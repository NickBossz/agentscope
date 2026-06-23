import type { IngestionEvent } from "./ingestion";

export const ingestionStreamName = "agentscope:ingestion";
export const ingestionDeadLetterStreamName = "agentscope:ingestion:dead-letter";
export const ingestionConsumerGroup = "agentscope-workers";
export const maximumProcessingAttempts = 3;

export interface QueuedIngestionEvent {
  organizationId: string;
  projectId: string;
  apiKeyId: string;
  receivedAt: string;
  attempt: number;
  event: IngestionEvent;
}
