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

// Team member availability status
export const availabilityStatusEnum = pgEnum('availability_status', [
  'available',
  'away',
  'busy',
  'do_not_disturb',
  'invisible',
]);

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

// Qualification Framework enum for country-specific qualification systems
export const qualificationFrameworkEnum = pgEnum('qualification_framework', [
  'AQF',       // Australian Qualifications Framework (Australia)
  'Non-AQF',   // Non-AQF courses like ELICOS, Professional Year (Australia)
  'RQF',       // Regulated Qualifications Framework (UK)
  'EQF',       // European Qualifications Framework (Europe)
  'NZQF',      // New Zealand Qualifications and Credentials Framework
  'MQF',       // Malaysian Qualifications Framework
  'US',        // United States Degree System
  'Canadian',  // Canadian Qualification System
  'Other',     // Custom/Other frameworks
]);

// Course level enum for standardized qualification levels (supports all frameworks)
export const courseLevelEnum = pgEnum('course_level', [
  // AQF Levels (Australia)
  'VCE (11-12)',
  'Certificate I',
  'Certificate II',
  'Certificate III',
  'Certificate IV',
  'Diploma',
  'Advanced Diploma',
  'Associate Degree',
  'Graduate Certificate',
  'Graduate Diploma',
  'Bachelor Degree',
  'Bachelor Honours',
  'Masters Degree',
  'Doctoral Degree',
  'Higher Doctoral Degree',
  // Non-AQF (Australia)
  'ELICOS - General English',
  'ELICOS - EAP',
  'ELICOS - Exam Prep',
  'Professional Year - Accounting',
  'Professional Year - IT',
  'Professional Year - Engineering',
  'Foundation',
  'Pathway Program',
  'Short Course',
  // RQF Levels (UK)
  'RQF Entry Level',
  'RQF Level 1',
  'RQF Level 2',
  'RQF Level 3',
  'RQF Level 4',
  'RQF Level 5',
  'RQF Level 6',
  'RQF Level 7',
  'RQF Level 8',
  // NZQF Levels (New Zealand)
  'NZQF Level 1',
  'NZQF Level 2',
  'NZQF Level 3',
  'NZQF Level 4',
  'NZQF Level 5',
  'NZQF Level 6',
  'NZQF Level 7',
  'NZQF Level 8',
  'NZQF Level 9',
  'NZQF Level 10',
  // MQF Levels (Malaysia)
  'MQF Level 1',
  'MQF Level 2',
  'MQF Level 3',
  'MQF Foundation',
  'MQF Level 4',
  'MQF Level 5',
  'MQF Level 6',
  'MQF Level 7',
  'MQF Level 8',
  // US Degrees
  'US Associate Degree',
  'US Bachelor Degree',
  'US Master Degree',
  'US Doctoral Degree',
  'US Professional Doctorate',
  // Canadian Qualifications
  'Canadian Certificate',
  'Canadian Diploma',
  'Canadian Advanced Diploma',
  'Canadian Associate Degree',
  'Canadian Bachelor Degree',
  'Canadian Master Degree',
  'Canadian Doctoral Degree',
  'Canadian CEGEP',
  // EQF Levels (Europe)
  'EQF Level 1',
  'EQF Level 2',
  'EQF Level 3',
  'EQF Level 4',
  'EQF Level 5',
  'EQF Level 6',
  'EQF Level 7',
  'EQF Level 8',
  // Other/Custom
  'Other',
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

// CRM Lead rating enum
export const leadRatingEnum = pgEnum('lead_rating', [
  'cold',
  'warm',
  'hot',
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

// CRM Client Status enum - for tracking student/client journey (applies to 'clients' contact type)
export const clientStatusEnum = pgEnum('client_status', [
  'lead',           // Initial inquiry, not yet applied
  'applicant',      // Has started/submitted an application
  'enrolled',       // Confirmed and studying
  'completed',      // Graduated/finished
  'inactive',       // Dropped off or no longer engaged
]);

// CRM Lead Stage enum - for tracking lead follow-up pipeline (applies when clientStatus = 'lead')
export const leadStageEnum = pgEnum('lead_stage', [
  'new',              // Just came in, hasn't been contacted
  'contacted',        // Initial outreach made
  'qualified',        // Confirmed as a genuine prospect
  'counselling',      // In active discussion about courses/options
  'ready_to_apply',   // All info gathered, ready to submit application
  'converted',        // Application created, lead converted to applicant
  'lost',             // Lead didn't convert
]);

// CRM Entry Source enum - how the contact entered the system
export const entrySourceEnum = pgEnum('entry_source', [
  'website',        // Self-registered student
  'consultant',     // Manual entry by team member
  'sub_agent',      // Partner agent submission
  'affiliate',      // External partner program
  'import',         // Bulk CSV import
  'referral',       // Referred by another contact
  'facebook_ads',   // Facebook advertising
  'walk_in',        // Walk-in at physical branch (via QR code scan)
  'other',          // Other sources
]);

// CRM Gender enum
export const genderEnum = pgEnum('gender', [
  'male',
  'female',
  'other',
  'prefer_not_to_say',
]);

// Admin approval status enum
export const approvalStatusEnum = pgEnum('approval_status', [
  'pending',
  'approved',
  'rejected',
]);

// Publish status enum for draft/publish workflow
export const publishStatusEnum = pgEnum('publish_status', [
  'draft',
  'published',
]);

// Note visibility enum — used by both contactNotes and applicationInternalNotes
export const noteVisibilityEnum = pgEnum("note_visibility", ["public", "private", "selected"]);

// Role scope enum - determines data visibility level for hierarchy
export const roleScopeEnum = pgEnum('role_scope', [
  'global',   // Can see all data across all regions/branches (CTO, CEO, CFO)
  'region',   // Can see all data within their assigned region (Regional Manager)
  'branch',   // Can see all data within their assigned branch (Branch Manager, Consultants)
  'self',     // Can only see their own data (Data Entry agents)
]);

// Australian visa type enum for students in Australia
export const australianVisaTypeEnum = pgEnum('australian_visa_type', [
  'student_500',           // Student Visa (Subclass 500)
  'graduate_485',          // Temporary Graduate Visa (Subclass 485)
  'skilled_482',           // Temporary Skill Shortage Visa (Subclass 482)
  'working_holiday_417',   // Working Holiday Visa (Subclass 417)
  'working_holiday_462',   // Work and Holiday Visa (Subclass 462)
  'bridging_visa',         // Various bridging visas
  'visitor_600',           // Visitor Visa (Subclass 600)
  'partner_820_801',       // Partner Visa
  'permanent_resident',    // PR holder
  'citizen',               // Australian Citizen
  'other',                 // Other visa types
]);

// Profile section enum for verification tracking
export const profileSectionEnum = pgEnum('profile_section', [
  'personal',      // Personal Information
  'passport',      // Passport & Visa Details
  'education',     // Education History
  'language',      // English Proficiency
  'preferences',   // Study Preferences
  'employment',    // Work Experience
  'funding',       // Financial/Sponsor Information
  'emergency',     // Emergency Contact
  'sop',           // Statement of Purpose
  'bio',           // Bio & Career Goals
]);

// Verification status enum for profile sections
export const verificationStatusEnum = pgEnum('verification_status', [
  'unverified',           // Never verified
  'pending_verification', // Awaiting initial verification
  'verified',             // Verified by consultant
  'needs_reverification', // Changed after verification, needs re-review
]);

// English test type enum
export const englishTestTypeEnum = pgEnum('english_test_type', [
  'ielts_academic',
  'ielts_general',
  'pte_academic',
  'toefl_ibt',
  'duolingo',
  'cambridge',
  'oet',
  'native_speaker',
  'none',
]);

// English proficiency status enum
export const englishProficiencyStatusEnum = pgEnum('english_proficiency_status', [
  'have_score',       // Has taken a test and has scores
  'native_speaker',   // Native English speaker (exempt)
  'planning_test',    // Planning to take a test
  'not_required',     // Not required for their course level
]);

// Student's English test scores interface (JSONB field)
export interface StudentEnglishTestScores {
  testType?: string;
  testDate?: string;
  expiryDate?: string;
  // IELTS scores (0-9 bands)
  ieltsOverall?: number;
  ieltsListening?: number;
  ieltsReading?: number;
  ieltsWriting?: number;
  ieltsSpeaking?: number;
  // PTE scores (10-90)
  pteOverall?: number;
  pteListening?: number;
  pteReading?: number;
  pteWriting?: number;
  pteSpeaking?: number;
  // TOEFL iBT (0-120)
  toeflOverall?: number;
  toeflListening?: number;
  toeflReading?: number;
  toeflWriting?: number;
  toeflSpeaking?: number;
  // Duolingo (10-160)
  duolingoOverall?: number;
  // Cambridge (A-C, 160-230)
  cambridgeScore?: number;
  cambridgeGrade?: string;
  // OET (A-E grades)
  oetOverall?: string;
  oetListening?: string;
  oetReading?: string;
  oetWriting?: string;
  oetSpeaking?: string;
}

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
  phone: varchar("phone", { length: 50 }), // User phone number for profile
  dateOfBirth: date("date_of_birth"), // User date of birth
  // Personal Address fields
  addressLine1: varchar("address_line_1", { length: 255 }),
  addressLine2: varchar("address_line_2", { length: 255 }),
  city: varchar("city", { length: 100 }),
  stateProvince: varchar("state_province", { length: 100 }),
  postalCode: varchar("postal_code", { length: 20 }),
  country: varchar("country", { length: 100 }),
  // Emergency Contact fields
  emergencyFirstName: varchar("emergency_first_name", { length: 100 }),
  emergencyLastName: varchar("emergency_last_name", { length: 100 }),
  emergencyMobile: varchar("emergency_mobile", { length: 50 }),
  emergencyEmail: varchar("emergency_email", { length: 255 }),
  emergencyRelationship: varchar("emergency_relationship", { length: 100 }),
  profileImageUrl: varchar("profile_image_url"),
  userType: varchar("user_type", { length: 20 }).notNull().default("student"), // 'platform_admin', 'admin', 'student', 'institution_admin'
  role: varchar("role", { length: 50 }).default("user"), // Legacy field - use roleId for new system
  roleId: varchar("role_id"), // References roles table for granular permissions (added later to avoid circular reference)
  profileId: varchar("profile_id"), // References profiles table for CRUD permission bundles
  regionId: varchar("region_id"), // Assigned region for staff (used with branchId for hierarchy)
  branchId: varchar("branch_id"), // Assigned branch/office location for staff
  availabilityStatus: availabilityStatusEnum("availability_status").default("available"),
  customStatusText: varchar("custom_status_text", { length: 100 }),
  lastStatusUpdate: timestamp("last_status_update"),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  requiresPasswordReset: boolean("requires_password_reset").default(false), // Force password change on first login
  tempPasswordIssuedAt: timestamp("temp_password_issued_at"), // When temp password was created (for expiry tracking)
  approvalStatus: approvalStatusEnum("approval_status"), // For platform admin approval workflow (null for students/institutions)
  approvedBy: varchar("approved_by").references(() => users.id, { onDelete: "set null" }), // Admin who approved
  approvedAt: timestamp("approved_at"), // When approval was granted
  rejectionReason: text("rejection_reason"), // Reason for rejection if applicable
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Type enum - constrains valid user types (4 types only)
// Note: 'Super Admin' is a ROLE, not a user type
export const userTypeEnum = pgEnum('user_type', [
  'platform_admin',    // Platform administrators
  'admin',             // Internal staff (various roles like Super Admin, CEO, Consultant, etc.)
  'student',           // Students seeking education
  'institution_admin', // Institution/University administrators
]);

// Roles table - stores all available roles (scalable, can add more anytime)
export const roles = pgTable("roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 50 }).notNull().unique(), // e.g., 'super_admin', 'ceo', 'junior_consultant'
  displayName: varchar("display_name", { length: 100 }).notNull(), // e.g., 'Super Admin', 'CEO', 'Junior Consultant'
  description: text("description"),
  userType: varchar("user_type", { length: 20 }).notNull(), // Which user type this role belongs to
  hierarchyLevel: integer("hierarchy_level").default(100), // Lower number = higher authority (CTO=10, Junior=70)
  defaultScope: roleScopeEnum("default_scope").default("branch"), // Data visibility scope for this role
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Permissions table - granular permissions (resource:action format)
export const permissions = pgTable("permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  resource: varchar("resource", { length: 50 }).notNull(), // e.g., 'courses', 'applications', 'users', 'crm'
  action: varchar("action", { length: 50 }).notNull(), // e.g., 'read', 'write', 'delete', 'approve'
  displayName: varchar("display_name", { length: 100 }).notNull(), // e.g., 'View Courses', 'Manage Applications'
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique("permissions_resource_action_unique").on(table.resource, table.action),
]);

// Role-Permission mapping - which roles have which permissions
export const rolePermissions = pgTable("role_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roleId: varchar("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permissionId: varchar("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique("role_permissions_unique").on(table.roleId, table.permissionId),
]);

// Relations for roles and permissions
export const rolesRelations = relations(roles, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

// Profiles table - CRUD permission bundles (Salesforce/Zoho style)
// Profiles determine WHAT actions users can perform (Create, Read, Update, Delete)
export const profiles = pgTable("profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 50 }).notNull().unique(), // e.g., 'full_access', 'standard', 'data_entry', 'read_only'
  displayName: varchar("display_name", { length: 100 }).notNull(), // e.g., 'Full Access', 'Standard', 'Data Entry', 'Read Only'
  description: text("description"),
  isSystemProfile: boolean("is_system_profile").default(false), // True for built-in profiles that can't be deleted
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Profile permissions table - defines CRUD access per module for each profile
// Modules: leads, applications, courses, institutions, users, reports, settings
export const profilePermissions = pgTable("profile_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: varchar("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  module: varchar("module", { length: 50 }).notNull(), // e.g., 'leads', 'applications', 'courses'
  canCreate: boolean("can_create").default(false),
  canRead: boolean("can_read").default(false),
  canUpdate: boolean("can_update").default(false),
  canDelete: boolean("can_delete").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique("profile_permissions_unique").on(table.profileId, table.module),
]);

// Relations for profiles
export const profilesRelations = relations(profiles, ({ many }) => ({
  profilePermissions: many(profilePermissions),
}));

export const profilePermissionsRelations = relations(profilePermissions, ({ one }) => ({
  profile: one(profiles, {
    fields: [profilePermissions.profileId],
    references: [profiles.id],
  }),
}));

// Invitation status enum
export const invitationStatusEnum = pgEnum('invitation_status', [
  'pending',   // Invitation sent, awaiting acceptance
  'accepted',  // User accepted and created account
  'expired',   // Invitation link expired (7 days)
  'revoked',   // Admin cancelled the invitation
]);

// Team invitations table - for platform_admin/admin to invite new team members
export const invitations = pgTable("invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  roleId: varchar("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  profileId: varchar("profile_id"), // Optional: references profiles table for CRUD permissions
  userType: varchar("user_type", { length: 20 }).notNull().default("admin"), // 'platform_admin' or 'admin' only
  regionId: varchar("region_id"), // Assigned region for the new team member
  branchId: varchar("branch_id"), // Assigned branch for the new team member
  tokenHash: varchar("token_hash").notNull(), // Hashed invitation token for security
  status: invitationStatusEnum("status").notNull().default("pending"),
  invitedById: varchar("invited_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  revokedAt: timestamp("revoked_at"),
  note: text("note"), // Optional note from inviter
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for invitations
export const invitationsRelations = relations(invitations, ({ one }) => ({
  role: one(roles, {
    fields: [invitations.roleId],
    references: [roles.id],
  }),
  invitedBy: one(users, {
    fields: [invitations.invitedById],
    references: [users.id],
  }),
}));

// Activity Logs table - CRM-style audit trail for all platform actions
export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Actor (user who performed the action) - denormalized for performance
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }), // Nullable if user is deleted
  userEmail: varchar("user_email"),
  userName: varchar("user_name"),
  userProfilePicture: varchar("user_profile_picture"),
  userType: varchar("user_type", { length: 20 }), // 'student', 'institution_admin', 'admin', 'platform_admin'
  
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
  slug: varchar("slug", { length: 255 }).unique(),
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
  
  // Australia-specific regulatory fields
  rtoNumber: varchar("rto_number", { length: 20 }), // Registered Training Organization number (Australia-specific)
  cricosProviderCode: varchar("cricos_provider_code", { length: 10 }), // CRICOS Provider Code for international students (Australia-specific)
  tags: text("tags").array(), // AI-generated or admin-curated tags for discovery
  
  // Approval workflow
  approvalStatus: varchar("approval_status", { length: 20 }).notNull().default("pending"), // 'pending', 'approved', 'rejected'
  rejectionReason: text("rejection_reason"), // Reason for rejection if applicable
  submittedForApprovalAt: timestamp("submitted_for_approval_at"),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by").references(() => users.id), // Admin who approved
  
  // Publish workflow (draft/publish for collaborative content creation)
  publishStatus: varchar("publish_status", { length: 20 }).notNull().default("draft"), // 'draft', 'published'
  publishedAt: timestamp("published_at"),
  publishedByUserId: varchar("published_by_user_id").references(() => users.id), // User who published
  visibility: varchar("visibility", { length: 20 }).notNull().default("public"), // 'public' | 'private' - private institutions only visible to logged-in students
  
  // Audit trail for tracking
  createdByUserId: varchar("created_by_user_id").references(() => users.id), // User who created the institution
  updatedByUserId: varchar("updated_by_user_id").references(() => users.id), // User who last updated the institution
  assignedToUserId: varchar("assigned_to_user_id").references(() => users.id), // User currently assigned to manage/edit this institution
  
  // Financial Information (Gold Standard fields for Partner API)
  tuitionFeesMin: decimal("tuition_fees_min", { precision: 10, scale: 2 }),
  tuitionFeesMax: decimal("tuition_fees_max", { precision: 10, scale: 2 }),
  tuitionCurrency: varchar("tuition_currency", { length: 3 }),
  
  // Delivery & Intake (Gold Standard fields for Partner API)
  deliveryModes: text("delivery_modes").array(),
  intakePeriods: text("intake_periods").array(),
  
  // Additional Information (Gold Standard fields for Partner API)
  accreditationStatus: text("accreditation_status"),
  rankingBand: text("ranking_band"),
  facilities: text("facilities").array(),
  internationalStudentSupport: boolean("international_student_support"),
  
  availableMarkets: text("available_markets").array().notNull().default(sql`ARRAY['AU','BD']::text[]`),
  featuredMarkets: text("featured_markets").array().notNull().default(sql`ARRAY[]::text[]`),
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // GIN indexes for array fields to support efficient filtering
  topDisciplinesIdx: index("universities_top_disciplines_gin_idx").using("gin", table.topDisciplines),
  tagsIdx: index("universities_tags_gin_idx").using("gin", table.tags),
  availableMarketsIdx: index("universities_available_markets_gin_idx").using("gin", table.availableMarkets),
  featuredMarketsIdx: index("universities_featured_markets_gin_idx").using("gin", table.featuredMarkets),
  // B-tree indexes for range filtering
  scholarshipRangeIdx: index("universities_scholarship_range_idx").on(table.scholarshipPercentageMin, table.scholarshipPercentageMax),
  // Composite indexes for common filter patterns
  countryProviderIdx: index("universities_country_provider_idx").on(table.country, table.providerType),
  activeApprovedIdx: index("universities_active_approved_idx").on(table.isActive, table.approvalStatus),
}));

// Institution contact role enum
export const institutionContactRoleEnum = pgEnum('institution_contact_role', [
  'primary',
  'academic',
  'finance',
  'marketing',
  'admissions',
  'international',
  'other',
]);

// Institution Contacts junction table - links institutions to CRM contacts
export const institutionContacts = pgTable("institution_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  institutionId: varchar("institution_id").notNull().references(() => universities.id, { onDelete: "cascade" }),
  contactId: varchar("contact_id").notNull().references(() => crmContacts.id, { onDelete: "cascade" }),
  contactRole: institutionContactRoleEnum("contact_role").notNull().default("other"),
  roleTitle: text("role_title"), // Job title e.g., "Marketing Officer"
  department: text("department"), // Department e.g., "Marketing"
  isPrimary: boolean("is_primary").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
}, (table) => ({
  institutionIdx: index("institution_contacts_institution_idx").on(table.institutionId),
  contactIdx: index("institution_contacts_contact_idx").on(table.contactId),
  uniqueInstitutionContact: unique("institution_contacts_unique").on(table.institutionId, table.contactId),
}));

// Institution Business Terms table - confidential partnership details (separate for audit trails)
export const institutionBusinessTerms = pgTable("institution_business_terms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  institutionId: varchar("institution_id").notNull().references(() => universities.id, { onDelete: "cascade" }).unique(),
  
  // Commission structure
  commissionPercentage: decimal("commission_percentage", { precision: 5, scale: 2 }),
  bonusStructure: text("bonus_structure"),
  
  // Contract details
  contractStartDate: date("contract_start_date"),
  contractEndDate: date("contract_end_date"),
  contractStatus: varchar("contract_status", { length: 20 }).default("active"),
  
  // Payment terms
  paymentTerms: text("payment_terms"),
  paymentFrequency: varchar("payment_frequency", { length: 20 }),
  bankDetails: text("bank_details"),
  
  // Special conditions and notes
  specialConditions: text("special_conditions"),
  internalNotes: text("internal_notes"),
  
  // Audit trail
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
  updatedByUserId: varchar("updated_by_user_id").references(() => users.id),
}, (table) => ({
  institutionIdx: index("institution_business_terms_institution_idx").on(table.institutionId),
  contractStatusIdx: index("institution_business_terms_status_idx").on(table.contractStatus),
}));

// Institution document category enum
export const institutionDocumentCategoryEnum = pgEnum('institution_document_category', [
  'application_forms',
  'brochures',
  'contracts',
  'marketing',
  'agreements',
  'other',
]);

// Institution Documents table - file storage with folder structure
export const institutionDocuments = pgTable("institution_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  institutionId: varchar("institution_id").notNull().references(() => universities.id, { onDelete: "cascade" }),
  
  // File info
  fileName: text("file_name").notNull(),
  originalFileName: text("original_file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  
  // Organization
  category: institutionDocumentCategoryEnum("category").notNull().default("other"),
  description: text("description"),
  
  // Visibility
  isConfidential: boolean("is_confidential").default(true),
  
  // Audit trail
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  uploadedByUserId: varchar("uploaded_by_user_id").references(() => users.id),
}, (table) => ({
  institutionIdx: index("institution_documents_institution_idx").on(table.institutionId),
  categoryIdx: index("institution_documents_category_idx").on(table.category),
}));

// Relations for institution contacts
export const institutionContactsRelations = relations(institutionContacts, ({ one }) => ({
  institution: one(universities, {
    fields: [institutionContacts.institutionId],
    references: [universities.id],
  }),
  contact: one(crmContacts, {
    fields: [institutionContacts.contactId],
    references: [crmContacts.id],
  }),
  createdBy: one(users, {
    fields: [institutionContacts.createdByUserId],
    references: [users.id],
  }),
}));

// Relations for institution business terms
export const institutionBusinessTermsRelations = relations(institutionBusinessTerms, ({ one }) => ({
  institution: one(universities, {
    fields: [institutionBusinessTerms.institutionId],
    references: [universities.id],
  }),
  createdBy: one(users, {
    fields: [institutionBusinessTerms.createdByUserId],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [institutionBusinessTerms.updatedByUserId],
    references: [users.id],
  }),
}));

// Relations for institution documents
export const institutionDocumentsRelations = relations(institutionDocuments, ({ one }) => ({
  institution: one(universities, {
    fields: [institutionDocuments.institutionId],
    references: [universities.id],
  }),
  uploadedBy: one(users, {
    fields: [institutionDocuments.uploadedByUserId],
    references: [users.id],
  }),
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

// Course specializations table (Tier 3 - free text with autocomplete suggestions)
export const courseSpecializations = pgTable("course_specializations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subDisciplineId: varchar("sub_discipline_id").notNull().references(() => subDisciplines.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // Display name (e.g., "Civil Engineering", "Machine Learning")
  slug: text("slug").notNull(), // URL-friendly version for deduplication
  usageCount: integer("usage_count").notNull().default(0), // Track how many courses use this specialization
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Composite unique constraint to prevent duplicate specializations within same sub-discipline
  subDisciplineSlugUnique: unique("course_specializations_sub_discipline_slug_unique").on(table.subDisciplineId, table.slug),
  // Index for looking up specializations by sub-discipline
  subDisciplineIdx: index("course_specializations_sub_discipline_idx").on(table.subDisciplineId),
  // Index for sorting by usage
  usageIdx: index("course_specializations_usage_idx").on(table.usageCount),
}));


// Courses table
export const courses = pgTable("courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  universityId: varchar("university_id").notNull().references(() => universities.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  slug: varchar("slug", { length: 255 }).unique(),
  description: text("description"),
  subject: text("subject").notNull(),
  discipline: disciplineEnum("discipline"), // Main discipline category for filtering
  subDisciplineId: varchar("sub_discipline_id").references(() => subDisciplines.id, { onDelete: "set null" }), // Optional sub-category within main discipline
  specialization: text("specialization"), // Tier 3: Free text specialization with autocomplete (e.g., "Civil Engineering")
  qualificationFramework: qualificationFrameworkEnum("qualification_framework").default('AQF'), // Qualification framework (AQF, Non-AQF, RQF, etc.)
  level: courseLevelEnum("level").notNull(), // Course qualification level (enforced by database enum)
  customLevel: text("custom_level"), // Free-text level for "Other" framework
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
  thumbnailStatus: varchar("thumbnail_status", { length: 20 }).default("none"), // 'none', 'pending', 'generating', 'completed', 'failed'
  thumbnailGeneratedAt: timestamp("thumbnail_generated_at"),
  
  // Additional course details
  courseCode: text("course_code"),
  cricosCode: text("cricos_code"), // CRICOS course code for Australian RTO/CRICOS registered courses
  isCricosRegistered: boolean("is_cricos_registered").notNull().default(false), // True when this course is registered on the CRICOS register
  prPathway: boolean("pr_pathway").default(false),
  eligibilityRequirements: text("eligibility_requirements"),
  englishRequirements: text("english_requirements"),
  curriculumUrl: text("curriculum_url"),
  sourceUrl: text("source_url"), // Direct link to course page on institution website
  costOfLiving: decimal("cost_of_living", { precision: 10, scale: 2 }),
  applicationFees: decimal("application_fees", { precision: 10, scale: 2 }),
  admissionFee: decimal("admission_fee", { precision: 10, scale: 2 }), // One-time admission/enrolment fee (distinct from application fee)
  materialsFee: decimal("materials_fee", { precision: 10, scale: 2 }), // Separate fee for course materials/resources
  images: text("images").array(),
  
  // Rich structured data for AI-powered recommendations
  intakes: text("intakes").array(), // ["January", "February", "April", "May", etc.]
  studyAreas: text("study_areas").array(), // Curriculum topics and learning areas
  careerOutcomes: text("career_outcomes").array(), // Potential career paths
  careerPath: text("career_path"), // Detailed career progression and trajectory description
  pathways: text("pathways").array(), // Progression routes (e.g., "University degrees", "RMIT University")
  
  // Detailed entry requirements for AI matching
  minimumAge: integer("minimum_age"), // Minimum age requirement
  englishRequirementsStructured: jsonb("english_requirements_structured").$type<EnglishRequirementsStructured>(), // Structured English requirements
  
  // Delivery and work-related fields for comprehensive recommendations
  deliveryMode: text("delivery_mode"), // 'online', 'on-campus', 'hybrid'
  campusLocations: text("campus_locations").array(), // Multiple campus options
  internshipAvailable: boolean("internship_available"), // Whether internships are part of the program
  internshipDetails: text("internship_details"), // Details about internship opportunities
  
  // Approval workflow
  approvalStatus: varchar("approval_status", { length: 20 }).notNull().default("pending"), // 'pending', 'approved', 'rejected'
  rejectionReason: text("rejection_reason"), // Reason for rejection if applicable
  submittedForApprovalAt: timestamp("submitted_for_approval_at"),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by").references(() => users.id), // Admin who approved
  
  // Publish workflow (draft/publish for collaborative content creation)
  publishStatus: varchar("publish_status", { length: 20 }).notNull().default("draft"), // 'draft', 'published'
  visibility: varchar("visibility", { length: 20 }).notNull().default("public"), // 'public' | 'private' — private courses only visible to logged-in students
  publishedAt: timestamp("published_at"),
  publishedByUserId: varchar("published_by_user_id").references(() => users.id), // User who published
  
  // Content ownership and assignment (for collaborative workflows)
  createdByUserId: varchar("created_by_user_id").references(() => users.id), // User who created this course
  updatedByUserId: varchar("updated_by_user_id").references(() => users.id), // User who last updated this course
  assignedToUserId: varchar("assigned_to_user_id").references(() => users.id), // User currently assigned to manage/edit this course
  
  availableMarkets: text("available_markets").array().notNull().default(sql`ARRAY['AU','BD']::text[]`),
  featuredMarkets: text("featured_markets").array().notNull().default(sql`ARRAY[]::text[]`),
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // GIN indexes for array and JSONB fields for fast filtering
  availableMarketsIdx: index("courses_available_markets_gin_idx").using("gin", table.availableMarkets),
  featuredMarketsIdx: index("courses_featured_markets_gin_idx").using("gin", table.featuredMarkets),
  intakesIdx: index("courses_intakes_gin_idx").using("gin", table.intakes),
  studyAreasIdx: index("courses_study_areas_gin_idx").using("gin", table.studyAreas),
  careerOutcomesIdx: index("courses_career_outcomes_gin_idx").using("gin", table.careerOutcomes),
  pathwaysIdx: index("courses_pathways_gin_idx").using("gin", table.pathways),
  englishReqsIdx: index("courses_english_reqs_gin_idx").using("gin", table.englishRequirementsStructured),
  // Btree index for duration and discipline filtering
  durationWeeksIdx: index("courses_duration_weeks_idx").on(table.durationWeeks),
  disciplineIdx: index("courses_discipline_idx").on(table.discipline),
  subDisciplineIdx: index("courses_sub_discipline_idx").on(table.subDisciplineId),
  specializationIdx: index("courses_specialization_idx").on(table.specialization),
  // Composite indexes for common query patterns
  disciplineSubDisciplineIdx: index("courses_discipline_sub_discipline_idx").on(table.discipline, table.subDisciplineId),
  disciplineSubSpecIdx: index("courses_discipline_sub_spec_idx").on(table.discipline, table.subDisciplineId, table.specialization),
  universityActiveIdx: index("courses_university_active_idx").on(table.universityId, table.isActive),
  subjectLevelIdx: index("courses_subject_level_idx").on(table.subject, table.level),
  activeApprovedIdx: index("courses_active_approved_idx").on(table.isActive, table.approvalStatus),
  disciplineActiveIdx: index("courses_discipline_active_idx").on(table.discipline, table.isActive, table.approvalStatus),
}));

// ============================================
// COURSE INTAKE TEMPLATES
// Recurring intake patterns that auto-calculate dates each year
// ============================================

export const courseIntakeTemplates = pgTable("course_intake_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  month: integer("month").notNull(), // 1-12 (January = 1, December = 12)
  startDay: integer("start_day").notNull().default(1), // Day of month when classes start (1-31)
  deadlineWeeksBefore: integer("deadline_weeks_before").notNull().default(8), // Application closes X weeks before start
  openMonthsBefore: integer("open_months_before").notNull().default(6), // Applications open X months before start
  intakeName: text("intake_name"), // Custom name like "Semester 1", "Fall", "Term 2" (optional)
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  courseMonthIdx: index("course_intake_templates_course_month_idx").on(table.courseId, table.month),
  courseIdx: index("course_intake_templates_course_idx").on(table.courseId),
}));

export const insertCourseIntakeTemplateSchema = createInsertSchema(courseIntakeTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCourseIntakeTemplate = z.infer<typeof insertCourseIntakeTemplateSchema>;
export type CourseIntakeTemplate = typeof courseIntakeTemplates.$inferSelect;

// ============================================
// COURSE INTAKE DATES
// Specific fixed calendar dates for course intakes (not recurring templates)
// Designed for courses with precisely-scheduled intake dates per year
// ============================================

export const courseIntakeDates = pgTable("course_intake_dates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  intakeDate: date("intake_date").notNull(), // ISO date string e.g. "2026-01-19"
  label: text("label"), // Optional custom label e.g. "Semester 1 2026"
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  courseIdx: index("course_intake_dates_course_idx").on(table.courseId),
  dateIdx: index("course_intake_dates_date_idx").on(table.courseId, table.intakeDate),
}));

export const insertCourseIntakeDateSchema = createInsertSchema(courseIntakeDates).omit({
  id: true,
  createdAt: true,
});

export type InsertCourseIntakeDate = z.infer<typeof insertCourseIntakeDateSchema>;
export type CourseIntakeDate = typeof courseIntakeDates.$inferSelect;

// ============================================
// COURSE TAGS SYSTEM
// E-commerce style tagging for course categorization and filtering
// ============================================

// Tag category enum for organizing tags (unified for courses and institutions)
export const tagCategoryEnum = pgEnum('tag_category', [
  // Course-specific categories
  'feature',    // Course features: Scholarship Available, Work Placement, Fast-Track
  'delivery',   // Delivery modes: Online, On-Campus, Hybrid, Evening Classes
  'career',     // Career outcomes: High Demand, Industry Certified, Graduate Employment
  'skill',      // Skills: Hands-on Training, Research Focus, Project-Based
  'industry',   // Industry sectors: Healthcare, Technology, Finance, Construction
  'audience',   // Target audience: International Students, Working Professionals, School Leavers
  // Institution-specific categories
  'type',        // Institution type: Public University, Private University, TAFE, College
  'specialization', // Focus areas: Research-Intensive, Teaching-Focused, Industry-Partnerships
  'experience',  // Student experience: Campus Life, Online Learning, International Support
  'location',    // Location features: Urban, Suburban, Regional, Multi-Campus
  'financial',   // Financial: Scholarship-Friendly, Affordable, Work-Study Programs
  'accreditation', // Rankings/Accreditation: Top 100, AACSB, EQUIS, Nationally Recognized
  'services',    // Student services: Career Services, Housing, Visa Support, Mentorship
]);

// Enum for what entity types a tag applies to
export const tagAppliesToEnum = pgEnum('tag_applies_to', [
  'courses',      // Tag applies to courses only
  'institutions', // Tag applies to institutions only
  'both',         // Tag applies to both courses and institutions
]);

// Tags table - unified registry for all tags (courses and institutions)
export const tags = pgTable("tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  category: tagCategoryEnum("category").notNull(),
  appliesTo: tagAppliesToEnum("applies_to").default('courses').notNull(), // What entity types this tag applies to
  description: text("description"),
  color: varchar("color", { length: 7 }), // Hex color for badge display e.g., #FF5000
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  categoryIdx: index("tags_category_idx").on(table.category),
  slugIdx: index("tags_slug_idx").on(table.slug),
  activeIdx: index("tags_active_idx").on(table.isActive),
  appliesToIdx: index("tags_applies_to_idx").on(table.appliesTo),
}));

// Course-Tags junction table for many-to-many relationship
export const courseTags = pgTable("course_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  tagId: varchar("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  courseTagUnique: unique("course_tag_unique").on(table.courseId, table.tagId),
  courseIdx: index("course_tags_course_idx").on(table.courseId),
  tagIdx: index("course_tags_tag_idx").on(table.tagId),
}));

// ============================================
// COURSE ENGLISH REQUIREMENTS
// Structured English language test requirements for courses
// Enables matching student scores against course requirements
// ============================================

// Course English Requirements table - minimum language test scores required for a course
export const courseEnglishRequirements = pgTable("course_english_requirements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  testType: varchar("test_type", { length: 20 }).notNull(), // 'ielts', 'toefl', 'pte', 'duolingo'
  minOverallScore: decimal("min_overall_score", { precision: 4, scale: 1 }).notNull(),
  minListeningScore: decimal("min_listening_score", { precision: 4, scale: 1 }),
  minReadingScore: decimal("min_reading_score", { precision: 4, scale: 1 }),
  minWritingScore: decimal("min_writing_score", { precision: 4, scale: 1 }),
  minSpeakingScore: decimal("min_speaking_score", { precision: 4, scale: 1 }),
  notes: text("notes"), // Additional notes like "no band less than 6.0"
  isPreferred: boolean("is_preferred").default(false), // Mark if this is the preferred test type
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  courseIdx: index("course_english_req_course_idx").on(table.courseId),
  testTypeIdx: index("course_english_req_test_type_idx").on(table.testType),
}));

// ============================================
// COURSE PRICING TIERS SYSTEM
// Flexible pricing model supporting:
// - Fixed pricing (single price for all)
// - Dynamic pricing with dimensions:
//   - Payment options (upfront vs installment)
//   - Study modes (weekday, weekend, online, etc.)
//   - Location-based (onshore, offshore, regional/country)
// ============================================

// Pricing model enum
export const pricingModelEnum = pgEnum('pricing_model', [
  'fixed',     // Single price for all students
  'dynamic',   // Variable pricing based on dimensions
]);

// Payment option enum
export const paymentOptionEnum = pgEnum('payment_option', [
  'upfront',     // Full payment upfront (often discounted)
  'installment', // Payment in installments (may include fees)
]);

// Study mode enum
export const studyModeEnum = pgEnum('study_mode', [
  'all',       // Applies to all study modes
  'weekday',   // Weekday classes
  'weekend',   // Weekend classes
  'online',    // Online/distance learning
  'evening',   // Evening classes
  'full_time', // Full-time study
  'part_time', // Part-time study
]);

// Location type enum for pricing
export const pricingLocationTypeEnum = pgEnum('pricing_location_type', [
  'all',       // Same price for all locations
  'onshore',   // Students studying in-country
  'offshore',  // Students studying from overseas
  'country',   // Country-specific pricing
]);

// Fee period enum - indicates billing cycle (display vs billing may differ in Australian unis)
export const feePeriodEnum = pgEnum('fee_period', [
  'annual',       // Per year (most common display format)
  'per_semester', // Per semester (typically 2 per year)
  'per_trimester', // Per trimester (typically 3 per year)
  'per_term',     // Per term (typically 4 per year)
  'total',        // Total course fee
]);

// Course pricing configuration - stores the pricing model for each course
export const coursePricingConfig = pgTable("course_pricing_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  pricingModel: pricingModelEnum("pricing_model").notNull().default('fixed'),
  // Fee period - how the fee is quoted (annual, per semester, etc.)
  feePeriod: feePeriodEnum("fee_period").default('annual'),
  // Dimension toggles for dynamic pricing
  enablePaymentOptions: boolean("enable_payment_options").default(false), // Upfront vs Installment
  enableStudyModes: boolean("enable_study_modes").default(false),        // Weekday/Weekend/Online
  enableLocationPricing: boolean("enable_location_pricing").default(false), // Onshore/Offshore/Regional
  // Installment configuration (applies when enablePaymentOptions is true)
  installmentCount: integer("installment_count").default(6),
  firstPaymentAmount: decimal("first_payment_amount", { precision: 10, scale: 2 }),
  installmentFee: decimal("installment_fee", { precision: 10, scale: 2 }).default("0"),
  admissionFeeIncluded: decimal("admission_fee_included", { precision: 10, scale: 2 }).default("0"), // Fee included in first payment
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  courseIdx: index("course_pricing_config_course_idx").on(table.courseId),
  // Unique constraint - one config per course
  uniqueCourse: unique("course_pricing_config_unique_course").on(table.courseId),
}));

// Course pricing tiers - individual price entries
export const coursePricingTiers = pgTable("course_pricing_tiers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  // Pricing dimensions
  paymentOption: paymentOptionEnum("payment_option").notNull().default('upfront'),
  studyMode: studyModeEnum("study_mode").notNull().default('all'),
  locationType: pricingLocationTypeEnum("location_type").notNull().default('all'),
  country: varchar("country", { length: 100 }), // For country-specific pricing (when locationType = 'country')
  isDefaultPrice: boolean("is_default_price").default(false), // Default price when no specific tier matches
  // Pricing details
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("AUD"),
  // Display info
  label: text("label"), // Optional display label like "Weekday - Upfront"
  description: text("description"), // Additional description
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  courseIdx: index("course_pricing_tiers_course_idx").on(table.courseId),
  paymentIdx: index("course_pricing_tiers_payment_idx").on(table.paymentOption),
  studyModeIdx: index("course_pricing_tiers_study_mode_idx").on(table.studyMode),
  locationIdx: index("course_pricing_tiers_location_idx").on(table.locationType, table.country),
  // Composite index for lookups
  coursePaymentStudyLocationIdx: index("course_pricing_tiers_composite_idx").on(
    table.courseId, table.paymentOption, table.studyMode, table.locationType, table.country
  ),
}));

// Export insert and select types
export const insertCoursePricingConfigSchema = createInsertSchema(coursePricingConfig).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCoursePricingConfig = z.infer<typeof insertCoursePricingConfigSchema>;
export type CoursePricingConfig = typeof coursePricingConfig.$inferSelect;

export const insertCoursePricingTierSchema = createInsertSchema(coursePricingTiers).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCoursePricingTier = z.infer<typeof insertCoursePricingTierSchema>;
export type CoursePricingTier = typeof coursePricingTiers.$inferSelect;

// ============================================
// INSTITUTION SCHOLARSHIPS SYSTEM
// Institution-wide scholarships that can be linked to courses
// Similar pattern to campus locations
// ============================================

// Scholarship status enum
export const scholarshipStatusEnum = pgEnum('scholarship_status', [
  'open',           // Currently accepting applications
  'not_open_yet',   // Applications will open in the future
  'closed',         // Applications are closed
]);

// Scholarship value type enum
export const scholarshipValueTypeEnum = pgEnum('scholarship_value_type', [
  'percentage',     // e.g., 20% off tuition
  'fixed',          // e.g., $5,000
]);

// Scholarships table - institution-wide scholarships
export const scholarships = pgTable("scholarships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  institutionId: varchar("institution_id").notNull().references(() => universities.id, { onDelete: "cascade" }),
  
  // Basic information
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Value details
  valueType: scholarshipValueTypeEnum("value_type").notNull(),
  value: decimal("value", { precision: 12, scale: 2 }).notNull(), // Amount or percentage
  currency: varchar("currency", { length: 3 }).default("AUD"), // For fixed amounts
  
  // Status and dates
  status: scholarshipStatusEnum("status").default("open").notNull(),
  startDate: date("start_date"), // When applications open
  endDate: date("end_date"), // When applications close
  
  // Eligibility and details
  eligibility: text("eligibility"), // Who can apply
  
  // Metadata
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  institutionIdx: index("scholarships_institution_idx").on(table.institutionId),
  statusIdx: index("scholarships_status_idx").on(table.status),
  activeIdx: index("scholarships_active_idx").on(table.isActive),
  dateRangeIdx: index("scholarships_date_range_idx").on(table.startDate, table.endDate),
}));

// Course-Scholarships junction table - links courses to available scholarships
export const courseScholarships = pgTable("course_scholarships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  scholarshipId: varchar("scholarship_id").notNull().references(() => scholarships.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  courseScholarshipUnique: unique("course_scholarship_unique").on(table.courseId, table.scholarshipId),
  courseIdx: index("course_scholarships_course_idx").on(table.courseId),
  scholarshipIdx: index("course_scholarships_scholarship_idx").on(table.scholarshipId),
}));

// Insert schemas and types
export const insertScholarshipSchema = createInsertSchema(scholarships).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertScholarship = z.infer<typeof insertScholarshipSchema>;
export type Scholarship = typeof scholarships.$inferSelect;

export const insertCourseScholarshipSchema = createInsertSchema(courseScholarships).omit({
  id: true,
  createdAt: true,
});
export type InsertCourseScholarship = z.infer<typeof insertCourseScholarshipSchema>;
export type CourseScholarship = typeof courseScholarships.$inferSelect;

// ============================================
// ACADEMIC QUALIFICATION & ENTRY REQUIREMENTS SYSTEM
// Smart matching system for course entry requirements
// ============================================

// Level category enum for qualification categorization
export const qualificationLevelCategoryEnum = pgEnum('qualification_level_category', [
  'primary',           // Primary school (Year 6 equivalent)
  'lower_secondary',   // Year 8-10 equivalent (SSC, O-Levels)
  'upper_secondary',   // Year 11-12 equivalent (HSC, A-Levels)
  'foundation',        // Foundation/pathway programs
  'certificate',       // Certificate I-IV
  'diploma',           // Diploma/Advanced Diploma
  'bachelor',          // Bachelor's degree
  'postgrad_cert',     // Graduate Certificate/Diploma
  'masters',           // Master's degree
  'doctoral',          // PhD/Doctoral
]);

// Academic Qualification Types - Master list of qualifications by country
export const academicQualificationTypes = pgTable("academic_qualification_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Country and naming
  country: varchar("country", { length: 100 }).notNull(), // e.g., "Bangladesh", "Australia", "UK"
  countryCode: varchar("country_code", { length: 3 }), // ISO code: "BD", "AU", "UK"
  name: varchar("name", { length: 255 }).notNull(), // e.g., "HSC", "Year 12 / ATAR", "A-Levels"
  fullName: varchar("full_name", { length: 500 }), // e.g., "Higher Secondary Certificate"
  
  // Categorization
  levelCategory: qualificationLevelCategoryEnum("level_category").notNull(),
  
  // Grading details
  gradingScale: varchar("grading_scale", { length: 50 }), // e.g., "5.0", "4.0", "100", "ATAR"
  gradingType: varchar("grading_type", { length: 50 }), // e.g., "gpa", "percentage", "points", "grades"
  minGrade: varchar("min_grade", { length: 50 }), // Minimum passing grade
  maxGrade: varchar("max_grade", { length: 50 }), // Maximum grade
  
  // Display and sorting
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  
  // Metadata
  notes: text("notes"), // Additional information
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  countryIdx: index("qual_types_country_idx").on(table.country),
  countryCodeIdx: index("qual_types_country_code_idx").on(table.countryCode),
  levelCategoryIdx: index("qual_types_level_category_idx").on(table.levelCategory),
  activeIdx: index("qual_types_active_idx").on(table.isActive),
}));

// Qualification Equivalencies - Maps between source and target qualifications with grade mapping
export const qualificationEquivalencies = pgTable("qualification_equivalencies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Source qualification (student's qualification)
  sourceQualificationId: varchar("source_qualification_id").notNull().references(() => academicQualificationTypes.id, { onDelete: "cascade" }),
  
  // Target qualification (destination country requirement)
  targetQualificationId: varchar("target_qualification_id").notNull().references(() => academicQualificationTypes.id, { onDelete: "cascade" }),
  
  // Grade range mapping
  sourceGradeMin: varchar("source_grade_min", { length: 50 }).notNull(), // e.g., "4.0"
  sourceGradeMax: varchar("source_grade_max", { length: 50 }), // e.g., "4.49" (null means 4.0+)
  targetEquivalent: varchar("target_equivalent", { length: 100 }).notNull(), // e.g., "ATAR 75"
  
  // Confidence and notes
  confidenceLevel: varchar("confidence_level", { length: 20 }).default("standard"), // "exact", "standard", "approximate"
  notes: text("notes"),
  
  // Metadata
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  sourceQualIdx: index("qual_equiv_source_idx").on(table.sourceQualificationId),
  targetQualIdx: index("qual_equiv_target_idx").on(table.targetQualificationId),
  sourceTargetIdx: index("qual_equiv_source_target_idx").on(table.sourceQualificationId, table.targetQualificationId),
}));

// Course Level Requirement Templates - Pre-set defaults by destination country + course level
export const courseLevelRequirementTemplates = pgTable("course_level_requirement_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Course level (matches courseLevelEnum)
  courseLevel: courseLevelEnum("course_level").notNull(),
  
  // Destination country (institution country)
  institutionCountry: varchar("institution_country", { length: 100 }).notNull(),
  
  // Requirement details
  qualificationTypeId: varchar("qualification_type_id").notNull().references(() => academicQualificationTypes.id, { onDelete: "cascade" }),
  minGrade: varchar("min_grade", { length: 100 }), // e.g., "ATAR 65", "GPA 3.0"
  
  // Display
  displayLabel: varchar("display_label", { length: 255 }), // e.g., "Year 12 with ATAR 65"
  displayOrder: integer("display_order").default(0),
  isDefault: boolean("is_default").default(false), // Auto-select when creating course
  isActive: boolean("is_active").default(true),
  
  // Metadata
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  courseLevelIdx: index("course_level_req_level_idx").on(table.courseLevel),
  countryIdx: index("course_level_req_country_idx").on(table.institutionCountry),
  levelCountryIdx: index("course_level_req_level_country_idx").on(table.courseLevel, table.institutionCountry),
  qualTypeIdx: index("course_level_req_qual_type_idx").on(table.qualificationTypeId),
}));

// Course Entry Requirements - Selected requirements for each course
export const courseEntryRequirements = pgTable("course_entry_requirements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Course reference
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  
  // Requirement (qualification type)
  qualificationTypeId: varchar("qualification_type_id").notNull().references(() => academicQualificationTypes.id, { onDelete: "cascade" }),
  
  // Grade requirement
  minGrade: varchar("min_grade", { length: 100 }), // e.g., "ATAR 65", "GPA 3.0"
  
  // Custom notes for this course's specific requirement
  customNotes: text("custom_notes"),
  
  // Display order
  displayOrder: integer("display_order").default(0),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  courseIdx: index("course_entry_req_course_idx").on(table.courseId),
  qualTypeIdx: index("course_entry_req_qual_type_idx").on(table.qualificationTypeId),
  courseQualUnique: unique("course_qual_unique").on(table.courseId, table.qualificationTypeId),
}));

// Insert schemas and types for Academic Qualification System
export const insertAcademicQualificationTypeSchema = createInsertSchema(academicQualificationTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAcademicQualificationType = z.infer<typeof insertAcademicQualificationTypeSchema>;
export type AcademicQualificationType = typeof academicQualificationTypes.$inferSelect;

export const insertQualificationEquivalencySchema = createInsertSchema(qualificationEquivalencies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertQualificationEquivalency = z.infer<typeof insertQualificationEquivalencySchema>;
export type QualificationEquivalency = typeof qualificationEquivalencies.$inferSelect;

export const insertCourseLevelRequirementTemplateSchema = createInsertSchema(courseLevelRequirementTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCourseLevelRequirementTemplate = z.infer<typeof insertCourseLevelRequirementTemplateSchema>;
export type CourseLevelRequirementTemplate = typeof courseLevelRequirementTemplates.$inferSelect;

export const insertCourseEntryRequirementSchema = createInsertSchema(courseEntryRequirements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCourseEntryRequirement = z.infer<typeof insertCourseEntryRequirementSchema>;
export type CourseEntryRequirement = typeof courseEntryRequirements.$inferSelect;

// ============================================
// AI SETTINGS TABLE
// Stores AI model configuration for platform admins (CTO role)
// ============================================

export const aiSettings = pgTable("ai_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Setting key (e.g., "default_model", "equivalency_model")
  settingKey: varchar("setting_key", { length: 100 }).notNull().unique(),
  
  // AI Provider and Model
  provider: varchar("provider", { length: 50 }).notNull().default("openrouter"), // "openrouter", "openai", "anthropic"
  modelId: varchar("model_id", { length: 200 }).notNull(), // e.g., "anthropic/claude-3.5-sonnet", "openai/gpt-4o"
  modelDisplayName: varchar("model_display_name", { length: 200 }), // Human-friendly name
  
  // Configuration
  maxTokens: integer("max_tokens").default(4096),
  temperature: real("temperature").default(0.7),
  
  // Metadata
  updatedByUserId: varchar("updated_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAiSettingSchema = createInsertSchema(aiSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAiSetting = z.infer<typeof insertAiSettingSchema>;
export type AiSetting = typeof aiSettings.$inferSelect;

// ============================================
// INSTITUTION TAGS JUNCTION
// Uses unified tags table with appliesTo='institutions' or 'both'
// ============================================

// Institution-Tags junction table for many-to-many relationship (references unified tags table)
export const institutionTags = pgTable("institution_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  institutionId: varchar("institution_id").notNull().references(() => universities.id, { onDelete: "cascade" }),
  tagId: varchar("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  institutionTagUnique: unique("institution_tag_unique").on(table.institutionId, table.tagId),
  institutionIdx: index("institution_tags_institution_idx").on(table.institutionId),
  tagIdx: index("institution_tags_tag_idx").on(table.tagId),
}));

// ============================================
// GLOBAL REGION SYSTEM TABLES
// Supports multi-region platform with domain-based detection
// ============================================

// Regions table - defines supported regions/countries
export const regions = pgTable("regions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Region identification
  code: varchar("code", { length: 10 }).notNull().unique(), // e.g., 'AU', 'BD', 'UK', 'CA'
  name: text("name").notNull(), // e.g., 'Australia', 'Bangladesh'
  
  // Domain and routing
  domainPattern: text("domain_pattern"), // e.g., '.com.au', '.com.bd', '.co.uk'
  primaryDomain: text("primary_domain"), // e.g., 'anzglobal.com.au'
  
  // Localization
  defaultLocale: varchar("default_locale", { length: 10 }).default("en"), // e.g., 'en', 'bn'
  supportedLocales: text("supported_locales").array(), // ['en', 'bn'] for Bangladesh
  defaultCurrency: varchar("default_currency", { length: 3 }).default("AUD"), // ISO 4217 currency code
  currencySymbol: varchar("currency_symbol", { length: 5 }).default("$"),
  
  // Region settings
  timezone: varchar("timezone", { length: 50 }), // e.g., 'Australia/Sydney', 'Asia/Dhaka'
  flagEmoji: varchar("flag_emoji", { length: 10 }), // e.g., '🇦🇺', '🇧🇩'
  flagUrl: text("flag_url"), // URL to flag image
  
  // Inheritance/fallback
  parentRegionId: varchar("parent_region_id").references((): any => regions.id, { onDelete: "set null" }),
  
  // Display settings
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false), // Only one region should be default
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  codeIdx: index("regions_code_idx").on(table.code),
  activeIdx: index("regions_active_idx").on(table.isActive),
}));

// ============================================
// PARTNER API KEYS TABLE
// For external bots/integrations to upload institutions and courses
// ============================================

export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Key identification
  name: varchar("name", { length: 100 }).notNull(), // Human-readable name for the key
  keyHash: varchar("key_hash", { length: 128 }).notNull(), // SHA-256 hash of the API key
  keyPrefix: varchar("key_prefix", { length: 12 }).notNull(), // First 8 chars for identification (e.g., "anz_live_")
  
  // Permissions
  permissions: text("permissions").array().default(sql`ARRAY['institutions:create', 'courses:create', 'institutions:read']::text[]`),
  
  // Institution scope — if set, this key may only create/update data for these institution IDs.
  // If null or empty, the key is unrestricted (can work with any institution).
  allowedInstitutions: varchar("allowed_institutions").array(),
  
  // Ownership and tracking
  createdByUserId: varchar("created_by_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  description: text("description"), // Optional description of what this key is used for
  
  // Usage tracking
  usageCount: integer("usage_count").default(0),
  lastUsedAt: timestamp("last_used_at"),
  lastUsedIp: varchar("last_used_ip", { length: 45 }), // IPv6 compatible
  
  // Rate limiting
  rateLimitPerMinute: integer("rate_limit_per_minute").default(100),
  rateLimitPerHour: integer("rate_limit_per_hour").default(1000),
  
  // Status
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"), // Optional expiration date
  revokedAt: timestamp("revoked_at"),
  revokedByUserId: varchar("revoked_by_user_id").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  keyHashIdx: index("api_keys_key_hash_idx").on(table.keyHash),
  keyPrefixIdx: index("api_keys_key_prefix_idx").on(table.keyPrefix),
  createdByIdx: index("api_keys_created_by_idx").on(table.createdByUserId),
  activeIdx: index("api_keys_active_idx").on(table.isActive),
}));

// API Key usage logs for audit trail
export const apiKeyUsageLogs = pgTable("api_key_usage_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  apiKeyId: varchar("api_key_id").notNull().references(() => apiKeys.id, { onDelete: "cascade" }),
  
  // Request details
  endpoint: varchar("endpoint", { length: 255 }).notNull(),
  method: varchar("method", { length: 10 }).notNull(), // GET, POST, etc.
  statusCode: integer("status_code"),
  
  // Resource tracking
  resourceType: varchar("resource_type", { length: 50 }), // 'institution', 'course'
  resourceId: varchar("resource_id"), // ID of created/modified resource
  
  // Request metadata
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  apiKeyIdx: index("api_key_usage_logs_key_idx").on(table.apiKeyId),
  createdAtIdx: index("api_key_usage_logs_created_at_idx").on(table.createdAt),
  resourceTypeIdx: index("api_key_usage_logs_resource_type_idx").on(table.resourceType),
}));

// Branches table - office locations within regions
export const branches = pgTable("branches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Branch identification
  name: varchar("name", { length: 100 }).notNull(), // e.g., 'Melbourne Office', 'Sydney Office', 'Dhaka Office'
  code: varchar("code", { length: 20 }).notNull().unique(), // e.g., 'MEL', 'SYD', 'DHK'
  
  // Location
  regionId: varchar("region_id").references(() => regions.id, { onDelete: "set null" }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  postcode: varchar("postcode", { length: 20 }),
  country: varchar("country", { length: 100 }),
  
  // Contact info
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  
  // Display settings
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  isHeadquarters: boolean("is_headquarters").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  codeIdx: index("branches_code_idx").on(table.code),
  regionIdx: index("branches_region_idx").on(table.regionId),
  activeIdx: index("branches_active_idx").on(table.isActive),
}));

// Student pathways table - defines onshore/offshore student types
export const studentPathways = pgTable("student_pathways", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  code: varchar("code", { length: 20 }).notNull().unique(), // 'onshore', 'offshore'
  name: text("name").notNull(), // 'Onshore Student', 'Offshore Student'
  description: text("description"),
  
  // Pathway characteristics
  requiresVisa: boolean("requires_visa").default(false),
  locationDescription: text("location_description"), // e.g., 'Already in Australia', 'Applying from overseas'
  
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  codeIdx: index("student_pathways_code_idx").on(table.code),
}));

// Course region variants - region-specific pricing and requirements per course
export const courseRegionVariants = pgTable("course_region_variants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Core references
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  regionId: varchar("region_id").notNull().references(() => regions.id, { onDelete: "cascade" }),
  pathwayId: varchar("pathway_id").references(() => studentPathways.id, { onDelete: "set null" }), // Null = applies to all pathways
  
  // Pricing (region-specific)
  tuitionFee: decimal("tuition_fee", { precision: 12, scale: 2 }),
  tuitionCurrency: varchar("tuition_currency", { length: 3 }).default("AUD"),
  applicationFee: decimal("application_fee", { precision: 10, scale: 2 }),
  costOfLiving: decimal("cost_of_living", { precision: 10, scale: 2 }),
  scholarshipMin: integer("scholarship_min"),
  scholarshipMax: integer("scholarship_max"),
  
  // English requirements (can differ by region)
  englishRequirements: jsonb("english_requirements").$type<EnglishRequirementsStructured>(),
  
  // Academic entry requirements (region-specific)
  academicRequirements: text("academic_requirements"),
  minimumAge: integer("minimum_age"),
  eligibilityNotes: text("eligibility_notes"),
  
  // Visa linkage
  visaRequirementId: varchar("visa_requirement_id").references(() => visaRequirements.id, { onDelete: "set null" }),
  
  // Availability
  isAvailable: boolean("is_available").default(true),
  availabilityNotes: text("availability_notes"),
  
  // Effective dates for pricing
  effectiveFrom: date("effective_from"),
  effectiveTo: date("effective_to"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Compound unique constraint for course + region + pathway combination
  courseRegionPathwayUnique: unique("course_region_pathway_unique").on(table.courseId, table.regionId, table.pathwayId),
  // Indexes for efficient lookups
  courseIdx: index("course_variants_course_idx").on(table.courseId),
  regionIdx: index("course_variants_region_idx").on(table.regionId),
  pathwayIdx: index("course_variants_pathway_idx").on(table.pathwayId),
  courseRegionIdx: index("course_variants_course_region_idx").on(table.courseId, table.regionId),
}));

// Visa requirements table - region/pathway level visa information
export const visaRequirements = pgTable("visa_requirements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Region and pathway scope
  regionId: varchar("region_id").notNull().references(() => regions.id, { onDelete: "cascade" }),
  pathwayId: varchar("pathway_id").references(() => studentPathways.id, { onDelete: "set null" }), // Null = applies to all pathways in region
  
  // Visa details
  visaType: varchar("visa_type", { length: 100 }), // e.g., 'Student Visa (Subclass 500)'
  visaName: text("visa_name").notNull(),
  description: text("description"),
  
  // Requirements
  processingTime: varchar("processing_time", { length: 100 }), // e.g., '4-6 weeks'
  applicationFee: decimal("application_fee", { precision: 10, scale: 2 }),
  feeCurrency: varchar("fee_currency", { length: 3 }).default("AUD"),
  
  // Documents and conditions
  requiredDocuments: text("required_documents").array(),
  financialRequirements: text("financial_requirements"),
  healthRequirements: text("health_requirements"),
  englishRequirements: text("english_requirements"),
  
  // Work rights
  workRightsIncluded: boolean("work_rights_included").default(false),
  workRightsDetails: text("work_rights_details"),
  
  // Links and resources
  officialUrl: text("official_url"),
  applicationUrl: text("application_url"),
  
  // Status
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  regionPathwayUnique: unique("visa_region_pathway_unique").on(table.regionId, table.pathwayId),
  regionIdx: index("visa_requirements_region_idx").on(table.regionId),
}));

// Localized content entity type enum
export const localizedEntityTypeEnum = pgEnum('localized_entity_type', [
  'course',
  'institution',
  'page',
  'faq',
  'blog',
  'visa_requirement',
  'testimonial',
  'ui_string',
]);

// Localized content table - translations for any entity
export const localizedContent = pgTable("localized_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Entity reference
  entityType: localizedEntityTypeEnum("entity_type").notNull(),
  entityId: varchar("entity_id").notNull(),
  
  // Locale
  locale: varchar("locale", { length: 10 }).notNull(), // e.g., 'en', 'bn', 'fr'
  
  // Translated content (flexible JSON structure)
  content: jsonb("content").notNull(), // { title: '...', description: '...', requirements: '...' }
  
  // Translation status
  isAutoTranslated: boolean("is_auto_translated").default(false),
  isReviewed: boolean("is_reviewed").default(false),
  reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  
  // Source tracking
  sourceLocale: varchar("source_locale", { length: 10 }).default("en"),
  translatedAt: timestamp("translated_at"),
  translatedBy: varchar("translated_by").references(() => users.id, { onDelete: "set null" }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Compound unique for entity + locale
  entityLocaleUnique: unique("entity_locale_unique").on(table.entityType, table.entityId, table.locale),
  // Indexes for lookups
  entityIdx: index("localized_content_entity_idx").on(table.entityType, table.entityId),
  localeIdx: index("localized_content_locale_idx").on(table.locale),
}));

// ============================================
// REGION SYSTEM INTERFACES
// ============================================

// Interface for course with region variant data
export interface CourseWithRegionVariant {
  course: typeof courses.$inferSelect;
  variant?: typeof courseRegionVariants.$inferSelect;
  region?: typeof regions.$inferSelect;
  pathway?: typeof studentPathways.$inferSelect;
  visaRequirement?: typeof visaRequirements.$inferSelect;
  localizedContent?: Record<string, any>;
}

// Interface for resolved course data (merged base + variant)
export interface ResolvedCourseData {
  // Base course fields
  id: string;
  title: string;
  description: string | null;
  subject: string;
  discipline: string | null;
  level: string;
  duration: string | null;
  
  // Region-resolved pricing
  tuitionFee: string | null;
  currency: string;
  applicationFee: string | null;
  costOfLiving: string | null;
  scholarshipMin: number | null;
  scholarshipMax: number | null;
  
  // Region-resolved requirements
  englishRequirements: EnglishRequirementsStructured | null;
  academicRequirements: string | null;
  minimumAge: number | null;
  
  // Region/visa info
  regionCode: string;
  pathwayCode: string | null;
  visaRequired: boolean;
  visaInfo: typeof visaRequirements.$inferSelect | null;
  
  // Localized content
  localizedTitle?: string;
  localizedDescription?: string;
}

// Student profiles table
export const studentProfiles = pgTable("student_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  
  firstName: text("first_name"),
  lastName: text("last_name"),
  preferredName: text("preferred_name"),
  gender: genderEnum("gender"),
  maritalStatus: text("marital_status"),
  spouseFirstName: text("spouse_first_name"),
  spouseLastName: text("spouse_last_name"),
  spouseDateOfBirth: date("spouse_date_of_birth"),
  spouseNationality: text("spouse_nationality"),
  spouseCountryOfBirth: text("spouse_country_of_birth"),
  spousePassportNumber: text("spouse_passport_number"),
  spouseIsAccompanying: boolean("spouse_is_accompanying").default(false),
  phone: varchar("phone", { length: 20 }),
  whatsapp: varchar("whatsapp", { length: 20 }),
  dateOfBirth: date("date_of_birth"),
  nationality: text("nationality"),
  profileImageUrl: text("profile_image_url"),
  
  // Address fields
  unitNo: text("unit_no"),
  street: text("street"),
  suburb: text("suburb"),
  city: text("city"),
  state: text("state"),
  postcode: varchar("postcode", { length: 20 }),
  country: text("country"),
  
  bio: text("bio"),
  educationLevel: text("education_level"),
  fieldOfStudy: text("field_of_study"),
  careerGoals: text("career_goals"),
  previousEducation: text("previous_education"),
  
  // Current location and visa details (for students in Australia)
  currentCountry: text("current_country"),
  isInAustralia: boolean("is_in_australia").default(false),
  australianVisaType: australianVisaTypeEnum("australian_visa_type"),
  visaExpiryDate: date("visa_expiry_date"),
  visaConditions: text("visa_conditions"),
  
  // Passport details
  passportNumber: text("passport_number"),
  passportCountry: text("passport_country"),
  passportIssuedDate: date("passport_issued_date"),
  passportExpiryDate: date("passport_expiry_date"),
  passportIssuingAuthority: text("passport_issuing_authority"),
  
  // Destination study preference
  destinationCountry: text("destination_country"),
  
  // Highest qualification details (links to academic qualification types for matching)
  highestQualificationTypeId: varchar("highest_qualification_type_id").references(() => academicQualificationTypes.id, { onDelete: "set null" }),
  qualificationGrade: text("qualification_grade"),
  qualificationGradingType: text("qualification_grading_type"),
  graduationYear: integer("graduation_year"),
  qualificationInstitution: text("qualification_institution"),
  qualificationCountry: text("qualification_country"),
  
  // English proficiency
  englishProficiencyStatus: englishProficiencyStatusEnum("english_proficiency_status"),
  englishTestScores: jsonb("english_test_scores").$type<StudentEnglishTestScores>(),
  hasEnglishTest: boolean("has_english_test").default(false),
  
  // Study preferences (for course recommendations)
  preferredDiscipline: disciplineEnum("preferred_discipline"),
  preferredCourseLevel: courseLevelEnum("preferred_course_level"),
  preferredStudyMode: studyModeEnum("preferred_study_mode"),
  preferredIntakes: text("preferred_intakes").array(),
  
  // Budget range (for matching with course fees)
  budgetMin: decimal("budget_min", { precision: 10, scale: 2 }),
  budgetMax: decimal("budget_max", { precision: 10, scale: 2 }),
  budgetCurrency: varchar("budget_currency", { length: 3 }).default("AUD"),
  
  // PR pathway interest
  prPathwayInterest: boolean("pr_pathway_interest").default(false),
  
  // Passport
  hasPassport: boolean("has_passport").default(false),

  // Work experience
  hasWorkExperience: boolean("has_work_experience").default(false),
  workExperienceYears: integer("work_experience_years"),
  workExperienceIndustry: text("work_experience_industry"),
  
  // Profile wizard state (for auto-save)
  profileWizardStep: integer("profile_wizard_step").default(1),
  profileCompletionPercentage: integer("profile_completion_percentage").default(0),
  
  referralCode: varchar("referral_code", { length: 10 }).unique(),
  referredByCode: varchar("referred_by_code", { length: 10 }),
  
  // Bank details for affiliate payouts
  bankAccountHolderName: text("bank_account_holder_name"),
  bankName: text("bank_name"),
  bankBsbCode: varchar("bank_bsb_code", { length: 10 }),
  bankAccountNumber: varchar("bank_account_number", { length: 20 }),
  
  // Funding/Sponsor Information (for universal application)
  fundingSource: varchar("funding_source", { length: 30 }), // 'self', 'family', 'scholarship', 'employer', 'loan', 'government', 'mixed'
  sponsorName: text("sponsor_name"),
  sponsorRelationship: text("sponsor_relationship"),
  sponsorOccupation: text("sponsor_occupation"),
  sponsorPhone: varchar("sponsor_phone", { length: 50 }),
  sponsorEmail: text("sponsor_email"),
  sponsorAddress: text("sponsor_address"),
  
  // Statement of Purpose (universal for applications)
  statementOfPurpose: text("statement_of_purpose"),
  
  // Emergency Contact fields (syncs to CRM contacts)
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactMobile: varchar("emergency_contact_mobile", { length: 50 }),
  emergencyContactRelationship: text("emergency_contact_relationship"),
  emergencyContactAddress: text("emergency_contact_address"),
  
  // Application slots (default 3, can be increased by consultant)
  maxApplicationSlots: integer("max_application_slots").default(3).notNull(),
  
  // Email notification tracking
  welcomeEmailSent: boolean("welcome_email_sent").default(false),
  lastReminderSentAt: timestamp("last_reminder_sent_at"),
  reminderCount: integer("reminder_count").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Applications table
export const applications = pgTable("applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Human-readable application number (auto-generated, e.g., APP-2024-00001)
  applicationNumber: varchar("application_number", { length: 20 }).unique(),
  
  // Primary course (kept for backwards compatibility, new courses added via applicationCourses)
  courseId: varchar("course_id").references(() => courses.id, { onDelete: "set null" }),
  studentId: varchar("student_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  
  // Application stage workflow
  currentStage: applicationStageEnum("current_stage").notNull().default('Assessment'),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending', 'reviewing', 'accepted', 'rejected', 'withdrawn'
  
  // Consultant assignment for admin workflow
  assignedConsultantId: varchar("assigned_consultant_id").references(() => users.id, { onDelete: "set null" }), // Admin/consultant assigned to review
  assignedAt: timestamp("assigned_at"),

  // Branch ownership — inherited from the assigned consultant's branch at time of assignment
  // Used for branch-scoped RBAC filtering and reporting KPIs
  branchId: varchar("branch_id").references(() => branches.id, { onDelete: "set null" }),
  
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
  index("applications_number_idx").on(table.applicationNumber),
]);

// Application Courses junction table - allows multiple courses per application (for package courses)
export const applicationCourses = pgTable("application_courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
  courseId: varchar("course_id").references(() => courses.id, { onDelete: "set null" }),
  externalCourseName: varchar("external_course_name"),
  externalInstitutionName: varchar("external_institution_name"),
  
  // Course-specific details within the application
  isPrimary: boolean("is_primary").default(false), // First/main course in the package
  notes: text("notes"), // Course-specific notes
  
  // Order for display (e.g., Certificate III first, then Diploma, then Bachelor)
  displayOrder: integer("display_order").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  addedBy: varchar("added_by").references(() => users.id, { onDelete: "set null" }), // Who added this course
}, (table) => [
  index("app_courses_application_idx").on(table.applicationId),
  index("app_courses_course_idx").on(table.courseId),
]);

// Application stage history for tracking all stage transitions
export const applicationStageHistory = pgTable("application_stage_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
  
  fromStage: applicationStageEnum("from_stage"),
  toStage: applicationStageEnum("to_stage").notNull(),
  
  changedBy: varchar("changed_by").notNull().references(() => users.id, { onDelete: "cascade" }), // Who moved the stage
  changedByRole: varchar("changed_by_role", { length: 20 }).notNull(), // 'student', 'admin', 'institution_admin', 'platform_admin'
  
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
  uploadedByRole: varchar("uploaded_by_role", { length: 20 }), // 'student', 'admin', 'institution_admin', 'platform_admin'
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

// Task notes / comments thread for internal team updates
export const taskNotes = pgTable("task_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").references(() => users.id, { onDelete: "set null" }),

  content: text("content").notNull(),

  // IDs of team members @mentioned in this note
  mentionedUserIds: varchar("mentioned_user_ids").array(),

  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("task_notes_task_idx").on(table.taskId),
  index("task_notes_author_idx").on(table.authorId),
]);

export const insertTaskNoteSchema = createInsertSchema(taskNotes).omit({
  id: true,
  createdAt: true,
});
export type InsertTaskNote = z.infer<typeof insertTaskNoteSchema>;
export type TaskNote = typeof taskNotes.$inferSelect;

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

  // Visibility controls (mirrors contactNotes)
  visibility: noteVisibilityEnum("visibility").notNull().default("public"),
  visibleTo: text("visible_to").array().default(sql`'{}'::text[]`),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("internal_notes_application_idx").on(table.applicationId),
  index("internal_notes_author_idx").on(table.authorId),
  index("internal_notes_created_at_idx").on(table.createdAt),
]);

// Application notes for consultant-student communication (visible to both)
export const applicationNotes = pgTable("application_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  content: text("content").notNull(),
  
  // Role of the author (student, admin, university)
  authorRole: varchar("author_role", { length: 20 }).notNull(),
  
  // Read status for the recipient
  isReadByStudent: boolean("is_read_by_student").default(false),
  isReadByConsultant: boolean("is_read_by_consultant").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("app_notes_application_idx").on(table.applicationId),
  index("app_notes_author_idx").on(table.authorId),
  index("app_notes_created_at_idx").on(table.createdAt),
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

// Referral Invitations table - for students to actively invite friends
export const referralInvitations = pgTable("referral_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  inviteeName: text("invitee_name").notNull(),
  inviteeEmail: text("invitee_email").notNull(),
  referralCode: varchar("referral_code", { length: 10 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("invited"), // 'invited', 'registered', 'enrolled', 'expired'
  emailSentAt: timestamp("email_sent_at"),
  registeredAt: timestamp("registered_at"),
  registeredStudentId: varchar("registered_student_id").references(() => studentProfiles.id, { onDelete: "set null" }),
  expiresAt: timestamp("expires_at"), // Optional expiry for invitation
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Student Education History table
export const studentEducations = pgTable("student_educations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentProfileId: varchar("student_profile_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  
  // Country-specific qualification type (links to academic_qualification_types for smart matching)
  qualificationTypeId: varchar("qualification_type_id").references(() => academicQualificationTypes.id, { onDelete: "set null" }),
  
  // Legacy level field (kept for backward compatibility, prefer qualificationTypeId)
  level: varchar("level", { length: 50 }), // 'high_school', 'bachelor', 'master', 'phd', 'diploma', 'certificate'
  
  // Country where education was completed
  country: text("country"),
  
  // Institution details
  institution: text("institution"),
  fieldOfStudy: text("field_of_study"), // Maps to disciplines for course matching
  
  // Completion year (dropdown: 2000-2030)
  yearCompleted: integer("year_completed"),
  
  // Legacy date fields (kept for detailed records)
  startDate: date("start_date"),
  endDate: date("end_date"),
  isCurrentlyStudying: boolean("is_currently_studying").default(false),
  
  // Grade/Result (dynamic based on qualification's grading type)
  gpa: decimal("gpa", { precision: 5, scale: 2 }),
  gradeScale: varchar("grade_scale", { length: 20 }), // e.g., '4.0', '5.0', '100', 'percentage', 'division'
  gradeResult: varchar("grade_result", { length: 50 }), // e.g., 'First Class', 'A+', '85%', '3.8'
  
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
  role: varchar("role", { length: 30 }).notNull().default("support_staff"), // 'super_admin', 'branch_manager', 'support_staff', 'operations_staff'
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
  senderType: varchar("sender_type", { length: 20 }).notNull(), // 'student' or 'institution_admin'
  
  recipientId: varchar("recipient_id").references(() => users.id, { onDelete: "cascade" }), // Who receives the document (can be null for general submissions)
  recipientType: varchar("recipient_type", { length: 20 }), // 'student', 'institution_admin', or null
  
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
  ownerType: varchar("owner_type", { length: 20 }).notNull(), // 'student', 'institution_admin', 'admin'
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
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  fileType: varchar("file_type", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("conversation_idx").on(table.conversationId),
  index("sender_idx").on(table.senderId),
  index("created_at_idx").on(table.createdAt),
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
// CRM CONTACTS TABLES
// ============================================

// CRM Contacts table - unified contact management for all contact types
export const crmContacts = pgTable("crm_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Basic Information
  photo: text("photo"),
  contactType: contactTypeEnum("contact_type").notNull().default("none"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  preferredName: text("preferred_name"),
  gender: genderEnum("gender"),
  email: text("email").notNull(),
  mobile: text("mobile"),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  nationality: text("nationality"),
  country: text("country"),
  city: text("city"),
  
  // Client Status & Entry Source (primarily for 'clients' contact type)
  clientStatus: clientStatusEnum("client_status").default("lead"),
  leadStage: leadStageEnum("lead_stage").default("new"),
  entrySource: entrySourceEnum("entry_source").default("consultant"),
  leadRating: leadRatingEnum("lead_rating").default("cold"),
  
  // Regional & Branch Assignment
  regionId: varchar("region_id").references(() => regions.id),
  branchId: varchar("branch_id").references(() => branches.id),
  
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
  assignedTo: varchar("assigned_to").references(() => users.id),
  workdriveFolderUrl: text("workdrive_folder_url"),
  workdriveFolderId: text("workdrive_folder_id"),
  
  // Visit Summary (for website tracking)
  firstVisit: timestamp("first_visit"),
  visitorScore: integer("visitor_score"),
  referrer: text("referrer"),
  averageTimeSpent: integer("average_time_spent"),
  mostRecentVisit: timestamp("most_recent_visit"),
  firstPageVisited: text("first_page_visited"),
  numberOfChats: integer("number_of_chats").default(0),
  daysVisited: integer("days_visited").default(0),
  
  // Student/Client Specific Fields (for 'clients' contact type)
  courseName: text("course_name"),
  courseUrl: text("course_url"),
  interestedIn: text("interested_in"),
  courseId: varchar("course_id").references(() => courses.id),
  universityId: varchar("university_id").references(() => universities.id),
  bestTimeToContact: text("best_time_to_contact"),
  ieltsScore: text("ielts_score"),
  preferredInstitution: text("preferred_institution"),
  languageStream: text("language_stream"),
  programDiscipline: text("program_discipline"),
  scheduledAppointment: timestamp("scheduled_appointment"),
  whereToStudy: text("where_to_study"),
  programType: text("program_type"),
  subjectToStudy: text("subject_to_study"),
  visaStatus: varchar("visa_status", { length: 100 }),
  
  // Reference Source Tracking (for understanding lead origin)
  referenceSource: text("reference_source"), // Specific detail e.g. "QR Code - Dhaka Branch", "Facebook Winter Campaign"
  utmSource: text("utm_source"),       // e.g. "google", "facebook", "qr_code"
  utmMedium: text("utm_medium"),       // e.g. "cpc", "social", "email", "qr"
  utmCampaign: text("utm_campaign"),   // e.g. "winter_2026_intake"
  utmTerm: text("utm_term"),           // paid keyword
  utmContent: text("utm_content"),     // ad variant identifier

  // Facebook Ads Details (for tracking source)
  fbAdAccount: text("fb_ad_account"),
  fbLeadForm: text("fb_lead_form"),
  fbAdAccountId: text("fb_ad_account_id"),
  fbLeadFormId: text("fb_lead_form_id"),
  fbAdCampaign: text("fb_ad_campaign"),
  
  // Partner/Provider Rep Specific Fields (for 'providers_rep' contact type)
  companyName: text("company_name"),
  jobTitle: text("job_title"),
  department: text("department"),
  
  // Linked Accounts (for institutions/organizations)
  linkedAccountId: varchar("linked_account_id"),
  linkedAccountName: text("linked_account_name"),
  
  // Linked platform user (for contacts who have platform accounts)
  linkedUserId: varchar("linked_user_id").references(() => users.id),
  
  // Notes
  notes: text("notes"),
  
  // Created/Updated by tracking
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
  updatedByUserId: varchar("updated_by_user_id").references(() => users.id),
  
  // Activity tracking
  lastActivityTime: timestamp("last_activity_time"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  contactTypeIdx: index("crm_contacts_type_idx").on(table.contactType),
  clientStatusIdx: index("crm_contacts_client_status_idx").on(table.clientStatus),
  leadStageIdx: index("crm_contacts_lead_stage_idx").on(table.leadStage),
  entrySourceIdx: index("crm_contacts_entry_source_idx").on(table.entrySource),
  contactOwnerIdx: index("crm_contacts_owner_idx").on(table.contactOwner),
  assignedToIdx: index("crm_contacts_assigned_idx").on(table.assignedTo),
  emailIdx: index("crm_contacts_email_idx").on(table.email),
  createdAtIdx: index("crm_contacts_created_at_idx").on(table.createdAt),
  regionIdx: index("crm_contacts_region_idx").on(table.regionId),
  branchIdx: index("crm_contacts_branch_idx").on(table.branchId),
  linkedUserIdx: index("crm_contacts_linked_user_idx").on(table.linkedUserId),
}));

// Contact Status History for tracking client status changes with timeline
export const contactStatusHistory = pgTable("contact_status_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: varchar("contact_id").notNull().references(() => crmContacts.id, { onDelete: "cascade" }),
  fromStatus: clientStatusEnum("from_status"),
  toStatus: clientStatusEnum("to_status").notNull(),
  changedBy: varchar("changed_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  contactIdIdx: index("contact_status_history_contact_idx").on(table.contactId),
  createdAtIdx: index("contact_status_history_created_idx").on(table.createdAt),
}));

// Contact Notes table - individual notes with @mentions and visibility controls
export const contactNotes = pgTable("contact_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: varchar("contact_id").notNull().references(() => crmContacts.id, { onDelete: "cascade" }),
  title: text("title"),
  content: text("content").notNull(),
  mentions: text("mentions").array().default(sql`'{}'::text[]`), // Array of user IDs mentioned
  visibility: noteVisibilityEnum("visibility").notNull().default("public"),
  visibleTo: text("visible_to").array().default(sql`'{}'::text[]`), // Array of user IDs who can see
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  contactIdIdx: index("contact_notes_contact_idx").on(table.contactId),
  createdByIdx: index("contact_notes_created_by_idx").on(table.createdById),
  createdAtIdx: index("contact_notes_created_at_idx").on(table.createdAt),
}));

// Contact History/Activity Log - tracks all changes to contacts
export const contactHistory = pgTable("contact_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: varchar("contact_id").notNull().references(() => crmContacts.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 50 }).notNull(), // 'created', 'updated', 'status_changed', 'assigned', 'note_added', etc.
  fieldName: varchar("field_name", { length: 100 }), // The field that was changed
  oldValue: text("old_value"), // Previous value (JSON stringified if complex)
  newValue: text("new_value"), // New value (JSON stringified if complex)
  description: text("description"), // Human-readable description of the change
  changedByUserId: varchar("changed_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  contactIdIdx: index("contact_history_contact_idx").on(table.contactId),
  changedByIdx: index("contact_history_changed_by_idx").on(table.changedByUserId),
  createdAtIdx: index("contact_history_created_at_idx").on(table.createdAt),
  actionIdx: index("contact_history_action_idx").on(table.action),
}));

// Lead Course Preferences — up to 3 ranked study preferences per CRM lead
export const leadCoursePreferences = pgTable("lead_course_preferences", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  leadId: varchar("lead_id").notNull().references(() => crmContacts.id, { onDelete: "cascade" }),
  preferenceRank: integer("preference_rank").notNull(), // 1, 2, or 3
  country: text("country"),
  universityId: varchar("university_id").references(() => universities.id, { onDelete: "set null" }),
  courseId: varchar("course_id").references(() => courses.id, { onDelete: "set null" }),
  courseName: text("course_name"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  leadIdIdx: index("lead_course_prefs_lead_idx").on(table.leadId),
  rankIdx: index("lead_course_prefs_rank_idx").on(table.leadId, table.preferenceRank),
}));

export const insertLeadCoursePreferenceSchema = createInsertSchema(leadCoursePreferences).omit({ id: true, createdAt: true });
export type LeadCoursePreference = typeof leadCoursePreferences.$inferSelect;
export type InsertLeadCoursePreference = z.infer<typeof insertLeadCoursePreferenceSchema>;

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
  institutionTags: many(institutionTags),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  university: one(universities, {
    fields: [courses.universityId],
    references: [universities.id],
  }),
  applications: many(applications),
  courseComparisons: many(courseComparisons),
  englishRequirements: many(courseEnglishRequirements),
  intakeTemplates: many(courseIntakeTemplates),
  intakeDates: many(courseIntakeDates),
}));

export const courseIntakeTemplatesRelations = relations(courseIntakeTemplates, ({ one }) => ({
  course: one(courses, {
    fields: [courseIntakeTemplates.courseId],
    references: [courses.id],
  }),
}));

export const courseIntakeDatesRelations = relations(courseIntakeDates, ({ one }) => ({
  course: one(courses, {
    fields: [courseIntakeDates.courseId],
    references: [courses.id],
  }),
}));

// Course English Requirements relations
export const courseEnglishRequirementsRelations = relations(courseEnglishRequirements, ({ one }) => ({
  course: one(courses, {
    fields: [courseEnglishRequirements.courseId],
    references: [courses.id],
  }),
}));

// Institution tags relations (now uses unified tags table)
export const institutionTagsRelations = relations(institutionTags, ({ one }) => ({
  institution: one(universities, {
    fields: [institutionTags.institutionId],
    references: [universities.id],
  }),
  tag: one(tags, {
    fields: [institutionTags.tagId],
    references: [tags.id],
  }),
}));

// Tags relations - unified for both courses and institutions
export const tagsRelations = relations(tags, ({ many }) => ({
  courseTags: many(courseTags),
  institutionTags: many(institutionTags),
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
  qualificationType: one(academicQualificationTypes, {
    fields: [studentEducations.qualificationTypeId],
    references: [academicQualificationTypes.id],
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

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  course: one(courses, {
    fields: [applications.courseId],
    references: [courses.id],
  }),
  student: one(studentProfiles, {
    fields: [applications.studentId],
    references: [studentProfiles.id],
  }),
  assignedConsultant: one(users, {
    fields: [applications.assignedConsultantId],
    references: [users.id],
  }),
  applicationCourses: many(applicationCourses),
}));

// Application Courses relations - for package courses
export const applicationCoursesRelations = relations(applicationCourses, ({ one }) => ({
  application: one(applications, {
    fields: [applicationCourses.applicationId],
    references: [applications.id],
  }),
  course: one(courses, {
    fields: [applicationCourses.courseId],
    references: [courses.id],
  }),
  addedByUser: one(users, {
    fields: [applicationCourses.addedBy],
    references: [users.id],
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

export const referralInvitationsRelations = relations(referralInvitations, ({ one }) => ({
  referrer: one(studentProfiles, {
    fields: [referralInvitations.referrerId],
    references: [studentProfiles.id],
  }),
  registeredStudent: one(studentProfiles, {
    fields: [referralInvitations.registeredStudentId],
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
  availableMarkets: z.array(z.string()).optional(),
  featuredMarkets: z.array(z.string()).optional(),
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
  
  // Validate qualification framework - country-specific qualification systems
  qualificationFramework: z.enum([
    'AQF', 'Non-AQF', 'RQF', 'EQF', 'NZQF', 'MQF', 'US', 'Canadian', 'Other'
  ]).optional().default('AQF'),
  
  // Validate course level - enforce enum values (supports all frameworks)
  level: z.enum([
    // AQF Levels (Australia)
    'VCE (11-12)', 'Certificate I', 'Certificate II', 'Certificate III', 'Certificate IV',
    'Diploma', 'Advanced Diploma', 'Associate Degree', 'Graduate Certificate', 'Graduate Diploma',
    'Bachelor Degree', 'Bachelor Honours', 'Masters Degree', 'Doctoral Degree', 'Higher Doctoral Degree',
    // Non-AQF (Australia)
    'ELICOS - General English', 'ELICOS - EAP', 'ELICOS - Exam Prep',
    'Professional Year - Accounting', 'Professional Year - IT', 'Professional Year - Engineering',
    'Foundation', 'Pathway Program', 'Short Course',
    // RQF Levels (UK)
    'RQF Entry Level', 'RQF Level 1', 'RQF Level 2', 'RQF Level 3', 'RQF Level 4',
    'RQF Level 5', 'RQF Level 6', 'RQF Level 7', 'RQF Level 8',
    // NZQF Levels (New Zealand)
    'NZQF Level 1', 'NZQF Level 2', 'NZQF Level 3', 'NZQF Level 4', 'NZQF Level 5',
    'NZQF Level 6', 'NZQF Level 7', 'NZQF Level 8', 'NZQF Level 9', 'NZQF Level 10',
    // MQF Levels (Malaysia)
    'MQF Level 1', 'MQF Level 2', 'MQF Level 3', 'MQF Foundation', 'MQF Level 4',
    'MQF Level 5', 'MQF Level 6', 'MQF Level 7', 'MQF Level 8',
    // US Degrees
    'US Associate Degree', 'US Bachelor Degree', 'US Master Degree', 'US Doctoral Degree', 'US Professional Doctorate',
    // Canadian Qualifications
    'Canadian Certificate', 'Canadian Diploma', 'Canadian Advanced Diploma', 'Canadian Associate Degree',
    'Canadian Bachelor Degree', 'Canadian Master Degree', 'Canadian Doctoral Degree', 'Canadian CEGEP',
    // EQF Levels (Europe)
    'EQF Level 1', 'EQF Level 2', 'EQF Level 3', 'EQF Level 4', 'EQF Level 5',
    'EQF Level 6', 'EQF Level 7', 'EQF Level 8',
    // Other/Custom
    'Other',
  ]),
  
  // Custom level text for "Other" framework (nullable when not using "Other" framework)
  customLevel: z.string().nullable().optional(),
  
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
  applicationFees: optionalNumber,
  admissionFee: optionalNumber,
  materialsFee: optionalNumber,
  minimumAge: optionalInteger,
  
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

// Export the course schema - use for backend
export const insertCourseSchema = baseCourseSchema;

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

// Course specialization schemas (Tier 3)
export const insertCourseSpecializationSchema = createInsertSchema(courseSpecializations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  usageCount: true,
}).extend({
  subDisciplineId: z.string().min(1, "Sub-discipline is required"),
  name: z.string().min(1, "Specialization name is required"),
  slug: z.string().min(1, "Slug is required"),
});

export type InsertCourseSpecialization = z.infer<typeof insertCourseSpecializationSchema>;
export type CourseSpecialization = typeof courseSpecializations.$inferSelect;

// Tag schemas for unified tagging system (courses and institutions)
export const insertTagSchema = createInsertSchema(tags).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Tag name is required").max(100),
  slug: z.string().min(1, "Slug is required").max(100),
  // All categories: course-specific + institution-specific
  category: z.enum([
    'feature', 'delivery', 'career', 'skill', 'industry', 'audience', // Course categories
    'type', 'specialization', 'experience', 'location', 'financial', 'accreditation', 'services' // Institution categories
  ]),
  appliesTo: z.enum(['courses', 'institutions', 'both']).default('courses'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color").optional().nullable(),
});

export const updateTagSchema = insertTagSchema.partial();

export type Tag = typeof tags.$inferSelect;
export type InsertTag = z.infer<typeof insertTagSchema>;
export type UpdateTag = z.infer<typeof updateTagSchema>;

// Course-Tag association schema
export const insertCourseTagSchema = createInsertSchema(courseTags).omit({
  id: true,
  createdAt: true,
});

export type CourseTag = typeof courseTags.$inferSelect;
export type InsertCourseTag = z.infer<typeof insertCourseTagSchema>;

// Tag with usage counts for admin display (unified for courses and institutions)
export interface TagWithCount extends Tag {
  courseCount: number;
  institutionCount: number;
}

// ============================================
// INSTITUTION TAG JUNCTION SCHEMAS AND TYPES
// Note: Uses unified tags table - institutions can use tags with appliesTo='institutions' or 'both'
// ============================================

// Institution-Tag association schema
export const insertInstitutionTagSchema = createInsertSchema(institutionTags).omit({
  id: true,
  createdAt: true,
});

export type InstitutionTag = typeof institutionTags.$inferSelect;
export type InsertInstitutionTag = z.infer<typeof insertInstitutionTagSchema>;

// Backward-compatible type alias (institutions now use unified Tag type)
export type InstitutionTagRegistry = Tag;
export type InsertInstitutionTagRegistry = InsertTag;
export type UpdateInstitutionTagRegistry = UpdateTag;
export type InstitutionTagWithCount = TagWithCount;

// Institution with tags for API responses
export interface InstitutionWithTags {
  institution: University;
  tags: Tag[];
}

// Course with tags for API responses
export interface CourseWithTags {
  id: string;
  tags: Tag[];
}

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

export const insertCourseEnglishRequirementSchema = createInsertSchema(courseEnglishRequirements).omit({
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

export const insertReferralInvitationSchema = createInsertSchema(referralInvitations).omit({
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

export type CourseEnglishRequirement = typeof courseEnglishRequirements.$inferSelect;
export type InsertCourseEnglishRequirement = z.infer<typeof insertCourseEnglishRequirementSchema>;

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

export type ReferralInvitation = typeof referralInvitations.$inferSelect;
export type InsertReferralInvitation = z.infer<typeof insertReferralInvitationSchema>;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

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
  postType: varchar("post_type", { length: 20 }).notNull().default("blog"),
  availableMarkets: text("available_markets").array().notNull().default(sql`ARRAY['AU','BD']::text[]`),
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
  availableMarketsIdx: index("blogs_available_markets_gin_idx").using("gin", table.availableMarkets),
}));

export const insertBlogSchema = createInsertSchema(blogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  title: z.string().min(1).max(200),
  excerpt: z.string().max(300).optional(),
  content: z.string().min(1),
  category: z.string().max(100).optional(),
  postType: z.enum(["blog", "news", "update"]).default("blog"),
  availableMarkets: z.array(z.enum(["AU", "BD"])).default(["AU", "BD"]),
  tags: z.array(z.string()).optional(),
  metaTitle: z.string().max(60).optional(),
  metaDescription: z.string().max(160).optional(),
  authorId: z.string().optional(),
});

export type Blog = typeof blogs.$inferSelect;
export type InsertBlog = z.infer<typeof insertBlogSchema>;

export type BlogWithAuthor = Blog & {
  authorName?: string | null;
  authorAvatar?: string | null;
  authorRole?: string | null;
};

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

// SEO Metadata table - AI-generated SEO content for courses and institutions
export const seoMetadataEntityTypeEnum = pgEnum("seo_metadata_entity_type", ["course", "institution", "blog"]);

export const seoMetadata = pgTable("seo_metadata", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: seoMetadataEntityTypeEnum("entity_type").notNull(), // 'course', 'institution', 'blog'
  entityId: varchar("entity_id", { length: 255 }).notNull(), // References the course/institution/blog ID
  
  // SEO fields
  metaTitle: varchar("meta_title", { length: 60 }).notNull(), // Optimal 50-60 chars
  metaDescription: text("meta_description").notNull(), // Optimal 150-160 chars
  ogTitle: varchar("og_title", { length: 100 }), // Open Graph title
  ogDescription: text("og_description"), // Open Graph description
  ogImageUrl: text("og_image_url"), // Open Graph image
  canonicalUrl: text("canonical_url"), // Canonical URL override
  focusKeywords: text("focus_keywords").array(), // Target keywords
  
  // AI generation tracking
  isAiGenerated: boolean("is_ai_generated").default(false),
  aiModel: varchar("ai_model", { length: 100 }), // e.g., 'gpt-4o', 'gpt-4o-mini'
  aiPrompt: text("ai_prompt"), // The prompt used for generation
  generatedAt: timestamp("generated_at"),
  
  // Approval workflow
  status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending', 'approved', 'rejected'
  approvedBy: varchar("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  
  // Audit fields
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  updatedById: varchar("updated_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  entityTypeIdIdx: uniqueIndex("seo_metadata_entity_type_id_idx").on(table.entityType, table.entityId),
  statusIdx: index("seo_metadata_status_idx").on(table.status),
  focusKeywordsIdx: index("seo_metadata_focus_keywords_gin_idx").using("gin", table.focusKeywords),
}));

export const insertSeoMetadataSchema = createInsertSchema(seoMetadata).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  metaTitle: z.string().min(10).max(60),
  metaDescription: z.string().min(50).max(160),
  focusKeywords: z.array(z.string()).optional(),
});

export type SeoMetadata = typeof seoMetadata.$inferSelect;
export type InsertSeoMetadata = z.infer<typeof insertSeoMetadataSchema>;

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
  englishRequirementsStructured: jsonb("english_requirements_structured"),
  deliveryMode: text("delivery_mode"),
  campusLocations: text("campus_locations").array(),
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

// Application Notes (Consultant-Student Communication)
export const insertApplicationNoteSchema = createInsertSchema(applicationNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ApplicationNote = typeof applicationNotes.$inferSelect;
export type InsertApplicationNote = z.infer<typeof insertApplicationNoteSchema>;

// Follow-up Reminders
export const insertFollowUpReminderSchema = createInsertSchema(followUpReminders).omit({
  id: true,
  createdAt: true,
  completedAt: true,
  notificationSent: true,
  notificationSentAt: true,
}).extend({
  reminderAt: z.coerce.date(),
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
    profileImageUrl?: string | null;
  } | null;
  application?: {
    id: string;
    currentStage: string;
    studentName?: string;
    courseName?: string;
  } | null;
}

export interface TaskNoteWithAuthor extends TaskNote {
  author?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  } | null;
}

// Workload summary for dashboard
export interface WorkloadSummary {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: string | null;
  profileImageUrl: string | null;
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  overdueTasks: number;
  totalApplications: number;
  activeApplications: number;
  avgTaskCompletionTime?: number; // in hours
}

// ============================================
// CRM CONTACTS SCHEMAS AND TYPES
// ============================================

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

// Contact with relations for display
export interface CrmContactWithRelations extends CrmContact {
  ownerUser?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    profileImageUrl: string | null;
  } | null;
  assignedToUser?: {
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
  region?: {
    id: string;
    name: string;
  } | null;
  branch?: {
    id: string;
    name: string;
  } | null;
  statusHistory?: ContactStatusHistory[];
}

// Contact Status History
export const insertContactStatusHistorySchema = createInsertSchema(contactStatusHistory).omit({
  id: true,
  createdAt: true,
});

export type ContactStatusHistory = typeof contactStatusHistory.$inferSelect;
export type InsertContactStatusHistory = z.infer<typeof insertContactStatusHistorySchema>;

// Contact Status History with author details for display
export interface ContactStatusHistoryWithAuthor extends ContactStatusHistory {
  changedByUser: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    profileImageUrl: string | null;
  } | null;
}

// Contact Notes
export const insertContactNoteSchema = createInsertSchema(contactNotes).omit({
  id: true,
  createdAt: true,
});

export type ContactNote = typeof contactNotes.$inferSelect;
export type InsertContactNote = z.infer<typeof insertContactNoteSchema>;

// Contact Note with author details for display
export interface ContactNoteWithAuthor extends ContactNote {
  createdBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    profileImageUrl: string | null;
  };
}

// Contact History
export const insertContactHistorySchema = createInsertSchema(contactHistory).omit({
  id: true,
  createdAt: true,
});

export type ContactHistory = typeof contactHistory.$inferSelect;
export type InsertContactHistory = z.infer<typeof insertContactHistorySchema>;

// Contact History with author details for display
export interface ContactHistoryWithAuthor extends ContactHistory {
  changedBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    profileImageUrl: string | null;
  } | null;
}

// ============================================
// INSTITUTION CONTACTS, BUSINESS TERMS, DOCUMENTS
// ============================================

// Institution Contacts
export const insertInstitutionContactSchema = createInsertSchema(institutionContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateInstitutionContactSchema = insertInstitutionContactSchema.partial();

export type InstitutionContact = typeof institutionContacts.$inferSelect;
export type InsertInstitutionContact = z.infer<typeof insertInstitutionContactSchema>;
export type UpdateInstitutionContact = z.infer<typeof updateInstitutionContactSchema>;

// Institution Contact with CRM Contact details
export interface InstitutionContactWithDetails extends InstitutionContact {
  contact: CrmContact;
}

// Institution Business Terms
export const insertInstitutionBusinessTermsSchema = createInsertSchema(institutionBusinessTerms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateInstitutionBusinessTermsSchema = insertInstitutionBusinessTermsSchema.partial();

export type InstitutionBusinessTerms = typeof institutionBusinessTerms.$inferSelect;
export type InsertInstitutionBusinessTerms = z.infer<typeof insertInstitutionBusinessTermsSchema>;
export type UpdateInstitutionBusinessTerms = z.infer<typeof updateInstitutionBusinessTermsSchema>;

// Institution Documents
export const insertInstitutionDocumentSchema = createInsertSchema(institutionDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateInstitutionDocumentSchema = insertInstitutionDocumentSchema.partial();

export type InstitutionDocument = typeof institutionDocuments.$inferSelect;
export type InsertInstitutionDocument = z.infer<typeof insertInstitutionDocumentSchema>;
export type UpdateInstitutionDocument = z.infer<typeof updateInstitutionDocumentSchema>;

// ============================================
// GLOBAL REGION SYSTEM SCHEMAS AND TYPES
// ============================================

// Regions
export const insertRegionSchema = createInsertSchema(regions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateRegionSchema = insertRegionSchema.partial();

export type Region = typeof regions.$inferSelect;
export type InsertRegion = z.infer<typeof insertRegionSchema>;
export type UpdateRegion = z.infer<typeof updateRegionSchema>;

// Branches
export const insertBranchSchema = createInsertSchema(branches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateBranchSchema = insertBranchSchema.partial();

export type Branch = typeof branches.$inferSelect;
export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type UpdateBranch = z.infer<typeof updateBranchSchema>;

// ============================================
// API KEYS SCHEMAS AND TYPES
// ============================================

// API Keys
export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  keyHash: true, // Hash is generated server-side
  keyPrefix: true, // Prefix is extracted server-side
  usageCount: true,
  lastUsedAt: true,
  lastUsedIp: true,
  revokedAt: true,
  revokedByUserId: true,
  createdAt: true,
  updatedAt: true,
});

export const updateApiKeySchema = insertApiKeySchema.partial().omit({
  createdByUserId: true, // Cannot change ownership
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type UpdateApiKey = z.infer<typeof updateApiKeySchema>;

// API Key Usage Logs
export const insertApiKeyUsageLogSchema = createInsertSchema(apiKeyUsageLogs).omit({
  id: true,
  createdAt: true,
});

export type ApiKeyUsageLog = typeof apiKeyUsageLogs.$inferSelect;
export type InsertApiKeyUsageLog = z.infer<typeof insertApiKeyUsageLogSchema>;

// Student Pathways
export const insertStudentPathwaySchema = createInsertSchema(studentPathways).omit({
  id: true,
  createdAt: true,
});

export type StudentPathway = typeof studentPathways.$inferSelect;
export type InsertStudentPathway = z.infer<typeof insertStudentPathwaySchema>;

// Course Region Variants
export const insertCourseRegionVariantSchema = createInsertSchema(courseRegionVariants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateCourseRegionVariantSchema = insertCourseRegionVariantSchema.partial();

export type CourseRegionVariant = typeof courseRegionVariants.$inferSelect;
export type InsertCourseRegionVariant = z.infer<typeof insertCourseRegionVariantSchema>;
export type UpdateCourseRegionVariant = z.infer<typeof updateCourseRegionVariantSchema>;

// Visa Requirements
export const insertVisaRequirementSchema = createInsertSchema(visaRequirements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateVisaRequirementSchema = insertVisaRequirementSchema.partial();

export type VisaRequirement = typeof visaRequirements.$inferSelect;
export type InsertVisaRequirement = z.infer<typeof insertVisaRequirementSchema>;
export type UpdateVisaRequirement = z.infer<typeof updateVisaRequirementSchema>;

// Localized Content
export const insertLocalizedContentSchema = createInsertSchema(localizedContent).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  reviewedAt: true,
  translatedAt: true,
});

export const updateLocalizedContentSchema = insertLocalizedContentSchema.partial();

export type LocalizedContent = typeof localizedContent.$inferSelect;
export type InsertLocalizedContent = z.infer<typeof insertLocalizedContentSchema>;
export type UpdateLocalizedContent = z.infer<typeof updateLocalizedContentSchema>;

// Roles
export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateRoleSchema = insertRoleSchema.partial();

export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type UpdateRole = z.infer<typeof updateRoleSchema>;

// Permissions
export const insertPermissionSchema = createInsertSchema(permissions).omit({
  id: true,
  createdAt: true,
});

export const updatePermissionSchema = insertPermissionSchema.partial();

export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type UpdatePermission = z.infer<typeof updatePermissionSchema>;

// Role Permissions
export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({
  id: true,
  createdAt: true,
});

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;

// Role with permissions (for API responses)
export interface RoleWithPermissions extends Role {
  permissions: Permission[];
}

// Profiles
export const insertProfileSchema = createInsertSchema(profiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateProfileSchema = insertProfileSchema.partial();

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;

// Profile Permissions
export const insertProfilePermissionSchema = createInsertSchema(profilePermissions).omit({
  id: true,
  createdAt: true,
});

export type ProfilePermission = typeof profilePermissions.$inferSelect;
export type InsertProfilePermission = z.infer<typeof insertProfilePermissionSchema>;

// Profile with permissions (for API responses)
export interface ProfileWithPermissions extends Profile {
  permissions: ProfilePermission[];
}

// Invitations
export const insertInvitationSchema = createInsertSchema(invitations).omit({
  id: true,
  tokenHash: true,
  status: true,
  acceptedAt: true,
  revokedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type Invitation = typeof invitations.$inferSelect;
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;

// Invitation with role details (for API responses)
export interface InvitationWithDetails extends Invitation {
  role?: Role;
  invitedBy?: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  };
}

// User with role details (for authorization context)
export interface UserWithRole extends User {
  roleDetails?: RoleWithPermissions;
}

// Region with related data for frontend display
export interface RegionWithDetails extends Region {
  pathways?: StudentPathway[];
  visaRequirements?: VisaRequirement[];
  courseVariantCount?: number;
}

// Course variant with full relations
export interface CourseRegionVariantWithRelations extends CourseRegionVariant {
  course?: {
    id: string;
    title: string;
    subject: string;
    level: string | null;
    universityId: string;
  };
  region?: Region;
  pathway?: StudentPathway;
  visaRequirement?: VisaRequirement;
}

// Resolved course data for region-aware display (merges base course with variant overrides)
export interface ResolvedCourseData {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  discipline: string | null;
  level: string | null;
  duration: string | null;
  
  // Pricing (from variant or base course)
  tuitionFee: string | null;
  currency: string;
  applicationFee: string | null;
  costOfLiving: string | null;
  scholarshipMin: number | null;
  scholarshipMax: number | null;
  
  // Requirements (from variant or base course)
  englishRequirements: Record<string, any> | null;
  academicRequirements: string | null;
  minimumAge: number | null;
  
  // Region context
  regionCode: string;
  pathwayCode: string | null;
  visaRequired: boolean;
  visaInfo: VisaRequirement | null;
  
  // Localized content overrides
  localizedTitle?: string;
  localizedDescription?: string;
}

// ============================================
// Profile Section Verification System
// ============================================

// Profile Section Verifications - tracks verification status per section
export const profileSectionVerifications = pgTable("profile_section_verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentProfileId: varchar("student_profile_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  section: profileSectionEnum("section").notNull(),
  status: verificationStatusEnum("status").notNull().default("unverified"),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: varchar("verified_by").references(() => users.id, { onDelete: "set null" }),
  verifierNotes: text("verifier_notes"),
  lastUpdatedAt: timestamp("last_updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueSectionPerProfile: unique().on(table.studentProfileId, table.section),
}));

// Profile Change History - tracks all changes to profile fields
export const profileChangeHistory = pgTable("profile_change_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentProfileId: varchar("student_profile_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  section: profileSectionEnum("section").notNull(),
  fieldName: text("field_name").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  changedAt: timestamp("changed_at").defaultNow(),
  changedBy: varchar("changed_by").references(() => users.id, { onDelete: "set null" }),
  changeReason: text("change_reason"),
});

// Application Profile Snapshots - preserves profile data at application submission time
export const applicationProfileSnapshots = pgTable("application_profile_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
  studentProfileId: varchar("student_profile_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  
  // Snapshot of all profile data as JSON
  profileData: jsonb("profile_data").notNull(),
  educationData: jsonb("education_data"),
  languageData: jsonb("language_data"),
  employmentData: jsonb("employment_data"),
  
  // Verification status at time of snapshot
  verificationStatusSnapshot: jsonb("verification_status_snapshot"),
  
  snapshotAt: timestamp("snapshot_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Types for verification system
export type ProfileSectionVerification = typeof profileSectionVerifications.$inferSelect;
export type InsertProfileSectionVerification = typeof profileSectionVerifications.$inferInsert;

export type ProfileChangeHistoryRecord = typeof profileChangeHistory.$inferSelect;
export type InsertProfileChangeHistory = typeof profileChangeHistory.$inferInsert;

export type ApplicationProfileSnapshot = typeof applicationProfileSnapshots.$inferSelect;
export type InsertApplicationProfileSnapshot = typeof applicationProfileSnapshots.$inferInsert;

// Profile section names as const for type safety
export const PROFILE_SECTIONS = [
  'personal',
  'passport',
  'education',
  'language',
  'preferences',
  'employment',
  'funding',
  'emergency',
  'sop',
  'bio',
] as const;

export type ProfileSection = typeof PROFILE_SECTIONS[number];

export type VerificationStatus = 'unverified' | 'pending_verification' | 'verified' | 'needs_reverification';

// ============================================
// NOTIFICATION & EMAIL MANAGEMENT SYSTEM
// ============================================

export const NOTIFICATION_TYPES = [
  'new_signup',
  'new_lead',
  'contact_inquiry',
  'task_assigned',
  'task_completed',
  'task_due_reminder',
  'application_assigned',
  'application_stage_change',
  'document_uploaded',
  'document_verified',
  'document_rejected',
  'document_requested',
  'admin_pending',
  'institution_approved',
  'institution_rejected',
  'course_approved',
  'course_rejected',
  'general',
  'invoice_sent',
  'payment_receipt',
  'invoice_overdue_reminder',
] as const;

export type NotificationType = typeof NOTIFICATION_TYPES[number];

export const NOTIFICATION_ROLES = [
  'cto',
  'branch_manager',
  'education_consultant',
  'marketing_officer',
  'accounts_officer',
  'hr_officer',
  'it_support',
  'branch_manager',
  'all_admins',
] as const;

export type NotificationRole = typeof NOTIFICATION_ROLES[number];

export const globalNotificationDefaults = pgTable("global_notification_defaults", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  notificationType: varchar("notification_type", { length: 50 }).notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  emailEnabled: boolean("email_enabled").notNull().default(true),
  inAppEnabled: boolean("in_app_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("gnd_type_role_idx").on(table.notificationType, table.role),
]);

export const userNotificationOverrides = pgTable("user_notification_overrides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  notificationType: varchar("notification_type", { length: 50 }).notNull(),
  emailEnabled: boolean("email_enabled"),
  inAppEnabled: boolean("in_app_enabled"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("uno_user_type_idx").on(table.userId, table.notificationType),
]);

export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  notificationType: varchar("notification_type", { length: 50 }).notNull().unique(),
  label: text("label").notNull(),
  description: text("description"),
  subjectTemplate: text("subject_template").notNull(),
  bodyTemplate: text("body_template").notNull(),
  availableVariables: jsonb("available_variables").$type<string[]>().default([]),
  isCustom: boolean("is_custom").notNull().default(false),
  updatedBy: varchar("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type GlobalNotificationDefault = typeof globalNotificationDefaults.$inferSelect;
export type InsertGlobalNotificationDefault = typeof globalNotificationDefaults.$inferInsert;

export type UserNotificationOverride = typeof userNotificationOverrides.$inferSelect;
export type InsertUserNotificationOverride = typeof userNotificationOverrides.$inferInsert;

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;

// ── Team Channels ─────────────────────────────────────────────────────────────

export const channels = pgTable("channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  isPrivate: boolean("is_private").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const channelMembers = pgTable("channel_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelId: varchar("channel_id").notNull().references(() => channels.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).default("member"),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const channelMessages = pgTable("channel_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelId: varchar("channel_id").notNull().references(() => channels.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").references(() => users.id, { onDelete: "set null" }),
  content: text("content").notNull(),
  fileUrl: text("file_url"),
  fileName: varchar("file_name"),
  fileSize: integer("file_size"),
  fileType: varchar("file_type"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChannelSchema = createInsertSchema(channels).omit({ id: true, createdAt: true });
export const insertChannelMessageSchema = createInsertSchema(channelMessages).omit({ id: true, createdAt: true });

export type Channel = typeof channels.$inferSelect;
export type InsertChannel = z.infer<typeof insertChannelSchema>;
export type ChannelMember = typeof channelMembers.$inferSelect;
export type ChannelMessage = typeof channelMessages.$inferSelect;
export type InsertChannelMessage = z.infer<typeof insertChannelMessageSchema>;

// ── Saved Filters ─────────────────────────────────────────────────────────────

export const savedFilters = pgTable("saved_filters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  panelType: varchar("panel_type", { length: 20 }).notNull(),
  filters: jsonb("filters").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSavedFilterSchema = createInsertSchema(savedFilters).omit({ id: true, createdAt: true });
export type SavedFilter = typeof savedFilters.$inferSelect;
export type InsertSavedFilter = z.infer<typeof insertSavedFilterSchema>;

// ── People / HR Module ────────────────────────────────────────────────────────
// This domain will grow to include Leave, KPI Tracking, and Performance Reviews.
// All tables share the pattern: userId (FK → users), branchId (snapshot at creation),
// timestamps, and RBAC scoping enforced at the API layer.

export const attendanceRecords = pgTable("attendance_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: varchar("branch_id"),
  clockInAt: timestamp("clock_in_at").notNull().defaultNow(),
  clockInPhotoPath: varchar("clock_in_photo_path").notNull(),
  clockOutAt: timestamp("clock_out_at"),
  clockOutPhotoPath: varchar("clock_out_photo_path"),
  totalMinutes: integer("total_minutes"),
  workDate: varchar("work_date", { length: 10 }).notNull(),
  notes: varchar("notes"),
  ipAddress: varchar("ip_address"),
  location: varchar("location"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAttendanceRecordSchema = createInsertSchema(attendanceRecords).omit({
  id: true,
  createdAt: true,
});
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type InsertAttendanceRecord = z.infer<typeof insertAttendanceRecordSchema>;

export const attendanceBreaks = pgTable("attendance_breaks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  attendanceRecordId: varchar("attendance_record_id").notNull().references(() => attendanceRecords.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  breakStartAt: timestamp("break_start_at").notNull().defaultNow(),
  breakEndAt: timestamp("break_end_at"),
  totalBreakMinutes: integer("total_break_minutes"),
});
export const insertAttendanceBreakSchema = createInsertSchema(attendanceBreaks).omit({ id: true });
export type AttendanceBreak = typeof attendanceBreaks.$inferSelect;
export type InsertAttendanceBreak = z.infer<typeof insertAttendanceBreakSchema>;

// ─── Zoho Mail Cache Tables ────────────────────────────────────────────────

export const emailAccounts = pgTable("email_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  label: varchar("label", { length: 100 }).notNull(),
  displayName: varchar("display_name", { length: 100 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  accountType: varchar("account_type", { length: 20 }).notNull().default("group"), // 'personal' | 'group'
  imapHost: varchar("imap_host", { length: 255 }).notNull(),
  imapPort: integer("imap_port").notNull().default(993),
  smtpHost: varchar("smtp_host", { length: 255 }).notNull(),
  smtpPort: integer("smtp_port").notNull().default(465),
  isActive: boolean("is_active").notNull().default(true),
  regionCode: varchar("region_code", { length: 10 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export const insertEmailAccountSchema = createInsertSchema(emailAccounts).omit({ id: true, createdAt: true });
export type EmailAccount = typeof emailAccounts.$inferSelect;
export type InsertEmailAccount = z.infer<typeof insertEmailAccountSchema>;

// App passwords for each mail account (stored in DB, managed by platform admin)
export const emailAccountSecrets = pgTable("email_account_secrets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => emailAccounts.id, { onDelete: "cascade" }),
  appPassword: text("app_password").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
export const insertEmailAccountSecretSchema = createInsertSchema(emailAccountSecrets).omit({ id: true, createdAt: true, updatedAt: true });
export type EmailAccountSecret = typeof emailAccountSecrets.$inferSelect;
export type InsertEmailAccountSecret = z.infer<typeof insertEmailAccountSecretSchema>;

// Access control: which admin users can access which mail accounts
export const emailAccountAccess = pgTable("email_account_access", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => emailAccounts.id, { onDelete: "cascade" }),
  adminUserId: varchar("admin_user_id").notNull(),
  canSend: boolean("can_send").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  unique().on(t.accountId, t.adminUserId),
]);
export const insertEmailAccountAccessSchema = createInsertSchema(emailAccountAccess).omit({ id: true, createdAt: true });
export type EmailAccountAccess = typeof emailAccountAccess.$inferSelect;
export type InsertEmailAccountAccess = z.infer<typeof insertEmailAccountAccessSchema>;

export const emailCache = pgTable("email_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  uid: varchar("uid", { length: 50 }).notNull(),
  account: varchar("account", { length: 255 }).notNull(),
  folder: varchar("folder", { length: 255 }).notNull().default("INBOX"),
  fromAddress: varchar("from_address", { length: 500 }),
  fromName: varchar("from_name", { length: 255 }),
  toAddresses: text("to_addresses"),
  subject: varchar("subject", { length: 1000 }),
  snippet: text("snippet"),
  sentAt: timestamp("sent_at"),
  isRead: boolean("is_read").notNull().default(false),
  isStarred: boolean("is_starred").notNull().default(false),
  hasAttachments: boolean("has_attachments").notNull().default(false),
  threadId: varchar("thread_id", { length: 255 }),
  fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
}, (t) => [
  unique().on(t.uid, t.account, t.folder),
]);
export const insertEmailCacheSchema = createInsertSchema(emailCache).omit({ id: true });
export type EmailCacheEntry = typeof emailCache.$inferSelect;
export type InsertEmailCacheEntry = z.infer<typeof insertEmailCacheSchema>;

export const emailBodyCache = pgTable("email_body_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  uid: varchar("uid", { length: 50 }).notNull(),
  account: varchar("account", { length: 255 }).notNull(),
  folder: varchar("folder", { length: 255 }).notNull().default("INBOX"),
  htmlBody: text("html_body"),
  textBody: text("text_body"),
  rawHeaders: text("raw_headers"),
  attachmentsMeta: text("attachments_meta"),
  fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
}, (t) => [
  unique().on(t.uid, t.account, t.folder),
]);
export const insertEmailBodyCacheSchema = createInsertSchema(emailBodyCache).omit({ id: true });
export type EmailBodyCache = typeof emailBodyCache.$inferSelect;
export type InsertEmailBodyCache = z.infer<typeof insertEmailBodyCacheSchema>;

// ─── Accounting Module ──────────────────────────────────────────────────────

export const accAccountTypeEnum = pgEnum('acc_account_type', [
  'asset', 'liability', 'income', 'expense', 'equity',
]);

export const accInvoiceStatusEnum = pgEnum('acc_invoice_status', [
  'draft', 'sent', 'partially_paid', 'paid', 'void', 'overdue',
]);

export const accPaymentMethodEnum = pgEnum('acc_payment_method', [
  'bank', 'cash', 'card', 'cheque',
]);

export const accBillToTypeEnum = pgEnum('acc_bill_to_type', [
  'institution', 'student', 'manual',
]);

export const accChartOfAccounts = pgTable("acc_chart_of_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 20 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  accountType: accAccountTypeEnum("account_type").notNull(),
  description: text("description"),
  isSystem: boolean("is_system").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export const insertAccChartOfAccountsSchema = createInsertSchema(accChartOfAccounts).omit({ id: true, createdAt: true });
export type AccChartOfAccount = typeof accChartOfAccounts.$inferSelect;
export type InsertAccChartOfAccount = z.infer<typeof insertAccChartOfAccountsSchema>;

export const accCustomers = pgTable("acc_customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  currency: varchar("currency", { length: 3 }).default("AUD"),
  crmContactId: varchar("crm_contact_id"),
  institutionId: varchar("institution_id").references(() => universities.id, { onDelete: "set null" }),
  studentId: varchar("student_id").references(() => studentProfiles.id, { onDelete: "set null" }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export const insertAccCustomerSchema = createInsertSchema(accCustomers).omit({ id: true, createdAt: true });
export type AccCustomer = typeof accCustomers.$inferSelect;
export type InsertAccCustomer = z.infer<typeof insertAccCustomerSchema>;

export const accItems = pgTable("acc_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  defaultPrice: decimal("default_price", { precision: 12, scale: 2 }).default("0"),
  unit: varchar("unit", { length: 50 }).default("unit"),
  incomeAccountId: varchar("income_account_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export const insertAccItemSchema = createInsertSchema(accItems).omit({ id: true, createdAt: true });
export type AccItem = typeof accItems.$inferSelect;
export type InsertAccItem = z.infer<typeof insertAccItemSchema>;

export const accInvoices = pgTable("acc_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: varchar("invoice_number", { length: 30 }).notNull().unique(),
  customerId: varchar("customer_id").notNull(),
  billToType: accBillToTypeEnum("bill_to_type").notNull().default("manual"),
  institutionId: varchar("institution_id").references(() => universities.id, { onDelete: "set null" }),
  studentId: varchar("student_id").references(() => studentProfiles.id, { onDelete: "set null" }),
  applicationId: varchar("application_id").references(() => applications.id, { onDelete: "set null" }),
  issueDate: date("issue_date").notNull(),
  dueDate: date("due_date").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("AUD"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  gstEnabled: boolean("gst_enabled").default(false),
  gstAmount: decimal("gst_amount", { precision: 12, scale: 2 }).default("0"),
  total: decimal("total", { precision: 12, scale: 2 }).notNull().default("0"),
  amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }).default("0"),
  status: accInvoiceStatusEnum("status").notNull().default("draft"),
  notes: text("notes"),
  terms: text("terms"),
  regionCode: varchar("region_code", { length: 5 }).default("AU"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
export const insertAccInvoiceSchema = createInsertSchema(accInvoices).omit({ id: true, createdAt: true, updatedAt: true, invoiceNumber: true, amountPaid: true });
export type AccInvoice = typeof accInvoices.$inferSelect;
export type InsertAccInvoice = z.infer<typeof insertAccInvoiceSchema>;

export const accInvoiceLineItems = pgTable("acc_invoice_line_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull(),
  itemId: varchar("item_id"),
  description: varchar("description", { length: 500 }).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull().default("0"),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull().default("0"),
});
export const insertAccInvoiceLineItemSchema = createInsertSchema(accInvoiceLineItems).omit({ id: true });
export type AccInvoiceLineItem = typeof accInvoiceLineItems.$inferSelect;
export type InsertAccInvoiceLineItem = z.infer<typeof insertAccInvoiceLineItemSchema>;

export const accInvoiceItems = accInvoiceLineItems;

export const accPaymentsReceived = pgTable("acc_payments_received", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentDate: date("payment_date").notNull(),
  method: accPaymentMethodEnum("method").notNull(),
  reference: varchar("reference", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export const insertAccPaymentReceivedSchema = createInsertSchema(accPaymentsReceived).omit({ id: true, createdAt: true });
export type AccPaymentReceived = typeof accPaymentsReceived.$inferSelect;
export type InsertAccPaymentReceived = z.infer<typeof insertAccPaymentReceivedSchema>;

export const accCreditNotes = pgTable("acc_credit_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull(),
  creditNoteNumber: varchar("credit_note_number", { length: 30 }).notNull(),
  issueDate: date("issue_date").notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull().default("0"),
  reason: text("reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export const insertAccCreditNoteSchema = createInsertSchema(accCreditNotes).omit({ id: true, createdAt: true });
export type AccCreditNote = typeof accCreditNotes.$inferSelect;
export type InsertAccCreditNote = z.infer<typeof insertAccCreditNoteSchema>;

export const accCreditNoteItems = pgTable("acc_credit_note_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  creditNoteId: varchar("credit_note_id").notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull().default("0"),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull().default("0"),
});
export const insertAccCreditNoteItemSchema = createInsertSchema(accCreditNoteItems).omit({ id: true });
export type AccCreditNoteItem = typeof accCreditNoteItems.$inferSelect;
export type InsertAccCreditNoteItem = z.infer<typeof insertAccCreditNoteItemSchema>;

export const accExpenseCategories = pgTable("acc_expense_categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  type: varchar("type", { length: 50 }).notNull().default("expense"),
});
export const insertAccExpenseCategorySchema = createInsertSchema(accExpenseCategories).omit({ id: true });
export type AccExpenseCategory = typeof accExpenseCategories.$inferSelect;
export type InsertAccExpenseCategory = z.infer<typeof insertAccExpenseCategorySchema>;

export const accExpenses = pgTable("acc_expenses", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  categoryId: integer("category_id").references(() => accExpenseCategories.id),
  vendor: varchar("vendor", { length: 255 }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("AUD"),
  expenseDate: date("expense_date").notNull(),
  description: text("description"),
  receiptRef: varchar("receipt_ref", { length: 255 }),
  regionCode: varchar("region_code", { length: 10 }),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export const insertAccExpenseSchema = createInsertSchema(accExpenses).omit({ id: true, createdAt: true });
export type AccExpense = typeof accExpenses.$inferSelect;
export type InsertAccExpense = z.infer<typeof insertAccExpenseSchema>;

export const accBillStatusEnum = pgEnum('acc_bill_status', [
  'unpaid', 'partially_paid', 'paid', 'overdue'
]);

export const accBills = pgTable("acc_bills", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  categoryId: integer("category_id").references(() => accExpenseCategories.id),
  vendor: varchar("vendor", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("AUD"),
  issueDate: date("issue_date").notNull(),
  dueDate: date("due_date").notNull(),
  description: text("description"),
  reference: varchar("reference", { length: 255 }),
  status: accBillStatusEnum("status").notNull().default("unpaid"),
  regionCode: varchar("region_code", { length: 10 }),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export const insertAccBillSchema = createInsertSchema(accBills).omit({ id: true, createdAt: true });
export type AccBill = typeof accBills.$inferSelect;
export type InsertAccBill = z.infer<typeof insertAccBillSchema>;

export const accBillPayments = pgTable("acc_bill_payments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  billId: integer("bill_id").notNull().references(() => accBills.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paidOn: date("paid_on").notNull(),
  method: varchar("method", { length: 100 }),
  reference: varchar("reference", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export const insertAccBillPaymentSchema = createInsertSchema(accBillPayments).omit({ id: true, createdAt: true });
export type AccBillPayment = typeof accBillPayments.$inferSelect;
export type InsertAccBillPayment = z.infer<typeof insertAccBillPaymentSchema>;

export const accReminderLogs = pgTable("acc_reminder_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  invoiceId: integer("invoice_id").notNull(),
  sentTo: varchar("sent_to", { length: 255 }).notNull(),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  triggeredBy: varchar("triggered_by", { length: 255 }),
});
