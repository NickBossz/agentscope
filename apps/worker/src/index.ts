import { createDatabase, ingestionEvents } from "@agentscope/database";
import {
  ingestionConsumerGroup,
  ingestionDeadLetterStreamName,
  ingestionEventSchema,
  ingestionStreamName,
  maximumProcessingAttempts,
  type QueuedIngestionEvent,
  sanitizeForLogging,
} from "@agentscope/shared";
import { and, eq } from "drizzle-orm";
import { workerConfig } from "./config";
import { processIngestionMessage, RetryableProcessingError } from "./processor";

const database = createDatabase(workerConfig.DATABASE_URL);
const redis = new Bun.RedisClient(workerConfig.REDIS_URL);
let stopping = false;

interface StreamEntry {
  id: string;
  data: string;
}

function streamEntries(response: unknown): StreamEntry[] {
  const streams = Array.isArray(response)
    ? response
    : typeof response === "object" && response !== null
      ? Object.values(response)
      : [];
  const entries: StreamEntry[] = [];
  for (const stream of streams) {
    const candidates =
      Array.isArray(stream) &&
      typeof stream[0] === "string" &&
      Array.isArray(stream[1])
        ? [stream]
        : Array.isArray(stream)
          ? stream
          : [];
    for (const entry of candidates) {
      if (!Array.isArray(entry) || typeof entry[0] !== "string") {
        continue;
      }
      const fields = entry[1];
      if (!Array.isArray(fields)) {
        continue;
      }
      const dataIndex = fields.indexOf("data");
      const data = fields[dataIndex + 1];
      if (dataIndex >= 0 && typeof data === "string") {
        entries.push({ id: entry[0], data });
      }
    }
  }
  return entries;
}

function claimedEntries(response: unknown): StreamEntry[] {
  if (!Array.isArray(response) || !Array.isArray(response[1])) {
    return [];
  }
  return streamEntries(response[1]);
}

async function processEntries(entries: StreamEntry[]): Promise<void> {
  for (const entry of entries) {
    let message: QueuedIngestionEvent | null = null;
    try {
      message = parseMessage(entry.data);
      await processIngestionMessage(database.db, message);
      await acknowledge(entry.id);
    } catch (error: unknown) {
      await retryOrDeadLetter(entry.id, message, error);
    }
  }
}

async function claimAbandonedEntries(): Promise<void> {
  const response = await redis.send("XAUTOCLAIM", [
    ingestionStreamName,
    ingestionConsumerGroup,
    workerConfig.WORKER_CONSUMER_NAME,
    "5000",
    "0-0",
    "COUNT",
    "10",
  ]);
  await processEntries(claimedEntries(response));
}

function parseMessage(data: string): QueuedIngestionEvent {
  const candidate: unknown = JSON.parse(data);
  if (typeof candidate !== "object" || candidate === null) {
    throw new Error("Queue message must be an object.");
  }
  const record = candidate as Record<string, unknown>;
  const event = ingestionEventSchema.parse(record.event);
  if (
    typeof record.organizationId !== "string" ||
    typeof record.projectId !== "string" ||
    typeof record.apiKeyId !== "string" ||
    typeof record.receivedAt !== "string" ||
    typeof record.attempt !== "number"
  ) {
    throw new Error("Queue message context is invalid.");
  }
  return {
    organizationId: record.organizationId,
    projectId: record.projectId,
    apiKeyId: record.apiKeyId,
    receivedAt: record.receivedAt,
    attempt: record.attempt,
    event,
  };
}

async function acknowledge(id: string): Promise<void> {
  await redis.send("XACK", [ingestionStreamName, ingestionConsumerGroup, id]);
}

async function retryOrDeadLetter(
  id: string,
  message: QueuedIngestionEvent | null,
  error: unknown,
): Promise<void> {
  const errorCode =
    error instanceof RetryableProcessingError
      ? "DEPENDENCY_NOT_READY"
      : "PROCESSING_FAILED";

  if (message && message.attempt < maximumProcessingAttempts) {
    const retryMessage: QueuedIngestionEvent = {
      ...message,
      attempt: message.attempt + 1,
    };
    await redis.send("XADD", [
      ingestionStreamName,
      "*",
      "data",
      JSON.stringify(retryMessage),
    ]);
    await database.db
      .update(ingestionEvents)
      .set({
        attempts: retryMessage.attempt,
        lastErrorCode: errorCode,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(ingestionEvents.projectId, message.projectId),
          eq(ingestionEvents.eventId, message.event.eventId),
        ),
      );
  } else {
    await redis.send("XADD", [
      ingestionDeadLetterStreamName,
      "*",
      "sourceId",
      id,
      "errorCode",
      errorCode,
      "eventId",
      message?.event.eventId ?? "unknown",
    ]);
    if (message) {
      await database.db
        .update(ingestionEvents)
        .set({
          status: "failed",
          attempts: message.attempt,
          lastErrorCode: errorCode,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(ingestionEvents.projectId, message.projectId),
            eq(ingestionEvents.eventId, message.event.eventId),
          ),
        );
    }
  }

  console.error("Ingestion event processing failed.", {
    sourceId: id,
    eventId: message?.event.eventId ?? "unknown",
    attempt: message?.attempt ?? 0,
    errorCode,
    error: sanitizeForLogging({
      name: error instanceof Error ? error.name : "UnknownError",
    }),
  });
  await acknowledge(id);
}

async function ensureConsumerGroup(): Promise<void> {
  try {
    await redis.send("XGROUP", [
      "CREATE",
      ingestionStreamName,
      ingestionConsumerGroup,
      "0",
      "MKSTREAM",
    ]);
  } catch (error: unknown) {
    if (!(error instanceof Error) || !error.message.includes("BUSYGROUP")) {
      throw error;
    }
  }
}

async function run(): Promise<void> {
  await ensureConsumerGroup();
  console.info("AgentScope worker is ready.");

  while (!stopping) {
    await claimAbandonedEntries();
    const response = await redis.send("XREADGROUP", [
      "GROUP",
      ingestionConsumerGroup,
      workerConfig.WORKER_CONSUMER_NAME,
      "COUNT",
      "10",
      "BLOCK",
      "2000",
      "STREAMS",
      ingestionStreamName,
      ">",
    ]);

    await processEntries(streamEntries(response));
  }
}

process.on("SIGTERM", () => {
  stopping = true;
});

try {
  await run();
} finally {
  redis.close();
  await database.pool.end();
}
