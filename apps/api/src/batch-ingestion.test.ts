import { describe, expect, test } from "bun:test";
import {
  DomainError,
  errorEnvelope,
  type QueuedIngestionEvent,
} from "@agentscope/shared";
import { Elysia } from "elysia";
import { ZodError } from "zod";
import type { AuthenticatedProjectKey } from "./api-key-auth";
import { createBatchIngestionRoutes } from "./batch-ingestion";
import type { IngestionAdmission } from "./ingestion-admission";
import type { IngestionPublisher } from "./ingestion-queue";

const access: AuthenticatedProjectKey = {
  apiKeyId: "api-key-id",
  projectId: "project-id",
  organizationId: "organization-id",
  environment: "development",
  settings: {
    capturePrompts: false,
    captureResponses: false,
    redactedFields: [],
  },
};

function event(eventId: string) {
  return {
    version: "v1",
    eventId,
    occurredAt: "2026-06-22T12:00:00.000Z",
    type: "trace.create",
    payload: {
      traceId: `trace_${eventId}`,
      name: "batch-trace",
      environment: "development",
      startedAt: "2026-06-22T12:00:00.000Z",
      input: { secret: "removed" },
    },
  };
}

function createContext() {
  const queued: QueuedIngestionEvent[] = [];
  const reserved = new Set<string>();
  const publisher: IngestionPublisher = {
    async publish(message) {
      queued.push(message);
      return `${queued.length}-0`;
    },
  };
  const admission: IngestionAdmission = {
    async checkRateLimit() {},
    async reserve(message) {
      if (reserved.has(message.event.eventId)) {
        return { duplicate: true, queueId: "existing-0" };
      }
      reserved.add(message.event.eventId);
      return { duplicate: false };
    },
    async markQueued() {},
    async release() {},
  };
  const app = new Elysia()
    .onError(({ error, set }) => {
      if (error instanceof DomainError) {
        set.status = error.status;
        return errorEnvelope(error);
      }
      if (error instanceof ZodError) {
        set.status = 400;
        return {
          error: {
            code: "VALIDATION_ERROR",
            message: "The request payload is invalid.",
            details: { issues: error.issues },
          },
        };
      }
      set.status = 500;
      return {
        error: { code: "INTERNAL_ERROR", message: "Error", details: {} },
      };
    })
    .use(
      createBatchIngestionRoutes({
        authenticate: async () => access,
        publisher,
        admission,
        now: () => new Date("2026-06-22T12:00:01.000Z"),
      }),
    );
  return { app, queued };
}

function batchRequest(events: unknown[]): Request {
  return new Request("http://localhost/v1/batch", {
    method: "POST",
    headers: {
      authorization: "Bearer test",
      "content-type": "application/json",
    },
    body: JSON.stringify({ version: "v1", events }),
  });
}

describe("batch ingestion", () => {
  test("reports accepted, duplicate and invalid events independently", async () => {
    const { app, queued } = createContext();
    await app.handle(batchRequest([event("evt_existing")]));
    const response = await app.handle(
      batchRequest([
        event("evt_valid"),
        event("evt_existing"),
        { malformed: true },
      ]),
    );
    const body = (await response.json()) as {
      data: {
        accepted: number;
        duplicated: number;
        invalid: number;
      };
    };

    expect(response.status).toBe(202);
    expect(body.data).toMatchObject({
      accepted: 1,
      duplicated: 1,
      invalid: 1,
    });
    expect(queued).toHaveLength(2);
    expect(queued[1]?.event.payload.input).toBeUndefined();
  });

  test("rejects a batch above the configured limit", async () => {
    const { app } = createContext();
    const response = await app.handle(
      batchRequest(
        Array.from({ length: 101 }, (_, index) => event(`evt_${index}`)),
      ),
    );

    expect(response.status).toBe(413);
    expect(await response.text()).toContain("BATCH_LIMIT_EXCEEDED");
  });
});
