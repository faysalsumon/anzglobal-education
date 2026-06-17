CREATE TABLE IF NOT EXISTS "account_notes" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"content" text NOT NULL,
	"mentions" text[] DEFAULT '{}'::text[],
	"visibility" "note_visibility" DEFAULT 'public' NOT NULL,
	"visible_to" text[] DEFAULT '{}'::text[],
	"created_by_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "acc_invoices" ADD COLUMN IF NOT EXISTS "account_id" uuid;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "abn" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "acn" text;--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD COLUMN IF NOT EXISTS "account_id" uuid;--> statement-breakpoint
ALTER TABLE "account_notes" DROP CONSTRAINT IF EXISTS "account_notes_account_id_accounts_id_fk";--> statement-breakpoint
ALTER TABLE "account_notes" ADD CONSTRAINT "account_notes_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_notes" DROP CONSTRAINT IF EXISTS "account_notes_created_by_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "account_notes" ADD CONSTRAINT "account_notes_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acc_invoices" DROP CONSTRAINT IF EXISTS "acc_invoices_account_id_accounts_id_fk";--> statement-breakpoint
ALTER TABLE "acc_invoices" ADD CONSTRAINT "acc_invoices_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contacts" DROP CONSTRAINT IF EXISTS "crm_contacts_account_id_accounts_id_fk";--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "account_notes_account_idx" ON "account_notes" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "account_notes_created_by_idx" ON "account_notes" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "account_notes_created_at_idx" ON "account_notes" USING btree ("created_at");
