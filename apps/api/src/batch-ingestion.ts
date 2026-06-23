import {
  applyIngestionPrivacy,
  DomainError,
  ingestionEventSchema,
  ingestionLimits,
  successEnvelope,
} from "@agentscope/shared";
import { Elysia } from "elysia";
import { z } from "zod";
import type { AuthenticatedProjectKey } from "./api-key-auth";
import type { IngestionAdmission } from "./ingestion-admission";
import {
  projectApiKeyFromRequest,
  publishIngestionEvent,
} from "./ingestion-http";
import type { IngestionPublisher } from "./ingestion-queue";

const batchRequestSchema = z
  .object({
    version: z.literal("v1"),
    events: z.array(z.unknown()).min(1),
  })
  .strict();

export interface BatchIngestionDependencies {
  authenticate(rawKey: string): Promise<AuthenticatedProjectKey>;
  publisher: IngestionPublisher;
  admission: IngestionAdmission;
  now?: () => Date;
}

export function createBatchIngestionRoutes(
  dependencies: BatchIngestionDependencies,
) {
  const now = dependencies.now ?? (() => new Date());

  return new Elysia({ name: "batch-ingestion" }).post(
    "/v1/batch",
    async ({ body, request, set }) => {
      const access = await dependencies.authenticate(
        projectApiKeyFromRequest(request),
      );
      const batch = batchRequestSchema.parse(body);
      if (batch.events.length > ingestionLimits.batchEvents) {
        throw new DomainError(
          "BATCH_LIMIT_EXCEEDED",
          "The batch contains too many events.",
          413,
          { limit: ingestionLimits.batchEvents },
        );
      }
      await dependencies.admission.checkRateLimit(access, batch.events.length);

      const results: Array<Record<string, unknown>> = [];
      for (const [index, candidate] of batch.events.entries()) {
        const parsed = ingestionEventSchema.safeParse(candidate);
        if (!parsed.success) {
          results.push({
            index,
            status: "invalid",
            issues: parsed.error.issues,
          });
          continue;
        }

        const event = parsed.data;
        if (
          event.type === "trace.create" &&
          event.payload.environment !== access.environment
        ) {
          results.push({
            index,
            eventId: event.eventId,
            status: "invalid",
            code: "ENVIRONMENT_MISMATCH",
          });
          continue;
        }

        const privacy = applyIngestionPrivacy(event, access.settings);
        const publication = await publishIngestionEvent(
          dependencies.publisher,
          dependencies.admission,
          access,
          {
            organizationId: access.organizationId,
            projectId: access.projectId,
            apiKeyId: access.apiKeyId,
            receivedAt: now().toISOString(),
            attempt: 1,
            event: privacy.event,
          },
          false,
        );
        results.push({
          index,
          eventId: event.eventId,
          status: publication.duplicate ? "duplicate" : "accepted",
          queueId: publication.queueId,
        });
      }

      const accepted = results.filter(
        (result) => result.status === "accepted",
      ).length;
      const duplicated = results.filter(
        (result) => result.status === "duplicate",
      ).length;
      const invalid = results.filter(
        (result) => result.status === "invalid",
      ).length;

      set.status = 202;
      return successEnvelope({
        accepted,
        duplicated,
        invalid,
        results,
      });
    },
  );
}
