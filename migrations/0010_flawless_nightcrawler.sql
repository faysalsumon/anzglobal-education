ALTER TABLE "application_courses" DROP CONSTRAINT "application_courses_course_id_courses_id_fk";
--> statement-breakpoint
DROP INDEX "app_courses_unique";--> statement-breakpoint
ALTER TABLE "application_courses" ALTER COLUMN "course_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "application_courses" ADD COLUMN "external_course_name" varchar;--> statement-breakpoint
ALTER TABLE "application_courses" ADD COLUMN "external_institution_name" varchar;--> statement-breakpoint
ALTER TABLE "application_courses" ADD CONSTRAINT "application_courses_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;