CREATE TYPE "public"."acc_account_type" AS ENUM('asset', 'liability', 'income', 'expense', 'equity');--> statement-breakpoint
CREATE TYPE "public"."acc_bill_status" AS ENUM('unpaid', 'partially_paid', 'paid', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."acc_bill_to_type" AS ENUM('institution', 'student', 'manual');--> statement-breakpoint
CREATE TYPE "public"."acc_invoice_status" AS ENUM('draft', 'sent', 'partially_paid', 'paid', 'void', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."acc_payment_method" AS ENUM('bank', 'cash', 'card', 'cheque');--> statement-breakpoint
CREATE TYPE "public"."activity_action" AS ENUM('created', 'updated', 'deleted', 'approved', 'rejected', 'activated', 'deactivated', 'assigned', 'unassigned', 'login', 'logout', 'status_changed', 'imported', 'exported', 'stage_changed');--> statement-breakpoint
CREATE TYPE "public"."activity_entity_type" AS ENUM('user', 'institution', 'course', 'application', 'student_lead', 'inquiry_lead', 'blog', 'document', 'scraped_course', 'import_batch', 'team_member', 'notification', 'task', 'internal_note', 'reminder', 'crm_lead', 'crm_contact', 'testimonial', 'faq', 'site_setting', 'content_snippet', 'public_team_member');--> statement-breakpoint
CREATE TYPE "public"."application_stage" AS ENUM('Assessment', 'Collect Docs', 'Documents Verification', 'Offer-Letter', 'GS-Clearance', 'COE', 'Health Cover', 'Visa Lodgment', 'Application Won', 'Refusal/Refunds', 'Application Lost');--> statement-breakpoint
CREATE TYPE "public"."approval_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."australian_visa_type" AS ENUM('student_500', 'graduate_485', 'skilled_482', 'working_holiday_417', 'working_holiday_462', 'bridging_visa', 'visitor_600', 'partner_820_801', 'permanent_resident', 'citizen', 'other');--> statement-breakpoint
CREATE TYPE "public"."availability_status" AS ENUM('available', 'away', 'busy', 'do_not_disturb', 'invisible');--> statement-breakpoint
CREATE TYPE "public"."blog_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."client_status" AS ENUM('lead', 'applicant', 'enrolled', 'completed', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."cms_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."contact_inquiry_status" AS ENUM('new', 'in_progress', 'responded', 'closed');--> statement-breakpoint
CREATE TYPE "public"."contact_inquiry_type" AS ENUM('student', 'institution');--> statement-breakpoint
CREATE TYPE "public"."contact_type" AS ENUM('none', 'clients', 'employee', 'external', 'internal', 'others', 'partner', 'providers_rep');--> statement-breakpoint
CREATE TYPE "public"."course_level" AS ENUM('VCE (11-12)', 'Certificate I', 'Certificate II', 'Certificate III', 'Certificate IV', 'Diploma', 'Advanced Diploma', 'Associate Degree', 'Graduate Certificate', 'Graduate Diploma', 'Bachelor Degree', 'Bachelor Honours', 'Masters Degree', 'Doctoral Degree', 'Higher Doctoral Degree', 'ELICOS - General English', 'ELICOS - EAP', 'ELICOS - Exam Prep', 'Professional Year - Accounting', 'Professional Year - IT', 'Professional Year - Engineering', 'Foundation', 'Pathway Program', 'Short Course', 'RQF Entry Level', 'RQF Level 1', 'RQF Level 2', 'RQF Level 3', 'RQF Level 4', 'RQF Level 5', 'RQF Level 6', 'RQF Level 7', 'RQF Level 8', 'NZQF Level 1', 'NZQF Level 2', 'NZQF Level 3', 'NZQF Level 4', 'NZQF Level 5', 'NZQF Level 6', 'NZQF Level 7', 'NZQF Level 8', 'NZQF Level 9', 'NZQF Level 10', 'MQF Level 1', 'MQF Level 2', 'MQF Level 3', 'MQF Foundation', 'MQF Level 4', 'MQF Level 5', 'MQF Level 6', 'MQF Level 7', 'MQF Level 8', 'US Associate Degree', 'US Bachelor Degree', 'US Master Degree', 'US Doctoral Degree', 'US Professional Doctorate', 'Canadian Certificate', 'Canadian Diploma', 'Canadian Advanced Diploma', 'Canadian Associate Degree', 'Canadian Bachelor Degree', 'Canadian Master Degree', 'Canadian Doctoral Degree', 'Canadian CEGEP', 'EQF Level 1', 'EQF Level 2', 'EQF Level 3', 'EQF Level 4', 'EQF Level 5', 'EQF Level 6', 'EQF Level 7', 'EQF Level 8', 'Other');--> statement-breakpoint
CREATE TYPE "public"."discipline" AS ENUM('Accounting, Business & Finance', 'Agriculture & Forestry', 'Applied Sciences & Professions', 'Arts, Design & Architecture', 'Computer Science & IT', 'Education & Training', 'Engineering & Technology', 'Environmental Studies & Earth Sciences', 'Hospitality, Leisure & Sports', 'Humanities', 'Journalism & Media', 'Law', 'Medicine & Health', 'Short Courses', 'Trade');--> statement-breakpoint
CREATE TYPE "public"."english_proficiency_status" AS ENUM('have_score', 'native_speaker', 'planning_test', 'not_required');--> statement-breakpoint
CREATE TYPE "public"."english_test_type" AS ENUM('ielts_academic', 'ielts_general', 'pte_academic', 'toefl_ibt', 'duolingo', 'cambridge', 'oet', 'native_speaker', 'none');--> statement-breakpoint
CREATE TYPE "public"."entry_source" AS ENUM('website', 'consultant', 'sub_agent', 'affiliate', 'import', 'referral', 'facebook_ads', 'walk_in', 'other');--> statement-breakpoint
CREATE TYPE "public"."faq_category" AS ENUM('general', 'students', 'institutions', 'applications', 'visas', 'fees', 'scholarships', 'accommodation');--> statement-breakpoint
CREATE TYPE "public"."fee_period" AS ENUM('annual', 'per_semester', 'per_trimester', 'per_term', 'total');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other', 'prefer_not_to_say');--> statement-breakpoint
CREATE TYPE "public"."import_batch_status" AS ENUM('pending', 'approved', 'rejected', 'failed');--> statement-breakpoint
CREATE TYPE "public"."import_batch_type" AS ENUM('universities', 'courses');--> statement-breakpoint
CREATE TYPE "public"."institution_contact_role" AS ENUM('primary', 'academic', 'finance', 'marketing', 'admissions', 'international', 'other');--> statement-breakpoint
CREATE TYPE "public"."institution_document_category" AS ENUM('application_forms', 'brochures', 'contracts', 'marketing', 'agreements', 'other');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."lead_rating" AS ENUM('cold', 'warm', 'hot');--> statement-breakpoint
CREATE TYPE "public"."lead_stage" AS ENUM('new', 'contacted', 'qualified', 'counselling', 'ready_to_apply', 'converted', 'lost');--> statement-breakpoint
CREATE TYPE "public"."localized_entity_type" AS ENUM('course', 'institution', 'page', 'faq', 'blog', 'visa_requirement', 'testimonial', 'ui_string');--> statement-breakpoint
CREATE TYPE "public"."note_visibility" AS ENUM('public', 'private', 'selected');--> statement-breakpoint
CREATE TYPE "public"."payment_option" AS ENUM('upfront', 'installment');--> statement-breakpoint
CREATE TYPE "public"."pricing_location_type" AS ENUM('all', 'onshore', 'offshore', 'country');--> statement-breakpoint
CREATE TYPE "public"."pricing_model" AS ENUM('fixed', 'dynamic');--> statement-breakpoint
CREATE TYPE "public"."profile_section" AS ENUM('personal', 'passport', 'education', 'language', 'preferences', 'employment', 'funding', 'emergency', 'sop', 'bio');--> statement-breakpoint
CREATE TYPE "public"."provider_type" AS ENUM('University', 'Institution', 'Tafe', 'School');--> statement-breakpoint
CREATE TYPE "public"."publish_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."qualification_framework" AS ENUM('AQF', 'Non-AQF', 'RQF', 'EQF', 'NZQF', 'MQF', 'US', 'Canadian', 'Other');--> statement-breakpoint
CREATE TYPE "public"."qualification_level_category" AS ENUM('primary', 'lower_secondary', 'upper_secondary', 'foundation', 'certificate', 'diploma', 'bachelor', 'postgrad_cert', 'masters', 'doctoral');--> statement-breakpoint
CREATE TYPE "public"."role_scope" AS ENUM('global', 'region', 'branch', 'self');--> statement-breakpoint
CREATE TYPE "public"."scholarship_status" AS ENUM('open', 'not_open_yet', 'closed');--> statement-breakpoint
CREATE TYPE "public"."scholarship_value_type" AS ENUM('percentage', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."scraping_job_status" AS ENUM('pending', 'running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."seo_metadata_entity_type" AS ENUM('course', 'institution', 'blog');--> statement-breakpoint
CREATE TYPE "public"."study_mode" AS ENUM('all', 'weekday', 'weekend', 'online', 'evening', 'full_time', 'part_time');--> statement-breakpoint
CREATE TYPE "public"."tag_applies_to" AS ENUM('courses', 'institutions', 'both');--> statement-breakpoint
CREATE TYPE "public"."tag_category" AS ENUM('feature', 'delivery', 'career', 'skill', 'industry', 'audience', 'type', 'specialization', 'experience', 'location', 'financial', 'accreditation', 'services');--> statement-breakpoint
CREATE TYPE "public"."task_category" AS ENUM('follow_up', 'document_collection', 'application_review', 'communication', 'visa_processing', 'general', 'urgent_action');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('pending', 'in_progress', 'completed', 'cancelled', 'on_hold');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('platform_admin', 'admin', 'student', 'institution_admin');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('unverified', 'pending_verification', 'verified', 'needs_reverification');--> statement-breakpoint
CREATE TABLE "academic_qualification_types" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country" varchar(100) NOT NULL,
	"country_code" varchar(3),
	"name" varchar(255) NOT NULL,
	"full_name" varchar(500),
	"level_category" "qualification_level_category" NOT NULL,
	"grading_scale" varchar(50),
	"grading_type" varchar(50),
	"min_grade" varchar(50),
	"max_grade" varchar(50),
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "acc_bill_payments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "acc_bill_payments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"bill_id" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"paid_on" date NOT NULL,
	"method" varchar(100),
	"reference" varchar(255),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "acc_bills" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "acc_bills_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"category_id" integer,
	"vendor" varchar(255) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'AUD' NOT NULL,
	"issue_date" date NOT NULL,
	"due_date" date NOT NULL,
	"description" text,
	"reference" varchar(255),
	"status" "acc_bill_status" DEFAULT 'unpaid' NOT NULL,
	"region_code" varchar(10),
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "acc_chart_of_accounts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"account_type" "acc_account_type" NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "acc_credit_note_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"credit_note_id" varchar NOT NULL,
	"description" varchar(500) NOT NULL,
	"quantity" numeric(10, 2) DEFAULT '1' NOT NULL,
	"unit_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"amount" numeric(12, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "acc_credit_notes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" varchar NOT NULL,
	"credit_note_number" varchar(30) NOT NULL,
	"issue_date" date NOT NULL,
	"total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "acc_customers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"address" text,
	"currency" varchar(3) DEFAULT 'AUD',
	"crm_contact_id" varchar,
	"institution_id" varchar,
	"student_id" varchar,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "acc_expense_categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "acc_expense_categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"type" varchar(50) DEFAULT 'expense' NOT NULL,
	CONSTRAINT "acc_expense_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "acc_expenses" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "acc_expenses_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"category_id" integer,
	"vendor" varchar(255),
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'AUD' NOT NULL,
	"expense_date" date NOT NULL,
	"description" text,
	"receipt_ref" varchar(255),
	"region_code" varchar(10),
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "acc_invoice_line_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" varchar NOT NULL,
	"item_id" varchar,
	"description" varchar(500) NOT NULL,
	"quantity" numeric(10, 2) DEFAULT '1' NOT NULL,
	"unit_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"amount" numeric(12, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "acc_invoices" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_number" varchar(30) NOT NULL,
	"customer_id" varchar NOT NULL,
	"bill_to_type" "acc_bill_to_type" DEFAULT 'manual' NOT NULL,
	"institution_id" varchar,
	"student_id" varchar,
	"application_id" varchar,
	"issue_date" date NOT NULL,
	"due_date" date NOT NULL,
	"currency" varchar(3) DEFAULT 'AUD' NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"gst_enabled" boolean DEFAULT false,
	"gst_amount" numeric(12, 2) DEFAULT '0',
	"total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"amount_paid" numeric(12, 2) DEFAULT '0',
	"status" "acc_invoice_status" DEFAULT 'draft' NOT NULL,
	"notes" text,
	"terms" text,
	"region_code" varchar(5) DEFAULT 'AU',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "acc_invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "acc_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" varchar(500) NOT NULL,
	"default_price" numeric(12, 2) DEFAULT '0',
	"unit" varchar(50) DEFAULT 'unit',
	"income_account_id" varchar,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "acc_payments_received" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" varchar NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"payment_date" date NOT NULL,
	"method" "acc_payment_method" NOT NULL,
	"reference" varchar(255),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "acc_reminder_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "acc_reminder_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"invoice_id" integer NOT NULL,
	"sent_to" varchar(255) NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"triggered_by" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"user_email" varchar,
	"user_name" varchar,
	"user_profile_picture" varchar,
	"user_type" varchar(20),
	"entity_type" "activity_entity_type" NOT NULL,
	"entity_id" varchar NOT NULL,
	"entity_name" text,
	"action" "activity_action" NOT NULL,
	"action_description" text,
	"changes" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "admin_team_members" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"role" varchar(30) DEFAULT 'support_staff' NOT NULL,
	"is_active" boolean DEFAULT true,
	"invited_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "admin_team_members_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "ai_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"setting_key" varchar(100) NOT NULL,
	"provider" varchar(50) DEFAULT 'openrouter' NOT NULL,
	"model_id" varchar(200) NOT NULL,
	"model_display_name" varchar(200),
	"max_tokens" integer DEFAULT 4096,
	"temperature" real DEFAULT 0.7,
	"updated_by_user_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "ai_settings_setting_key_unique" UNIQUE("setting_key")
);
--> statement-breakpoint
CREATE TABLE "api_key_usage_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key_id" varchar NOT NULL,
	"endpoint" varchar(255) NOT NULL,
	"method" varchar(10) NOT NULL,
	"status_code" integer,
	"resource_type" varchar(50),
	"resource_id" varchar,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"key_hash" varchar(128) NOT NULL,
	"key_prefix" varchar(12) NOT NULL,
	"permissions" text[] DEFAULT ARRAY['institutions:create', 'courses:create', 'institutions:read']::text[],
	"created_by_user_id" varchar NOT NULL,
	"description" text,
	"usage_count" integer DEFAULT 0,
	"last_used_at" timestamp,
	"last_used_ip" varchar(45),
	"rate_limit_per_minute" integer DEFAULT 100,
	"rate_limit_per_hour" integer DEFAULT 1000,
	"is_active" boolean DEFAULT true,
	"expires_at" timestamp,
	"revoked_at" timestamp,
	"revoked_by_user_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "application_courses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" varchar NOT NULL,
	"course_id" varchar NOT NULL,
	"is_primary" boolean DEFAULT false,
	"notes" text,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"added_by" varchar
);
--> statement-breakpoint
CREATE TABLE "application_internal_notes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" varchar NOT NULL,
	"author_id" varchar NOT NULL,
	"content" text NOT NULL,
	"mentioned_user_ids" varchar[],
	"is_pinned" boolean DEFAULT false,
	"visibility" "note_visibility" DEFAULT 'public' NOT NULL,
	"visible_to" text[] DEFAULT '{}'::text[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "application_notes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" varchar NOT NULL,
	"author_id" varchar NOT NULL,
	"content" text NOT NULL,
	"author_role" varchar(20) NOT NULL,
	"is_read_by_student" boolean DEFAULT false,
	"is_read_by_consultant" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "application_profile_snapshots" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" varchar NOT NULL,
	"student_profile_id" varchar NOT NULL,
	"profile_data" jsonb NOT NULL,
	"education_data" jsonb,
	"language_data" jsonb,
	"employment_data" jsonb,
	"verification_status_snapshot" jsonb,
	"snapshot_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "application_stage_documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" varchar NOT NULL,
	"stage" "application_stage" NOT NULL,
	"document_id" varchar,
	"document_type" varchar(50) NOT NULL,
	"document_name" text NOT NULL,
	"document_url" text,
	"is_required" boolean DEFAULT false,
	"is_verified" boolean DEFAULT false,
	"uploaded_by" varchar,
	"uploaded_by_role" varchar(20),
	"uploaded_at" timestamp,
	"verified_by" varchar,
	"verified_at" timestamp,
	"verification_notes" text,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "application_stage_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" varchar NOT NULL,
	"from_stage" "application_stage",
	"to_stage" "application_stage" NOT NULL,
	"changed_by" varchar NOT NULL,
	"changed_by_role" varchar(20) NOT NULL,
	"notes" text,
	"metadata" jsonb,
	"duration_in_stage" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_number" varchar(20),
	"course_id" varchar,
	"student_id" varchar NOT NULL,
	"current_stage" "application_stage" DEFAULT 'Assessment' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"assigned_consultant_id" varchar,
	"assigned_at" timestamp,
	"branch_id" varchar,
	"personal_statement" text,
	"additional_info" text,
	"stage_metadata" jsonb,
	"submitted_at" timestamp,
	"approved_at" timestamp,
	"rejected_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "applications_application_number_unique" UNIQUE("application_number")
);
--> statement-breakpoint
CREATE TABLE "attendance_breaks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attendance_record_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"break_start_at" timestamp DEFAULT now() NOT NULL,
	"break_end_at" timestamp,
	"total_break_minutes" integer
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"branch_id" varchar,
	"clock_in_at" timestamp DEFAULT now() NOT NULL,
	"clock_in_photo_path" varchar NOT NULL,
	"clock_out_at" timestamp,
	"clock_out_photo_path" varchar,
	"total_minutes" integer,
	"work_date" varchar(10) NOT NULL,
	"notes" varchar,
	"ip_address" varchar,
	"location" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blogs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" varchar NOT NULL,
	"title" text NOT NULL,
	"slug" varchar(255) NOT NULL,
	"excerpt" text,
	"content" text NOT NULL,
	"featured_image_url" text,
	"category" varchar(100),
	"post_type" varchar(20) DEFAULT 'blog' NOT NULL,
	"tags" text[],
	"status" "blog_status" DEFAULT 'draft' NOT NULL,
	"meta_title" varchar(60),
	"meta_description" text,
	"og_image_url" text,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "blogs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(20) NOT NULL,
	"region_id" varchar,
	"address" text,
	"city" varchar(100),
	"state" varchar(100),
	"postcode" varchar(20),
	"country" varchar(100),
	"phone" varchar(50),
	"email" varchar(255),
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"is_headquarters" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "branches_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "channel_members" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"role" varchar(20) DEFAULT 'member',
	"joined_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "channel_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" varchar NOT NULL,
	"sender_id" varchar,
	"content" text NOT NULL,
	"file_url" text,
	"file_name" varchar,
	"file_size" integer,
	"file_type" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "channels" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_by_id" varchar,
	"is_private" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chat_conversations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"session_id" varchar,
	"title" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"sources" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" varchar NOT NULL,
	"action" varchar(50) NOT NULL,
	"field_name" varchar(100),
	"old_value" text,
	"new_value" text,
	"description" text,
	"changed_by_user_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact_inquiries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inquiry_type" "contact_inquiry_type" NOT NULL,
	"status" "contact_inquiry_status" DEFAULT 'new' NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"message" text NOT NULL,
	"student_name" varchar(255),
	"country" varchar(100),
	"course_interest" varchar(255),
	"study_level" varchar(100),
	"visa_status" varchar(100),
	"institution_name" varchar(255),
	"contact_person" varchar(255),
	"website" varchar(255),
	"partnership_type" varchar(100),
	"ip_address" varchar(45),
	"user_agent" text,
	"referrer" text,
	"assigned_to" varchar,
	"notes" text,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact_notes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" varchar NOT NULL,
	"title" text,
	"content" text NOT NULL,
	"mentions" text[] DEFAULT '{}'::text[],
	"visibility" "note_visibility" DEFAULT 'public' NOT NULL,
	"visible_to" text[] DEFAULT '{}'::text[],
	"created_by_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact_status_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" varchar NOT NULL,
	"from_status" "client_status",
	"to_status" "client_status" NOT NULL,
	"changed_by" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact_submissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"category" varchar(50) DEFAULT 'general' NOT NULL,
	"subject" varchar(200) NOT NULL,
	"message" text NOT NULL,
	"status" varchar(20) DEFAULT 'new' NOT NULL,
	"priority" varchar(20) DEFAULT 'medium',
	"assigned_to" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "content_snippets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snippet_key" varchar(100) NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"content_html" text,
	"status" "cms_status" DEFAULT 'draft' NOT NULL,
	"page_location" varchar(100),
	"section_name" varchar(100),
	"version" integer DEFAULT 1,
	"previous_version_id" varchar,
	"created_by_id" varchar,
	"updated_by_id" varchar,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "content_snippets_snippet_key_unique" UNIQUE("snippet_key")
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant1_id" varchar NOT NULL,
	"participant2_id" varchar NOT NULL,
	"last_message_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "course_comparisons" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_profile_id" varchar NOT NULL,
	"course_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "course_english_requirements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" varchar NOT NULL,
	"test_type" varchar(20) NOT NULL,
	"min_overall_score" numeric(4, 1) NOT NULL,
	"min_listening_score" numeric(4, 1),
	"min_reading_score" numeric(4, 1),
	"min_writing_score" numeric(4, 1),
	"min_speaking_score" numeric(4, 1),
	"notes" text,
	"is_preferred" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "course_entry_requirements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" varchar NOT NULL,
	"qualification_type_id" varchar NOT NULL,
	"min_grade" varchar(100),
	"custom_notes" text,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "course_qual_unique" UNIQUE("course_id","qualification_type_id")
);
--> statement-breakpoint
CREATE TABLE "course_intake_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" varchar NOT NULL,
	"month" integer NOT NULL,
	"start_day" integer DEFAULT 1 NOT NULL,
	"deadline_weeks_before" integer DEFAULT 8 NOT NULL,
	"open_months_before" integer DEFAULT 6 NOT NULL,
	"intake_name" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "course_level_requirement_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_level" "course_level" NOT NULL,
	"institution_country" varchar(100) NOT NULL,
	"qualification_type_id" varchar NOT NULL,
	"min_grade" varchar(100),
	"display_label" varchar(255),
	"display_order" integer DEFAULT 0,
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "course_pricing_config" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" varchar NOT NULL,
	"pricing_model" "pricing_model" DEFAULT 'fixed' NOT NULL,
	"fee_period" "fee_period" DEFAULT 'annual',
	"enable_payment_options" boolean DEFAULT false,
	"enable_study_modes" boolean DEFAULT false,
	"enable_location_pricing" boolean DEFAULT false,
	"installment_count" integer DEFAULT 6,
	"first_payment_amount" numeric(10, 2),
	"installment_fee" numeric(10, 2) DEFAULT '0',
	"admission_fee_included" numeric(10, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "course_pricing_config_unique_course" UNIQUE("course_id")
);
--> statement-breakpoint
CREATE TABLE "course_pricing_tiers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" varchar NOT NULL,
	"payment_option" "payment_option" DEFAULT 'upfront' NOT NULL,
	"study_mode" "study_mode" DEFAULT 'all' NOT NULL,
	"location_type" "pricing_location_type" DEFAULT 'all' NOT NULL,
	"country" varchar(100),
	"is_default_price" boolean DEFAULT false,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'AUD' NOT NULL,
	"label" text,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "course_recommendations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_profile_id" varchar NOT NULL,
	"course_id" varchar NOT NULL,
	"match_score" numeric(5, 2) NOT NULL,
	"rationale" text,
	"match_factors" jsonb,
	"meets_age_requirement" boolean,
	"meets_academic_requirement" boolean,
	"meets_english_requirement" boolean,
	"eligibility_notes" text,
	"is_active" boolean DEFAULT true,
	"refreshed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "course_region_variants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" varchar NOT NULL,
	"region_id" varchar NOT NULL,
	"pathway_id" varchar,
	"tuition_fee" numeric(12, 2),
	"tuition_currency" varchar(3) DEFAULT 'AUD',
	"application_fee" numeric(10, 2),
	"cost_of_living" numeric(10, 2),
	"scholarship_min" integer,
	"scholarship_max" integer,
	"english_requirements" jsonb,
	"academic_requirements" text,
	"minimum_age" integer,
	"eligibility_notes" text,
	"visa_requirement_id" varchar,
	"is_available" boolean DEFAULT true,
	"availability_notes" text,
	"effective_from" date,
	"effective_to" date,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "course_region_pathway_unique" UNIQUE("course_id","region_id","pathway_id")
);
--> statement-breakpoint
CREATE TABLE "course_scholarships" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" varchar NOT NULL,
	"scholarship_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "course_scholarship_unique" UNIQUE("course_id","scholarship_id")
);
--> statement-breakpoint
CREATE TABLE "course_specializations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sub_discipline_id" varchar NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "course_specializations_sub_discipline_slug_unique" UNIQUE("sub_discipline_id","slug")
);
--> statement-breakpoint
CREATE TABLE "course_tags" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" varchar NOT NULL,
	"tag_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "course_tag_unique" UNIQUE("course_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"university_id" varchar NOT NULL,
	"title" text NOT NULL,
	"slug" varchar(255),
	"description" text,
	"subject" text NOT NULL,
	"discipline" "discipline",
	"sub_discipline_id" varchar,
	"specialization" text,
	"qualification_framework" "qualification_framework" DEFAULT 'AQF',
	"level" "course_level" NOT NULL,
	"custom_level" text,
	"duration" text,
	"duration_months" integer,
	"duration_weeks" integer,
	"fees" numeric(10, 2),
	"currency" varchar(3) DEFAULT 'AUD',
	"location" text,
	"country" text,
	"start_date" text,
	"application_deadline" text,
	"prerequisites" text,
	"thumbnail_url" text,
	"thumbnail_status" varchar(20) DEFAULT 'none',
	"thumbnail_generated_at" timestamp,
	"course_code" text,
	"pr_pathway" boolean DEFAULT false,
	"eligibility_requirements" text,
	"english_requirements" text,
	"curriculum_url" text,
	"source_url" text,
	"cost_of_living" numeric(10, 2),
	"application_fees" numeric(10, 2),
	"images" text[],
	"intakes" text[],
	"study_areas" text[],
	"career_outcomes" text[],
	"career_path" text,
	"pathways" text[],
	"minimum_age" integer,
	"english_requirements_structured" jsonb,
	"delivery_mode" text,
	"campus_locations" text[],
	"internship_available" boolean,
	"internship_details" text,
	"approval_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"submitted_for_approval_at" timestamp,
	"approved_at" timestamp,
	"approved_by" varchar,
	"publish_status" varchar(20) DEFAULT 'draft' NOT NULL,
	"visibility" varchar(20) DEFAULT 'public' NOT NULL,
	"published_at" timestamp,
	"published_by_user_id" varchar,
	"created_by_user_id" varchar,
	"updated_by_user_id" varchar,
	"assigned_to_user_id" varchar,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "courses_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "crm_contacts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"photo" text,
	"contact_type" "contact_type" DEFAULT 'none' NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"preferred_name" text,
	"gender" "gender",
	"email" text NOT NULL,
	"mobile" text,
	"phone" text,
	"whatsapp" text,
	"nationality" text,
	"country" text,
	"city" text,
	"client_status" "client_status" DEFAULT 'lead',
	"lead_stage" "lead_stage" DEFAULT 'new',
	"entry_source" "entry_source" DEFAULT 'consultant',
	"lead_rating" "lead_rating" DEFAULT 'cold',
	"region_id" varchar,
	"branch_id" varchar,
	"unit_no" text,
	"street" text,
	"suburb" text,
	"state" text,
	"postcode" text,
	"emergency_contact_relationship" text,
	"emergency_contact_name" text,
	"emergency_contact_mobile" text,
	"emergency_contact_address" text,
	"contact_owner" varchar,
	"assigned_to" varchar,
	"workdrive_folder_url" text,
	"workdrive_folder_id" text,
	"first_visit" timestamp,
	"visitor_score" integer,
	"referrer" text,
	"average_time_spent" integer,
	"most_recent_visit" timestamp,
	"first_page_visited" text,
	"number_of_chats" integer DEFAULT 0,
	"days_visited" integer DEFAULT 0,
	"course_name" text,
	"course_url" text,
	"interested_in" text,
	"course_id" varchar,
	"university_id" varchar,
	"best_time_to_contact" text,
	"ielts_score" text,
	"preferred_institution" text,
	"language_stream" text,
	"program_discipline" text,
	"scheduled_appointment" timestamp,
	"where_to_study" text,
	"program_type" text,
	"subject_to_study" text,
	"visa_status" varchar(100),
	"reference_source" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"utm_term" text,
	"utm_content" text,
	"fb_ad_account" text,
	"fb_lead_form" text,
	"fb_ad_account_id" text,
	"fb_lead_form_id" text,
	"fb_ad_campaign" text,
	"company_name" text,
	"job_title" text,
	"department" text,
	"linked_account_id" varchar,
	"linked_account_name" text,
	"linked_user_id" varchar,
	"notes" text,
	"created_by_user_id" varchar,
	"updated_by_user_id" varchar,
	"last_activity_time" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "discovered_course_urls" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" varchar NOT NULL,
	"url" text NOT NULL,
	"discovered_at" timestamp DEFAULT now(),
	"discovery_method" text,
	"page_title" text,
	"extraction_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"extracted_at" timestamp,
	"extraction_error" text,
	"scraped_course_id" varchar,
	"is_likely_course" boolean DEFAULT true,
	"confidence_score" real,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_comments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"content" text NOT NULL,
	"is_internal" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_folders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"parent_folder_id" varchar,
	"owner_id" varchar NOT NULL,
	"owner_type" varchar(20) NOT NULL,
	"student_profile_id" varchar,
	"university_id" varchar,
	"color" varchar(7),
	"icon" varchar(50),
	"is_default" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requested_by" varchar NOT NULL,
	"university_id" varchar NOT NULL,
	"student_id" varchar NOT NULL,
	"student_profile_id" varchar NOT NULL,
	"application_id" varchar,
	"document_type" varchar(50) NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"priority" varchar(20) DEFAULT 'medium',
	"due_date" timestamp,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"document_id" varchar,
	"request_notes" text,
	"response_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"file_path" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer,
	"mime_type" varchar(100),
	"sender_id" varchar NOT NULL,
	"sender_type" varchar(20) NOT NULL,
	"recipient_id" varchar,
	"recipient_type" varchar(20),
	"application_id" varchar,
	"university_id" varchar,
	"student_profile_id" varchar,
	"folder_id" varchar,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"review_notes" text,
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_account_access" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" varchar NOT NULL,
	"admin_user_id" varchar NOT NULL,
	"can_send" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_account_access_account_id_admin_user_id_unique" UNIQUE("account_id","admin_user_id")
);
--> statement-breakpoint
CREATE TABLE "email_account_secrets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" varchar NOT NULL,
	"app_password" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_accounts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" varchar(100) NOT NULL,
	"display_name" varchar(100),
	"email" varchar(255) NOT NULL,
	"account_type" varchar(20) DEFAULT 'group' NOT NULL,
	"imap_host" varchar(255) NOT NULL,
	"imap_port" integer DEFAULT 993 NOT NULL,
	"smtp_host" varchar(255) NOT NULL,
	"smtp_port" integer DEFAULT 465 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"region_code" varchar(10),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_accounts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "email_body_cache" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uid" varchar(50) NOT NULL,
	"account" varchar(255) NOT NULL,
	"folder" varchar(255) DEFAULT 'INBOX' NOT NULL,
	"html_body" text,
	"text_body" text,
	"raw_headers" text,
	"attachments_meta" text,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_body_cache_uid_account_folder_unique" UNIQUE("uid","account","folder")
);
--> statement-breakpoint
CREATE TABLE "email_cache" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uid" varchar(50) NOT NULL,
	"account" varchar(255) NOT NULL,
	"folder" varchar(255) DEFAULT 'INBOX' NOT NULL,
	"from_address" varchar(500),
	"from_name" varchar(255),
	"to_addresses" text,
	"subject" varchar(1000),
	"snippet" text,
	"sent_at" timestamp,
	"is_read" boolean DEFAULT false NOT NULL,
	"is_starred" boolean DEFAULT false NOT NULL,
	"has_attachments" boolean DEFAULT false NOT NULL,
	"thread_id" varchar(255),
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_cache_uid_account_folder_unique" UNIQUE("uid","account","folder")
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_type" varchar(50) NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"subject_template" text NOT NULL,
	"body_template" text NOT NULL,
	"available_variables" jsonb DEFAULT '[]'::jsonb,
	"is_custom" boolean DEFAULT false NOT NULL,
	"updated_by" varchar,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "email_templates_notification_type_unique" UNIQUE("notification_type")
);
--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"category" "faq_category" DEFAULT 'general' NOT NULL,
	"status" "cms_status" DEFAULT 'draft' NOT NULL,
	"display_order" integer DEFAULT 0,
	"show_on_page" text[],
	"created_by_id" varchar,
	"updated_by_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_profile_id" varchar NOT NULL,
	"item_type" varchar(20) NOT NULL,
	"item_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "follow_up_reminders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" varchar,
	"application_id" varchar,
	"user_id" varchar NOT NULL,
	"reminder_at" timestamp NOT NULL,
	"message" text,
	"is_completed" boolean DEFAULT false,
	"completed_at" timestamp,
	"notification_sent" boolean DEFAULT false,
	"notification_sent_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "global_notification_defaults" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_type" varchar(50) NOT NULL,
	"role" varchar(50) NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"in_app_enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "import_batch_type" NOT NULL,
	"status" "import_batch_status" DEFAULT 'pending' NOT NULL,
	"uploaded_by" varchar NOT NULL,
	"file_name" text NOT NULL,
	"raw_csv_text" text NOT NULL,
	"raw_data" jsonb NOT NULL,
	"validation_errors" jsonb,
	"error_count" integer DEFAULT 0,
	"valid_count" integer DEFAULT 0,
	"imported_count" integer DEFAULT 0,
	"total_count" integer NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "institution_business_terms" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution_id" varchar NOT NULL,
	"commission_percentage" numeric(5, 2),
	"bonus_structure" text,
	"contract_start_date" date,
	"contract_end_date" date,
	"contract_status" varchar(20) DEFAULT 'active',
	"payment_terms" text,
	"payment_frequency" varchar(20),
	"bank_details" text,
	"special_conditions" text,
	"internal_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by_user_id" varchar,
	"updated_by_user_id" varchar,
	CONSTRAINT "institution_business_terms_institution_id_unique" UNIQUE("institution_id")
);
--> statement-breakpoint
CREATE TABLE "institution_contacts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution_id" varchar NOT NULL,
	"contact_id" varchar NOT NULL,
	"contact_role" "institution_contact_role" DEFAULT 'other' NOT NULL,
	"role_title" text,
	"department" text,
	"is_primary" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by_user_id" varchar,
	CONSTRAINT "institution_contacts_unique" UNIQUE("institution_id","contact_id")
);
--> statement-breakpoint
CREATE TABLE "institution_documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution_id" varchar NOT NULL,
	"file_name" text NOT NULL,
	"original_file_name" text NOT NULL,
	"file_path" text NOT NULL,
	"file_size" integer,
	"mime_type" varchar(100),
	"category" "institution_document_category" DEFAULT 'other' NOT NULL,
	"description" text,
	"is_confidential" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"uploaded_by_user_id" varchar
);
--> statement-breakpoint
CREATE TABLE "institution_tags" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution_id" varchar NOT NULL,
	"tag_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "institution_tag_unique" UNIQUE("institution_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"role_id" varchar NOT NULL,
	"profile_id" varchar,
	"user_type" varchar(20) DEFAULT 'admin' NOT NULL,
	"region_id" varchar,
	"branch_id" varchar,
	"token_hash" varchar NOT NULL,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"invited_by_id" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"revoked_at" timestamp,
	"note" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "localized_content" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" "localized_entity_type" NOT NULL,
	"entity_id" varchar NOT NULL,
	"locale" varchar(10) NOT NULL,
	"content" jsonb NOT NULL,
	"is_auto_translated" boolean DEFAULT false,
	"is_reviewed" boolean DEFAULT false,
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"source_locale" varchar(10) DEFAULT 'en',
	"translated_at" timestamp,
	"translated_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "entity_locale_unique" UNIQUE("entity_type","entity_id","locale")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar NOT NULL,
	"sender_id" varchar NOT NULL,
	"content" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"file_url" text,
	"file_name" text,
	"file_size" integer,
	"file_type" varchar(100),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"link" text,
	"metadata" jsonb,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource" varchar(50) NOT NULL,
	"action" varchar(50) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "permissions_resource_action_unique" UNIQUE("resource","action")
);
--> statement-breakpoint
CREATE TABLE "profile_change_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_profile_id" varchar NOT NULL,
	"section" "profile_section" NOT NULL,
	"field_name" text NOT NULL,
	"old_value" text,
	"new_value" text,
	"changed_at" timestamp DEFAULT now(),
	"changed_by" varchar,
	"change_reason" text
);
--> statement-breakpoint
CREATE TABLE "profile_permissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" varchar NOT NULL,
	"module" varchar(50) NOT NULL,
	"can_create" boolean DEFAULT false,
	"can_read" boolean DEFAULT false,
	"can_update" boolean DEFAULT false,
	"can_delete" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "profile_permissions_unique" UNIQUE("profile_id","module")
);
--> statement-breakpoint
CREATE TABLE "profile_section_verifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_profile_id" varchar NOT NULL,
	"section" "profile_section" NOT NULL,
	"status" "verification_status" DEFAULT 'unverified' NOT NULL,
	"verified_at" timestamp,
	"verified_by" varchar,
	"verifier_notes" text,
	"last_updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "profile_section_verifications_student_profile_id_section_unique" UNIQUE("student_profile_id","section")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"description" text,
	"is_system_profile" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "profiles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "public_team_members" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" varchar(255) NOT NULL,
	"bio" text,
	"image_url" text,
	"linkedin_url" text,
	"twitter_url" text,
	"email_address" varchar(255),
	"display_order" integer DEFAULT 0,
	"status" "cms_status" DEFAULT 'draft' NOT NULL,
	"is_featured" boolean DEFAULT false,
	"created_by_id" varchar,
	"updated_by_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "qualification_equivalencies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_qualification_id" varchar NOT NULL,
	"target_qualification_id" varchar NOT NULL,
	"source_grade_min" varchar(50) NOT NULL,
	"source_grade_max" varchar(50),
	"target_equivalent" varchar(100) NOT NULL,
	"confidence_level" varchar(20) DEFAULT 'standard',
	"notes" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "referral_invitations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_id" varchar NOT NULL,
	"invitee_name" text NOT NULL,
	"invitee_email" text NOT NULL,
	"referral_code" varchar(10) NOT NULL,
	"status" varchar(20) DEFAULT 'invited' NOT NULL,
	"email_sent_at" timestamp,
	"registered_at" timestamp,
	"registered_student_id" varchar,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_id" varchar NOT NULL,
	"referred_id" varchar NOT NULL,
	"referral_code" varchar(10) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"bonus_amount" numeric(10, 2),
	"bonus_currency" varchar(3) DEFAULT 'AUD',
	"bonus_paid_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(10) NOT NULL,
	"name" text NOT NULL,
	"domain_pattern" text,
	"primary_domain" text,
	"default_locale" varchar(10) DEFAULT 'en',
	"supported_locales" text[],
	"default_currency" varchar(3) DEFAULT 'AUD',
	"currency_symbol" varchar(5) DEFAULT '$',
	"timezone" varchar(50),
	"flag_emoji" varchar(10),
	"flag_url" text,
	"parent_region_id" varchar,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "regions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" varchar NOT NULL,
	"permission_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "role_permissions_unique" UNIQUE("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"description" text,
	"user_type" varchar(20) NOT NULL,
	"hierarchy_level" integer DEFAULT 100,
	"default_scope" "role_scope" DEFAULT 'branch',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "saved_filters" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" varchar(100) NOT NULL,
	"panel_type" varchar(20) NOT NULL,
	"filters" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scholarships" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution_id" varchar NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"value_type" "scholarship_value_type" NOT NULL,
	"value" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'AUD',
	"status" "scholarship_status" DEFAULT 'open' NOT NULL,
	"start_date" date,
	"end_date" date,
	"eligibility" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scraped_courses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" varchar NOT NULL,
	"institution_id" varchar,
	"source_url" text NOT NULL,
	"extracted_at" timestamp DEFAULT now(),
	"confidence" numeric(3, 2),
	"warnings" text[],
	"title" text,
	"description" text,
	"subject" text,
	"discipline" text,
	"sub_discipline" text,
	"level" text,
	"duration" text,
	"duration_months" integer,
	"duration_weeks" integer,
	"fees" numeric(10, 2),
	"currency" varchar(3),
	"location" text,
	"country" text,
	"start_date" text,
	"application_deadline" text,
	"prerequisites" text,
	"thumbnail_url" text,
	"course_code" text,
	"pr_pathway" boolean,
	"eligibility_requirements" text,
	"english_requirements" text,
	"curriculum_url" text,
	"cost_of_living" numeric(10, 2),
	"application_fees" numeric(10, 2),
	"images" text[],
	"intakes" text[],
	"study_areas" text[],
	"career_outcomes" text[],
	"career_path" text,
	"pathways" text[],
	"minimum_age" integer,
	"english_requirements_structured" jsonb,
	"delivery_mode" text,
	"campus_locations" text[],
	"internship_available" boolean,
	"internship_details" text,
	"review_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"reviewed_at" timestamp,
	"reviewed_by" varchar,
	"review_notes" text,
	"approved_course_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scraped_institutions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" varchar NOT NULL,
	"source_url" text NOT NULL,
	"extracted_at" timestamp DEFAULT now(),
	"confidence" numeric(3, 2),
	"warnings" text[],
	"name" text,
	"description" text,
	"overview" text,
	"small_description" text,
	"full_description" text,
	"location" text,
	"country" text,
	"established_year" integer,
	"logo" text,
	"website" text,
	"provider_type" text,
	"contact_email" text,
	"contact_phone" text,
	"top_disciplines" text[],
	"top_courses" text[],
	"number_of_campuses" integer,
	"campus_addresses" jsonb,
	"scholarship_percentage_min" integer,
	"scholarship_percentage_max" integer,
	"tuition_fees_min" numeric(10, 2),
	"tuition_fees_max" numeric(10, 2),
	"tuition_currency" varchar(3),
	"delivery_modes" text[],
	"intake_periods" text[],
	"accreditation_status" text,
	"ranking_band" text,
	"facilities" text[],
	"international_student_support" boolean,
	"tags" text[],
	"institution_gallery" text[],
	"review_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"reviewed_at" timestamp,
	"reviewed_by" varchar,
	"review_notes" text,
	"approved_institution_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scraping_jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution_id" varchar,
	"institution_url" text NOT NULL,
	"institution_name" text,
	"status" "scraping_job_status" DEFAULT 'pending' NOT NULL,
	"use_auto_discovery" boolean DEFAULT false,
	"discovered_course_listing_url" text,
	"discovery_method" text,
	"discovery_confidence" real,
	"use_full_website_crawl" boolean DEFAULT false,
	"extract_institution_data" boolean DEFAULT false,
	"template_id" varchar,
	"progress" integer DEFAULT 0,
	"total_pages" integer DEFAULT 0,
	"scraped_pages" integer DEFAULT 0,
	"courses_found" integer DEFAULT 0,
	"courses_extracted" integer DEFAULT 0,
	"error_message" text,
	"error_details" jsonb,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"created_by" varchar
);
--> statement-breakpoint
CREATE TABLE "scraping_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"platform_type" text,
	"selectors" jsonb,
	"use_browser" boolean DEFAULT false,
	"wait_for_selector" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "seo_metadata" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" "seo_metadata_entity_type" NOT NULL,
	"entity_id" varchar(255) NOT NULL,
	"meta_title" varchar(60) NOT NULL,
	"meta_description" text NOT NULL,
	"og_title" varchar(100),
	"og_description" text,
	"og_image_url" text,
	"canonical_url" text,
	"focus_keywords" text[],
	"is_ai_generated" boolean DEFAULT false,
	"ai_model" varchar(100),
	"ai_prompt" text,
	"generated_at" timestamp,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"approved_by" varchar,
	"approved_at" timestamp,
	"created_by_id" varchar,
	"updated_by_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"setting_key" varchar(100) NOT NULL,
	"setting_value" text,
	"setting_type" varchar(50) DEFAULT 'text' NOT NULL,
	"category" varchar(100) DEFAULT 'general' NOT NULL,
	"label" varchar(255) NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT true,
	"updated_by_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "site_settings_setting_key_unique" UNIQUE("setting_key")
);
--> statement-breakpoint
CREATE TABLE "student_educations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_profile_id" varchar NOT NULL,
	"qualification_type_id" varchar,
	"level" varchar(50),
	"country" text,
	"institution" text,
	"field_of_study" text,
	"year_completed" integer,
	"start_date" date,
	"end_date" date,
	"is_currently_studying" boolean DEFAULT false,
	"gpa" numeric(5, 2),
	"grade_scale" varchar(20),
	"grade_result" varchar(50),
	"document_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "student_employments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_profile_id" varchar NOT NULL,
	"job_title" varchar(100) NOT NULL,
	"company" text NOT NULL,
	"industry" varchar(100),
	"employment_type" varchar(30),
	"country" text,
	"city" text,
	"start_date" date,
	"end_date" date,
	"is_currently_working" boolean DEFAULT false,
	"responsibilities" text,
	"achievements" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "student_language_scores" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_profile_id" varchar NOT NULL,
	"test_type" varchar(20) NOT NULL,
	"overall_score" numeric(4, 1) NOT NULL,
	"listening_score" numeric(4, 1),
	"reading_score" numeric(4, 1),
	"writing_score" numeric(4, 1),
	"speaking_score" numeric(4, 1),
	"test_date" date,
	"expiry_date" date,
	"document_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "student_pathways" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"requires_visa" boolean DEFAULT false,
	"location_description" text,
	"is_active" boolean DEFAULT true,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "student_pathways_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "student_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"first_name" text,
	"last_name" text,
	"preferred_name" text,
	"gender" "gender",
	"marital_status" text,
	"spouse_first_name" text,
	"spouse_last_name" text,
	"spouse_date_of_birth" date,
	"spouse_nationality" text,
	"spouse_country_of_birth" text,
	"spouse_passport_number" text,
	"spouse_is_accompanying" boolean DEFAULT false,
	"phone" varchar(20),
	"whatsapp" varchar(20),
	"date_of_birth" date,
	"nationality" text,
	"profile_image_url" text,
	"unit_no" text,
	"street" text,
	"suburb" text,
	"city" text,
	"state" text,
	"postcode" varchar(20),
	"country" text,
	"bio" text,
	"education_level" text,
	"field_of_study" text,
	"career_goals" text,
	"previous_education" text,
	"current_country" text,
	"is_in_australia" boolean DEFAULT false,
	"australian_visa_type" "australian_visa_type",
	"visa_expiry_date" date,
	"visa_conditions" text,
	"passport_number" text,
	"passport_country" text,
	"passport_issued_date" date,
	"passport_expiry_date" date,
	"passport_issuing_authority" text,
	"destination_country" text,
	"highest_qualification_type_id" varchar,
	"qualification_grade" text,
	"qualification_grading_type" text,
	"graduation_year" integer,
	"qualification_institution" text,
	"qualification_country" text,
	"english_proficiency_status" "english_proficiency_status",
	"english_test_scores" jsonb,
	"has_english_test" boolean DEFAULT false,
	"preferred_discipline" "discipline",
	"preferred_course_level" "course_level",
	"preferred_study_mode" "study_mode",
	"preferred_intakes" text[],
	"budget_min" numeric(10, 2),
	"budget_max" numeric(10, 2),
	"budget_currency" varchar(3) DEFAULT 'AUD',
	"pr_pathway_interest" boolean DEFAULT false,
	"has_passport" boolean DEFAULT false,
	"has_work_experience" boolean DEFAULT false,
	"work_experience_years" integer,
	"work_experience_industry" text,
	"profile_wizard_step" integer DEFAULT 1,
	"profile_completion_percentage" integer DEFAULT 0,
	"referral_code" varchar(10),
	"referred_by_code" varchar(10),
	"bank_account_holder_name" text,
	"bank_name" text,
	"bank_bsb_code" varchar(10),
	"bank_account_number" varchar(20),
	"funding_source" varchar(30),
	"sponsor_name" text,
	"sponsor_relationship" text,
	"sponsor_occupation" text,
	"sponsor_phone" varchar(50),
	"sponsor_email" text,
	"sponsor_address" text,
	"statement_of_purpose" text,
	"emergency_contact_name" text,
	"emergency_contact_mobile" varchar(50),
	"emergency_contact_relationship" text,
	"emergency_contact_address" text,
	"max_application_slots" integer DEFAULT 3 NOT NULL,
	"welcome_email_sent" boolean DEFAULT false,
	"last_reminder_sent_at" timestamp,
	"reminder_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "student_profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "student_profiles_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "sub_disciplines" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discipline" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "sub_disciplines_discipline_slug_unique" UNIQUE("discipline","slug")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"category" "tag_category" NOT NULL,
	"applies_to" "tag_applies_to" DEFAULT 'courses' NOT NULL,
	"description" text,
	"color" varchar(7),
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "task_notes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" varchar NOT NULL,
	"author_id" varchar,
	"content" text NOT NULL,
	"mentioned_user_ids" varchar[],
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" "task_category" DEFAULT 'general' NOT NULL,
	"priority" "task_priority" DEFAULT 'medium' NOT NULL,
	"status" "task_status" DEFAULT 'pending' NOT NULL,
	"assigned_to_id" varchar,
	"assigned_by_name" text,
	"application_id" varchar,
	"student_profile_id" varchar,
	"related_stage" "application_stage",
	"due_date" timestamp,
	"completed_at" timestamp,
	"sla_warning_hours" integer DEFAULT 24,
	"sla_critical_hours" integer DEFAULT 4,
	"created_by_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_name" varchar(255) NOT NULL,
	"student_location" varchar(255),
	"student_country" varchar(100),
	"institution" varchar(255),
	"course" varchar(255),
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"image_url" text,
	"rating" integer DEFAULT 5,
	"status" "cms_status" DEFAULT 'draft' NOT NULL,
	"display_order" integer DEFAULT 0,
	"is_featured" boolean DEFAULT false,
	"show_on_page" text[],
	"created_by_id" varchar,
	"updated_by_id" varchar,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "universities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"name" text NOT NULL,
	"slug" varchar(255),
	"description" text,
	"logo" text,
	"website" text,
	"country" text,
	"established_year" integer,
	"contact_email" text,
	"contact_phone" text,
	"number_of_campuses" integer,
	"provider_type" "provider_type",
	"scholarship_percentage_min" integer,
	"scholarship_percentage_max" integer,
	"top_disciplines" text[],
	"small_description" text,
	"full_description" text,
	"institution_gallery" text[],
	"top_courses" text[],
	"campus_addresses" jsonb,
	"rto_number" varchar(20),
	"cricos_provider_code" varchar(10),
	"tags" text[],
	"approval_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"submitted_for_approval_at" timestamp,
	"approved_at" timestamp,
	"approved_by" varchar,
	"publish_status" varchar(20) DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"published_by_user_id" varchar,
	"visibility" varchar(20) DEFAULT 'public' NOT NULL,
	"created_by_user_id" varchar,
	"updated_by_user_id" varchar,
	"assigned_to_user_id" varchar,
	"tuition_fees_min" numeric(10, 2),
	"tuition_fees_max" numeric(10, 2),
	"tuition_currency" varchar(3),
	"delivery_modes" text[],
	"intake_periods" text[],
	"accreditation_status" text,
	"ranking_band" text,
	"facilities" text[],
	"international_student_support" boolean,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "universities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "university_team_members" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"university_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"role" varchar(30) DEFAULT 'course_manager' NOT NULL,
	"is_active" boolean DEFAULT true,
	"invited_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_notification_overrides" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"notification_type" varchar(50) NOT NULL,
	"email_enabled" boolean,
	"in_app_enabled" boolean,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"password" varchar,
	"email_verified" boolean DEFAULT false,
	"verification_token" varchar,
	"verification_token_expiry" timestamp,
	"reset_password_token" varchar,
	"reset_password_expiry" timestamp,
	"first_name" varchar,
	"last_name" varchar,
	"phone" varchar(50),
	"date_of_birth" date,
	"address_line_1" varchar(255),
	"address_line_2" varchar(255),
	"city" varchar(100),
	"state_province" varchar(100),
	"postal_code" varchar(20),
	"country" varchar(100),
	"emergency_first_name" varchar(100),
	"emergency_last_name" varchar(100),
	"emergency_mobile" varchar(50),
	"emergency_email" varchar(255),
	"emergency_relationship" varchar(100),
	"profile_image_url" varchar,
	"user_type" varchar(20) DEFAULT 'student' NOT NULL,
	"role" varchar(50) DEFAULT 'user',
	"role_id" varchar,
	"profile_id" varchar,
	"region_id" varchar,
	"branch_id" varchar,
	"availability_status" "availability_status" DEFAULT 'available',
	"custom_status_text" varchar(100),
	"last_status_update" timestamp,
	"is_active" boolean DEFAULT true,
	"last_login" timestamp,
	"requires_password_reset" boolean DEFAULT false,
	"temp_password_issued_at" timestamp,
	"approval_status" "approval_status",
	"approved_by" varchar,
	"approved_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "visa_requirements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"region_id" varchar NOT NULL,
	"pathway_id" varchar,
	"visa_type" varchar(100),
	"visa_name" text NOT NULL,
	"description" text,
	"processing_time" varchar(100),
	"application_fee" numeric(10, 2),
	"fee_currency" varchar(3) DEFAULT 'AUD',
	"required_documents" text[],
	"financial_requirements" text,
	"health_requirements" text,
	"english_requirements" text,
	"work_rights_included" boolean DEFAULT false,
	"work_rights_details" text,
	"official_url" text,
	"application_url" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "visa_region_pathway_unique" UNIQUE("region_id","pathway_id")
);
--> statement-breakpoint
ALTER TABLE "acc_bill_payments" ADD CONSTRAINT "acc_bill_payments_bill_id_acc_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."acc_bills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acc_bills" ADD CONSTRAINT "acc_bills_category_id_acc_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."acc_expense_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acc_customers" ADD CONSTRAINT "acc_customers_institution_id_universities_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."universities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acc_customers" ADD CONSTRAINT "acc_customers_student_id_student_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acc_expenses" ADD CONSTRAINT "acc_expenses_category_id_acc_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."acc_expense_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acc_invoices" ADD CONSTRAINT "acc_invoices_institution_id_universities_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."universities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acc_invoices" ADD CONSTRAINT "acc_invoices_student_id_student_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acc_invoices" ADD CONSTRAINT "acc_invoices_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_team_members" ADD CONSTRAINT "admin_team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_team_members" ADD CONSTRAINT "admin_team_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key_usage_logs" ADD CONSTRAINT "api_key_usage_logs_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_revoked_by_user_id_users_id_fk" FOREIGN KEY ("revoked_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_courses" ADD CONSTRAINT "application_courses_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_courses" ADD CONSTRAINT "application_courses_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_courses" ADD CONSTRAINT "application_courses_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_internal_notes" ADD CONSTRAINT "application_internal_notes_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_internal_notes" ADD CONSTRAINT "application_internal_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_notes" ADD CONSTRAINT "application_notes_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_notes" ADD CONSTRAINT "application_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_profile_snapshots" ADD CONSTRAINT "application_profile_snapshots_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_profile_snapshots" ADD CONSTRAINT "application_profile_snapshots_student_profile_id_student_profiles_id_fk" FOREIGN KEY ("student_profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_stage_documents" ADD CONSTRAINT "application_stage_documents_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_stage_documents" ADD CONSTRAINT "application_stage_documents_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_stage_documents" ADD CONSTRAINT "application_stage_documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_stage_documents" ADD CONSTRAINT "application_stage_documents_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_stage_history" ADD CONSTRAINT "application_stage_history_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_stage_history" ADD CONSTRAINT "application_stage_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_student_id_student_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_assigned_consultant_id_users_id_fk" FOREIGN KEY ("assigned_consultant_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_breaks" ADD CONSTRAINT "attendance_breaks_attendance_record_id_attendance_records_id_fk" FOREIGN KEY ("attendance_record_id") REFERENCES "public"."attendance_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_breaks" ADD CONSTRAINT "attendance_breaks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blogs" ADD CONSTRAINT "blogs_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_members" ADD CONSTRAINT "channel_members_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_members" ADD CONSTRAINT "channel_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_messages" ADD CONSTRAINT "channel_messages_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_messages" ADD CONSTRAINT "channel_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_history" ADD CONSTRAINT "contact_history_contact_id_crm_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_history" ADD CONSTRAINT "contact_history_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_inquiries" ADD CONSTRAINT "contact_inquiries_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_notes" ADD CONSTRAINT "contact_notes_contact_id_crm_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_notes" ADD CONSTRAINT "contact_notes_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_status_history" ADD CONSTRAINT "contact_status_history_contact_id_crm_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_status_history" ADD CONSTRAINT "contact_status_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_submissions" ADD CONSTRAINT "contact_submissions_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_snippets" ADD CONSTRAINT "content_snippets_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_snippets" ADD CONSTRAINT "content_snippets_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_participant1_id_users_id_fk" FOREIGN KEY ("participant1_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_participant2_id_users_id_fk" FOREIGN KEY ("participant2_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_comparisons" ADD CONSTRAINT "course_comparisons_student_profile_id_student_profiles_id_fk" FOREIGN KEY ("student_profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_comparisons" ADD CONSTRAINT "course_comparisons_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_english_requirements" ADD CONSTRAINT "course_english_requirements_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_entry_requirements" ADD CONSTRAINT "course_entry_requirements_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_entry_requirements" ADD CONSTRAINT "course_entry_requirements_qualification_type_id_academic_qualification_types_id_fk" FOREIGN KEY ("qualification_type_id") REFERENCES "public"."academic_qualification_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_intake_templates" ADD CONSTRAINT "course_intake_templates_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_level_requirement_templates" ADD CONSTRAINT "course_level_requirement_templates_qualification_type_id_academic_qualification_types_id_fk" FOREIGN KEY ("qualification_type_id") REFERENCES "public"."academic_qualification_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_pricing_config" ADD CONSTRAINT "course_pricing_config_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_pricing_tiers" ADD CONSTRAINT "course_pricing_tiers_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_recommendations" ADD CONSTRAINT "course_recommendations_student_profile_id_student_profiles_id_fk" FOREIGN KEY ("student_profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_recommendations" ADD CONSTRAINT "course_recommendations_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_region_variants" ADD CONSTRAINT "course_region_variants_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_region_variants" ADD CONSTRAINT "course_region_variants_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_region_variants" ADD CONSTRAINT "course_region_variants_pathway_id_student_pathways_id_fk" FOREIGN KEY ("pathway_id") REFERENCES "public"."student_pathways"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_region_variants" ADD CONSTRAINT "course_region_variants_visa_requirement_id_visa_requirements_id_fk" FOREIGN KEY ("visa_requirement_id") REFERENCES "public"."visa_requirements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_scholarships" ADD CONSTRAINT "course_scholarships_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_scholarships" ADD CONSTRAINT "course_scholarships_scholarship_id_scholarships_id_fk" FOREIGN KEY ("scholarship_id") REFERENCES "public"."scholarships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_specializations" ADD CONSTRAINT "course_specializations_sub_discipline_id_sub_disciplines_id_fk" FOREIGN KEY ("sub_discipline_id") REFERENCES "public"."sub_disciplines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_tags" ADD CONSTRAINT "course_tags_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_tags" ADD CONSTRAINT "course_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_sub_discipline_id_sub_disciplines_id_fk" FOREIGN KEY ("sub_discipline_id") REFERENCES "public"."sub_disciplines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_published_by_user_id_users_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_contact_owner_users_id_fk" FOREIGN KEY ("contact_owner") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_linked_user_id_users_id_fk" FOREIGN KEY ("linked_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovered_course_urls" ADD CONSTRAINT "discovered_course_urls_job_id_scraping_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."scraping_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovered_course_urls" ADD CONSTRAINT "discovered_course_urls_scraped_course_id_scraped_courses_id_fk" FOREIGN KEY ("scraped_course_id") REFERENCES "public"."scraped_courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_comments" ADD CONSTRAINT "document_comments_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_comments" ADD CONSTRAINT "document_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_folders" ADD CONSTRAINT "document_folders_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_folders" ADD CONSTRAINT "document_folders_student_profile_id_student_profiles_id_fk" FOREIGN KEY ("student_profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_folders" ADD CONSTRAINT "document_folders_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_student_profile_id_student_profiles_id_fk" FOREIGN KEY ("student_profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_student_profile_id_student_profiles_id_fk" FOREIGN KEY ("student_profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_folder_id_document_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."document_folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_account_access" ADD CONSTRAINT "email_account_access_account_id_email_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."email_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_account_secrets" ADD CONSTRAINT "email_account_secrets_account_id_email_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."email_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_student_profile_id_student_profiles_id_fk" FOREIGN KEY ("student_profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up_reminders" ADD CONSTRAINT "follow_up_reminders_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up_reminders" ADD CONSTRAINT "follow_up_reminders_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up_reminders" ADD CONSTRAINT "follow_up_reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_business_terms" ADD CONSTRAINT "institution_business_terms_institution_id_universities_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_business_terms" ADD CONSTRAINT "institution_business_terms_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_business_terms" ADD CONSTRAINT "institution_business_terms_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_contacts" ADD CONSTRAINT "institution_contacts_institution_id_universities_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_contacts" ADD CONSTRAINT "institution_contacts_contact_id_crm_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_contacts" ADD CONSTRAINT "institution_contacts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_documents" ADD CONSTRAINT "institution_documents_institution_id_universities_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_documents" ADD CONSTRAINT "institution_documents_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_tags" ADD CONSTRAINT "institution_tags_institution_id_universities_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_tags" ADD CONSTRAINT "institution_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_id_users_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "localized_content" ADD CONSTRAINT "localized_content_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "localized_content" ADD CONSTRAINT "localized_content_translated_by_users_id_fk" FOREIGN KEY ("translated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_change_history" ADD CONSTRAINT "profile_change_history_student_profile_id_student_profiles_id_fk" FOREIGN KEY ("student_profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_change_history" ADD CONSTRAINT "profile_change_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_permissions" ADD CONSTRAINT "profile_permissions_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_section_verifications" ADD CONSTRAINT "profile_section_verifications_student_profile_id_student_profiles_id_fk" FOREIGN KEY ("student_profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_section_verifications" ADD CONSTRAINT "profile_section_verifications_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_team_members" ADD CONSTRAINT "public_team_members_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_team_members" ADD CONSTRAINT "public_team_members_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_equivalencies" ADD CONSTRAINT "qualification_equivalencies_source_qualification_id_academic_qualification_types_id_fk" FOREIGN KEY ("source_qualification_id") REFERENCES "public"."academic_qualification_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_equivalencies" ADD CONSTRAINT "qualification_equivalencies_target_qualification_id_academic_qualification_types_id_fk" FOREIGN KEY ("target_qualification_id") REFERENCES "public"."academic_qualification_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_invitations" ADD CONSTRAINT "referral_invitations_referrer_id_student_profiles_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_invitations" ADD CONSTRAINT "referral_invitations_registered_student_id_student_profiles_id_fk" FOREIGN KEY ("registered_student_id") REFERENCES "public"."student_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_student_profiles_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_id_student_profiles_id_fk" FOREIGN KEY ("referred_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regions" ADD CONSTRAINT "regions_parent_region_id_regions_id_fk" FOREIGN KEY ("parent_region_id") REFERENCES "public"."regions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_filters" ADD CONSTRAINT "saved_filters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scholarships" ADD CONSTRAINT "scholarships_institution_id_universities_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scraped_courses" ADD CONSTRAINT "scraped_courses_job_id_scraping_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."scraping_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scraped_courses" ADD CONSTRAINT "scraped_courses_institution_id_universities_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scraped_courses" ADD CONSTRAINT "scraped_courses_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scraped_courses" ADD CONSTRAINT "scraped_courses_approved_course_id_courses_id_fk" FOREIGN KEY ("approved_course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scraped_institutions" ADD CONSTRAINT "scraped_institutions_job_id_scraping_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."scraping_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scraped_institutions" ADD CONSTRAINT "scraped_institutions_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scraped_institutions" ADD CONSTRAINT "scraped_institutions_approved_institution_id_universities_id_fk" FOREIGN KEY ("approved_institution_id") REFERENCES "public"."universities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scraping_jobs" ADD CONSTRAINT "scraping_jobs_institution_id_universities_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scraping_jobs" ADD CONSTRAINT "scraping_jobs_template_id_scraping_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."scraping_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scraping_jobs" ADD CONSTRAINT "scraping_jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_metadata" ADD CONSTRAINT "seo_metadata_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_metadata" ADD CONSTRAINT "seo_metadata_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_metadata" ADD CONSTRAINT "seo_metadata_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_educations" ADD CONSTRAINT "student_educations_student_profile_id_student_profiles_id_fk" FOREIGN KEY ("student_profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_educations" ADD CONSTRAINT "student_educations_qualification_type_id_academic_qualification_types_id_fk" FOREIGN KEY ("qualification_type_id") REFERENCES "public"."academic_qualification_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_educations" ADD CONSTRAINT "student_educations_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_employments" ADD CONSTRAINT "student_employments_student_profile_id_student_profiles_id_fk" FOREIGN KEY ("student_profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_language_scores" ADD CONSTRAINT "student_language_scores_student_profile_id_student_profiles_id_fk" FOREIGN KEY ("student_profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_language_scores" ADD CONSTRAINT "student_language_scores_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_highest_qualification_type_id_academic_qualification_types_id_fk" FOREIGN KEY ("highest_qualification_type_id") REFERENCES "public"."academic_qualification_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_notes" ADD CONSTRAINT "task_notes_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_notes" ADD CONSTRAINT "task_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_student_profile_id_student_profiles_id_fk" FOREIGN KEY ("student_profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "universities" ADD CONSTRAINT "universities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "universities" ADD CONSTRAINT "universities_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "universities" ADD CONSTRAINT "universities_published_by_user_id_users_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "universities" ADD CONSTRAINT "universities_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "universities" ADD CONSTRAINT "universities_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "universities" ADD CONSTRAINT "universities_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "university_team_members" ADD CONSTRAINT "university_team_members_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "university_team_members" ADD CONSTRAINT "university_team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "university_team_members" ADD CONSTRAINT "university_team_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notification_overrides" ADD CONSTRAINT "user_notification_overrides_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visa_requirements" ADD CONSTRAINT "visa_requirements_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visa_requirements" ADD CONSTRAINT "visa_requirements_pathway_id_student_pathways_id_fk" FOREIGN KEY ("pathway_id") REFERENCES "public"."student_pathways"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "qual_types_country_idx" ON "academic_qualification_types" USING btree ("country");--> statement-breakpoint
CREATE INDEX "qual_types_country_code_idx" ON "academic_qualification_types" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "qual_types_level_category_idx" ON "academic_qualification_types" USING btree ("level_category");--> statement-breakpoint
CREATE INDEX "qual_types_active_idx" ON "academic_qualification_types" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "activity_logs_user_idx" ON "activity_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "activity_logs_entity_idx" ON "activity_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "activity_logs_action_idx" ON "activity_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "activity_logs_entity_timeline_idx" ON "activity_logs" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "api_key_usage_logs_key_idx" ON "api_key_usage_logs" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX "api_key_usage_logs_created_at_idx" ON "api_key_usage_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "api_key_usage_logs_resource_type_idx" ON "api_key_usage_logs" USING btree ("resource_type");--> statement-breakpoint
CREATE INDEX "api_keys_key_hash_idx" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "api_keys_key_prefix_idx" ON "api_keys" USING btree ("key_prefix");--> statement-breakpoint
CREATE INDEX "api_keys_created_by_idx" ON "api_keys" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "api_keys_active_idx" ON "api_keys" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "app_courses_application_idx" ON "application_courses" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "app_courses_course_idx" ON "application_courses" USING btree ("course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "app_courses_unique" ON "application_courses" USING btree ("application_id","course_id");--> statement-breakpoint
CREATE INDEX "internal_notes_application_idx" ON "application_internal_notes" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "internal_notes_author_idx" ON "application_internal_notes" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "internal_notes_created_at_idx" ON "application_internal_notes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "app_notes_application_idx" ON "application_notes" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "app_notes_author_idx" ON "application_notes" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "app_notes_created_at_idx" ON "application_notes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "stage_docs_application_idx" ON "application_stage_documents" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "stage_docs_stage_idx" ON "application_stage_documents" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "stage_docs_uploaded_by_idx" ON "application_stage_documents" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "stage_history_application_idx" ON "application_stage_history" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "stage_history_changed_by_idx" ON "application_stage_history" USING btree ("changed_by");--> statement-breakpoint
CREATE INDEX "stage_history_created_at_idx" ON "application_stage_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "applications_student_idx" ON "applications" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "applications_course_idx" ON "applications" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "applications_stage_idx" ON "applications" USING btree ("current_stage");--> statement-breakpoint
CREATE INDEX "applications_consultant_idx" ON "applications" USING btree ("assigned_consultant_id");--> statement-breakpoint
CREATE INDEX "applications_status_idx" ON "applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "applications_number_idx" ON "applications" USING btree ("application_number");--> statement-breakpoint
CREATE UNIQUE INDEX "blogs_slug_unique_idx" ON "blogs" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "blogs_status_idx" ON "blogs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "blogs_category_idx" ON "blogs" USING btree ("category");--> statement-breakpoint
CREATE INDEX "blogs_tags_gin_idx" ON "blogs" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "blogs_published_at_idx" ON "blogs" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "branches_code_idx" ON "branches" USING btree ("code");--> statement-breakpoint
CREATE INDEX "branches_region_idx" ON "branches" USING btree ("region_id");--> statement-breakpoint
CREATE INDEX "branches_active_idx" ON "branches" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "chat_conversations_user_id_idx" ON "chat_conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "chat_conversations_session_id_idx" ON "chat_conversations" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "chat_conversations_created_at_idx" ON "chat_conversations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "chat_messages_conversation_id_idx" ON "chat_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "chat_messages_created_at_idx" ON "chat_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "contact_history_contact_idx" ON "contact_history" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "contact_history_changed_by_idx" ON "contact_history" USING btree ("changed_by_user_id");--> statement-breakpoint
CREATE INDEX "contact_history_created_at_idx" ON "contact_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "contact_history_action_idx" ON "contact_history" USING btree ("action");--> statement-breakpoint
CREATE INDEX "contact_inquiries_email_idx" ON "contact_inquiries" USING btree ("email");--> statement-breakpoint
CREATE INDEX "contact_inquiries_status_idx" ON "contact_inquiries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "contact_inquiries_type_idx" ON "contact_inquiries" USING btree ("inquiry_type");--> statement-breakpoint
CREATE INDEX "contact_inquiries_created_at_idx" ON "contact_inquiries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "contact_notes_contact_idx" ON "contact_notes" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "contact_notes_created_by_idx" ON "contact_notes" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "contact_notes_created_at_idx" ON "contact_notes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "contact_status_history_contact_idx" ON "contact_status_history" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "contact_status_history_created_idx" ON "contact_status_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "status_contact_idx" ON "contact_submissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "category_idx" ON "contact_submissions" USING btree ("category");--> statement-breakpoint
CREATE INDEX "assigned_to_idx" ON "contact_submissions" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "created_at_contact_idx" ON "contact_submissions" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "content_snippets_key_idx" ON "content_snippets" USING btree ("snippet_key");--> statement-breakpoint
CREATE INDEX "content_snippets_status_idx" ON "content_snippets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "content_snippets_page_idx" ON "content_snippets" USING btree ("page_location");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_participants" ON "conversations" USING btree ("participant1_id","participant2_id");--> statement-breakpoint
CREATE INDEX "participant1_idx" ON "conversations" USING btree ("participant1_id");--> statement-breakpoint
CREATE INDEX "participant2_idx" ON "conversations" USING btree ("participant2_id");--> statement-breakpoint
CREATE INDEX "last_message_idx" ON "conversations" USING btree ("last_message_at");--> statement-breakpoint
CREATE UNIQUE INDEX "course_comparisons_student_course_unique" ON "course_comparisons" USING btree ("student_profile_id","course_id");--> statement-breakpoint
CREATE INDEX "course_english_req_course_idx" ON "course_english_requirements" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "course_english_req_test_type_idx" ON "course_english_requirements" USING btree ("test_type");--> statement-breakpoint
CREATE INDEX "course_entry_req_course_idx" ON "course_entry_requirements" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "course_entry_req_qual_type_idx" ON "course_entry_requirements" USING btree ("qualification_type_id");--> statement-breakpoint
CREATE INDEX "course_intake_templates_course_month_idx" ON "course_intake_templates" USING btree ("course_id","month");--> statement-breakpoint
CREATE INDEX "course_intake_templates_course_idx" ON "course_intake_templates" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "course_level_req_level_idx" ON "course_level_requirement_templates" USING btree ("course_level");--> statement-breakpoint
CREATE INDEX "course_level_req_country_idx" ON "course_level_requirement_templates" USING btree ("institution_country");--> statement-breakpoint
CREATE INDEX "course_level_req_level_country_idx" ON "course_level_requirement_templates" USING btree ("course_level","institution_country");--> statement-breakpoint
CREATE INDEX "course_level_req_qual_type_idx" ON "course_level_requirement_templates" USING btree ("qualification_type_id");--> statement-breakpoint
CREATE INDEX "course_pricing_config_course_idx" ON "course_pricing_config" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "course_pricing_tiers_course_idx" ON "course_pricing_tiers" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "course_pricing_tiers_payment_idx" ON "course_pricing_tiers" USING btree ("payment_option");--> statement-breakpoint
CREATE INDEX "course_pricing_tiers_study_mode_idx" ON "course_pricing_tiers" USING btree ("study_mode");--> statement-breakpoint
CREATE INDEX "course_pricing_tiers_location_idx" ON "course_pricing_tiers" USING btree ("location_type","country");--> statement-breakpoint
CREATE INDEX "course_pricing_tiers_composite_idx" ON "course_pricing_tiers" USING btree ("course_id","payment_option","study_mode","location_type","country");--> statement-breakpoint
CREATE UNIQUE INDEX "course_recommendations_student_course_unique" ON "course_recommendations" USING btree ("student_profile_id","course_id");--> statement-breakpoint
CREATE INDEX "course_recommendations_student_score_idx" ON "course_recommendations" USING btree ("student_profile_id","match_score");--> statement-breakpoint
CREATE INDEX "course_recommendations_refreshed_at_idx" ON "course_recommendations" USING btree ("refreshed_at");--> statement-breakpoint
CREATE INDEX "course_variants_course_idx" ON "course_region_variants" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "course_variants_region_idx" ON "course_region_variants" USING btree ("region_id");--> statement-breakpoint
CREATE INDEX "course_variants_pathway_idx" ON "course_region_variants" USING btree ("pathway_id");--> statement-breakpoint
CREATE INDEX "course_variants_course_region_idx" ON "course_region_variants" USING btree ("course_id","region_id");--> statement-breakpoint
CREATE INDEX "course_scholarships_course_idx" ON "course_scholarships" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "course_scholarships_scholarship_idx" ON "course_scholarships" USING btree ("scholarship_id");--> statement-breakpoint
CREATE INDEX "course_specializations_sub_discipline_idx" ON "course_specializations" USING btree ("sub_discipline_id");--> statement-breakpoint
CREATE INDEX "course_specializations_usage_idx" ON "course_specializations" USING btree ("usage_count");--> statement-breakpoint
CREATE INDEX "course_tags_course_idx" ON "course_tags" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "course_tags_tag_idx" ON "course_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "courses_intakes_gin_idx" ON "courses" USING gin ("intakes");--> statement-breakpoint
CREATE INDEX "courses_study_areas_gin_idx" ON "courses" USING gin ("study_areas");--> statement-breakpoint
CREATE INDEX "courses_career_outcomes_gin_idx" ON "courses" USING gin ("career_outcomes");--> statement-breakpoint
CREATE INDEX "courses_pathways_gin_idx" ON "courses" USING gin ("pathways");--> statement-breakpoint
CREATE INDEX "courses_english_reqs_gin_idx" ON "courses" USING gin ("english_requirements_structured");--> statement-breakpoint
CREATE INDEX "courses_duration_weeks_idx" ON "courses" USING btree ("duration_weeks");--> statement-breakpoint
CREATE INDEX "courses_discipline_idx" ON "courses" USING btree ("discipline");--> statement-breakpoint
CREATE INDEX "courses_sub_discipline_idx" ON "courses" USING btree ("sub_discipline_id");--> statement-breakpoint
CREATE INDEX "courses_specialization_idx" ON "courses" USING btree ("specialization");--> statement-breakpoint
CREATE INDEX "courses_discipline_sub_discipline_idx" ON "courses" USING btree ("discipline","sub_discipline_id");--> statement-breakpoint
CREATE INDEX "courses_discipline_sub_spec_idx" ON "courses" USING btree ("discipline","sub_discipline_id","specialization");--> statement-breakpoint
CREATE INDEX "courses_university_active_idx" ON "courses" USING btree ("university_id","is_active");--> statement-breakpoint
CREATE INDEX "courses_subject_level_idx" ON "courses" USING btree ("subject","level");--> statement-breakpoint
CREATE INDEX "courses_active_approved_idx" ON "courses" USING btree ("is_active","approval_status");--> statement-breakpoint
CREATE INDEX "courses_discipline_active_idx" ON "courses" USING btree ("discipline","is_active","approval_status");--> statement-breakpoint
CREATE INDEX "crm_contacts_type_idx" ON "crm_contacts" USING btree ("contact_type");--> statement-breakpoint
CREATE INDEX "crm_contacts_client_status_idx" ON "crm_contacts" USING btree ("client_status");--> statement-breakpoint
CREATE INDEX "crm_contacts_lead_stage_idx" ON "crm_contacts" USING btree ("lead_stage");--> statement-breakpoint
CREATE INDEX "crm_contacts_entry_source_idx" ON "crm_contacts" USING btree ("entry_source");--> statement-breakpoint
CREATE INDEX "crm_contacts_owner_idx" ON "crm_contacts" USING btree ("contact_owner");--> statement-breakpoint
CREATE INDEX "crm_contacts_assigned_idx" ON "crm_contacts" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "crm_contacts_email_idx" ON "crm_contacts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "crm_contacts_created_at_idx" ON "crm_contacts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "crm_contacts_region_idx" ON "crm_contacts" USING btree ("region_id");--> statement-breakpoint
CREATE INDEX "crm_contacts_branch_idx" ON "crm_contacts" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "crm_contacts_linked_user_idx" ON "crm_contacts" USING btree ("linked_user_id");--> statement-breakpoint
CREATE INDEX "discovered_urls_job_id_idx" ON "discovered_course_urls" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "discovered_urls_url_idx" ON "discovered_course_urls" USING btree ("url");--> statement-breakpoint
CREATE INDEX "discovered_urls_extraction_status_idx" ON "discovered_course_urls" USING btree ("extraction_status");--> statement-breakpoint
CREATE INDEX "discovered_urls_is_likely_course_idx" ON "discovered_course_urls" USING btree ("is_likely_course");--> statement-breakpoint
CREATE INDEX "doc_comments_document_idx" ON "document_comments" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "doc_comments_user_idx" ON "document_comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "doc_folders_owner_idx" ON "document_folders" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "doc_folders_parent_idx" ON "document_folders" USING btree ("parent_folder_id");--> statement-breakpoint
CREATE INDEX "doc_folders_student_profile_idx" ON "document_folders" USING btree ("student_profile_id");--> statement-breakpoint
CREATE INDEX "doc_requests_student_idx" ON "document_requests" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "doc_requests_student_profile_idx" ON "document_requests" USING btree ("student_profile_id");--> statement-breakpoint
CREATE INDEX "doc_requests_requested_by_idx" ON "document_requests" USING btree ("requested_by");--> statement-breakpoint
CREATE INDEX "doc_requests_university_idx" ON "document_requests" USING btree ("university_id");--> statement-breakpoint
CREATE INDEX "doc_requests_application_idx" ON "document_requests" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "doc_requests_status_idx" ON "document_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "documents_sender_idx" ON "documents" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "documents_recipient_idx" ON "documents" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "documents_application_idx" ON "documents" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "documents_student_profile_idx" ON "documents" USING btree ("student_profile_id");--> statement-breakpoint
CREATE INDEX "documents_status_idx" ON "documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "faqs_status_idx" ON "faqs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "faqs_category_idx" ON "faqs" USING btree ("category");--> statement-breakpoint
CREATE INDEX "faqs_order_idx" ON "faqs" USING btree ("display_order");--> statement-breakpoint
CREATE INDEX "unique_favorite" ON "favorites" USING btree ("student_profile_id","item_type","item_id");--> statement-breakpoint
CREATE INDEX "student_item_type_idx" ON "favorites" USING btree ("student_profile_id","item_type");--> statement-breakpoint
CREATE INDEX "item_type_item_id_idx" ON "favorites" USING btree ("item_type","item_id");--> statement-breakpoint
CREATE INDEX "reminders_user_idx" ON "follow_up_reminders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reminders_task_idx" ON "follow_up_reminders" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "reminders_application_idx" ON "follow_up_reminders" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "reminders_reminder_at_idx" ON "follow_up_reminders" USING btree ("reminder_at");--> statement-breakpoint
CREATE INDEX "reminders_is_completed_idx" ON "follow_up_reminders" USING btree ("is_completed");--> statement-breakpoint
CREATE INDEX "gnd_type_role_idx" ON "global_notification_defaults" USING btree ("notification_type","role");--> statement-breakpoint
CREATE INDEX "type_status_idx" ON "import_batches" USING btree ("type","status");--> statement-breakpoint
CREATE INDEX "uploaded_by_idx" ON "import_batches" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "created_at_import_idx" ON "import_batches" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "institution_business_terms_institution_idx" ON "institution_business_terms" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "institution_business_terms_status_idx" ON "institution_business_terms" USING btree ("contract_status");--> statement-breakpoint
CREATE INDEX "institution_contacts_institution_idx" ON "institution_contacts" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "institution_contacts_contact_idx" ON "institution_contacts" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "institution_documents_institution_idx" ON "institution_documents" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "institution_documents_category_idx" ON "institution_documents" USING btree ("category");--> statement-breakpoint
CREATE INDEX "institution_tags_institution_idx" ON "institution_tags" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "institution_tags_tag_idx" ON "institution_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "localized_content_entity_idx" ON "localized_content" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "localized_content_locale_idx" ON "localized_content" USING btree ("locale");--> statement-breakpoint
CREATE INDEX "conversation_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "sender_idx" ON "messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "created_at_idx" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "public_team_members_status_idx" ON "public_team_members" USING btree ("status");--> statement-breakpoint
CREATE INDEX "public_team_members_order_idx" ON "public_team_members" USING btree ("display_order");--> statement-breakpoint
CREATE INDEX "qual_equiv_source_idx" ON "qualification_equivalencies" USING btree ("source_qualification_id");--> statement-breakpoint
CREATE INDEX "qual_equiv_target_idx" ON "qualification_equivalencies" USING btree ("target_qualification_id");--> statement-breakpoint
CREATE INDEX "qual_equiv_source_target_idx" ON "qualification_equivalencies" USING btree ("source_qualification_id","target_qualification_id");--> statement-breakpoint
CREATE INDEX "regions_code_idx" ON "regions" USING btree ("code");--> statement-breakpoint
CREATE INDEX "regions_active_idx" ON "regions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "scholarships_institution_idx" ON "scholarships" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "scholarships_status_idx" ON "scholarships" USING btree ("status");--> statement-breakpoint
CREATE INDEX "scholarships_active_idx" ON "scholarships" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "scholarships_date_range_idx" ON "scholarships" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "scraped_courses_job_id_idx" ON "scraped_courses" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "scraped_courses_institution_id_idx" ON "scraped_courses" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "scraped_courses_review_status_idx" ON "scraped_courses" USING btree ("review_status");--> statement-breakpoint
CREATE INDEX "scraped_courses_confidence_idx" ON "scraped_courses" USING btree ("confidence");--> statement-breakpoint
CREATE INDEX "scraped_institutions_job_id_idx" ON "scraped_institutions" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "scraped_institutions_review_status_idx" ON "scraped_institutions" USING btree ("review_status");--> statement-breakpoint
CREATE INDEX "scraped_institutions_confidence_idx" ON "scraped_institutions" USING btree ("confidence");--> statement-breakpoint
CREATE INDEX "scraping_jobs_institution_id_idx" ON "scraping_jobs" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "scraping_jobs_status_idx" ON "scraping_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "scraping_jobs_created_at_idx" ON "scraping_jobs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "scraping_jobs_template_id_idx" ON "scraping_jobs" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "scraping_templates_platform_type_idx" ON "scraping_templates" USING btree ("platform_type");--> statement-breakpoint
CREATE UNIQUE INDEX "seo_metadata_entity_type_id_idx" ON "seo_metadata" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "seo_metadata_status_idx" ON "seo_metadata" USING btree ("status");--> statement-breakpoint
CREATE INDEX "seo_metadata_focus_keywords_gin_idx" ON "seo_metadata" USING gin ("focus_keywords");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE UNIQUE INDEX "site_settings_key_idx" ON "site_settings" USING btree ("setting_key");--> statement-breakpoint
CREATE INDEX "site_settings_category_idx" ON "site_settings" USING btree ("category");--> statement-breakpoint
CREATE INDEX "student_pathways_code_idx" ON "student_pathways" USING btree ("code");--> statement-breakpoint
CREATE INDEX "sub_disciplines_discipline_idx" ON "sub_disciplines" USING btree ("discipline");--> statement-breakpoint
CREATE INDEX "sub_disciplines_usage_idx" ON "sub_disciplines" USING btree ("usage_count");--> statement-breakpoint
CREATE INDEX "tags_category_idx" ON "tags" USING btree ("category");--> statement-breakpoint
CREATE INDEX "tags_slug_idx" ON "tags" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "tags_active_idx" ON "tags" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "tags_applies_to_idx" ON "tags" USING btree ("applies_to");--> statement-breakpoint
CREATE INDEX "task_notes_task_idx" ON "task_notes" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_notes_author_idx" ON "task_notes" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "tasks_assigned_to_idx" ON "tasks" USING btree ("assigned_to_id");--> statement-breakpoint
CREATE INDEX "tasks_application_idx" ON "tasks" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "tasks_status_idx" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tasks_priority_idx" ON "tasks" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "tasks_due_date_idx" ON "tasks" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "tasks_created_by_idx" ON "tasks" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "testimonials_status_idx" ON "testimonials" USING btree ("status");--> statement-breakpoint
CREATE INDEX "testimonials_featured_idx" ON "testimonials" USING btree ("is_featured");--> statement-breakpoint
CREATE INDEX "testimonials_order_idx" ON "testimonials" USING btree ("display_order");--> statement-breakpoint
CREATE INDEX "universities_top_disciplines_gin_idx" ON "universities" USING gin ("top_disciplines");--> statement-breakpoint
CREATE INDEX "universities_tags_gin_idx" ON "universities" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "universities_scholarship_range_idx" ON "universities" USING btree ("scholarship_percentage_min","scholarship_percentage_max");--> statement-breakpoint
CREATE INDEX "universities_country_provider_idx" ON "universities" USING btree ("country","provider_type");--> statement-breakpoint
CREATE INDEX "universities_active_approved_idx" ON "universities" USING btree ("is_active","approval_status");--> statement-breakpoint
CREATE INDEX "uno_user_type_idx" ON "user_notification_overrides" USING btree ("user_id","notification_type");--> statement-breakpoint
CREATE INDEX "visa_requirements_region_idx" ON "visa_requirements" USING btree ("region_id");