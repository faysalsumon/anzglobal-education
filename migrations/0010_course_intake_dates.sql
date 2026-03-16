-- 0010: Add course_intake_dates table for specific fixed-date intake scheduling
--
-- Complements the existing course_intake_templates (recurring annual patterns).
-- This table stores specific calendar dates, e.g. "19 Jan 2026", "9 Feb 2026"
-- as used by institutions with precisely-scheduled multi-year intake calendars.

CREATE TABLE IF NOT EXISTS "course_intake_dates" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "course_id" varchar NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
  "intake_date" date NOT NULL,
  "label" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "course_intake_dates_course_idx"
  ON "course_intake_dates" ("course_id");

CREATE INDEX IF NOT EXISTS "course_intake_dates_date_idx"
  ON "course_intake_dates" ("course_id", "intake_date");
