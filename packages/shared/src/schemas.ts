import { z } from "zod";
import { environments, organizationRoles } from "./types";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const emailSchema = z
  .string()
  .trim()
  .email()
  .max(320)
  .transform((value) => value.toLowerCase());
export const passwordSchema = z.string().min(12).max(128);
export const nameSchema = z.string().trim().min(1).max(120);
export const slugSchema = z.string().trim().min(2).max(80).regex(slugPattern);
export const uuidSchema = z.string().uuid();

export const signUpSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const createOrganizationSchema = z.object({
  name: nameSchema,
  slug: slugSchema,
});

export const organizationRoleSchema = z.enum(organizationRoles);

export const createProjectSchema = z.object({
  organizationId: uuidSchema,
  name: nameSchema,
  slug: slugSchema,
  description: z.string().trim().max(2000).optional(),
  defaultEnvironment: z.enum(environments).default("development"),
  retentionDays: z.number().int().min(1).max(3650).default(30),
  capturePrompts: z.boolean().default(true),
  captureResponses: z.boolean().default(true),
  redactedFields: z
    .array(z.string().trim().min(1).max(200))
    .max(100)
    .default([]),
});

export const updateProjectSchema = createProjectSchema
  .omit({ organizationId: true })
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field is required.",
  );

export const createApiKeySchema = z.object({
  name: nameSchema,
  environment: z.enum(environments),
  expiresAt: z.iso.datetime().optional(),
});

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_URL: z.url(),
  API_URL: z.url(),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(604800),
  TRACE_ENCRYPTION_KEY: z.string().min(32),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.url(),
  OTEL_SERVICE_NAME: z.string().min(1).default("agentscope"),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type AppEnvironment = z.infer<typeof envSchema>;

export function parseEnvironment(
  environment: Record<string, string | undefined>,
): AppEnvironment {
  return envSchema.parse(environment);
}
