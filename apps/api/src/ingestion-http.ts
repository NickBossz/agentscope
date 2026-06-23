import { DomainError } from "@agentscope/shared";
import type { AuthenticatedProjectKey } from "./api-key-auth";
import type { IngestionAdmission } from "./ingestion-admission";
import type {
  IngestionPublisher,
  QueuedIngestionEvent,
} from "./ingestion-queue";

export function projectApiKeyFromRequest(request: Request): string {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(\S+)$/i);
  if (!match?.[1]) {
    throw new DomainError(
      "MISSING_API_KEY",
      "A project API key is required.",
      401,
    );
  }
  return match[1];
}

export async function publishIngestionEvent(
  publisher: IngestionPublisher,
  admission: IngestionAdmission,
  access: AuthenticatedProjectKey,
  message: QueuedIngestionEvent,
  checkRateLimit = true,
): Promise<{ duplicate: boolean; queueId?: string | undefined }> {
  if (checkRateLimit) {
    await admission.checkRateLimit(access);
  }
  const reservation = await admission.reserve(message);
  if (reservation.duplicate) {
    return reservation;
  }

  let queueId: string;
  try {
    queueId = await publisher.publish(message);
  } catch {
    await admission.release(message.projectId, message.event.eventId);
    throw new DomainError(
      "INGESTION_QUEUE_UNAVAILABLE",
      "The ingestion service is temporarily unavailable.",
      503,
    );
  }

  try {
    await admission.markQueued(
      message.projectId,
      message.event.eventId,
      queueId,
    );
    return { duplicate: false, queueId };
  } catch {
    throw new DomainError(
      "INGESTION_QUEUE_UNAVAILABLE",
      "The ingestion service is temporarily unavailable.",
      503,
    );
  }
}
