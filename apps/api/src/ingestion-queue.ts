import {
  ingestionStreamName,
  type QueuedIngestionEvent,
} from "@agentscope/shared";

export type { QueuedIngestionEvent } from "@agentscope/shared";

export interface IngestionPublisher {
  publish(message: QueuedIngestionEvent): Promise<string>;
}

export function createRedisIngestionPublisher(
  redisUrl: string,
): IngestionPublisher & { close(): void } {
  const redis = new Bun.RedisClient(redisUrl);

  return {
    async publish(message): Promise<string> {
      const result = await redis.send("XADD", [
        ingestionStreamName,
        "*",
        "data",
        JSON.stringify(message),
      ]);
      if (typeof result !== "string") {
        throw new Error("Redis did not return an ingestion stream entry ID.");
      }
      return result;
    },
    close(): void {
      redis.close();
    },
  };
}
