import {
  applyIngestionPrivacy,
  DomainError,
  successEnvelope,
  traceCreateEventSchema,
  traceUpdateEventSchema,
} from "@agentscope/shared";
import { Elysia } from "elysia";
import type { AuthenticatedProjectKey } from "./api-key-auth";
import type { IngestionAdmission } from "./ingestion-admission";
import {
  projectApiKeyFromRequest,
  publishIngestionEvent,
} from "./ingestion-http";
import type { IngestionPublisher } from "./ingestion-queue";

export interface TraceIngestionDependencies {
  authenticate(rawKey: string): Promise<AuthenticatedProjectKey>;
  publisher: IngestionPublisher;
  admission: IngestionAdmission;
  now?: () => Date;
}

export function createTraceIngestionRoutes(
  dependencies: TraceIngestionDependencies,
) {
  const now = dependencies.now ?? (() => new Date());

  return new Elysia({ name: "trace-ingestion" })
    .post("/v1/traces", async ({ body, request, set }) => {
      const access = await dependencies.authenticate(
        projectApiKeyFromRequest(request),
      );
      const event = traceCreateEventSchema.parse(body);

      if (event.payload.environment !== access.environment) {
        throw new DomainError(
          "ENVIRONMENT_MISMATCH",
          "The trace environment does not match the API key environment.",
          403,
        );
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
      );

      set.status = 202;
      return successEnvelope({
        accepted: true,
        eventId: event.eventId,
        traceId: event.payload.traceId,
        duplicate: publication.duplicate,
        queueId: publication.queueId,
      });
    })
    .patch("/v1/traces/:traceId", async ({ body, params, request, set }) => {
      const access = await dependencies.authenticate(
        projectApiKeyFromRequest(request),
      );
      const event = traceUpdateEventSchema.parse(body);
      if (event.payload.traceId !== params.traceId) {
        throw new DomainError(
          "TRACE_ID_MISMATCH",
          "The trace ID in the path and payload must match.",
          400,
        );
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
      );

      set.status = 202;
      return successEnvelope({
        accepted: true,
        eventId: event.eventId,
        traceId: event.payload.traceId,
        duplicate: publication.duplicate,
        queueId: publication.queueId,
      });
    });
}
