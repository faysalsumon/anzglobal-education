ALTER TABLE "accounts" ADD COLUMN "legal_entity_name" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "tax_id" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "billing_address" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "billing_city" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "billing_state" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "billing_country" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "billing_same_as_location" boolean DEFAULT true;
