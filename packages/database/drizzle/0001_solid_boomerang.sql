CREATE TYPE "public"."ingestion_event_status" AS ENUM('reserved', 'queued', 'processed', 'failed');--> statement-breakpoint
CREATE TABLE "ingestion_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"api_key_id" uuid,
	"event_id" varchar(128) NOT NULL,
	"event_type" varchar(32) NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "ingestion_event_status" DEFAULT 'reserved' NOT NULL,
	"queue_id" varchar(64),
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error_code" varchar(120),
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "spans" ADD COLUMN "messages" jsonb;--> statement-breakpoint
ALTER TABLE "spans" ADD COLUMN "model_parameters" jsonb;--> statement-breakpoint
ALTER TABLE "spans" ADD COLUMN "model_price_id" uuid;--> statement-breakpoint
ALTER TABLE "traces" ADD COLUMN "messages" jsonb;--> statement-breakpoint
ALTER TABLE "traces" ADD COLUMN "model_parameters" jsonb;--> statement-breakpoint
ALTER TABLE "traces" ADD COLUMN "model_price_id" uuid;--> statement-breakpoint
ALTER TABLE "ingestion_events" ADD CONSTRAINT "ingestion_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_events" ADD CONSTRAINT "ingestion_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_events" ADD CONSTRAINT "ingestion_events_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ingestion_events_project_event_unique" ON "ingestion_events" USING btree ("project_id","event_id");--> statement-breakpoint
CREATE INDEX "ingestion_events_status_created_idx" ON "ingestion_events" USING btree ("status","created_at");--> statement-breakpoint
ALTER TABLE "spans" ADD CONSTRAINT "spans_model_price_id_model_prices_id_fk" FOREIGN KEY ("model_price_id") REFERENCES "public"."model_prices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traces" ADD CONSTRAINT "traces_model_price_id_model_prices_id_fk" FOREIGN KEY ("model_price_id") REFERENCES "public"."model_prices"("id") ON DELETE set null ON UPDATE no action;