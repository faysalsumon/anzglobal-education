ALTER TABLE "application_courses" DROP CONSTRAINT IF EXISTS "application_courses_course_id_courses_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "app_courses_unique";--> statement-breakpoint
ALTER TABLE "application_courses" ALTER COLUMN "course_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "application_courses" ADD COLUMN IF NOT EXISTS "external_course_name" varchar;--> statement-breakpoint
ALTER TABLE "application_courses" ADD COLUMN IF NOT EXISTS "external_institution_name" varchar;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'application_courses_course_id_courses_id_fk'
      AND table_name = 'application_courses'
  ) THEN
    ALTER TABLE "application_courses" ADD CONSTRAINT "application_courses_course_id_courses_id_fk"
      FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
