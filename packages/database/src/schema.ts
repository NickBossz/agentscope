import {
  environments,
  errorCategories,
  organizationRoles,
  spanTypes,
  traceStatuses,
} from "@agentscope/shared";
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const organizationRoleEnum = pgEnum(
  "organization_role",
  organizationRoles,
);
export const environmentEnum = pgEnum("environment", environments);
export const traceStatusEnum = pgEnum("trace_status", traceStatuses);
export const spanTypeEnum = pgEnum("span_type", spanTypes);
export const errorCategoryEnum = pgEnum("error_category", errorCategories);
export const evaluationLabelEnum = pgEnum("evaluation_label", [
  "positive",
  "neutral",
  "negative",
]);
export const auditActionEnum = pgEnum("audit_action", [
  "api_key.created",
  "api_key.rotated",
  "api_key.revoked",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("users_email_unique").on(sql`lower(${table.email})`)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_unique").on(table.tokenHash),
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
);

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 80 }).notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("organizations_slug_unique").on(table.slug)],
);

export const organizationMembers = pgTable(
  "organization_members",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: organizationRoleEnum("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.userId] }),
    index("organization_members_user_id_idx").on(table.userId),
  ],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 80 }).notNull(),
    description: text("description"),
    defaultEnvironment: environmentEnum("default_environment")
      .notNull()
      .default("development"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("projects_organization_slug_unique").on(
      table.organizationId,
      table.slug,
    ),
    index("projects_organization_id_idx").on(table.organizationId),
    index("projects_active_idx").on(table.organizationId, table.archivedAt),
  ],
);

export const projectSettings = pgTable("project_settings", {
  projectId: uuid("project_id")
    .primaryKey()
    .references(() => projects.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  retentionDays: integer("retention_days").notNull().default(30),
  capturePrompts: boolean("capture_prompts").notNull().default(true),
  captureResponses: boolean("capture_responses").notNull().default(true),
  redactedFields: jsonb("redacted_fields")
    .$type<string[]>()
    .notNull()
    .default([]),
  ...timestamps,
});

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    prefix: varchar("prefix", { length: 32 }).notNull(),
    keyHash: varchar("key_hash", { length: 64 }).notNull(),
    environment: environmentEnum("environment").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    rotatedFromId: uuid("rotated_from_id"),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("api_keys_prefix_unique").on(table.prefix),
    uniqueIndex("api_keys_hash_unique").on(table.keyHash),
    index("api_keys_project_active_idx").on(table.projectId, table.revokedAt),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    action: auditActionEnum("action").notNull(),
    targetId: uuid("target_id").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_logs_organization_created_idx").on(
      table.organizationId,
      table.createdAt,
    ),
  ],
);

export const traces = pgTable(
  "traces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    externalId: varchar("external_id", { length: 128 }).notNull(),
    eventId: varchar("event_id", { length: 128 }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 240 }).notNull(),
    environment: environmentEnum("environment").notNull(),
    status: traceStatusEnum("status").notNull().default("pending"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationMs: bigint("duration_ms", { mode: "number" }),
    input: jsonb("input"),
    output: jsonb("output"),
    userExternalId: varchar("user_external_id", { length: 240 }),
    sessionExternalId: varchar("session_external_id", { length: 240 }),
    model: varchar("model", { length: 240 }),
    provider: varchar("provider", { length: 120 }),
    inputTokens: bigint("input_tokens", { mode: "number" }),
    outputTokens: bigint("output_tokens", { mode: "number" }),
    cachedTokens: bigint("cached_tokens", { mode: "number" }),
    reasoningTokens: bigint("reasoning_tokens", { mode: "number" }),
    totalTokens: bigint("total_tokens", { mode: "number" }),
    estimatedCost: numeric("estimated_cost", { precision: 30, scale: 12 }),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    applicationVersion: varchar("application_version", { length: 120 }),
    agentVersion: varchar("agent_version", { length: 120 }),
    promptVersion: varchar("prompt_version", { length: 120 }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("traces_project_external_unique").on(
      table.projectId,
      table.externalId,
    ),
    uniqueIndex("traces_project_event_unique").on(
      table.projectId,
      table.eventId,
    ),
    index("traces_project_started_idx").on(table.projectId, table.startedAt),
    index("traces_project_status_idx").on(table.projectId, table.status),
    index("traces_organization_id_idx").on(table.organizationId),
  ],
);

export const spans = pgTable(
  "spans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    externalId: varchar("external_id", { length: 128 }).notNull(),
    eventId: varchar("event_id", { length: 128 }),
    traceId: uuid("trace_id")
      .notNull()
      .references(() => traces.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    parentSpanExternalId: varchar("parent_span_external_id", { length: 128 }),
    name: varchar("name", { length: 240 }).notNull(),
    type: spanTypeEnum("type").notNull(),
    status: traceStatusEnum("status").notNull().default("pending"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationMs: bigint("duration_ms", { mode: "number" }),
    input: jsonb("input"),
    output: jsonb("output"),
    model: varchar("model", { length: 240 }),
    provider: varchar("provider", { length: 120 }),
    inputTokens: bigint("input_tokens", { mode: "number" }),
    outputTokens: bigint("output_tokens", { mode: "number" }),
    cachedTokens: bigint("cached_tokens", { mode: "number" }),
    reasoningTokens: bigint("reasoning_tokens", { mode: "number" }),
    totalTokens: bigint("total_tokens", { mode: "number" }),
    estimatedCost: numeric("estimated_cost", { precision: 30, scale: 12 }),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("spans_project_external_unique").on(
      table.projectId,
      table.externalId,
    ),
    uniqueIndex("spans_project_event_unique").on(
      table.projectId,
      table.eventId,
    ),
    index("spans_trace_id_idx").on(table.traceId),
    index("spans_parent_external_idx").on(
      table.traceId,
      table.parentSpanExternalId,
    ),
    index("spans_project_type_idx").on(table.projectId, table.type),
  ],
);

export const toolCalls = pgTable(
  "tool_calls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    traceId: uuid("trace_id")
      .notNull()
      .references(() => traces.id, { onDelete: "cascade" }),
    spanId: uuid("span_id")
      .notNull()
      .references(() => spans.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 240 }).notNull(),
    arguments: jsonb("arguments"),
    result: jsonb("result"),
    durationMs: bigint("duration_ms", { mode: "number" }),
    status: traceStatusEnum("status").notNull(),
    retryCount: integer("retry_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("tool_calls_trace_id_idx").on(table.traceId),
    index("tool_calls_project_name_idx").on(table.projectId, table.name),
  ],
);

export const traceErrors = pgTable(
  "trace_errors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    traceId: uuid("trace_id")
      .notNull()
      .references(() => traces.id, { onDelete: "cascade" }),
    spanId: uuid("span_id").references(() => spans.id, { onDelete: "cascade" }),
    category: errorCategoryEnum("category").notNull(),
    errorType: varchar("error_type", { length: 240 }),
    message: text("message").notNull(),
    stackTrace: text("stack_trace"),
    provider: varchar("provider", { length: 120 }),
    toolName: varchar("tool_name", { length: 240 }),
    retryNumber: integer("retry_number").notNull().default(0),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("trace_errors_trace_id_idx").on(table.traceId),
    index("trace_errors_project_category_idx").on(
      table.projectId,
      table.category,
    ),
  ],
);

export const evaluations = pgTable(
  "evaluations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    traceId: uuid("trace_id")
      .notNull()
      .references(() => traces.id, { onDelete: "cascade" }),
    spanId: uuid("span_id").references(() => spans.id, { onDelete: "cascade" }),
    authorUserId: uuid("author_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    label: evaluationLabelEnum("label").notNull(),
    score: numeric("score", { precision: 8, scale: 4 }),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("evaluations_trace_id_idx").on(table.traceId),
    index("evaluations_project_created_idx").on(
      table.projectId,
      table.createdAt,
    ),
  ],
);

export const modelPrices = pgTable(
  "model_prices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: varchar("provider", { length: 120 }).notNull(),
    model: varchar("model", { length: 240 }).notNull(),
    inputPricePerMillion: numeric("input_price_per_million", {
      precision: 30,
      scale: 12,
    }),
    outputPricePerMillion: numeric("output_price_per_million", {
      precision: 30,
      scale: 12,
    }),
    cachedInputPricePerMillion: numeric("cached_input_price_per_million", {
      precision: 30,
      scale: 12,
    }),
    effectiveFrom: timestamp("effective_from", {
      withTimezone: true,
    }).notNull(),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("model_prices_version_unique").on(
      table.provider,
      table.model,
      table.effectiveFrom,
    ),
    index("model_prices_lookup_idx").on(
      table.provider,
      table.model,
      table.effectiveFrom,
    ),
  ],
);
