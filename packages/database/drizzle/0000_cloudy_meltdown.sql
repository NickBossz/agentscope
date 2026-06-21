CREATE TYPE "public"."audit_action" AS ENUM('api_key.created', 'api_key.rotated', 'api_key.revoked');--> statement-breakpoint
CREATE TYPE "public"."environment" AS ENUM('development', 'staging', 'production');--> statement-breakpoint
CREATE TYPE "public"."error_category" AS ENUM('timeout', 'authentication', 'rate_limit', 'provider_error', 'invalid_response', 'parsing_failure', 'tool_failure', 'context_limit', 'agent_loop', 'internal_error');--> statement-breakpoint
CREATE TYPE "public"."evaluation_label" AS ENUM('positive', 'neutral', 'negative');--> statement-breakpoint
CREATE TYPE "public"."organization_role" AS ENUM('owner', 'admin', 'developer', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."span_type" AS ENUM('agent', 'llm', 'tool', 'retrieval', 'embedding', 'reranking', 'database', 'http', 'code', 'evaluation', 'custom');--> statement-breakpoint
CREATE TYPE "public"."trace_status" AS ENUM('pending', 'running', 'success', 'error', 'cancelled');--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"prefix" varchar(32) NOT NULL,
	"key_hash" varchar(64) NOT NULL,
	"environment" "environment" NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"rotated_from_id" uuid,
	"last_used_at" timestamp with time zone,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid,
	"actor_user_id" uuid NOT NULL,
	"action" "audit_action" NOT NULL,
	"target_id" uuid NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"trace_id" uuid NOT NULL,
	"span_id" uuid,
	"author_user_id" uuid,
	"label" "evaluation_label" NOT NULL,
	"score" numeric(8, 4),
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(120) NOT NULL,
	"model" varchar(240) NOT NULL,
	"input_price_per_million" numeric(30, 12),
	"output_price_per_million" numeric(30, 12),
	"cached_input_price_per_million" numeric(30, 12),
	"effective_from" timestamp with time zone NOT NULL,
	"effective_to" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "organization_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_members_organization_id_user_id_pk" PRIMARY KEY("organization_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(80) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_settings" (
	"project_id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"retention_days" integer DEFAULT 30 NOT NULL,
	"capture_prompts" boolean DEFAULT true NOT NULL,
	"capture_responses" boolean DEFAULT true NOT NULL,
	"redacted_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(80) NOT NULL,
	"description" text,
	"default_environment" "environment" DEFAULT 'development' NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" varchar(128) NOT NULL,
	"event_id" varchar(128),
	"trace_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"parent_span_external_id" varchar(128),
	"name" varchar(240) NOT NULL,
	"type" "span_type" NOT NULL,
	"status" "trace_status" DEFAULT 'pending' NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"duration_ms" bigint,
	"input" jsonb,
	"output" jsonb,
	"model" varchar(240),
	"provider" varchar(120),
	"input_tokens" bigint,
	"output_tokens" bigint,
	"cached_tokens" bigint,
	"reasoning_tokens" bigint,
	"total_tokens" bigint,
	"estimated_cost" numeric(30, 12),
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tool_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"trace_id" uuid NOT NULL,
	"span_id" uuid NOT NULL,
	"name" varchar(240) NOT NULL,
	"arguments" jsonb,
	"result" jsonb,
	"duration_ms" bigint,
	"status" "trace_status" NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trace_errors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"trace_id" uuid NOT NULL,
	"span_id" uuid,
	"category" "error_category" NOT NULL,
	"error_type" varchar(240),
	"message" text NOT NULL,
	"stack_trace" text,
	"provider" varchar(120),
	"tool_name" varchar(240),
	"retry_number" integer DEFAULT 0 NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "traces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" varchar(128) NOT NULL,
	"event_id" varchar(128),
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(240) NOT NULL,
	"environment" "environment" NOT NULL,
	"status" "trace_status" DEFAULT 'pending' NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"duration_ms" bigint,
	"input" jsonb,
	"output" jsonb,
	"user_external_id" varchar(240),
	"session_external_id" varchar(240),
	"model" varchar(240),
	"provider" varchar(120),
	"input_tokens" bigint,
	"output_tokens" bigint,
	"cached_tokens" bigint,
	"reasoning_tokens" bigint,
	"total_tokens" bigint,
	"estimated_cost" numeric(30, 12),
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"application_version" varchar(120),
	"agent_version" varchar(120),
	"prompt_version" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(320) NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_trace_id_traces_id_fk" FOREIGN KEY ("trace_id") REFERENCES "public"."traces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_span_id_spans_id_fk" FOREIGN KEY ("span_id") REFERENCES "public"."spans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_settings" ADD CONSTRAINT "project_settings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_settings" ADD CONSTRAINT "project_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spans" ADD CONSTRAINT "spans_trace_id_traces_id_fk" FOREIGN KEY ("trace_id") REFERENCES "public"."traces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spans" ADD CONSTRAINT "spans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spans" ADD CONSTRAINT "spans_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_calls" ADD CONSTRAINT "tool_calls_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_calls" ADD CONSTRAINT "tool_calls_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_calls" ADD CONSTRAINT "tool_calls_trace_id_traces_id_fk" FOREIGN KEY ("trace_id") REFERENCES "public"."traces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_calls" ADD CONSTRAINT "tool_calls_span_id_spans_id_fk" FOREIGN KEY ("span_id") REFERENCES "public"."spans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trace_errors" ADD CONSTRAINT "trace_errors_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trace_errors" ADD CONSTRAINT "trace_errors_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trace_errors" ADD CONSTRAINT "trace_errors_trace_id_traces_id_fk" FOREIGN KEY ("trace_id") REFERENCES "public"."traces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trace_errors" ADD CONSTRAINT "trace_errors_span_id_spans_id_fk" FOREIGN KEY ("span_id") REFERENCES "public"."spans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traces" ADD CONSTRAINT "traces_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traces" ADD CONSTRAINT "traces_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_prefix_unique" ON "api_keys" USING btree ("prefix");--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_hash_unique" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "api_keys_project_active_idx" ON "api_keys" USING btree ("project_id","revoked_at");--> statement-breakpoint
CREATE INDEX "audit_logs_organization_created_idx" ON "audit_logs" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "evaluations_trace_id_idx" ON "evaluations" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "evaluations_project_created_idx" ON "evaluations" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "model_prices_version_unique" ON "model_prices" USING btree ("provider","model","effective_from");--> statement-breakpoint
CREATE INDEX "model_prices_lookup_idx" ON "model_prices" USING btree ("provider","model","effective_from");--> statement-breakpoint
CREATE INDEX "organization_members_user_id_idx" ON "organization_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_unique" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_organization_slug_unique" ON "projects" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX "projects_organization_id_idx" ON "projects" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "projects_active_idx" ON "projects" USING btree ("organization_id","archived_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_unique" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "spans_project_external_unique" ON "spans" USING btree ("project_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "spans_project_event_unique" ON "spans" USING btree ("project_id","event_id");--> statement-breakpoint
CREATE INDEX "spans_trace_id_idx" ON "spans" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "spans_parent_external_idx" ON "spans" USING btree ("trace_id","parent_span_external_id");--> statement-breakpoint
CREATE INDEX "spans_project_type_idx" ON "spans" USING btree ("project_id","type");--> statement-breakpoint
CREATE INDEX "tool_calls_trace_id_idx" ON "tool_calls" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "tool_calls_project_name_idx" ON "tool_calls" USING btree ("project_id","name");--> statement-breakpoint
CREATE INDEX "trace_errors_trace_id_idx" ON "trace_errors" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "trace_errors_project_category_idx" ON "trace_errors" USING btree ("project_id","category");--> statement-breakpoint
CREATE UNIQUE INDEX "traces_project_external_unique" ON "traces" USING btree ("project_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "traces_project_event_unique" ON "traces" USING btree ("project_id","event_id");--> statement-breakpoint
CREATE INDEX "traces_project_started_idx" ON "traces" USING btree ("project_id","started_at");--> statement-breakpoint
CREATE INDEX "traces_project_status_idx" ON "traces" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "traces_organization_id_idx" ON "traces" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree (lower("email"));