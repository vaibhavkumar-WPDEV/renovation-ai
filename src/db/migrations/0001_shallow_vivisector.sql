CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(128) NOT NULL,
	"key_prefix" varchar(12) NOT NULL,
	"key_hash" varchar(64) NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "lead_id" uuid;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "access_token" varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "content" jsonb;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "signer_name" varchar(128);--> statement-breakpoint
ALTER TABLE "review_requests" ADD COLUMN "access_token" varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE "review_requests" ADD COLUMN "feedback" text;--> statement-breakpoint
ALTER TABLE "review_requests" ADD COLUMN "ai_response_draft" text;--> statement-breakpoint
ALTER TABLE "review_requests" ADD COLUMN "responded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tenant_settings" ADD COLUMN "review_config" jsonb;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_keys_tenant_idx" ON "api_keys" USING btree ("tenant_id");--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "proposals_lead_idx" ON "proposals" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "review_requests_tenant_idx" ON "review_requests" USING btree ("tenant_id");--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_access_token_unique" UNIQUE("access_token");--> statement-breakpoint
ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_access_token_unique" UNIQUE("access_token");