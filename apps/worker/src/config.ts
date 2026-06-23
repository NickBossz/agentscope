import { z } from "zod";

const workerEnvironmentSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  WORKER_CONSUMER_NAME: z.string().min(1).default(`worker-${process.pid}`),
});

export const workerConfig = workerEnvironmentSchema.parse(process.env);
