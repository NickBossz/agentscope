import {
  applyIngestionPrivacy,
  DomainError,
  spanCreateEventSchema,
  spanUpdateEventSchema,
  successEnvelope,
} from "@agentscope/shared";
import { Elysia } from "elysia";
import type { AuthenticatedProjectKey } from "./api-key-auth";
import type { IngestionAdmission } from "./ingestion-admission";
import {
  projectApiKeyFromRequest,
  publishIngestionEvent,
} from "./ingestion-http";
import type { IngestionPublisher } from "./ingestion-queue";

export interface SpanIngestionDependencies {
  authenticate(rawKey: string): Promise<AuthenticatedProjectKey>;
  publisher: IngestionPublisher;
  admission: IngestionAdmission;
  now?: () => Date;
}

export function createSpanIngestionRoutes(
  dependencies: SpanIngestionDependencies,
) {
  const now = dependencies.now ?? (() => new Date());

  return new Elysia({ name: "span-ingestion" })
    .post(
      "/v1/traces/:traceId/spans",
      async ({ body, params, request, set }) => {
        const access = await dependencies.authenticate(
          projectApiKeyFromRequest(request),
        );
        const event = spanCreateEventSchema.parse(body);
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
          spanId: event.payload.spanId,
          duplicate: publication.duplicate,
          queueId: publication.queueId,
        });
      },
    )
    .patch("/v1/spans/:spanId", async ({ body, params, request, set }) => {
      const access = await dependencies.authenticate(
        projectApiKeyFromRequest(request),
      );
      const event = spanUpdateEventSchema.parse(body);
      if (event.payload.spanId !== params.spanId) {
        throw new DomainError(
          "SPAN_ID_MISMATCH",
          "The span ID in the path and payload must match.",
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
        spanId: event.payload.spanId,
        duplicate: publication.duplicate,
        queueId: publication.queueId,
      });
    });
}
