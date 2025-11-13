import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import {
  index,
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
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  providerType: text("provider_type"), // Private Institutions, TAFE, Private University, Public University
  scholarshipPercentageMin: integer("scholarship_percentage_min"),
  scholarshipPercentageMax: integer("scholarship_percentage_max"),
  topDisciplines: text("top_disciplines").array(),
  
  // New detailed fields
  smallDescription: text("small_description"), // AI-powered, max 100 words
  fullDescription: text("full_description"), // AI-powered
  institutionGallery: text("institution_gallery").array(), // Up to 3 images, 600x400px
  topCourses: text("top_courses").array(), // Array of course IDs or names
  campusAddresses: jsonb("campus_addresses"), // Array of campus address objects: [{address: string, city: string, state: string, postcode: string}]
  
  // Approval workflow
  approvalStatus: varchar("approval_status", { length: 20 }).notNull().default("pending"), // 'pending', 'approved', 'rejected'
  rejectionReason: text("rejection_reason"), // Reason for rejection if applicable
  submittedForApprovalAt: timestamp("submitted_for_approval_at"),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by").references(() => users.id), // Admin who approved
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Courses table
export const courses = pgTable("courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  universityId: varchar("university_id").notNull().references(() => universities.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  subject: text("subject").notNull(),
  level: text("level").notNull(), // 'undergraduate', 'postgraduate', 'certificate', 'diploma'
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
  pathways: text("pathways").array(), // Progression routes (e.g., "University degrees", "RMIT University")
  
  // Detailed entry requirements for AI matching
  minimumAge: integer("minimum_age"), // Minimum age requirement
  academicRequirements: text("academic_requirements"), // Detailed academic entry criteria
  englishRequirementsStructured: jsonb("english_requirements_structured"), // Structured: { IELTS: {overall, min_each_band}, TOEFL: {overall}, PTE: {overall}, etc. }
  
  // Delivery and work-related fields for comprehensive recommendations
  deliveryMode: text("delivery_mode"), // 'online', 'on-campus', 'hybrid'
  campusLocations: text("campus_locations").array(), // Multiple campus options
  workRights: boolean("work_rights"), // Whether course provides work rights/visa eligibility
  internshipAvailable: boolean("internship_available"), // Whether internships are part of the program
  internshipDetails: text("internship_details"), // Details about internship opportunities
  
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
  // Btree index for duration filtering
  durationWeeksIdx: index("courses_duration_weeks_idx").on(table.durationWeeks),
  // Composite indexes for common query patterns
  universityActiveIdx: index("courses_university_active_idx").on(table.universityId, table.isActive),
  subjectLevelIdx: index("courses_subject_level_idx").on(table.subject, table.level),
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
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Applications table
export const applications = pgTable("applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  studentId: varchar("student_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending', 'reviewing', 'accepted', 'rejected'
  personalStatement: text("personal_statement"),
  additionalInfo: text("additional_info"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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

export const insertUniversitySchema = createInsertSchema(universities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Validate campus addresses structure
  campusAddresses: z.array(z.object({
    address: z.string(),
    city: z.string().optional(),
    state: z.string().optional(),
    postcode: z.string().optional(),
    country: z.string().optional(),
  })).optional(),
  // Validate scholarship range
  scholarshipPercentageMin: z.number().int().min(0).max(100).optional(),
  scholarshipPercentageMax: z.number().int().min(0).max(100).optional(),
}).refine((data) => {
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

// Base schema without refine() - can be extended by frontend forms
const baseCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Validate array fields - ensure they're arrays and contain valid data
  intakes: z.array(z.string()).optional().default([]),
  studyAreas: z.array(z.string()).optional().default([]),
  careerOutcomes: z.array(z.string()).optional().default([]),
  pathways: z.array(z.string()).optional().default([]),
  campusLocations: z.array(z.string()).optional().default([]),
  
  // Validate scholarship range
  scholarshipPercentageMin: z.number().int().min(0).max(100).optional(),
  scholarshipPercentageMax: z.number().int().min(0).max(100).optional(),
  
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

export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;

export type University = typeof universities.$inferSelect;
export type InsertUniversity = z.infer<typeof insertUniversitySchema>;

export type Course = typeof courses.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type CourseWithUniversity = Course & { university?: University | null };

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
