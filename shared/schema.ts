import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
  boolean,
  integer,
  decimal,
  date,
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
  location: text("location"),
  country: text("country"),
  establishedYear: integer("established_year"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  numberOfCampuses: integer("number_of_campuses"),
  providerType: text("provider_type"), // Private Institutions, TAFE, Private University, Public University
  scholarshipPercentage: integer("scholarship_percentage"),
  topDisciplines: text("top_disciplines").array(),
  
  // New detailed fields
  smallDescription: text("small_description"), // AI-powered, max 100 words
  fullDescription: text("full_description"), // AI-powered
  institutionGallery: text("institution_gallery").array(), // Up to 3 images, 600x400px
  topCourses: text("top_courses").array(), // Array of course IDs or names
  
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
  scholarshipPercentage: integer("scholarship_percentage"),
  eligibilityRequirements: text("eligibility_requirements"),
  englishRequirements: text("english_requirements"),
  curriculumUrl: text("curriculum_url"),
  costOfLiving: decimal("cost_of_living", { precision: 10, scale: 2 }),
  applicationFees: decimal("application_fees", { precision: 10, scale: 2 }),
  images: text("images").array(),
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
  type: varchar("type", { length: 50 }).notNull(), // 'transcript', 'ielts', 'pte', 'offer_letter', 'coe', 'visa_document', 'other'
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
  
  status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending', 'reviewed', 'approved', 'rejected'
  reviewNotes: text("review_notes"),
  reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one }) => ({
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
}));

export const studentProfilesRelations = relations(studentProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [studentProfiles.userId],
    references: [users.id],
  }),
  applications: many(applications),
  educations: many(studentEducations),
  languageScores: many(studentLanguageScores),
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

export const documentsRelations = relations(documents, ({ one }) => ({
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
});

export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

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

export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

export type StudentProfile = typeof studentProfiles.$inferSelect;
export type InsertStudentProfile = z.infer<typeof insertStudentProfileSchema>;

export type Application = typeof applications.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;

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

export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
