export type Brand<TValue, TBrand extends string> = TValue & {
  readonly __brand: TBrand;
};

export type UserId = Brand<string, "UserId">;
export type OrganizationId = Brand<string, "OrganizationId">;
export type ProjectId = Brand<string, "ProjectId">;
export type ApiKeyId = Brand<string, "ApiKeyId">;
export type TraceId = Brand<string, "TraceId">;
export type SpanId = Brand<string, "SpanId">;

export const organizationRoles = [
  "owner",
  "admin",
  "developer",
  "viewer",
] as const;
export type OrganizationRole = (typeof organizationRoles)[number];

export const environments = ["development", "staging", "production"] as const;
export type Environment = (typeof environments)[number];

export const traceStatuses = [
  "pending",
  "running",
  "success",
  "error",
  "cancelled",
] as const;
export type TraceStatus = (typeof traceStatuses)[number];

export const spanTypes = [
  "agent",
  "llm",
  "tool",
  "retrieval",
  "embedding",
  "reranking",
  "database",
  "http",
  "code",
  "evaluation",
  "custom",
] as const;
export type SpanType = (typeof spanTypes)[number];

export const errorCategories = [
  "timeout",
  "authentication",
  "rate_limit",
  "provider_error",
  "invalid_response",
  "parsing_failure",
  "tool_failure",
  "context_limit",
  "agent_loop",
  "internal_error",
] as const;
export type ErrorCategory = (typeof errorCategories)[number];

export interface ApiError {
  code: string;
  message: string;
  details: Record<string, unknown>;
}

export interface ApiErrorEnvelope {
  error: ApiError;
}

export interface ApiSuccessEnvelope<TData> {
  data: TData;
}

export type ApiResponse<TData> = ApiSuccessEnvelope<TData> | ApiErrorEnvelope;
