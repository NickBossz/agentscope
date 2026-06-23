import type { Database } from "@agentscope/database";
import { ingestionEvents } from "@agentscope/database";
import { DomainError, type QueuedIngestionEvent } from "@agentscope/shared";
import { and, eq } from "drizzle-orm";
import type { AuthenticatedProjectKey } from "./api-key-auth";

export interface ReservationResult {
  duplicate: boolean;
  queueId?: string | undefined;
}

export interface IngestionAdmission {
  checkRateLimit(
    access: AuthenticatedProjectKey,
    units?: number,
  ): Promise<void>;
  reserve(message: QueuedIngestionEvent): Promise<ReservationResult>;
  markQueued(
    projectId: string,
    eventId: string,
    queueId: string,
  ): Promise<void>;
  release(projectId: string, eventId: string): Promise<void>;
}

export function createIngestionAdmission(
  database: Database["db"],
  redisUrl: string,
): IngestionAdmission & { close(): void } {
  const redis = new Bun.RedisClient(redisUrl);
  const limit = 120;
  const windowSeconds = 60;

  return {
    async checkRateLimit(access, units = 1): Promise<void> {
      const window = Math.floor(Date.now() / (windowSeconds * 1_000));
      const key = `agentscope:rate:${access.projectId}:${access.apiKeyId}:${window}`;
      const count = await redis.incrby(key, units);
      if (count === units) {
        await redis.expire(key, windowSeconds + 1);
      }
      if (count > limit) {
        throw new DomainError(
          "RATE_LIMIT_EXCEEDED",
          "The ingestion rate limit was exceeded.",
          429,
          { limit, windowSeconds },
        );
      }
    },

    async reserve(message): Promise<ReservationResult> {
      const [created] = await database
        .insert(ingestionEvents)
        .values({
          organizationId: message.organizationId,
          projectId: message.projectId,
          apiKeyId: message.apiKeyId,
          eventId: message.event.eventId,
          eventType: message.event.type,
          payload: message.event as unknown as Record<string, unknown>,
        })
        .onConflictDoNothing({
          target: [ingestionEvents.projectId, ingestionEvents.eventId],
        })
        .returning({ id: ingestionEvents.id });

      if (created) {
        return { duplicate: false };
      }

      const [existing] = await database
        .select({ queueId: ingestionEvents.queueId })
        .from(ingestionEvents)
        .where(
          and(
            eq(ingestionEvents.projectId, message.projectId),
            eq(ingestionEvents.eventId, message.event.eventId),
          ),
        )
        .limit(1);
      return { duplicate: true, queueId: existing?.queueId ?? undefined };
    },

    async markQueued(projectId, eventId, queueId): Promise<void> {
      await database
        .update(ingestionEvents)
        .set({ status: "queued", queueId, updatedAt: new Date() })
        .where(
          and(
            eq(ingestionEvents.projectId, projectId),
            eq(ingestionEvents.eventId, eventId),
          ),
        );
    },

    async release(projectId, eventId): Promise<void> {
      await database
        .delete(ingestionEvents)
        .where(
          and(
            eq(ingestionEvents.projectId, projectId),
            eq(ingestionEvents.eventId, eventId),
            eq(ingestionEvents.status, "reserved"),
          ),
        );
    },

    close(): void {
      redis.close();
    },
  };
}
