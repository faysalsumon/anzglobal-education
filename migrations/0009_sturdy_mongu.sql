CREATE TABLE IF NOT EXISTS "course_intake_dates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" varchar NOT NULL,
	"intake_date" date NOT NULL,
	"label" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lead_course_preferences" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "lead_course_preferences_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"lead_id" varchar NOT NULL,
	"preference_rank" integer NOT NULL,
	"country" text,
	"university_id" varchar,
	"course_id" varchar,
	"course_name" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "allowed_institutions" varchar[];
--> statement-breakpoint
ALTER TABLE "blogs" ADD COLUMN IF NOT EXISTS "available_markets" text[] DEFAULT ARRAY['AU','BD']::text[] NOT NULL;
--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "cricos_code" text;
--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "is_cricos_registered" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "admission_fee" numeric(10, 2);
--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "materials_fee" numeric(10, 2);
--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "available_markets" text[] DEFAULT ARRAY['AU','BD']::text[] NOT NULL;
--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "featured_markets" text[] DEFAULT ARRAY[]::text[] NOT NULL;
--> statement-breakpoint
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "available_markets" text[] DEFAULT ARRAY['AU','BD']::text[] NOT NULL;
--> statement-breakpoint
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "featured_markets" text[] DEFAULT ARRAY[]::text[] NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'course_intake_dates_course_id_courses_id_fk'
  ) THEN
    ALTER TABLE "course_intake_dates" ADD CONSTRAINT "course_intake_dates_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lead_course_preferences_lead_id_crm_contacts_id_fk'
  ) THEN
    ALTER TABLE "lead_course_preferences" ADD CONSTRAINT "lead_course_preferences_lead_id_crm_contacts_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."crm_contacts"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lead_course_preferences_university_id_universities_id_fk'
  ) THEN
    ALTER TABLE "lead_course_preferences" ADD CONSTRAINT "lead_course_preferences_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lead_course_preferences_course_id_courses_id_fk'
  ) THEN
    ALTER TABLE "lead_course_preferences" ADD CONSTRAINT "lead_course_preferences_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "course_intake_dates_course_idx" ON "course_intake_dates" USING btree ("course_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "course_intake_dates_date_idx" ON "course_intake_dates" USING btree ("course_id","intake_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_course_prefs_lead_idx" ON "lead_course_preferences" USING btree ("lead_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_course_prefs_rank_idx" ON "lead_course_preferences" USING btree ("lead_id","preference_rank");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blogs_available_markets_gin_idx" ON "blogs" USING gin ("available_markets");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "courses_available_markets_gin_idx" ON "courses" USING gin ("available_markets");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "courses_featured_markets_gin_idx" ON "courses" USING gin ("featured_markets");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "universities_available_markets_gin_idx" ON "universities" USING gin ("available_markets");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "universities_featured_markets_gin_idx" ON "universities" USING gin ("featured_markets");
