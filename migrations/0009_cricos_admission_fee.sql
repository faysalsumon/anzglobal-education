-- 0009: Add CRICOS code, CRICOS registration flag, and admission fee to courses
--
-- cricosCode: stores the CRICOS registered course code for AU courses (e.g. 116694A)
-- isCricosRegistered: persisted boolean flag indicating the course is on the CRICOS register
-- admissionFee: one-time admission/enrolment fee, distinct from the per-application applicationFees

ALTER TABLE "courses"
  ADD COLUMN IF NOT EXISTS "cricos_code" text;

ALTER TABLE "courses"
  ADD COLUMN IF NOT EXISTS "is_cricos_registered" boolean NOT NULL DEFAULT false;

ALTER TABLE "courses"
  ADD COLUMN IF NOT EXISTS "admission_fee" numeric(10, 2);
