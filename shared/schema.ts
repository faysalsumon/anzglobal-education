import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import {
  index,
  unique,
  uniqueIndex,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
  boolean,
  integer,
  decimal,
  date,
  pgEnum,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Discipline enum for course categorization
export const disciplineEnum = pgEnum('discipline', [
  'Accounting, Business & Finance',
  'Agriculture & Forestry',
  'Applied Sciences & Professions',
  'Arts, Design & Architecture',
  'Computer Science & IT',
  'Education & Training',
  'Engineering & Technology',
  'Environmental Studies & Earth Sciences',
  'Hospitality, Leisure & Sports',
  'Humanities',
  'Journalism & Media',
  'Law',
  'Medicine & Health',
  'Short Courses',
  'Trade',
]);

// Course level enum for standardized qualification levels
export const courseLevelEnum = pgEnum('course_level', [
  'VCE (11-12)',
  'Certificate II',
  'Certificate III',
  'Certificate IV',
  'Diploma',
  'Advanced Diploma',
  'Graduate Certificate',
  'Graduate Diploma',
  'Bachelor Degree',
  'Professional Year',
  'Masters Degree',
  'Doctoral Degree',
  'Higher Doctoral Degree',
  'ELICOS',
]);

// Provider type enum for institution categorization
export const providerTypeEnum = pgEnum('provider_type', [
  'University',
  'Institution',
  'Tafe',
  'School',
]);

// Application stage enum based on CRM workflow
export const applicationStageEnum = pgEnum('application_stage', [
  'Assessment',
  'Collect Docs',
  'Documents Verification',
  'Offer-Letter',
  'GS-Clearance',
  'COE',
  'Health Cover',
  'Visa Lodgment',
  'Application Won',
  'Refusal/Refunds',
  'Application Lost',
]);

// Activity log action types
export const activityActionEnum = pgEnum('activity_action', [
  'created',
  'updated',
  'deleted',
  'approved',
  'rejected',
  'activated',
  'deactivated',
  'assigned',
  'unassigned',
  'login',
  'logout',
  'status_changed',
  'imported',
  'exported',
  'stage_changed',
]);

// Activity log entity types
export const activityEntityTypeEnum = pgEnum('activity_entity_type', [
  'user',
  'institution',
  'course',
  'application',
  'student_lead',
  'inquiry_lead',
  'blog',
  'document',
  'scraped_course',
  'import_batch',
  'team_member',
  'notification',
  'task',
  'internal_note',
  'reminder',
  'crm_lead',
  'crm_contact',
  'testimonial',
  'faq',
  'site_setting',
  'content_snippet',
  'public_team_member',
]);

// CMS content status enum
export const cmsStatusEnum = pgEnum('cms_status', [
  'draft',
  'published',
  'archived',
]);

// FAQ category enum
export const faqCategoryEnum = pgEnum('faq_category', [
  'general',
  'students',
  'institutions',
  'applications',
  'visas',
  'fees',
  'scholarships',
  'accommodation',
]);

// CRM Task priority enum
export const taskPriorityEnum = pgEnum('task_priority', [
  'low',
  'medium',
  'high',
  'urgent',
]);

// CRM Task status enum
export const taskStatusEnum = pgEnum('task_status', [
  'pending',
  'in_progress',
  'completed',
  'cancelled',
  'on_hold',
]);

// CRM Task category enum
export const taskCategoryEnum = pgEnum('task_category', [
  'follow_up',
  'document_collection',
  'application_review',
  'communication',
  'visa_processing',
  'general',
  'urgent_action',
]);

// CRM Lead status enum
export const leadStatusEnum = pgEnum('lead_status', [
  'not_contacted',
  'contacted',
  'qualified',
  'unqualified',
  'converted',
  'lost',
]);

// CRM Lead rating enum
export const leadRatingEnum = pgEnum('lead_rating', [
  'cold',
  'warm',
  'hot',
]);

// CRM Lead creation method enum
export const leadCreationMethodEnum = pgEnum('lead_creation_method', [
  'manually',
  'website_form',
  'facebook_ads',
  'referral',
  'import',
  'other',
]);

// CRM Contact type enum
export const contactTypeEnum = pgEnum('contact_type', [
  'none',
  'clients',
  'employee',
  'external',
  'internal',
  'others',
  'partner',
  'providers_rep',
]);

// Shared TypeScript interfaces for JSONB fields
export interface EnglishRequirementsStructured {
  IELTS?: {
    overall?: number;
    min_each_band?: number;
  };
  TOEFL?: {
    overall?: number;
  };
  PTE?: {
    overall?: number;
    listening?: number;
    reading?: number;
    writing?: number;
    speaking?: number;
  };
  Duolingo?: {
    overall?: number;
  };
}

// Campus address interface (stored in institution.campusAddresses JSONB field)
export interface Campus {
  name?: string;           // Optional campus name (e.g., "Sydney Campus", "Melbourne CBD")
  address: string;         // Street address (previously just "street")
  street?: string;         // Alias for address for backward compatibility
  city: string;
  state: string;
  postcode: string;
  country: string;
  latitude?: string;       // Optional GPS coordinates for direct map placement
  longitude?: string;
}

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  password: varchar("password"), // For email/password auth (hashed)
  emailVerified: boolean("email_verified").default(false),
  verificationToken: varchar("verification_token"),
  verificationTokenExpiry: timestamp("verification_token_expiry"),
  resetPasswordToken: varchar("reset_password_token"),
  resetPasswordExpiry: timestamp("reset_password_expiry"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  userType: varchar("user_type", { length: 20 }).notNull().default("student"), // 'student', 'university', 'admin', or 'super_admin'
  role: varchar("role", { length: 50 }).default("user"), // For granular permissions
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Activity Logs table - CRM-style audit trail for all platform actions
export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Actor (user who performed the action) - denormalized for performance
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }), // Nullable if user is deleted
  userEmail: varchar("user_email"),
  userName: varchar("user_name"),
  userProfilePicture: varchar("user_profile_picture"),
  userType: varchar("user_type", { length: 20 }), // 'student', 'university', 'admin', 'super_admin'
  
  // Entity being acted upon
  entityType: activityEntityTypeEnum("entity_type").notNull(),
  entityId: varchar("entity_id").notNull(),
  entityName: text("entity_name"), // Human-readable name (course title, institution name, etc.)
  
  // Action details
  action: activityActionEnum("action").notNull(),
  actionDescription: text("action_description"), // Human-readable description: "Changed title from 'Old' to 'New'"
  
  // Field-level change tracking (before/after values)
  changes: jsonb("changes"), // { fieldName: { before: value, after: value } }
  
  // Additional context
  metadata: jsonb("metadata"), // IP address, user agent, additional context
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Indexes for efficient querying
  userIdx: index("activity_logs_user_idx").on(table.userId),
  entityIdx: index("activity_logs_entity_idx").on(table.entityType, table.entityId),
  actionIdx: index("activity_logs_action_idx").on(table.action),
  createdAtIdx: index("activity_logs_created_at_idx").on(table.createdAt),
  // Composite index for entity timeline queries
  entityTimelineIdx: index("activity_logs_entity_timeline_idx").on(table.entityType, table.entityId, table.createdAt),
}));

// Universities table
export const universities = pgTable("universities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  logo: text("logo"),
  website: text("website"),
  country: text("country"),
  establishedYear: integer("established_year"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  numberOfCampuses: integer("number_of_campuses"),
  providerType: providerTypeEnum("provider_type"), // University, Institution, Tafe, School
  scholarshipPercentageMin: integer("scholarship_percentage_min"),
  scholarshipPercentageMax: integer("scholarship_percentage_max"),
  topDisciplines: text("top_disciplines").array(),
  
  // New detailed fields
  smallDescription: text("small_description"), // AI-powered, max 100 words
  fullDescription: text("full_description"), // AI-powered
  institutionGallery: text("institution_gallery").array(), // Up to 3 images, 600x400px
  topCourses: text("top_courses").array(), // Array of course IDs or names
  campusAddresses: jsonb("campus_addresses"), // Array of campus address objects: [{name: string, address: string, city: string, state: string, postcode: string, country: string}]
  
  // Filter-friendly fields (nullable, precomputed from course data)
  tuitionFeesMin: decimal("tuition_fees_min", { precision: 10, scale: 2 }), // Minimum tuition across all programs
  tuitionFeesMax: decimal("tuition_fees_max", { precision: 10, scale: 2 }), // Maximum tuition across all programs
  tuitionCurrency: varchar("tuition_currency", { length: 3 }).default("AUD"), // Currency code
  deliveryModes: text("delivery_modes").array(), // ["on-campus", "online", "hybrid"]
  intakePeriods: text("intake_periods").array(), // ["January", "February", "July", "September"]
  accreditationStatus: text("accreditation_status"), // "Fully Accredited", "Provisional", etc.
  rankingBand: text("ranking_band"), // "Top 100", "Top 500", "Regional Leader", etc.
  facilities: text("facilities").array(), // ["Library", "Sports Center", "Career Services", "Student Housing"]
  internationalStudentSupport: boolean("international_student_support"), // Whether institution provides international student support
  tags: text("tags").array(), // AI-generated or admin-curated tags for discovery
  
  // Approval workflow
  approvalStatus: varchar("approval_status", { length: 20 }).notNull().default("pending"), // 'pending', 'approved', 'rejected'
  rejectionReason: text("rejection_reason"), // Reason for rejection if applicable
  submittedForApprovalAt: timestamp("submitted_for_approval_at"),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by").references(() => users.id), // Admin who approved
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // GIN indexes for array fields to support efficient filtering
  topDisciplinesIdx: index("universities_top_disciplines_gin_idx").using("gin", table.topDisciplines),
  deliveryModesIdx: index("universities_delivery_modes_gin_idx").using("gin", table.deliveryModes),
  intakePeriodsIdx: index("universities_intake_periods_gin_idx").using("gin", table.intakePeriods),
  facilitiesIdx: index("universities_facilities_gin_idx").using("gin", table.facilities),
  tagsIdx: index("universities_tags_gin_idx").using("gin", table.tags),
  // B-tree indexes for range filtering
  scholarshipRangeIdx: index("universities_scholarship_range_idx").on(table.scholarshipPercentageMin, table.scholarshipPercentageMax),
  tuitionRangeIdx: index("universities_tuition_range_idx").on(table.tuitionFeesMin, table.tuitionFeesMax),
  // Composite indexes for common filter patterns
  countryProviderIdx: index("universities_country_provider_idx").on(table.country, table.providerType),
  activeApprovedIdx: index("universities_active_approved_idx").on(table.isActive, table.approvalStatus),
}));

// Sub-disciplines table (for categorizing courses within main disciplines)
export const subDisciplines = pgTable("sub_disciplines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  discipline: text("discipline").notNull(), // Parent discipline (must match one of the main disciplines)
  name: text("name").notNull(), // Display name (e.g., "Accounting", "Business and Management")
  slug: text("slug").notNull(), // URL-friendly version for deduplication
  usageCount: integer("usage_count").notNull().default(0), // Track how many courses use this sub-discipline
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Composite unique constraint to prevent duplicate sub-disciplines within same discipline
  disciplineSlugUnique: unique("sub_disciplines_discipline_slug_unique").on(table.discipline, table.slug),
  // Index for looking up sub-disciplines by parent discipline
  disciplineIdx: index("sub_disciplines_discipline_idx").on(table.discipline),
  // Index for sorting by usage
  usageIdx: index("sub_disciplines_usage_idx").on(table.usageCount),
}));


// Courses table
export const courses = pgTable("courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  universityId: varchar("university_id").notNull().references(() => universities.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  subject: text("subject").notNull(),
  discipline: disciplineEnum("discipline"), // Main discipline category for filtering
  subDisciplineId: varchar("sub_discipline_id").references(() => subDisciplines.id, { onDelete: "set null" }), // Optional sub-category within main discipline
  level: courseLevelEnum("level").notNull(), // Course qualification level (enforced by database enum)
  duration: text("duration"), // e.g., "2 years", "6 months"
  durationMonths: integer("duration_months"), // For filtering
  durationWeeks: integer("duration_weeks"), // For precise duration tracking
  fees: decimal("fees", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("AUD"),
  location: text("location"),
  country: text("country"),
  startDate: text("start_date"),
  applicationDeadline: text("application_deadline"),
  prerequisites: text("prerequisites"),
  thumbnailUrl: text("thumbnail_url"),
  
  // Additional course details
  courseCode: text("course_code"),
  prPathway: boolean("pr_pathway").default(false),
  scholarshipPercentageMin: integer("scholarship_percentage_min"),
  scholarshipPercentageMax: integer("scholarship_percentage_max"),
  eligibilityRequirements: text("eligibility_requirements"),
  englishRequirements: text("english_requirements"),
  curriculumUrl: text("curriculum_url"),
  costOfLiving: decimal("cost_of_living", { precision: 10, scale: 2 }),
  applicationFees: decimal("application_fees", { precision: 10, scale: 2 }),
  images: text("images").array(),
  
  // Rich structured data for AI-powered recommendations
  intakes: text("intakes").array(), // ["January", "February", "April", "May", etc.]
  studyAreas: text("study_areas").array(), // Curriculum topics and learning areas
  careerOutcomes: text("career_outcomes").array(), // Potential career paths
  careerPath: text("career_path"), // Detailed career progression and trajectory description
  pathways: text("pathways").array(), // Progression routes (e.g., "University degrees", "RMIT University")
  
  // Detailed entry requirements for AI matching
  minimumAge: integer("minimum_age"), // Minimum age requirement
  academicRequirements: text("academic_requirements"), // Detailed academic entry criteria
  englishRequirementsStructured: jsonb("english_requirements_structured").$type<EnglishRequirementsStructured>(), // Structured English requirements
  
  // Delivery and work-related fields for comprehensive recommendations
  deliveryMode: text("delivery_mode"), // 'online', 'on-campus', 'hybrid'
  campusLocations: text("campus_locations").array(), // Multiple campus options
  workRights: boolean("work_rights"), // Whether course provides work rights/visa eligibility
  internshipAvailable: boolean("internship_available"), // Whether internships are part of the program
  internshipDetails: text("internship_details"), // Details about internship opportunities
  
  // Approval workflow
  approvalStatus: varchar("approval_status", { length: 20 }).notNull().default("pending"), // 'pending', 'approved', 'rejected'
  rejectionReason: text("rejection_reason"), // Reason for rejection if applicable
  submittedForApprovalAt: timestamp("submitted_for_approval_at"),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by").references(() => users.id), // Admin who approved
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // GIN indexes for array and JSONB fields for fast filtering
  intakesIdx: index("courses_intakes_gin_idx").using("gin", table.intakes),
  studyAreasIdx: index("courses_study_areas_gin_idx").using("gin", table.studyAreas),
  careerOutcomesIdx: index("courses_career_outcomes_gin_idx").using("gin", table.careerOutcomes),
  pathwaysIdx: index("courses_pathways_gin_idx").using("gin", table.pathways),
  englishReqsIdx: index("courses_english_reqs_gin_idx").using("gin", table.englishRequirementsStructured),
  // Btree index for duration and discipline filtering
  durationWeeksIdx: index("courses_duration_weeks_idx").on(table.durationWeeks),
  disciplineIdx: index("courses_discipline_idx").on(table.discipline),
  subDisciplineIdx: index("courses_sub_discipline_idx").on(table.subDisciplineId),
  // Composite indexes for common query patterns
  disciplineSubDisciplineIdx: index("courses_discipline_sub_discipline_idx").on(table.discipline, table.subDisciplineId),
  universityActiveIdx: index("courses_university_active_idx").on(table.universityId, table.isActive),
  subjectLevelIdx: index("courses_subject_level_idx").on(table.subject, table.level),
  activeApprovedIdx: index("courses_active_approved_idx").on(table.isActive, table.approvalStatus),
  disciplineActiveIdx: index("courses_discipline_active_idx").on(table.discipline, table.isActive, table.approvalStatus),
}));

// Student profiles table
export const studentProfiles = pgTable("student_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: varchar("phone", { length: 20 }),
  dateOfBirth: date("date_of_birth"),
  nationality: text("nationality"),
  profileImageUrl: text("profile_image_url"),
  
  bio: text("bio"),
  educationLevel: text("education_level"),
  fieldOfStudy: text("field_of_study"),
  country: text("country"),
  careerGoals: text("career_goals"),
  previousEducation: text("previous_education"),
  
  referralCode: varchar("referral_code", { length: 10 }).unique(),
  referredByCode: varchar("referred_by_code", { length: 10 }),
  
  // Bank details for affiliate payouts
  bankAccountHolderName: text("bank_account_holder_name"),
  bankName: text("bank_name"),
  bankBsbCode: varchar("bank_bsb_code", { length: 10 }),
  bankAccountNumber: varchar("bank_account_number", { length: 20 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Applications table
export const applications = pgTable("applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  studentId: varchar("student_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  
  // Application stage workflow
  currentStage: applicationStageEnum("current_stage").notNull().default('Assessment'),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending', 'reviewing', 'accepted', 'rejected', 'withdrawn'
  
  // Consultant assignment for admin workflow
  assignedConsultantId: varchar("assigned_consultant_id").references(() => users.id, { onDelete: "set null" }), // Admin/consultant assigned to review
  assignedAt: timestamp("assigned_at"),
  
  // Application details
  personalStatement: text("personal_statement"),
  additionalInfo: text("additional_info"),
  
  // Stage-specific metadata
  stageMetadata: jsonb("stage_metadata"), // Store stage-specific data (offer letter details, visa info, etc.)
  
  // Important dates
  submittedAt: timestamp("submitted_at"),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("applications_student_idx").on(table.studentId),
  index("applications_course_idx").on(table.courseId),
  index("applications_stage_idx").on(table.currentStage),
  index("applications_consultant_idx").on(table.assignedConsultantId),
  index("applications_status_idx").on(table.status),
]);

// Application stage history for tracking all stage transitions
export const applicationStageHistory = pgTable("application_stage_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
  
  fromStage: applicationStageEnum("from_stage"),
  toStage: applicationStageEnum("to_stage").notNull(),
  
  changedBy: varchar("changed_by").notNull().references(() => users.id, { onDelete: "cascade" }), // Who moved the stage
  changedByRole: varchar("changed_by_role", { length: 20 }).notNull(), // 'student', 'admin', 'university'
  
  notes: text("notes"), // Optional notes for the stage transition
  metadata: jsonb("metadata"), // Additional stage-specific data
  
  durationInStage: integer("duration_in_stage"), // Time spent in previous stage (hours)
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("stage_history_application_idx").on(table.applicationId),
  index("stage_history_changed_by_idx").on(table.changedBy),
  index("stage_history_created_at_idx").on(table.createdAt),
]);

// Stage-specific documents for applications
export const applicationStageDocuments = pgTable("application_stage_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
  stage: applicationStageEnum("stage").notNull(),
  
  documentId: varchar("document_id").references(() => documents.id, { onDelete: "set null" }), // Reference to uploaded document
  
  documentType: varchar("document_type", { length: 50 }).notNull(), // 'passport', 'academic_transcript', 'offer_letter', etc.
  documentName: text("document_name").notNull(),
  documentUrl: text("document_url"),
  
  isRequired: boolean("is_required").default(false),
  isVerified: boolean("is_verified").default(false),
  
  uploadedBy: varchar("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  uploadedByRole: varchar("uploaded_by_role", { length: 20 }), // 'student', 'admin', 'university'
  uploadedAt: timestamp("uploaded_at"),
  
  verifiedBy: varchar("verified_by").references(() => users.id, { onDelete: "set null" }),
  verifiedAt: timestamp("verified_at"),
  verificationNotes: text("verification_notes"),
  
  rejectionReason: text("rejection_reason"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("stage_docs_application_idx").on(table.applicationId),
  index("stage_docs_stage_idx").on(table.stage),
  index("stage_docs_uploaded_by_idx").on(table.uploadedBy),
]);

// ============================================
// CRM SYSTEM TABLES
// ============================================

// Tasks table for CRM task management
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Task details
  title: text("title").notNull(),
  description: text("description"),
  category: taskCategoryEnum("category").notNull().default('general'),
  
  // Priority and status
  priority: taskPriorityEnum("priority").notNull().default('medium'),
  status: taskStatusEnum("status").notNull().default('pending'),
  
  // Assignment
  assignedToId: varchar("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
  assignedByName: text("assigned_by_name"), // Store name for display even if user deleted
  
  // Related entities
  applicationId: varchar("application_id").references(() => applications.id, { onDelete: "cascade" }),
  studentProfileId: varchar("student_profile_id").references(() => studentProfiles.id, { onDelete: "set null" }),
  relatedStage: applicationStageEnum("related_stage"), // Which application stage this task relates to
  
  // Timing
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  
  // SLA tracking
  slaWarningHours: integer("sla_warning_hours").default(24), // Hours before due date to show warning
  slaCriticalHours: integer("sla_critical_hours").default(4), // Hours before due date to show critical
  
  // Audit
  createdById: varchar("created_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("tasks_assigned_to_idx").on(table.assignedToId),
  index("tasks_application_idx").on(table.applicationId),
  index("tasks_status_idx").on(table.status),
  index("tasks_priority_idx").on(table.priority),
  index("tasks_due_date_idx").on(table.dueDate),
  index("tasks_created_by_idx").on(table.createdById),
]);

// Application internal notes for team communication (not visible to students)
export const applicationInternalNotes = pgTable("application_internal_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  content: text("content").notNull(),
  
  // Optional tagging/mentions (store user IDs of mentioned team members)
  mentionedUserIds: varchar("mentioned_user_ids").array(),
  
  // Mark important notes
  isPinned: boolean("is_pinned").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("internal_notes_application_idx").on(table.applicationId),
  index("internal_notes_author_idx").on(table.authorId),
  index("internal_notes_created_at_idx").on(table.createdAt),
]);

// Follow-up reminders for tasks and applications
export const followUpReminders = pgTable("follow_up_reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Can be linked to task, application, or both
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  applicationId: varchar("application_id").references(() => applications.id, { onDelete: "cascade" }),
  
  // Who gets reminded
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Reminder details
  reminderAt: timestamp("reminder_at").notNull(),
  message: text("message"),
  
  // Status
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  
  // Was notification sent?
  notificationSent: boolean("notification_sent").default(false),
  notificationSentAt: timestamp("notification_sent_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("reminders_user_idx").on(table.userId),
  index("reminders_task_idx").on(table.taskId),
  index("reminders_application_idx").on(table.applicationId),
  index("reminders_reminder_at_idx").on(table.reminderAt),
  index("reminders_is_completed_idx").on(table.isCompleted),
]);

// ============================================
// END CRM SYSTEM TABLES
// ============================================

// Favorites table for students to save favorite institutions and courses
export const favorites = pgTable("favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentProfileId: varchar("student_profile_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  itemType: varchar("item_type", { length: 20 }).notNull(), // 'university' or 'course'
  itemId: varchar("item_id").notNull(), // ID of the university or course
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Unique constraint to prevent duplicate favorites
  uniqueFavorite: index("unique_favorite").on(table.studentProfileId, table.itemType, table.itemId),
  // Index for fast lookups
  studentItemTypeIdx: index("student_item_type_idx").on(table.studentProfileId, table.itemType),
  itemTypeItemIdIdx: index("item_type_item_id_idx").on(table.itemType, table.itemId),
}));

// Course comparisons table for students to compare courses side-by-side
export const courseComparisons = pgTable("course_comparisons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentProfileId: varchar("student_profile_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Unique constraint to prevent duplicate comparisons
  uniqueStudentCourse: uniqueIndex("course_comparisons_student_course_unique").on(table.studentProfileId, table.courseId),
}));

// Course recommendations table for caching AI-powered course recommendations
export const courseRecommendations = pgTable("course_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentProfileId: varchar("student_profile_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  
  // AI-generated recommendation metrics
  matchScore: decimal("match_score", { precision: 5, scale: 2 }).notNull(), // 0-100 compatibility score
  rationale: text("rationale"), // AI explanation of why this course matches
  matchFactors: jsonb("match_factors"), // Structured breakdown: {eligibility_match, career_alignment, etc.}
  
  // Eligibility checks
  meetsAgeRequirement: boolean("meets_age_requirement"),
  meetsAcademicRequirement: boolean("meets_academic_requirement"),
  meetsEnglishRequirement: boolean("meets_english_requirement"),
  eligibilityNotes: text("eligibility_notes"), // Specific gaps or requirements needed
  
  // Cache management
  isActive: boolean("is_active").default(true),
  refreshedAt: timestamp("refreshed_at").defaultNow(), // When recommendation was last calculated
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Unique constraint per student-course pair
  uniqueStudentCourseRec: uniqueIndex("course_recommendations_student_course_unique").on(table.studentProfileId, table.courseId),
  // Indexes for fast filtering and sorting
  studentScoreIdx: index("course_recommendations_student_score_idx").on(table.studentProfileId, table.matchScore),
  refreshedAtIdx: index("course_recommendations_refreshed_at_idx").on(table.refreshedAt),
}));

// Referrals table for student affiliate/referral system
export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }), // Student who referred
  referredId: varchar("referred_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }), // Student who was referred
  referralCode: varchar("referral_code", { length: 10 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending', 'completed', 'cancelled'
  bonusAmount: decimal("bonus_amount", { precision: 10, scale: 2 }), // Bonus amount (to be set later)
  bonusCurrency: varchar("bonus_currency", { length: 3 }).default("AUD"),
  bonusPaidAt: timestamp("bonus_paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Student Education History table
export const studentEducations = pgTable("student_educations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentProfileId: varchar("student_profile_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  level: varchar("level", { length: 50 }).notNull(), // 'high_school', 'bachelor', 'master', 'phd', 'diploma', 'certificate'
  institution: text("institution").notNull(),
  country: text("country"),
  fieldOfStudy: text("field_of_study"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  isCurrentlyStudying: boolean("is_currently_studying").default(false),
  gpa: decimal("gpa", { precision: 5, scale: 2 }),
  gradeScale: varchar("grade_scale", { length: 20 }), // e.g., '4.0', '5.0', '100'
  documentId: varchar("document_id").references(() => documents.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Student Language Test Scores table
export const studentLanguageScores = pgTable("student_language_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentProfileId: varchar("student_profile_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  testType: varchar("test_type", { length: 20 }).notNull(), // 'ielts', 'toefl', 'pte', 'duolingo'
  overallScore: decimal("overall_score", { precision: 4, scale: 1 }).notNull(),
  listeningScore: decimal("listening_score", { precision: 4, scale: 1 }),
  readingScore: decimal("reading_score", { precision: 4, scale: 1 }),
  writingScore: decimal("writing_score", { precision: 4, scale: 1 }),
  speakingScore: decimal("speaking_score", { precision: 4, scale: 1 }),
  testDate: date("test_date"),
  expiryDate: date("expiry_date"),
  documentId: varchar("document_id").references(() => documents.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Student Employment History table (optional)
export const studentEmployments = pgTable("student_employments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentProfileId: varchar("student_profile_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  jobTitle: varchar("job_title", { length: 100 }).notNull(),
  company: text("company").notNull(),
  industry: varchar("industry", { length: 100 }),
  employmentType: varchar("employment_type", { length: 30 }), // 'full_time', 'part_time', 'internship', 'contract', 'freelance'
  country: text("country"),
  city: text("city"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  isCurrentlyWorking: boolean("is_currently_working").default(false),
  responsibilities: text("responsibilities"),
  achievements: text("achievements"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// University Team Members table
export const universityTeamMembers = pgTable("university_team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  universityId: varchar("university_id").notNull().references(() => universities.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 30 }).notNull().default("course_manager"), // 'super_admin', 'admin', 'course_manager', 'application_manager'
  isActive: boolean("is_active").default(true),
  invitedBy: varchar("invited_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Platform Admin Team Members table (ANZ Global Team)
export const adminTeamMembers = pgTable("admin_team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 30 }).notNull().default("support_staff"), // 'super_admin', 'support_manager', 'support_staff', 'operations_staff'
  isActive: boolean("is_active").default(true),
  invitedBy: varchar("invited_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Documents table for student-university document exchange
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 50 }).notNull(), // 'passport', 'transcript', 'degree_certificate', 'ielts', 'toefl', 'pte', 'cv', 'recommendation_letter', 'bank_statement', 'visa_document', 'offer_letter', 'coe', 'other'
  title: text("title").notNull(),
  description: text("description"),
  filePath: text("file_path").notNull(), // Object storage path
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"), // in bytes
  mimeType: varchar("mime_type", { length: 100 }),
  
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }), // Who uploaded the document
  senderType: varchar("sender_type", { length: 20 }).notNull(), // 'student' or 'university'
  
  recipientId: varchar("recipient_id").references(() => users.id, { onDelete: "cascade" }), // Who receives the document (can be null for general submissions)
  recipientType: varchar("recipient_type", { length: 20 }), // 'student', 'university', or null
  
  applicationId: varchar("application_id").references(() => applications.id, { onDelete: "cascade" }), // Optional link to application
  universityId: varchar("university_id").references(() => universities.id, { onDelete: "cascade" }), // Optional link to university
  studentProfileId: varchar("student_profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }), // Link to student profile
  folderId: varchar("folder_id").references(() => documentFolders.id, { onDelete: "set null" }), // Optional folder organization
  
  status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending', 'reviewed', 'approved', 'rejected'
  reviewNotes: text("review_notes"),
  reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("documents_sender_idx").on(table.senderId),
  index("documents_recipient_idx").on(table.recipientId),
  index("documents_application_idx").on(table.applicationId),
  index("documents_student_profile_idx").on(table.studentProfileId),
  index("documents_status_idx").on(table.status),
]);

// Document folders for organizing documents
export const documentFolders = pgTable("document_folders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  parentFolderId: varchar("parent_folder_id"), // Self-reference for nested folders
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ownerType: varchar("owner_type", { length: 20 }).notNull(), // 'student', 'university', 'admin'
  studentProfileId: varchar("student_profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }),
  universityId: varchar("university_id").references(() => universities.id, { onDelete: "cascade" }),
  color: varchar("color", { length: 7 }), // Hex color for folder
  icon: varchar("icon", { length: 50 }), // Icon name
  isDefault: boolean("is_default").default(false), // System default folders
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("doc_folders_owner_idx").on(table.ownerId),
  index("doc_folders_parent_idx").on(table.parentFolderId),
  index("doc_folders_student_profile_idx").on(table.studentProfileId),
]);

// Document comments for collaboration
export const documentComments = pgTable("document_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  isInternal: boolean("is_internal").default(false), // Internal university notes vs. visible to student
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("doc_comments_document_idx").on(table.documentId),
  index("doc_comments_user_idx").on(table.userId),
]);

// Document requests table for universities to request specific documents from students
export const documentRequests = pgTable("document_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestedBy: varchar("requested_by").notNull().references(() => users.id, { onDelete: "cascade" }), // University user
  universityId: varchar("university_id").notNull().references(() => universities.id, { onDelete: "cascade" }), // University making the request
  studentId: varchar("student_id").notNull().references(() => users.id, { onDelete: "cascade" }), // Student user
  studentProfileId: varchar("student_profile_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  applicationId: varchar("application_id").references(() => applications.id, { onDelete: "cascade" }), // Optional link to application
  
  documentType: varchar("document_type", { length: 50 }).notNull(), // Type of document being requested
  title: text("title").notNull(), // Request title
  description: text("description"), // Why document is needed
  priority: varchar("priority", { length: 20 }).default("medium"), // 'low', 'medium', 'high', 'urgent'
  dueDate: timestamp("due_date"), // Optional deadline
  
  status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending', 'uploaded', 'completed', 'cancelled'
  documentId: varchar("document_id").references(() => documents.id, { onDelete: "set null" }), // Linked document when uploaded
  
  requestNotes: text("request_notes"), // Notes from requester
  responseNotes: text("response_notes"), // Notes from student
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("doc_requests_student_idx").on(table.studentId),
  index("doc_requests_student_profile_idx").on(table.studentProfileId),
  index("doc_requests_requested_by_idx").on(table.requestedBy),
  index("doc_requests_university_idx").on(table.universityId),
  index("doc_requests_application_idx").on(table.applicationId),
  index("doc_requests_status_idx").on(table.status),
]);

// Notifications table for all user types
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(), // 'application_submitted', 'application_status_changed', 'new_course', 'document_uploaded', 'team_invite', etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"), // URL to navigate to when clicked
  metadata: jsonb("metadata"), // Additional data (e.g., applicationId, courseId, etc.)
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Conversations table for real-time chat system
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participant1Id: varchar("participant1_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  participant2Id: varchar("participant2_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Ensure each pair of users has only one conversation
  uniqueIndex("unique_participants").on(table.participant1Id, table.participant2Id),
  index("participant1_idx").on(table.participant1Id),
  index("participant2_idx").on(table.participant2Id),
  index("last_message_idx").on(table.lastMessageAt),
]);

// Messages table for storing individual chat messages
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("conversation_idx").on(table.conversationId),
  index("sender_idx").on(table.senderId),
  index("created_at_idx").on(table.createdAt),
]);

// Student leads table for information requests from course pages
export const studentLeads = pgTable("student_leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  visaStatus: text("visa_status").notNull(), // Current visa information/status
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  universityId: varchar("university_id").notNull().references(() => universities.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().default("new"), // 'new', 'contacted', 'converted'
  notes: text("notes"), // Admin/consultant notes
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("course_idx").on(table.courseId),
  index("university_idx").on(table.universityId),
  index("status_idx").on(table.status),
  index("created_at_leads_idx").on(table.createdAt),
]);

// Enums for CSV import batches
export const importBatchTypeEnum = pgEnum('import_batch_type', ['universities', 'courses']);
export const importBatchStatusEnum = pgEnum('import_batch_status', ['pending', 'approved', 'rejected', 'failed']);

// Contact submissions table for general contact form inquiries
export const contactSubmissions = pgTable("contact_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"), // Optional
  category: varchar("category", { length: 50 }).notNull().default("general"), // 'general', 'technical', 'partnership', 'support'
  subject: varchar("subject", { length: 200 }).notNull(),
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("new"), // 'new', 'in_progress', 'resolved', 'closed'
  priority: varchar("priority", { length: 20 }).default("medium"), // 'low', 'medium', 'high'
  assignedTo: varchar("assigned_to").references(() => users.id), // Admin user
  notes: text("notes"), // Internal admin notes
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("status_contact_idx").on(table.status),
  index("category_idx").on(table.category),
  index("assigned_to_idx").on(table.assignedTo),
  index("created_at_contact_idx").on(table.createdAt),
]);

// ============================================
// CRM LEADS AND CONTACTS TABLES
// ============================================

// CRM Leads table - full lead management for student inquiries
export const crmLeads = pgTable("crm_leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Personal Information
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  mobile: text("mobile"),
  city: text("city"),
  
  // Lead Source & Status
  leadStatus: leadStatusEnum("lead_status").notNull().default("not_contacted"),
  leadRating: leadRatingEnum("lead_rating").default("cold"),
  leadCreationMethod: leadCreationMethodEnum("lead_creation_method").default("manually"),
  country: text("country"),
  nationality: text("nationality"),
  
  // Lead Location & Assignment
  branch: text("branch"), // Melbourne, Sydney, etc.
  assignedTo: varchar("assigned_to").references(() => users.id),
  leadOwner: varchar("lead_owner").references(() => users.id),
  
  // Product Interest
  courseName: text("course_name"),
  courseUrl: text("course_url"),
  interestedIn: text("interested_in"),
  courseId: varchar("course_id").references(() => courses.id),
  universityId: varchar("university_id").references(() => universities.id),
  
  // Visit Summary (website tracking)
  firstVisit: timestamp("first_visit"),
  visitorScore: integer("visitor_score"),
  referrer: text("referrer"),
  averageTimeSpent: integer("average_time_spent"), // in minutes
  mostRecentVisit: timestamp("most_recent_visit"),
  firstPageVisited: text("first_page_visited"),
  numberOfChats: integer("number_of_chats").default(0),
  daysVisited: integer("days_visited").default(0),
  
  // Additional Information
  bestTimeToContact: text("best_time_to_contact"),
  ieltsScore: text("ielts_score"),
  preferredInstitution: text("preferred_institution"),
  languageStream: text("language_stream"),
  programDiscipline: text("program_discipline"),
  scheduledAppointment: timestamp("scheduled_appointment"),
  whereToStudy: text("where_to_study"),
  programType: text("program_type"),
  subjectToStudy: text("subject_to_study"),
  
  // Facebook Ads Details
  fbAdAccount: text("fb_ad_account"),
  fbLeadForm: text("fb_lead_form"),
  fbAdAccountId: text("fb_ad_account_id"),
  fbLeadFormId: text("fb_lead_form_id"),
  fbAdCampaign: text("fb_ad_campaign"),
  
  // Record Information
  workdriveFolderUrl: text("workdrive_folder_url"),
  workdriveFolderId: text("workdrive_folder_id"),
  notes: text("notes"),
  
  // Converted contact reference
  convertedContactId: varchar("converted_contact_id"),
  convertedAt: timestamp("converted_at"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastActivityTime: timestamp("last_activity_time"),
}, (table) => ({
  leadStatusIdx: index("crm_leads_status_idx").on(table.leadStatus),
  leadOwnerIdx: index("crm_leads_owner_idx").on(table.leadOwner),
  assignedToIdx: index("crm_leads_assigned_idx").on(table.assignedTo),
  branchIdx: index("crm_leads_branch_idx").on(table.branch),
  emailIdx: index("crm_leads_email_idx").on(table.email),
  createdAtIdx: index("crm_leads_created_at_idx").on(table.createdAt),
  ratingIdx: index("crm_leads_rating_idx").on(table.leadRating),
}));

// Lead Status History for tracking status changes with timeline
export const leadStatusHistory = pgTable("lead_status_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull().references(() => crmLeads.id, { onDelete: "cascade" }),
  fromStatus: leadStatusEnum("from_status"),
  toStatus: leadStatusEnum("to_status").notNull(),
  changedBy: varchar("changed_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  leadIdIdx: index("lead_status_history_lead_idx").on(table.leadId),
  createdAtIdx: index("lead_status_history_created_idx").on(table.createdAt),
}));

// CRM Contacts table - categorized organization contacts
export const crmContacts = pgTable("crm_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Basic Information
  photo: text("photo"),
  contactType: contactTypeEnum("contact_type").notNull().default("none"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  mobile: text("mobile").notNull(),
  phone: text("phone"),
  nationality: text("nationality"),
  country: text("country"),
  
  // Address
  unitNo: text("unit_no"),
  street: text("street"),
  suburb: text("suburb"),
  state: text("state"),
  postcode: text("postcode"),
  
  // Emergency Contact Details
  emergencyContactRelationship: text("emergency_contact_relationship"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactMobile: text("emergency_contact_mobile"),
  emergencyContactAddress: text("emergency_contact_address"),
  
  // Record Information
  contactOwner: varchar("contact_owner").references(() => users.id),
  workdriveFolderUrl: text("workdrive_folder_url"),
  workdriveFolderId: text("workdrive_folder_id"),
  
  // Visit Summary (for website tracking)
  firstVisit: timestamp("first_visit"),
  visitorScore: integer("visitor_score"),
  referrer: text("referrer"),
  averageTimeSpent: integer("average_time_spent"),
  
  // Linked Accounts (for institutions/organizations)
  linkedAccountId: varchar("linked_account_id"),
  linkedAccountName: text("linked_account_name"),
  
  // Source lead reference
  sourceLeadId: varchar("source_lead_id").references(() => crmLeads.id),
  
  // Notes
  notes: text("notes"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  contactTypeIdx: index("crm_contacts_type_idx").on(table.contactType),
  contactOwnerIdx: index("crm_contacts_owner_idx").on(table.contactOwner),
  emailIdx: index("crm_contacts_email_idx").on(table.email),
  createdAtIdx: index("crm_contacts_created_at_idx").on(table.createdAt),
  sourceLeadIdx: index("crm_contacts_source_lead_idx").on(table.sourceLeadId),
}));

// CSV Import batches table for bulk import with approval workflow
export const importBatches = pgTable("import_batches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: importBatchTypeEnum("type").notNull(),
  status: importBatchStatusEnum("status").notNull().default("pending"),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  fileName: text("file_name").notNull(),
  rawCsvText: text("raw_csv_text").notNull(), // Original CSV content for audit
  rawData: jsonb("raw_data").notNull(), // Parsed CSV data with per-row validation flags (includes isValid for each row)
  validationErrors: jsonb("validation_errors"), // Array of validation issues
  errorCount: integer("error_count").default(0), // Count of rows with validation errors
  validCount: integer("valid_count").default(0), // Count of valid rows
  importedCount: integer("imported_count").default(0),
  totalCount: integer("total_count").notNull(),
  notes: text("notes"), // Admin notes/reason for rejection
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
}, (table) => [
  index("type_status_idx").on(table.type, table.status),
  index("uploaded_by_idx").on(table.uploadedBy),
  index("created_at_import_idx").on(table.createdAt),
]);

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  university: one(universities, {
    fields: [users.id],
    references: [universities.userId],
  }),
  studentProfile: one(studentProfiles, {
    fields: [users.id],
    references: [studentProfiles.userId],
  }),
  adminTeamMember: one(adminTeamMembers, {
    fields: [users.id],
    references: [adminTeamMembers.userId],
  }),
  notifications: many(notifications),
}));

export const universitiesRelations = relations(universities, ({ one, many }) => ({
  user: one(users, {
    fields: [universities.userId],
    references: [users.id],
  }),
  courses: many(courses),
  teamMembers: many(universityTeamMembers),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  university: one(universities, {
    fields: [courses.universityId],
    references: [universities.id],
  }),
  applications: many(applications),
  courseComparisons: many(courseComparisons),
}));

export const studentProfilesRelations = relations(studentProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [studentProfiles.userId],
    references: [users.id],
  }),
  applications: many(applications),
  educations: many(studentEducations),
  languageScores: many(studentLanguageScores),
  employments: many(studentEmployments),
  favorites: many(favorites),
  courseComparisons: many(courseComparisons),
}));

export const studentEducationsRelations = relations(studentEducations, ({ one }) => ({
  studentProfile: one(studentProfiles, {
    fields: [studentEducations.studentProfileId],
    references: [studentProfiles.id],
  }),
  document: one(documents, {
    fields: [studentEducations.documentId],
    references: [documents.id],
  }),
}));

export const studentLanguageScoresRelations = relations(studentLanguageScores, ({ one }) => ({
  studentProfile: one(studentProfiles, {
    fields: [studentLanguageScores.studentProfileId],
    references: [studentProfiles.id],
  }),
  document: one(documents, {
    fields: [studentLanguageScores.documentId],
    references: [documents.id],
  }),
}));

export const studentEmploymentsRelations = relations(studentEmployments, ({ one }) => ({
  studentProfile: one(studentProfiles, {
    fields: [studentEmployments.studentProfileId],
    references: [studentProfiles.id],
  }),
}));

export const applicationsRelations = relations(applications, ({ one }) => ({
  course: one(courses, {
    fields: [applications.courseId],
    references: [courses.id],
  }),
  student: one(studentProfiles, {
    fields: [applications.studentId],
    references: [studentProfiles.id],
  }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  studentProfile: one(studentProfiles, {
    fields: [favorites.studentProfileId],
    references: [studentProfiles.id],
  }),
}));

export const courseComparisonsRelations = relations(courseComparisons, ({ one }) => ({
  studentProfile: one(studentProfiles, {
    fields: [courseComparisons.studentProfileId],
    references: [studentProfiles.id],
  }),
  course: one(courses, {
    fields: [courseComparisons.courseId],
    references: [courses.id],
  }),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  referrer: one(studentProfiles, {
    fields: [referrals.referrerId],
    references: [studentProfiles.id],
  }),
  referred: one(studentProfiles, {
    fields: [referrals.referredId],
    references: [studentProfiles.id],
  }),
}));

export const universityTeamMembersRelations = relations(universityTeamMembers, ({ one }) => ({
  university: one(universities, {
    fields: [universityTeamMembers.universityId],
    references: [universities.id],
  }),
  user: one(users, {
    fields: [universityTeamMembers.userId],
    references: [users.id],
  }),
}));

export const adminTeamMembersRelations = relations(adminTeamMembers, ({ one }) => ({
  user: one(users, {
    fields: [adminTeamMembers.userId],
    references: [users.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  sender: one(users, {
    fields: [documents.senderId],
    references: [users.id],
  }),
  recipient: one(users, {
    fields: [documents.recipientId],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [documents.reviewedBy],
    references: [users.id],
  }),
  application: one(applications, {
    fields: [documents.applicationId],
    references: [applications.id],
  }),
  university: one(universities, {
    fields: [documents.universityId],
    references: [universities.id],
  }),
  studentProfile: one(studentProfiles, {
    fields: [documents.studentProfileId],
    references: [studentProfiles.id],
  }),
  folder: one(documentFolders, {
    fields: [documents.folderId],
    references: [documentFolders.id],
  }),
  comments: many(documentComments),
}));

export const documentFoldersRelations = relations(documentFolders, ({ one, many }) => ({
  owner: one(users, {
    fields: [documentFolders.ownerId],
    references: [users.id],
  }),
  studentProfile: one(studentProfiles, {
    fields: [documentFolders.studentProfileId],
    references: [studentProfiles.id],
  }),
  university: one(universities, {
    fields: [documentFolders.universityId],
    references: [universities.id],
  }),
  documents: many(documents),
}));

export const documentCommentsRelations = relations(documentComments, ({ one }) => ({
  document: one(documents, {
    fields: [documentComments.documentId],
    references: [documents.id],
  }),
  user: one(users, {
    fields: [documentComments.userId],
    references: [users.id],
  }),
}));

export const documentRequestsRelations = relations(documentRequests, ({ one }) => ({
  requester: one(users, {
    fields: [documentRequests.requestedBy],
    references: [users.id],
  }),
  university: one(universities, {
    fields: [documentRequests.universityId],
    references: [universities.id],
  }),
  student: one(users, {
    fields: [documentRequests.studentId],
    references: [users.id],
  }),
  studentProfile: one(studentProfiles, {
    fields: [documentRequests.studentProfileId],
    references: [studentProfiles.id],
  }),
  application: one(applications, {
    fields: [documentRequests.applicationId],
    references: [applications.id],
  }),
  document: one(documents, {
    fields: [documentRequests.documentId],
    references: [documents.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  participant1: one(users, {
    fields: [conversations.participant1Id],
    references: [users.id],
  }),
  participant2: one(users, {
    fields: [conversations.participant2Id],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

export const studentLeadsRelations = relations(studentLeads, ({ one }) => ({
  course: one(courses, {
    fields: [studentLeads.courseId],
    references: [courses.id],
  }),
  university: one(universities, {
    fields: [studentLeads.universityId],
    references: [universities.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
}).extend({
  entityType: z.enum(['user', 'institution', 'course', 'application', 'student_lead', 'inquiry_lead', 'blog', 'document', 'scraped_course', 'import_batch', 'team_member', 'notification', 'task', 'reminder']),
  action: z.enum(['created', 'updated', 'deleted', 'approved', 'rejected', 'activated', 'deactivated', 'assigned', 'unassigned', 'login', 'logout', 'status_changed', 'imported', 'exported']),
  entityId: z.string().min(1, "Entity ID is required"),
});

export const insertUniversitySchema = createInsertSchema(universities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Validate campus addresses structure
  campusAddresses: z.array(z.object({
    name: z.string().optional(),
    address: z.string(),
    city: z.string().optional(),
    state: z.string().optional(),
    postcode: z.string().optional(),
    country: z.string().optional(),
  })).optional(),
  // Validate scholarship range
  scholarshipPercentageMin: z.number().int().min(0).max(100).optional(),
  scholarshipPercentageMax: z.number().int().min(0).max(100).optional(),
  // Validate new filter fields
  deliveryModes: z.array(z.string()).optional(),
  intakePeriods: z.array(z.string()).optional(),
  facilities: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  tuitionFeesMin: z.number().min(0).optional(),
  tuitionFeesMax: z.number().min(0).optional(),
  accreditationStatus: z.string().optional(),
  rankingBand: z.string().optional(),
  internationalStudentSupport: z.boolean().optional(),
}).refine((data) => {
  // If both scholarship min and max are provided, ensure min <= max
  if (data.scholarshipPercentageMin !== null && data.scholarshipPercentageMin !== undefined &&
      data.scholarshipPercentageMax !== null && data.scholarshipPercentageMax !== undefined) {
    return data.scholarshipPercentageMin <= data.scholarshipPercentageMax;
  }
  return true;
}, {
  message: "Scholarship minimum percentage must be less than or equal to maximum percentage",
  path: ["scholarshipPercentageMin"],
}).refine((data) => {
  // If both tuition min and max are provided, ensure min <= max
  if (data.tuitionFeesMin !== null && data.tuitionFeesMin !== undefined &&
      data.tuitionFeesMax !== null && data.tuitionFeesMax !== undefined) {
    return data.tuitionFeesMin <= data.tuitionFeesMax;
  }
  return true;
}, {
  message: "Minimum tuition fees must be less than or equal to maximum tuition fees",
  path: ["tuitionFeesMin"],
});

// Helper for optional numeric fields - converts empty strings to undefined, parses numeric strings, rejects invalid strings
const optionalNumber = z.preprocess(
  (val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    if (typeof val === "number") return val;
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (trimmed === "") return undefined;
      const parsed = Number(trimmed);
      if (isNaN(parsed)) return val; // Return original to trigger validation error
      return parsed;
    }
    return val;
  },
  z.number().optional()
);

const optionalInteger = z.preprocess(
  (val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    if (typeof val === "number") return Number.isInteger(val) ? val : val; // Return floats as-is for validation error
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (trimmed === "") return undefined;
      // Only accept integer strings (no decimals)
      if (!/^-?\d+$/.test(trimmed)) return val; // Return original to trigger validation error
      const parsed = parseInt(trimmed, 10);
      if (isNaN(parsed)) return val;
      return parsed;
    }
    return val;
  },
  z.number().int().optional()
);

// Base schema without refine() - can be extended by frontend forms
const baseCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvalStatus: true, // Set automatically to 'pending'
  rejectionReason: true, // Only set by admins
  submittedForApprovalAt: true, // Set automatically
  approvedAt: true, // Set by admins
  approvedBy: true, // Set by admins
}).extend({
  // Validate discipline
  discipline: z.enum([
    'Accounting, Business & Finance',
    'Agriculture & Forestry',
    'Applied Sciences & Professions',
    'Arts, Design & Architecture',
    'Computer Science & IT',
    'Education & Training',
    'Engineering & Technology',
    'Environmental Studies & Earth Sciences',
    'Hospitality, Leisure & Sports',
    'Humanities',
    'Journalism & Media',
    'Law',
    'Medicine & Health',
    'Short Courses',
    'Trade',
  ]).optional(),
  
  // Validate course level - enforce enum values
  level: z.enum([
    'VCE (11-12)',
    'Certificate II',
    'Certificate III',
    'Certificate IV',
    'Diploma',
    'Advanced Diploma',
    'Graduate Certificate',
    'Graduate Diploma',
    'Bachelor Degree',
    'Professional Year',
    'Masters Degree',
    'Doctoral Degree',
    'Higher Doctoral Degree',
    'ELICOS',
  ]),
  
  // Validate array fields - ensure they're arrays and contain valid data
  intakes: z.array(z.string()).optional().default([]),
  studyAreas: z.array(z.string()).optional().default([]),
  careerOutcomes: z.array(z.string()).optional().default([]),
  pathways: z.array(z.string()).optional().default([]),
  campusLocations: z.array(z.string()).optional().default([]),
  images: z.array(z.string()).optional().default([]),
  
  // Validate numeric fields with empty string handling
  fees: optionalNumber,
  durationMonths: optionalInteger,
  durationWeeks: optionalInteger,
  costOfLiving: optionalNumber,
  applicationFees: optionalNumber,
  minimumAge: optionalInteger,
  
  // Validate scholarship range
  scholarshipPercentageMin: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      if (typeof val === "number") return Number.isInteger(val) ? val : val; // Return floats as-is for validation error
      if (typeof val === "string") {
        const trimmed = val.trim();
        if (trimmed === "") return undefined;
        // Only accept integer strings (no decimals)
        if (!/^-?\d+$/.test(trimmed)) return val; // Return original to trigger validation error
        const parsed = parseInt(trimmed, 10);
        if (isNaN(parsed)) return val;
        return parsed;
      }
      return val;
    },
    z.number().int().min(0).max(100).optional()
  ),
  scholarshipPercentageMax: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      if (typeof val === "number") return Number.isInteger(val) ? val : val; // Return floats as-is for validation error
      if (typeof val === "string") {
        const trimmed = val.trim();
        if (trimmed === "") return undefined;
        // Only accept integer strings (no decimals)
        if (!/^-?\d+$/.test(trimmed)) return val; // Return original to trigger validation error
        const parsed = parseInt(trimmed, 10);
        if (isNaN(parsed)) return val;
        return parsed;
      }
      return val;
    },
    z.number().int().min(0).max(100).optional()
  ),
  
  // Validate English requirements structure
  englishRequirementsStructured: z.object({
    IELTS: z.object({
      overall: z.number().min(0).max(9).optional(),
      min_each_band: z.number().min(0).max(9).optional(),
    }).optional(),
    TOEFL: z.object({
      overall: z.number().min(0).max(120).optional(),
    }).optional(),
    PTE: z.object({
      overall: z.number().min(0).max(90).optional(),
    }).optional(),
    Duolingo: z.object({
      overall: z.number().min(0).max(160).optional(),
    }).optional(),
  }).optional(),
  
  // Validate delivery mode
  deliveryMode: z.enum(['online', 'on-campus', 'hybrid']).optional(),
});

// Refined schema with validation - use for backend
export const insertCourseSchema = baseCourseSchema.refine((data) => {
  // If both min and max are provided, ensure min <= max
  if (data.scholarshipPercentageMin !== null && data.scholarshipPercentageMin !== undefined &&
      data.scholarshipPercentageMax !== null && data.scholarshipPercentageMax !== undefined) {
    return data.scholarshipPercentageMin <= data.scholarshipPercentageMax;
  }
  return true;
}, {
  message: "Scholarship minimum percentage must be less than or equal to maximum percentage",
  path: ["scholarshipPercentageMin"],
});

// Export base schema for frontend forms that need to extend it
export { baseCourseSchema };

// Sub-discipline schemas
export const insertSubDisciplineSchema = createInsertSchema(subDisciplines).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  usageCount: true,
}).extend({
  discipline: z.string().min(1, "Discipline is required"),
  name: z.string().min(1, "Sub-discipline name is required"),
  slug: z.string().min(1, "Slug is required"),
});

export type InsertSubDiscipline = z.infer<typeof insertSubDisciplineSchema>;
export type SubDiscipline = typeof subDisciplines.$inferSelect;


export const insertStudentProfileSchema = createInsertSchema(studentProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApplicationStageHistorySchema = createInsertSchema(applicationStageHistory).omit({
  id: true,
  createdAt: true,
});
export type InsertApplicationStageHistory = z.infer<typeof insertApplicationStageHistorySchema>;
export type ApplicationStageHistory = typeof applicationStageHistory.$inferSelect;

export const insertApplicationStageDocumentSchema = createInsertSchema(applicationStageDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertApplicationStageDocument = z.infer<typeof insertApplicationStageDocumentSchema>;
export type ApplicationStageDocument = typeof applicationStageDocuments.$inferSelect;

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
  createdAt: true,
});

export const insertCourseComparisonSchema = createInsertSchema(courseComparisons).omit({
  id: true,
  createdAt: true,
});

export const insertStudentEducationSchema = createInsertSchema(studentEducations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStudentLanguageScoreSchema = createInsertSchema(studentLanguageScores).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStudentEmploymentSchema = createInsertSchema(studentEmployments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUniversityTeamMemberSchema = createInsertSchema(universityTeamMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAdminTeamMemberSchema = createInsertSchema(adminTeamMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentFolderSchema = createInsertSchema(documentFolders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentCommentSchema = createInsertSchema(documentComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentRequestSchema = createInsertSchema(documentRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCourseRecommendationSchema = createInsertSchema(courseRecommendations).omit({
  id: true,
  createdAt: true,
}).extend({
  matchScore: z.number().min(0).max(100),
  matchFactors: z.object({
    eligibility_match: z.number().min(0).max(100).optional(),
    career_alignment: z.number().min(0).max(100).optional(),
    academic_fit: z.number().min(0).max(100).optional(),
    location_preference: z.number().min(0).max(100).optional(),
    financial_viability: z.number().min(0).max(100).optional(),
  }).optional(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  lastMessageAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertStudentLeadSchema = createInsertSchema(studentLeads).omit({
  id: true,
  createdAt: true,
});

export const insertContactSubmissionSchema = createInsertSchema(contactSubmissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertImportBatchSchema = createInsertSchema(importBatches).omit({
  id: true,
  createdAt: true,
  processedAt: true,
});

export const rejectionSchema = z.object({
  reason: z.string().min(1, "Rejection reason is required").max(1000, "Rejection reason is too long"),
});

export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

export type University = typeof universities.$inferSelect;
export type InsertUniversity = z.infer<typeof insertUniversitySchema>;

export type Course = typeof courses.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type CourseWithUniversity = Course & { university?: University | null };
export type CourseWithDetails = CourseWithUniversity;

export type StudentProfile = typeof studentProfiles.$inferSelect;
export type InsertStudentProfile = z.infer<typeof insertStudentProfileSchema>;

export type Application = typeof applications.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;

export type CourseComparison = typeof courseComparisons.$inferSelect;
export type InsertCourseComparison = z.infer<typeof insertCourseComparisonSchema>;

export type CourseRecommendation = typeof courseRecommendations.$inferSelect;
export type InsertCourseRecommendation = z.infer<typeof insertCourseRecommendationSchema>;

export type StudentEducation = typeof studentEducations.$inferSelect;
export type InsertStudentEducation = z.infer<typeof insertStudentEducationSchema>;

export type StudentLanguageScore = typeof studentLanguageScores.$inferSelect;
export type InsertStudentLanguageScore = z.infer<typeof insertStudentLanguageScoreSchema>;

export type StudentEmployment = typeof studentEmployments.$inferSelect;
export type InsertStudentEmployment = z.infer<typeof insertStudentEmploymentSchema>;

export type UniversityTeamMember = typeof universityTeamMembers.$inferSelect;
export type InsertUniversityTeamMember = z.infer<typeof insertUniversityTeamMemberSchema>;

export type AdminTeamMember = typeof adminTeamMembers.$inferSelect;
export type InsertAdminTeamMember = z.infer<typeof insertAdminTeamMemberSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type DocumentFolder = typeof documentFolders.$inferSelect;
export type InsertDocumentFolder = z.infer<typeof insertDocumentFolderSchema>;

export type DocumentComment = typeof documentComments.$inferSelect;
export type InsertDocumentComment = z.infer<typeof insertDocumentCommentSchema>;

export type DocumentRequest = typeof documentRequests.$inferSelect;
export type InsertDocumentRequest = z.infer<typeof insertDocumentRequestSchema>;

export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type StudentLead = typeof studentLeads.$inferSelect;
export type InsertStudentLead = z.infer<typeof insertStudentLeadSchema>;

export type ContactSubmission = typeof contactSubmissions.$inferSelect;
export type InsertContactSubmission = z.infer<typeof insertContactSubmissionSchema>;

export type ImportBatch = typeof importBatches.$inferSelect;
export type InsertImportBatch = z.infer<typeof insertImportBatchSchema>;

// Blog Status Enum
export const blogStatusEnum = pgEnum("blog_status", ["draft", "published"]);

// Blogs table
export const blogs = pgTable("blogs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  featuredImageUrl: text("featured_image_url"),
  category: varchar("category", { length: 100 }),
  tags: text("tags").array(),
  status: blogStatusEnum("status").notNull().default("draft"),
  
  // SEO fields
  metaTitle: varchar("meta_title", { length: 60 }),
  metaDescription: text("meta_description"),
  ogImageUrl: text("og_image_url"),
  
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  slugIdx: uniqueIndex("blogs_slug_unique_idx").on(table.slug),
  statusIdx: index("blogs_status_idx").on(table.status),
  categoryIdx: index("blogs_category_idx").on(table.category),
  tagsIdx: index("blogs_tags_gin_idx").using("gin", table.tags),
  publishedAtIdx: index("blogs_published_at_idx").on(table.publishedAt),
}));

export const insertBlogSchema = createInsertSchema(blogs).omit({
  id: true,
  authorId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  title: z.string().min(1).max(200),
  excerpt: z.string().max(300).optional(),
  content: z.string().min(1),
  category: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
  metaTitle: z.string().max(60).optional(),
  metaDescription: z.string().max(160).optional(),
});

export type Blog = typeof blogs.$inferSelect;
export type InsertBlog = z.infer<typeof insertBlogSchema>;

// ============================================
// CMS CONTENT BLOCKS TABLES
// ============================================

// Testimonials table - Student success stories for public display
export const testimonials = pgTable("testimonials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentName: varchar("student_name", { length: 255 }).notNull(),
  studentLocation: varchar("student_location", { length: 255 }), // e.g., "Melbourne, Australia"
  studentCountry: varchar("student_country", { length: 100 }), // Origin country
  institution: varchar("institution", { length: 255 }), // Where they study
  course: varchar("course", { length: 255 }), // What they study
  title: varchar("title", { length: 255 }).notNull(), // Quote headline
  content: text("content").notNull(), // Full testimonial text
  imageUrl: text("image_url"), // Student photo
  rating: integer("rating").default(5), // 1-5 star rating
  status: cmsStatusEnum("status").notNull().default("draft"),
  displayOrder: integer("display_order").default(0), // For sorting on frontend
  isFeatured: boolean("is_featured").default(false), // Show on landing page
  showOnPage: text("show_on_page").array(), // Which pages to show on: ['landing', 'study-australia', 'reviews']
  
  // Audit fields
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  updatedById: varchar("updated_by_id").references(() => users.id, { onDelete: "set null" }),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  statusIdx: index("testimonials_status_idx").on(table.status),
  featuredIdx: index("testimonials_featured_idx").on(table.isFeatured),
  orderIdx: index("testimonials_order_idx").on(table.displayOrder),
}));

// FAQs table - Frequently asked questions
export const faqs = pgTable("faqs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  question: text("question").notNull(),
  answer: text("answer").notNull(), // Supports markdown
  category: faqCategoryEnum("category").notNull().default("general"),
  status: cmsStatusEnum("status").notNull().default("draft"),
  displayOrder: integer("display_order").default(0),
  showOnPage: text("show_on_page").array(), // Which pages to show on
  
  // Audit fields
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  updatedById: varchar("updated_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  statusIdx: index("faqs_status_idx").on(table.status),
  categoryIdx: index("faqs_category_idx").on(table.category),
  orderIdx: index("faqs_order_idx").on(table.displayOrder),
}));

// Public team members table - For about page (founders, leadership)
export const publicTeamMembers = pgTable("public_team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 255 }).notNull(), // e.g., "Co-Founder & CEO"
  bio: text("bio"), // Short biography
  imageUrl: text("image_url"),
  linkedinUrl: text("linkedin_url"),
  twitterUrl: text("twitter_url"),
  emailAddress: varchar("email_address", { length: 255 }),
  displayOrder: integer("display_order").default(0),
  status: cmsStatusEnum("status").notNull().default("draft"),
  isFeatured: boolean("is_featured").default(false), // Show prominently
  
  // Audit fields
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  updatedById: varchar("updated_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  statusIdx: index("public_team_members_status_idx").on(table.status),
  orderIdx: index("public_team_members_order_idx").on(table.displayOrder),
}));

// Site settings table - Global configuration (contact info, social links, etc.)
export const siteSettings = pgTable("site_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  settingKey: varchar("setting_key", { length: 100 }).notNull().unique(),
  settingValue: text("setting_value"),
  settingType: varchar("setting_type", { length: 50 }).notNull().default("text"), // text, html, json, image, boolean
  category: varchar("category", { length: 100 }).notNull().default("general"), // contact, social, branding, seo
  label: varchar("label", { length: 255 }).notNull(), // Human-readable label
  description: text("description"), // Help text for admins
  isPublic: boolean("is_public").default(true), // Whether to expose via public API
  
  // Audit fields
  updatedById: varchar("updated_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  keyIdx: uniqueIndex("site_settings_key_idx").on(table.settingKey),
  categoryIdx: index("site_settings_category_idx").on(table.category),
}));

// Content snippets table - Reusable text blocks (mission statement, taglines, etc.)
export const contentSnippets = pgTable("content_snippets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  snippetKey: varchar("snippet_key", { length: 100 }).notNull().unique(), // e.g., "mission_statement", "hero_headline"
  title: varchar("title", { length: 255 }).notNull(), // Display name for admins
  content: text("content").notNull(), // Supports markdown
  contentHtml: text("content_html"), // Pre-rendered HTML (optional)
  status: cmsStatusEnum("status").notNull().default("draft"),
  pageLocation: varchar("page_location", { length: 100 }), // e.g., "landing", "about", "study-australia"
  sectionName: varchar("section_name", { length: 100 }), // e.g., "hero", "features", "cta"
  
  // Version tracking
  version: integer("version").default(1),
  previousVersionId: varchar("previous_version_id"),
  
  // Audit fields
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  updatedById: varchar("updated_by_id").references(() => users.id, { onDelete: "set null" }),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  keyIdx: uniqueIndex("content_snippets_key_idx").on(table.snippetKey),
  statusIdx: index("content_snippets_status_idx").on(table.status),
  pageIdx: index("content_snippets_page_idx").on(table.pageLocation),
}));

// Insert schemas for CMS tables
export const insertTestimonialSchema = createInsertSchema(testimonials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  studentName: z.string().min(2).max(255),
  title: z.string().min(5).max(255),
  content: z.string().min(20).max(5000),
  rating: z.number().int().min(1).max(5).optional(),
  showOnPage: z.array(z.string()).optional(),
});

export const updateTestimonialSchema = insertTestimonialSchema.partial();

export const insertFaqSchema = createInsertSchema(faqs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  question: z.string().min(10).max(500),
  answer: z.string().min(20).max(5000),
  showOnPage: z.array(z.string()).optional(),
});

export const updateFaqSchema = insertFaqSchema.partial();

export const insertPublicTeamMemberSchema = createInsertSchema(publicTeamMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(2).max(255),
  role: z.string().min(2).max(255),
  bio: z.string().max(2000).optional(),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  twitterUrl: z.string().url().optional().or(z.literal("")),
  emailAddress: z.string().email().optional().or(z.literal("")),
});

export const updatePublicTeamMemberSchema = insertPublicTeamMemberSchema.partial();

export const insertSiteSettingSchema = createInsertSchema(siteSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  settingKey: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/, "Key must be lowercase with underscores"),
  label: z.string().min(1).max(255),
});

export const updateSiteSettingSchema = insertSiteSettingSchema.partial().omit({ settingKey: true });

export const insertContentSnippetSchema = createInsertSchema(contentSnippets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  version: true,
  previousVersionId: true,
}).extend({
  snippetKey: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/, "Key must be lowercase with underscores"),
  title: z.string().min(1).max(255),
  content: z.string().min(1),
});

export const updateContentSnippetSchema = insertContentSnippetSchema.partial().omit({ snippetKey: true });

// CMS Types
export type Testimonial = typeof testimonials.$inferSelect;
export type InsertTestimonial = z.infer<typeof insertTestimonialSchema>;
export type UpdateTestimonial = z.infer<typeof updateTestimonialSchema>;

export type Faq = typeof faqs.$inferSelect;
export type InsertFaq = z.infer<typeof insertFaqSchema>;
export type UpdateFaq = z.infer<typeof updateFaqSchema>;

export type PublicTeamMember = typeof publicTeamMembers.$inferSelect;
export type InsertPublicTeamMember = z.infer<typeof insertPublicTeamMemberSchema>;
export type UpdatePublicTeamMember = z.infer<typeof updatePublicTeamMemberSchema>;

export type SiteSetting = typeof siteSettings.$inferSelect;
export type InsertSiteSetting = z.infer<typeof insertSiteSettingSchema>;
export type UpdateSiteSetting = z.infer<typeof updateSiteSettingSchema>;

export type ContentSnippet = typeof contentSnippets.$inferSelect;
export type InsertContentSnippet = z.infer<typeof insertContentSnippetSchema>;
export type UpdateContentSnippet = z.infer<typeof updateContentSnippetSchema>;

// Contact inquiry type enum
export const contactInquiryTypeEnum = pgEnum("contact_inquiry_type", ["student", "institution"]);

// Contact inquiry status enum
export const contactInquiryStatusEnum = pgEnum("contact_inquiry_status", ["new", "in_progress", "responded", "closed"]);

// Contact inquiries table
export const contactInquiries = pgTable("contact_inquiries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  inquiryType: contactInquiryTypeEnum("inquiry_type").notNull(),
  status: contactInquiryStatusEnum("status").notNull().default("new"),
  
  // Common fields
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  message: text("message").notNull(),
  
  // Student-specific fields
  studentName: varchar("student_name", { length: 255 }),
  country: varchar("country", { length: 100 }),
  courseInterest: varchar("course_interest", { length: 255 }),
  studyLevel: varchar("study_level", { length: 100 }), // Bachelor's, Master's, PhD, etc.
  visaStatus: varchar("visa_status", { length: 100 }), // Need visa, Have visa, etc.
  
  // Institution-specific fields
  institutionName: varchar("institution_name", { length: 255 }),
  contactPerson: varchar("contact_person", { length: 255 }),
  website: varchar("website", { length: 255 }),
  partnershipType: varchar("partnership_type", { length: 100 }), // Recruitment, Academic, Research, etc.
  
  // Tracking fields
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  
  // Admin fields
  assignedTo: varchar("assigned_to").references(() => users.id),
  notes: text("notes"),
  respondedAt: timestamp("responded_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  emailIdx: index("contact_inquiries_email_idx").on(table.email),
  statusIdx: index("contact_inquiries_status_idx").on(table.status),
  typeIdx: index("contact_inquiries_type_idx").on(table.inquiryType),
  createdAtIdx: index("contact_inquiries_created_at_idx").on(table.createdAt),
}));

export const insertContactInquirySchema = createInsertSchema(contactInquiries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  assignedTo: true,
  notes: true,
  respondedAt: true,
}).extend({
  email: z.string().email().max(255),
  phone: z.string().max(50).optional(),
  message: z.string().min(20).max(5000),
  
  // Student fields validation
  studentName: z.string().min(2).max(255).optional(),
  country: z.string().max(100).optional(),
  courseInterest: z.string().max(255).optional(),
  studyLevel: z.string().max(100).optional(),
  visaStatus: z.string().max(100).optional(),
  
  // Institution fields validation
  institutionName: z.string().min(2).max(255).optional(),
  contactPerson: z.string().min(2).max(255).optional(),
  website: z.string().url().max(255).optional().or(z.literal('')),
  partnershipType: z.string().max(100).optional(),
});

export type ContactInquiry = typeof contactInquiries.$inferSelect;
export type InsertContactInquiry = z.infer<typeof insertContactInquirySchema>;

// Chat conversations table
export const chatConversations = pgTable("chat_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id"), // For anonymous users
  title: varchar("title", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("chat_conversations_user_id_idx").on(table.userId),
  sessionIdIdx: index("chat_conversations_session_id_idx").on(table.sessionId),
  createdAtIdx: index("chat_conversations_created_at_idx").on(table.createdAt),
}));

// Chat messages table
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").references(() => chatConversations.id, { onDelete: "cascade" }).notNull(),
  role: varchar("role", { length: 20 }).notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  sources: jsonb("sources"), // Array of source documents used
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  conversationIdIdx: index("chat_messages_conversation_id_idx").on(table.conversationId),
  createdAtIdx: index("chat_messages_created_at_idx").on(table.createdAt),
}));

export const insertChatConversationSchema = createInsertSchema(chatConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
}).extend({
  content: z.string().min(1).max(5000),
  role: z.enum(['user', 'assistant']),
});

export type ChatConversation = typeof chatConversations.$inferSelect;
export type InsertChatConversation = z.infer<typeof insertChatConversationSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// Scraping job status enum
export const scrapingJobStatusEnum = pgEnum('scraping_job_status', [
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
]);

// Scraping templates - pre-configured scraping strategies for common platforms
export const scrapingTemplates = pgTable("scraping_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // e.g., "WordPress University", "Custom CMS"
  description: text("description"),
  platformType: text("platform_type"), // e.g., "wordpress", "custom", "wix"
  selectors: jsonb("selectors"), // JSON with CSS selectors for common elements
  useBrowser: boolean("use_browser").default(false), // Whether to use Playwright
  waitForSelector: text("wait_for_selector"), // Selector to wait for before scraping
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  platformTypeIdx: index("scraping_templates_platform_type_idx").on(table.platformType),
}));

// Scraping jobs table - tracks automated web scraping jobs
export const scrapingJobs = pgTable("scraping_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  institutionId: varchar("institution_id").references(() => universities.id, { onDelete: "cascade" }),
  institutionUrl: text("institution_url").notNull(),
  institutionName: text("institution_name"),
  status: scrapingJobStatusEnum("status").notNull().default("pending"),
  
  // Auto-discovery settings
  useAutoDiscovery: boolean("use_auto_discovery").default(false), // Automatically find course listing page
  discoveredCourseListingUrl: text("discovered_course_listing_url"), // Found course listing URL
  discoveryMethod: text("discovery_method"), // "ai", "regex", or "manual"
  discoveryConfidence: real("discovery_confidence"), // 0.0-1.0 confidence score
  
  // Full website crawling settings
  useFullWebsiteCrawl: boolean("use_full_website_crawl").default(false), // Crawl entire website to discover all courses
  extractInstitutionData: boolean("extract_institution_data").default(false), // Extract institution data during crawl
  
  // Template settings
  templateId: varchar("template_id").references(() => scrapingTemplates.id),
  
  // Progress tracking
  progress: integer("progress").default(0), // Percentage 0-100
  totalPages: integer("total_pages").default(0),
  scrapedPages: integer("scraped_pages").default(0),
  coursesFound: integer("courses_found").default(0),
  coursesExtracted: integer("courses_extracted").default(0),
  
  // Error handling
  errorMessage: text("error_message"),
  errorDetails: jsonb("error_details"), // Detailed error information
  
  // Timestamps
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id), // Admin who triggered the job
}, (table) => ({
  institutionIdIdx: index("scraping_jobs_institution_id_idx").on(table.institutionId),
  statusIdx: index("scraping_jobs_status_idx").on(table.status),
  createdAtIdx: index("scraping_jobs_created_at_idx").on(table.createdAt),
  templateIdIdx: index("scraping_jobs_template_id_idx").on(table.templateId),
}));

// Scraped courses table - staging area for scraped course data before approval
export const scrapedCourses = pgTable("scraped_courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").references(() => scrapingJobs.id, { onDelete: "cascade" }).notNull(),
  institutionId: varchar("institution_id").references(() => universities.id, { onDelete: "cascade" }),
  
  // Provenance tracking
  sourceUrl: text("source_url").notNull(),
  extractedAt: timestamp("extracted_at").defaultNow(),
  confidence: decimal("confidence", { precision: 3, scale: 2 }), // AI confidence score 0.00-1.00
  warnings: text("warnings").array(), // Extraction warnings
  
  // All course fields (mirrors courses table but in staging)
  title: text("title"),
  description: text("description"),
  subject: text("subject"),
  discipline: text("discipline"),
  subDiscipline: text("sub_discipline"), // Will be mapped to subDisciplineId on approval
  level: text("level"),
  duration: text("duration"),
  durationMonths: integer("duration_months"),
  durationWeeks: integer("duration_weeks"),
  fees: decimal("fees", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }),
  location: text("location"),
  country: text("country"),
  startDate: text("start_date"),
  applicationDeadline: text("application_deadline"),
  prerequisites: text("prerequisites"),
  thumbnailUrl: text("thumbnail_url"),
  courseCode: text("course_code"),
  prPathway: boolean("pr_pathway"),
  scholarshipPercentageMin: integer("scholarship_percentage_min"),
  scholarshipPercentageMax: integer("scholarship_percentage_max"),
  eligibilityRequirements: text("eligibility_requirements"),
  englishRequirements: text("english_requirements"),
  curriculumUrl: text("curriculum_url"),
  costOfLiving: decimal("cost_of_living", { precision: 10, scale: 2 }),
  applicationFees: decimal("application_fees", { precision: 10, scale: 2 }),
  images: text("images").array(),
  intakes: text("intakes").array(),
  studyAreas: text("study_areas").array(),
  careerOutcomes: text("career_outcomes").array(),
  careerPath: text("career_path"),
  pathways: text("pathways").array(),
  minimumAge: integer("minimum_age"),
  academicRequirements: text("academic_requirements"),
  englishRequirementsStructured: jsonb("english_requirements_structured"),
  deliveryMode: text("delivery_mode"),
  campusLocations: text("campus_locations").array(),
  workRights: boolean("work_rights"),
  internshipAvailable: boolean("internship_available"),
  internshipDetails: text("internship_details"),
  
  // Review status
  reviewStatus: varchar("review_status", { length: 20 }).notNull().default("pending"), // 'pending', 'approved', 'rejected', 'merged'
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewNotes: text("review_notes"),
  approvedCourseId: varchar("approved_course_id").references(() => courses.id), // If approved and merged
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  jobIdIdx: index("scraped_courses_job_id_idx").on(table.jobId),
  institutionIdIdx: index("scraped_courses_institution_id_idx").on(table.institutionId),
  reviewStatusIdx: index("scraped_courses_review_status_idx").on(table.reviewStatus),
  confidenceIdx: index("scraped_courses_confidence_idx").on(table.confidence),
}));

// Discovered Course URLs - tracks all URLs found during website crawling
export const discoveredCourseUrls = pgTable("discovered_course_urls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").references(() => scrapingJobs.id, { onDelete: "cascade" }).notNull(),
  
  url: text("url").notNull(),
  discoveredAt: timestamp("discovered_at").defaultNow(),
  discoveryMethod: text("discovery_method"), // 'sitemap', 'crawl', 'ai', 'regex'
  pageTitle: text("page_title"), // Page title if discovered
  
  // Extraction status
  extractionStatus: varchar("extraction_status", { length: 20 }).notNull().default("pending"), // 'pending', 'extracted', 'failed', 'skipped'
  extractedAt: timestamp("extracted_at"),
  extractionError: text("extraction_error"),
  scrapedCourseId: varchar("scraped_course_id").references(() => scrapedCourses.id), // Link to extracted course
  
  // Confidence scoring
  isLikelyCourse: boolean("is_likely_course").default(true), // AI confidence this is a course page
  confidenceScore: real("confidence_score"), // 0.0-1.0
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  jobIdIdx: index("discovered_urls_job_id_idx").on(table.jobId),
  urlIdx: index("discovered_urls_url_idx").on(table.url),
  extractionStatusIdx: index("discovered_urls_extraction_status_idx").on(table.extractionStatus),
  isLikelyCourseIdx: index("discovered_urls_is_likely_course_idx").on(table.isLikelyCourse),
}));

// Scraped Institutions - staging area for institution data before approval
export const scrapedInstitutions = pgTable("scraped_institutions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").references(() => scrapingJobs.id, { onDelete: "cascade" }).notNull(),
  
  // Provenance tracking
  sourceUrl: text("source_url").notNull(),
  extractedAt: timestamp("extracted_at").defaultNow(),
  confidence: decimal("confidence", { precision: 3, scale: 2 }), // AI confidence score 0.00-1.00
  warnings: text("warnings").array(), // Extraction warnings
  
  // All institution fields (mirrors universities table but in staging)
  name: text("name"),
  description: text("description"),
  overview: text("overview"),
  smallDescription: text("small_description"),
  fullDescription: text("full_description"),
  location: text("location"),
  country: text("country"),
  establishedYear: integer("established_year"),
  logo: text("logo"),
  website: text("website"),
  providerType: text("provider_type"),
  
  // Contact Information
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  
  // Academic Information
  topDisciplines: text("top_disciplines").array(),
  topCourses: text("top_courses").array(),
  
  // Campus Information
  numberOfCampuses: integer("number_of_campuses"),
  campusAddresses: jsonb("campus_addresses"), // Array of address objects
  
  // Financial Information
  scholarshipPercentageMin: integer("scholarship_percentage_min"),
  scholarshipPercentageMax: integer("scholarship_percentage_max"),
  tuitionFeesMin: decimal("tuition_fees_min", { precision: 10, scale: 2 }),
  tuitionFeesMax: decimal("tuition_fees_max", { precision: 10, scale: 2 }),
  tuitionCurrency: varchar("tuition_currency", { length: 3 }),
  
  // Delivery & Intake
  deliveryModes: text("delivery_modes").array(),
  intakePeriods: text("intake_periods").array(),
  
  // Additional Information
  accreditationStatus: text("accreditation_status"),
  rankingBand: text("ranking_band"),
  facilities: text("facilities").array(),
  internationalStudentSupport: boolean("international_student_support"),
  tags: text("tags").array(),
  institutionGallery: text("institution_gallery").array(),
  
  // Review status
  reviewStatus: varchar("review_status", { length: 20 }).notNull().default("pending"), // 'pending', 'approved', 'rejected', 'merged'
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewNotes: text("review_notes"),
  approvedInstitutionId: varchar("approved_institution_id").references(() => universities.id), // If approved and merged
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  jobIdIdx: index("scraped_institutions_job_id_idx").on(table.jobId),
  reviewStatusIdx: index("scraped_institutions_review_status_idx").on(table.reviewStatus),
  confidenceIdx: index("scraped_institutions_confidence_idx").on(table.confidence),
}));

export const insertScrapingTemplateSchema = createInsertSchema(scrapingTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScrapingJobSchema = createInsertSchema(scrapingJobs).omit({
  id: true,
  createdAt: true,
});

export const insertScrapedCourseSchema = createInsertSchema(scrapedCourses).omit({
  id: true,
  createdAt: true,
});

export const insertDiscoveredCourseUrlSchema = createInsertSchema(discoveredCourseUrls).omit({
  id: true,
  createdAt: true,
});

export const insertScrapedInstitutionSchema = createInsertSchema(scrapedInstitutions).omit({
  id: true,
  createdAt: true,
});

export type ScrapingTemplate = typeof scrapingTemplates.$inferSelect;
export type InsertScrapingTemplate = z.infer<typeof insertScrapingTemplateSchema>;
export type ScrapingJob = typeof scrapingJobs.$inferSelect;
export type InsertScrapingJob = z.infer<typeof insertScrapingJobSchema>;
export type ScrapedCourse = typeof scrapedCourses.$inferSelect;
export type InsertScrapedCourse = z.infer<typeof insertScrapedCourseSchema>;
export type DiscoveredCourseUrl = typeof discoveredCourseUrls.$inferSelect;
export type InsertDiscoveredCourseUrl = z.infer<typeof insertDiscoveredCourseUrlSchema>;
export type ScrapedInstitution = typeof scrapedInstitutions.$inferSelect;
export type InsertScrapedInstitution = z.infer<typeof insertScrapedInstitutionSchema>;

// ============================================
// CRM SYSTEM SCHEMAS AND TYPES
// ============================================

// Tasks
export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export const updateTaskSchema = insertTaskSchema.partial();

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;

// Application Internal Notes
export const insertApplicationInternalNoteSchema = createInsertSchema(applicationInternalNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ApplicationInternalNote = typeof applicationInternalNotes.$inferSelect;
export type InsertApplicationInternalNote = z.infer<typeof insertApplicationInternalNoteSchema>;

// Follow-up Reminders
export const insertFollowUpReminderSchema = createInsertSchema(followUpReminders).omit({
  id: true,
  createdAt: true,
  completedAt: true,
  notificationSent: true,
  notificationSentAt: true,
});

export type FollowUpReminder = typeof followUpReminders.$inferSelect;
export type InsertFollowUpReminder = z.infer<typeof insertFollowUpReminderSchema>;

// Task with related data for dashboard views
export interface TaskWithRelations extends Task {
  assignedTo?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    profileImageUrl: string | null;
  } | null;
  createdBy?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  application?: {
    id: string;
    currentStage: string;
    studentName?: string;
    courseName?: string;
  } | null;
}

// Workload summary for dashboard
export interface WorkloadSummary {
  userId: string;
  userName: string;
  userEmail: string | null;
  userRole: string | null;
  profileImageUrl: string | null;
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  overdueTasks: number;
  assignedApplications: number;
  avgTaskCompletionTime?: number; // in hours
}

// ============================================
// CRM LEADS AND CONTACTS SCHEMAS AND TYPES
// ============================================

// CRM Leads
export const insertCrmLeadSchema = createInsertSchema(crmLeads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastActivityTime: true,
  convertedContactId: true,
  convertedAt: true,
});

export const updateCrmLeadSchema = insertCrmLeadSchema.partial();

export type CrmLead = typeof crmLeads.$inferSelect;
export type InsertCrmLead = z.infer<typeof insertCrmLeadSchema>;
export type UpdateCrmLead = z.infer<typeof updateCrmLeadSchema>;

// Lead Status History
export const insertLeadStatusHistorySchema = createInsertSchema(leadStatusHistory).omit({
  id: true,
  createdAt: true,
});

export type LeadStatusHistory = typeof leadStatusHistory.$inferSelect;
export type InsertLeadStatusHistory = z.infer<typeof insertLeadStatusHistorySchema>;

// CRM Contacts
export const insertCrmContactSchema = createInsertSchema(crmContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateCrmContactSchema = insertCrmContactSchema.partial();

export type CrmContact = typeof crmContacts.$inferSelect;
export type InsertCrmContact = z.infer<typeof insertCrmContactSchema>;
export type UpdateCrmContact = z.infer<typeof updateCrmContactSchema>;

// Lead with relations for display
export interface CrmLeadWithRelations extends CrmLead {
  assignedToUser?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    profileImageUrl: string | null;
  } | null;
  ownerUser?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    profileImageUrl: string | null;
  } | null;
  course?: {
    id: string;
    title: string;
  } | null;
  university?: {
    id: string;
    name: string;
  } | null;
  statusHistory?: LeadStatusHistory[];
}

// Contact with relations for display
export interface CrmContactWithRelations extends CrmContact {
  ownerUser?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    profileImageUrl: string | null;
  } | null;
  sourceLead?: CrmLead | null;
}
