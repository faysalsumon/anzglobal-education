import {
  users,
  universities,
  courses,
  subDisciplines,
  studentProfiles,
  applications,
  universityTeamMembers,
  adminTeamMembers,
  studentEducations,
  studentLanguageScores,
  studentEmployments,
  courseEnglishRequirements,
  referrals,
  referralInvitations,
  type User,
  type UpsertUser,
  type University,
  type InsertUniversity,
  type Course,
  type InsertCourse,
  type CourseWithUniversity,
  type SubDiscipline,
  type InsertSubDiscipline,
  type CourseSpecialization,
  type InsertCourseSpecialization,
  courseSpecializations,
  type StudentProfile,
  type InsertStudentProfile,
  type Application,
  type InsertApplication,
  type UniversityTeamMember,
  type InsertUniversityTeamMember,
  type AdminTeamMember,
  type InsertAdminTeamMember,
  type StudentEducation,
  type InsertStudentEducation,
  type StudentLanguageScore,
  type InsertStudentLanguageScore,
  type StudentEmployment,
  type InsertStudentEmployment,
  type CourseEnglishRequirement,
  type InsertCourseEnglishRequirement,
  type Referral,
  type InsertReferral,
  type ReferralInvitation,
  type InsertReferralInvitation,
  contactSubmissions,
  type ContactSubmission,
  type InsertContactSubmission,
  documents,
  type Document,
  type InsertDocument,
  documentFolders,
  type DocumentFolder,
  type InsertDocumentFolder,
  documentComments,
  type DocumentComment,
  type InsertDocumentComment,
  documentRequests,
  type DocumentRequest,
  type InsertDocumentRequest,
  blogs,
  type Blog,
  type BlogWithAuthor,
  type InsertBlog,
  contactInquiries,
  type ContactInquiry,
  type InsertContactInquiry,
  // CRM imports
  crmContacts,
  tasks,
  taskNotes,
  applicationInternalNotes,
  followUpReminders,
  type Task,
  type InsertTask,
  type UpdateTask,
  type TaskNote,
  type InsertTaskNote,
  type TaskNoteWithAuthor,
  type ApplicationInternalNote,
  type InsertApplicationInternalNote,
  type FollowUpReminder,
  type InsertFollowUpReminder,
  type TaskWithRelations,
  type WorkloadSummary,
  // CMS imports
  testimonials,
  faqs,
  publicTeamMembers,
  siteSettings,
  contentSnippets,
  type Testimonial,
  type InsertTestimonial,
  type UpdateTestimonial,
  type Faq,
  type InsertFaq,
  type UpdateFaq,
  type PublicTeamMember,
  type InsertPublicTeamMember,
  type UpdatePublicTeamMember,
  type SiteSetting,
  type InsertSiteSetting,
  type UpdateSiteSetting,
  type ContentSnippet,
  type InsertContentSnippet,
  type UpdateContentSnippet,
  // Region system imports
  regions,
  studentPathways,
  courseRegionVariants,
  visaRequirements,
  localizedContent,
  type Region,
  type InsertRegion,
  type UpdateRegion,
  type StudentPathway,
  type InsertStudentPathway,
  type CourseRegionVariant,
  type InsertCourseRegionVariant,
  type UpdateCourseRegionVariant,
  type VisaRequirement,
  type InsertVisaRequirement,
  type UpdateVisaRequirement,
  type LocalizedContent,
  type InsertLocalizedContent,
  type UpdateLocalizedContent,
  type RegionWithDetails,
  type CourseRegionVariantWithRelations,
  type ResolvedCourseData,
  // Qualification system imports
  academicQualificationTypes,
  qualificationEquivalencies,
  // AI Settings imports
  aiSettings,
  type AiSetting,
  type InsertAiSetting,
  // API Keys imports
  apiKeys,
  apiKeyUsageLogs,
  type ApiKey,
  type ApiKeyUsageLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, like, or, desc, isNull, sql, lt, lte, gte, count, getTableColumns } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(userData: Partial<User>): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;

  // University operations
  getUniversityById(id: string): Promise<University | undefined>;
  getUniversityBySlug(slug: string): Promise<University | undefined>;
  getUniversityByIdOrSlug(idOrSlug: string): Promise<University | undefined>;
  getUniversityByUserId(userId: string): Promise<University | undefined>;
  getAllUniversities(): Promise<University[]>;
  createUniversity(university: InsertUniversity): Promise<University>;
  updateUniversity(id: string, data: Partial<University>): Promise<University>;
  deleteUniversity(id: string): Promise<void>;
  
  // Course operations
  getCourseById(id: string): Promise<CourseWithUniversity | undefined>;
  getCourseBySlug(slug: string): Promise<CourseWithUniversity | undefined>;
  getCourseByIdOrSlug(idOrSlug: string): Promise<CourseWithUniversity | undefined>;
  getCoursesByUniversityId(universityId: string): Promise<CourseWithUniversity[]>;
  getAllCourses(): Promise<CourseWithUniversity[]>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: string, data: Partial<Course>): Promise<Course>;
  deleteCourse(id: string): Promise<void>;
  
  // Sub-discipline operations
  getSubDisciplines(discipline?: string): Promise<SubDiscipline[]>;
  getSubDisciplineById(id: string): Promise<SubDiscipline | undefined>;
  createSubDiscipline(subDiscipline: InsertSubDiscipline): Promise<SubDiscipline>;
  incrementSubDisciplineUsage(id: string): Promise<void>;
  
  // Course specialization operations (Tier 3)
  getSpecializations(subDisciplineId?: string): Promise<CourseSpecialization[]>;
  getSpecializationById(id: string): Promise<CourseSpecialization | undefined>;
  createOrGetSpecialization(name: string, subDisciplineId: string): Promise<CourseSpecialization>;
  incrementSpecializationUsage(id: string): Promise<void>;
  
  // Student profile operations
  getStudentProfileById(id: string): Promise<StudentProfile | undefined>;
  getStudentProfileByUserId(userId: string): Promise<StudentProfile | undefined>;
  getStudentProfileByEmail(email: string): Promise<StudentProfile | undefined>;
  createStudentProfile(profile: InsertStudentProfile): Promise<StudentProfile>;
  updateStudentProfile(id: string, data: Partial<InsertStudentProfile>): Promise<StudentProfile>;
  markWelcomeEmailSent(profileId: string): Promise<void>;
  updateReminderTracking(profileId: string): Promise<void>;
  getStudentsNeedingReminders(): Promise<Array<{
    id: string;
    email: string;
    firstName: string | null;
    profileCompletionPercentage: number | null;
    reminderCount: number | null;
    lastReminderSentAt: Date | null;
    createdAt: Date | null;
  }>>;
  
  // Application operations
  getApplicationById(id: string): Promise<Application | undefined>;
  getApplicationsByStudentId(studentId: string): Promise<Application[]>;
  getApplicationsByUniversityId(universityId: string): Promise<Application[]>;
  createApplication(application: InsertApplication): Promise<Application>;
  updateApplicationStatus(id: string, status: string): Promise<Application>;
  
  // Team member operations
  getTeamMembersByUniversityId(universityId: string): Promise<UniversityTeamMember[]>;
  getTeamMemberByUserId(userId: string): Promise<UniversityTeamMember | undefined>;
  getTeamMemberByUserAndUniversity(userId: string, universityId: string): Promise<UniversityTeamMember | undefined>;
  createTeamMember(teamMember: InsertUniversityTeamMember): Promise<UniversityTeamMember>;
  updateTeamMemberRole(id: string, role: string): Promise<UniversityTeamMember>;
  deactivateTeamMember(id: string): Promise<UniversityTeamMember>;
  deleteTeamMember(id: string): Promise<void>;
  
  // Admin team member operations
  getAllAdminTeamMembers(): Promise<AdminTeamMember[]>;
  getAdminTeamMemberByUserId(userId: string): Promise<AdminTeamMember | undefined>;
  createAdminTeamMember(teamMember: InsertAdminTeamMember): Promise<AdminTeamMember>;
  updateAdminTeamMemberRole(id: string, role: string): Promise<AdminTeamMember>;
  deleteAdminTeamMember(id: string): Promise<void>;
  
  // Platform statistics
  getPlatformStats(): Promise<{ institutionCount: number; courseCount: number }>;
  
  // Student education operations
  getEducationsByStudentProfileId(studentProfileId: string): Promise<StudentEducation[]>;
  getEducationById(id: string): Promise<StudentEducation | undefined>;
  createEducation(education: InsertStudentEducation): Promise<StudentEducation>;
  updateEducation(id: string, data: Partial<InsertStudentEducation>): Promise<StudentEducation>;
  deleteEducation(id: string): Promise<void>;
  
  // Student language score operations
  getLanguageScoresByStudentProfileId(studentProfileId: string): Promise<StudentLanguageScore[]>;
  getLanguageScoreById(id: string): Promise<StudentLanguageScore | undefined>;
  createLanguageScore(score: InsertStudentLanguageScore): Promise<StudentLanguageScore>;
  updateLanguageScore(id: string, data: Partial<InsertStudentLanguageScore>): Promise<StudentLanguageScore>;
  deleteLanguageScore(id: string): Promise<void>;
  
  // Course English requirements operations
  getEnglishRequirementsByCourseId(courseId: string): Promise<CourseEnglishRequirement[]>;
  getEnglishRequirementById(id: string): Promise<CourseEnglishRequirement | undefined>;
  createEnglishRequirement(requirement: InsertCourseEnglishRequirement): Promise<CourseEnglishRequirement>;
  updateEnglishRequirement(id: string, data: Partial<InsertCourseEnglishRequirement>): Promise<CourseEnglishRequirement>;
  deleteEnglishRequirement(id: string): Promise<void>;
  
  // Student employment operations (optional)
  getEmploymentsByStudentProfileId(studentProfileId: string): Promise<StudentEmployment[]>;
  getEmploymentById(id: string): Promise<StudentEmployment | undefined>;
  createEmployment(employment: InsertStudentEmployment): Promise<StudentEmployment>;
  updateEmployment(id: string, data: Partial<InsertStudentEmployment>): Promise<StudentEmployment>;
  deleteEmployment(id: string): Promise<void>;
  
  // Contact submission operations
  getAllContactSubmissions(filters?: { status?: string; category?: string; assignedTo?: string }): Promise<ContactSubmission[]>;
  getContactSubmissionById(id: string): Promise<ContactSubmission | undefined>;
  createContactSubmission(submission: InsertContactSubmission): Promise<ContactSubmission>;
  updateContactSubmission(id: string, data: Partial<InsertContactSubmission>): Promise<ContactSubmission>;
  deleteContactSubmission(id: string): Promise<void>;
  
  // Document folder operations
  getFolderById(id: string): Promise<DocumentFolder | undefined>;
  getFoldersByOwnerId(ownerId: string): Promise<DocumentFolder[]>;
  getDefaultFolders(ownerId: string): Promise<DocumentFolder[]>;
  createFolder(folder: InsertDocumentFolder): Promise<DocumentFolder>;
  updateFolder(id: string, data: Partial<InsertDocumentFolder>): Promise<DocumentFolder>;
  deleteFolder(id: string): Promise<void>;
  
  // Document operations
  getDocumentById(id: string): Promise<Document | undefined>;
  getDocumentsByStudentProfileId(studentProfileId: string): Promise<Document[]>;
  getDocumentsByFolderId(folderId: string): Promise<Document[]>;
  getDocumentsByApplicationId(applicationId: string): Promise<Document[]>;
  getAllDocuments(filters?: { status?: string; type?: string; senderId?: string; recipientId?: string }): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: string, data: Partial<InsertDocument>): Promise<Document>;
  updateDocumentStatus(id: string, status: string, reviewNotes?: string, reviewedBy?: string): Promise<Document>;
  deleteDocument(id: string): Promise<void>;
  
  // Document comment operations
  getCommentById(id: string): Promise<DocumentComment | undefined>;
  getCommentsByDocumentId(documentId: string): Promise<DocumentComment[]>;
  createComment(comment: InsertDocumentComment): Promise<DocumentComment>;
  updateComment(id: string, data: Partial<InsertDocumentComment>): Promise<DocumentComment>;
  deleteComment(id: string): Promise<void>;
  
  // Document request operations
  getDocumentRequestById(id: string): Promise<DocumentRequest | undefined>;
  getDocumentRequestsByStudentId(studentId: string): Promise<DocumentRequest[]>;
  getDocumentRequestsByUniversityId(universityId: string): Promise<DocumentRequest[]>;
  getDocumentRequestsByApplicationId(applicationId: string): Promise<DocumentRequest[]>;
  createDocumentRequest(request: InsertDocumentRequest): Promise<DocumentRequest>;
  updateDocumentRequest(id: string, data: Partial<InsertDocumentRequest>): Promise<DocumentRequest>;
  deleteDocumentRequest(id: string): Promise<void>;
  
  // Blog operations
  getAllBlogs(filters?: { status?: string; category?: string; tag?: string; authorId?: string }): Promise<BlogWithAuthor[]>;
  getPublishedBlogs(filters?: { category?: string; tag?: string; limit?: number; offset?: number }): Promise<{ blogs: BlogWithAuthor[]; total: number }>;
  getBlogById(id: string): Promise<BlogWithAuthor | undefined>;
  getBlogBySlug(slug: string): Promise<BlogWithAuthor | undefined>;
  createBlog(blog: InsertBlog): Promise<Blog>;
  updateBlog(id: string, data: Partial<InsertBlog>): Promise<Blog>;
  publishBlog(id: string): Promise<Blog>;
  unpublishBlog(id: string): Promise<Blog>;
  deleteBlog(id: string): Promise<void>;
  getAllAdminStaff(): Promise<Array<{ id: string; firstName: string | null; lastName: string | null; profileImageUrl: string | null; role: string | null }>>;
  
  // Contact inquiry operations
  getAllContactInquiries(filters?: { status?: string; type?: string; assignedTo?: string }): Promise<ContactInquiry[]>;
  getContactInquiryById(id: string): Promise<ContactInquiry | undefined>;
  createContactInquiry(inquiry: InsertContactInquiry): Promise<ContactInquiry>;
  updateContactInquiry(id: string, data: Partial<InsertContactInquiry>): Promise<ContactInquiry>;
  updateContactInquiryStatus(id: string, status: "new" | "in_progress" | "responded" | "closed"): Promise<ContactInquiry>;
  assignContactInquiry(id: string, assignedTo: string): Promise<ContactInquiry>;
  
  // ============================================
  // CRM SYSTEM OPERATIONS
  // ============================================
  
  // Task operations
  getTaskById(id: string): Promise<Task | undefined>;
  getTasksByAssignee(userId: string): Promise<Task[]>;
  getTasksByApplicationId(applicationId: string): Promise<Task[]>;
  getAllTasks(filters?: { 
    status?: string; 
    priority?: string; 
    assignedToId?: string;
    involvedUserId?: string;
    applicationId?: string;
    category?: string;
  }): Promise<Task[]>;
  getTasksWithRelations(filters?: { 
    status?: string; 
    priority?: string; 
    assignedToId?: string;
    involvedUserId?: string;
    applicationId?: string;
    category?: string;
  }): Promise<TaskWithRelations[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, data: UpdateTask): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  completeTask(id: string): Promise<Task>;
  getTaskNotes(taskId: string): Promise<TaskNoteWithAuthor[]>;
  createTaskNote(data: InsertTaskNote): Promise<TaskNote>;
  updateTaskNote(noteId: string, content: string): Promise<TaskNote>;
  deleteTaskNote(noteId: string): Promise<void>;
  
  // Application internal notes operations
  getNoteById(id: string): Promise<ApplicationInternalNote | undefined>;
  getNotesByApplicationId(applicationId: string): Promise<ApplicationInternalNote[]>;
  createNote(note: InsertApplicationInternalNote): Promise<ApplicationInternalNote>;
  updateNote(id: string, data: Partial<InsertApplicationInternalNote>): Promise<ApplicationInternalNote>;
  deleteNote(id: string): Promise<void>;
  toggleNotePin(id: string): Promise<ApplicationInternalNote>;
  
  // Follow-up reminder operations
  getReminderById(id: string): Promise<FollowUpReminder | undefined>;
  getRemindersByUserId(userId: string): Promise<FollowUpReminder[]>;
  getUpcomingReminders(userId: string): Promise<FollowUpReminder[]>;
  getDueReminders(): Promise<FollowUpReminder[]>;
  getRemindersByApplicationId(applicationId: string): Promise<FollowUpReminder[]>;
  createReminder(reminder: InsertFollowUpReminder): Promise<FollowUpReminder>;
  updateReminder(id: string, data: Partial<InsertFollowUpReminder>): Promise<FollowUpReminder>;
  completeReminder(id: string): Promise<FollowUpReminder>;
  deleteReminder(id: string): Promise<void>;
  
  // Workload summary operations
  getTeamWorkloadSummary(): Promise<WorkloadSummary[]>;
  
  // ============================================
  // CMS CONTENT BLOCKS OPERATIONS
  // ============================================
  
  // Testimonial operations
  getTestimonialById(id: string): Promise<Testimonial | undefined>;
  getAllTestimonials(filters?: { status?: string; isFeatured?: boolean; showOnPage?: string }): Promise<Testimonial[]>;
  getPublishedTestimonials(page?: string): Promise<Testimonial[]>;
  createTestimonial(testimonial: InsertTestimonial): Promise<Testimonial>;
  updateTestimonial(id: string, data: UpdateTestimonial): Promise<Testimonial>;
  deleteTestimonial(id: string): Promise<void>;
  
  // FAQ operations
  getFaqById(id: string): Promise<Faq | undefined>;
  getAllFaqs(filters?: { status?: string; category?: string; showOnPage?: string }): Promise<Faq[]>;
  getPublishedFaqs(category?: string, page?: string): Promise<Faq[]>;
  createFaq(faq: InsertFaq): Promise<Faq>;
  updateFaq(id: string, data: UpdateFaq): Promise<Faq>;
  deleteFaq(id: string): Promise<void>;
  
  // Public team member operations
  getPublicTeamMemberById(id: string): Promise<PublicTeamMember | undefined>;
  getAllPublicTeamMembers(filters?: { status?: string; isFeatured?: boolean }): Promise<PublicTeamMember[]>;
  getPublishedPublicTeamMembers(): Promise<PublicTeamMember[]>;
  createPublicTeamMember(member: InsertPublicTeamMember): Promise<PublicTeamMember>;
  updatePublicTeamMember(id: string, data: UpdatePublicTeamMember): Promise<PublicTeamMember>;
  deletePublicTeamMember(id: string): Promise<void>;
  
  // Site settings operations
  getSiteSettingByKey(key: string): Promise<SiteSetting | undefined>;
  getAllSiteSettings(category?: string): Promise<SiteSetting[]>;
  getPublicSiteSettings(): Promise<SiteSetting[]>;
  createSiteSetting(setting: InsertSiteSetting): Promise<SiteSetting>;
  updateSiteSetting(key: string, data: UpdateSiteSetting): Promise<SiteSetting>;
  deleteSiteSetting(id: string): Promise<void>;
  
  // Content snippet operations
  getContentSnippetById(id: string): Promise<ContentSnippet | undefined>;
  getContentSnippetByKey(key: string): Promise<ContentSnippet | undefined>;
  getAllContentSnippets(filters?: { status?: string; pageLocation?: string }): Promise<ContentSnippet[]>;
  getPublishedContentSnippets(pageLocation?: string): Promise<ContentSnippet[]>;
  createContentSnippet(snippet: InsertContentSnippet): Promise<ContentSnippet>;
  updateContentSnippet(id: string, data: UpdateContentSnippet): Promise<ContentSnippet>;
  deleteContentSnippet(id: string): Promise<void>;
  
  // ============================================
  // GLOBAL REGION SYSTEM OPERATIONS
  // ============================================
  
  // Region operations
  getRegionById(id: string): Promise<Region | undefined>;
  getRegionByCode(code: string): Promise<Region | undefined>;
  getRegionByDomainPattern(domain: string): Promise<Region | undefined>;
  getAllRegions(activeOnly?: boolean): Promise<Region[]>;
  getRegionWithDetails(id: string): Promise<RegionWithDetails | undefined>;
  createRegion(region: InsertRegion): Promise<Region>;
  updateRegion(id: string, data: UpdateRegion): Promise<Region>;
  deleteRegion(id: string): Promise<void>;
  getDefaultRegion(): Promise<Region | undefined>;
  
  // Student pathway operations
  getPathwayById(id: string): Promise<StudentPathway | undefined>;
  getPathwayByCode(code: string): Promise<StudentPathway | undefined>;
  getAllPathways(activeOnly?: boolean): Promise<StudentPathway[]>;
  createPathway(pathway: InsertStudentPathway): Promise<StudentPathway>;
  updatePathway(id: string, data: Partial<InsertStudentPathway>): Promise<StudentPathway>;
  deletePathway(id: string): Promise<void>;
  
  // Course region variant operations
  getVariantById(id: string): Promise<CourseRegionVariant | undefined>;
  getVariantsByCourseId(courseId: string): Promise<CourseRegionVariant[]>;
  getVariantsByRegionId(regionId: string): Promise<CourseRegionVariant[]>;
  getVariant(courseId: string, regionId: string, pathwayId?: string): Promise<CourseRegionVariant | undefined>;
  getVariantWithRelations(courseId: string, regionId: string, pathwayId?: string): Promise<CourseRegionVariantWithRelations | undefined>;
  createVariant(variant: InsertCourseRegionVariant): Promise<CourseRegionVariant>;
  updateVariant(id: string, data: UpdateCourseRegionVariant): Promise<CourseRegionVariant>;
  deleteVariant(id: string): Promise<void>;
  deleteVariantsByCourseId(courseId: string): Promise<void>;
  
  // Visa requirement operations
  getVisaRequirementById(id: string): Promise<VisaRequirement | undefined>;
  getVisaRequirementsByRegionId(regionId: string): Promise<VisaRequirement[]>;
  getVisaRequirement(regionId: string, pathwayId?: string): Promise<VisaRequirement | undefined>;
  createVisaRequirement(requirement: InsertVisaRequirement): Promise<VisaRequirement>;
  updateVisaRequirement(id: string, data: UpdateVisaRequirement): Promise<VisaRequirement>;
  deleteVisaRequirement(id: string): Promise<void>;
  
  // Localized content operations
  getLocalizedContentById(id: string): Promise<LocalizedContent | undefined>;
  getLocalizedContent(entityType: string, entityId: string, locale: string): Promise<LocalizedContent | undefined>;
  getLocalizedContentsByEntity(entityType: string, entityId: string): Promise<LocalizedContent[]>;
  getAllLocalizedContent(filters?: { entityType?: string; locale?: string; isReviewed?: boolean }): Promise<LocalizedContent[]>;
  createLocalizedContent(content: InsertLocalizedContent): Promise<LocalizedContent>;
  updateLocalizedContent(id: string, data: UpdateLocalizedContent): Promise<LocalizedContent>;
  deleteLocalizedContent(id: string): Promise<void>;
  
  // Course resolution with region fallback
  resolveCourseForRegion(courseId: string, regionCode: string, pathwayCode?: string): Promise<ResolvedCourseData | undefined>;
  
  // Qualification equivalencies operations
  batchSaveQualificationEquivalencies(equivalencies: Array<{
    sourceQualification: { country: string; name: string; levelCategory: string };
    targetQualification: { country: string; name: string; levelCategory: string };
    sourceGradeMin: string;
    sourceGradeMax?: string;
    targetEquivalent: string;
    confidenceLevel?: string;
    notes?: string;
  }>): Promise<number>;
  
  // AI Settings operations
  getAiSetting(settingKey: string): Promise<AiSetting | undefined>;
  getAllAiSettings(): Promise<AiSetting[]>;
  upsertAiSetting(settingKey: string, data: Partial<InsertAiSetting>): Promise<AiSetting>;
  
  // API Key operations
  createApiKey(data: { name: string; keyHash: string; keyPrefix: string; permissions: string[]; createdByUserId: string; description?: string; expiresAt?: Date; rateLimitPerMinute?: number; rateLimitPerHour?: number }): Promise<ApiKey>;
  getApiKeyById(id: string): Promise<ApiKey | undefined>;
  getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined>;
  getAllApiKeys(): Promise<ApiKey[]>;
  updateApiKey(id: string, data: Partial<{ name: string; permissions: string[]; description: string; isActive: boolean; rateLimitPerMinute: number; rateLimitPerHour: number }>): Promise<ApiKey>;
  revokeApiKey(id: string, revokedByUserId: string): Promise<ApiKey>;
  incrementApiKeyUsage(id: string, ipAddress: string): Promise<void>;
  
  // API Key Usage Logs operations
  createApiKeyUsageLog(data: { apiKeyId: string; endpoint: string; method: string; statusCode?: number; resourceType?: string; resourceId?: string; ipAddress?: string; userAgent?: string }): Promise<ApiKeyUsageLog>;
  getApiKeyUsageLogs(apiKeyId: string, limit?: number): Promise<ApiKeyUsageLog[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user as User | undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user as User | undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return (await db.select().from(users)) as User[];
  }

  async createUser(userData: Partial<User>): Promise<User> {
    const [user] = (await db
      .insert(users)
      .values(userData as any)
      .returning()) as User[];
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user as User;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Check if user exists by email (since email is unique and used for OIDC)
    const existingUserByEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, userData.email!))
      .limit(1);
    
    if (existingUserByEmail.length > 0) {
      // User exists with this email, update their information
      const [updatedUser] = await db
        .update(users)
        .set({
          firstName: userData.firstName,
          lastName: userData.lastName,
          userType: userData.userType || existingUserByEmail[0].userType,
          role: userData.role || existingUserByEmail[0].role,
          lastLogin: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.email, userData.email!))
        .returning();
      return updatedUser as User;
    }
    
    // If user doesn't exist, insert new user
    const [user] = (await db
      .insert(users)
      .values(userData as any)
      .returning()) as User[];
    return user;
  }

  // University operations
  async getUniversityById(id: string): Promise<University | undefined> {
    const [university] = await db
      .select()
      .from(universities)
      .where(eq(universities.id, id));
    return university;
  }

  async getUniversityBySlug(slug: string): Promise<University | undefined> {
    const [university] = await db
      .select()
      .from(universities)
      .where(eq(universities.slug, slug));
    return university;
  }

  async getUniversityByIdOrSlug(idOrSlug: string): Promise<University | undefined> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    if (isUuid) {
      return this.getUniversityById(idOrSlug);
    }
    return this.getUniversityBySlug(idOrSlug);
  }

  async getUniversityByUserId(userId: string): Promise<University | undefined> {
    const [university] = await db
      .select()
      .from(universities)
      .where(eq(universities.userId, userId));
    return university;
  }

  async getAllUniversities(): Promise<University[]> {
    return await db.select().from(universities);
  }

  async createUniversity(universityData: InsertUniversity): Promise<University> {
    if (!universityData.slug && universityData.name) {
      const { generateUniqueUniversitySlug } = await import("./slug-utils");
      universityData.slug = await generateUniqueUniversitySlug(universityData.name);
    }
    const [university] = await db
      .insert(universities)
      .values(universityData as any)
      .returning();
    return university;
  }

  async updateUniversity(id: string, data: Partial<University>): Promise<University> {
    const processedData = { ...data } as Record<string, any>;
    if (processedData.publishedAt !== undefined) {
      if (processedData.publishedAt === null) {
        processedData.publishedAt = null;
      } else if (typeof processedData.publishedAt === 'string') {
        processedData.publishedAt = new Date(processedData.publishedAt);
      }
    }
    if (processedData.name && !processedData.slug) {
      const { generateUniqueUniversitySlug } = await import("./slug-utils");
      processedData.slug = await generateUniqueUniversitySlug(processedData.name, id);
    }
    
    const [university] = await db
      .update(universities)
      .set({ ...processedData, updatedAt: new Date() })
      .where(eq(universities.id, id))
      .returning();
    
    return university;
  }

  async deleteUniversity(id: string): Promise<void> {
    await db.delete(universities).where(eq(universities.id, id));
  }

  // Course operations
  async getCourseById(id: string): Promise<CourseWithUniversity | undefined> {
    const rows = await db
      .select({
        course: courses,
        university: universities,
      })
      .from(courses)
      .leftJoin(universities, eq(courses.universityId, universities.id))
      .where(eq(courses.id, id));
    
    if (rows.length === 0) return undefined;
    
    const { course, university } = rows[0];
    return { ...course, university };
  }

  async getCourseBySlug(slug: string): Promise<CourseWithUniversity | undefined> {
    const rows = await db
      .select({
        course: courses,
        university: universities,
      })
      .from(courses)
      .leftJoin(universities, eq(courses.universityId, universities.id))
      .where(eq(courses.slug, slug));
    
    if (rows.length === 0) return undefined;
    
    const { course, university } = rows[0];
    return { ...course, university };
  }

  async getCourseByIdOrSlug(idOrSlug: string): Promise<CourseWithUniversity | undefined> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    if (isUuid) {
      return this.getCourseById(idOrSlug);
    }
    return this.getCourseBySlug(idOrSlug);
  }

  async getCoursesByUniversityId(universityId: string): Promise<CourseWithUniversity[]> {
    const rows = await db
      .select({
        course: courses,
        university: universities,
      })
      .from(courses)
      .leftJoin(universities, eq(courses.universityId, universities.id))
      .where(eq(courses.universityId, universityId));
    
    return rows.map(({ course, university }) => ({ ...course, university }));
  }

  async getAllCourses(): Promise<CourseWithUniversity[]> {
    const rows = await db
      .select({
        course: courses,
        university: universities,
      })
      .from(courses)
      .leftJoin(universities, eq(courses.universityId, universities.id));
    
    return rows.map(({ course, university }) => ({ ...course, university }));
  }

  async createCourse(courseData: InsertCourse): Promise<Course> {
    if (!courseData.slug && courseData.title) {
      const { generateUniqueCourseSlug } = await import("./slug-utils");
      let institutionName: string | undefined;
      if (courseData.universityId) {
        const uni = await this.getUniversityById(courseData.universityId);
        institutionName = uni?.name;
      }
      courseData.slug = await generateUniqueCourseSlug(courseData.title, institutionName);
    }
    const [course] = await db
      .insert(courses)
      .values(courseData as any)
      .returning();
    return course;
  }

  async updateCourse(id: string, data: Partial<Course>): Promise<Course> {
    const processedData = { ...data } as Record<string, any>;
    if (processedData.publishedAt && typeof processedData.publishedAt === 'string') {
      processedData.publishedAt = new Date(processedData.publishedAt);
    }
    if (!processedData.updatedAt) {
      processedData.updatedAt = new Date();
    }
    if (processedData.title && !processedData.slug) {
      const { generateUniqueCourseSlug } = await import("./slug-utils");
      const existingCourse = await this.getCourseById(id);
      const uni = existingCourse ? await this.getUniversityById(existingCourse.universityId) : undefined;
      processedData.slug = await generateUniqueCourseSlug(processedData.title, uni?.name, id);
    }
    const [course] = await db
      .update(courses)
      .set(processedData)
      .where(eq(courses.id, id))
      .returning();
    return course;
  }

  async deleteCourse(id: string): Promise<void> {
    await db.delete(courses).where(eq(courses.id, id));
  }

  // Sub-discipline operations
  async getSubDisciplines(discipline?: string): Promise<SubDiscipline[]> {
    if (discipline) {
      return await db
        .select()
        .from(subDisciplines)
        .where(eq(subDisciplines.discipline, discipline))
        .orderBy(desc(subDisciplines.usageCount));
    }
    return await db
      .select()
      .from(subDisciplines)
      .orderBy(desc(subDisciplines.usageCount));
  }

  async getSubDisciplineById(id: string): Promise<SubDiscipline | undefined> {
    const [subDiscipline] = await db
      .select()
      .from(subDisciplines)
      .where(eq(subDisciplines.id, id));
    return subDiscipline;
  }

  async createSubDiscipline(subDisciplineData: InsertSubDiscipline): Promise<SubDiscipline> {
    // Check if sub-discipline with same slug already exists for this discipline
    const existing = await db
      .select()
      .from(subDisciplines)
      .where(
        and(
          eq(subDisciplines.discipline, subDisciplineData.discipline),
          eq(subDisciplines.slug, subDisciplineData.slug)
        )
      )
      .limit(1);
    
    if (existing.length > 0) {
      return existing[0];
    }

    const [subDiscipline] = await db
      .insert(subDisciplines)
      .values(subDisciplineData)
      .returning();
    return subDiscipline;
  }

  async incrementSubDisciplineUsage(id: string): Promise<void> {
    await db
      .update(subDisciplines)
      .set({ 
        usageCount: sql`${subDisciplines.usageCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(subDisciplines.id, id));
  }

  // Course specialization operations (Tier 3)
  async getSpecializations(subDisciplineId?: string): Promise<CourseSpecialization[]> {
    if (subDisciplineId) {
      return await db
        .select()
        .from(courseSpecializations)
        .where(eq(courseSpecializations.subDisciplineId, subDisciplineId))
        .orderBy(desc(courseSpecializations.usageCount));
    }
    return await db
      .select()
      .from(courseSpecializations)
      .orderBy(desc(courseSpecializations.usageCount));
  }

  async getSpecializationById(id: string): Promise<CourseSpecialization | undefined> {
    const [spec] = await db
      .select()
      .from(courseSpecializations)
      .where(eq(courseSpecializations.id, id));
    return spec;
  }

  async createOrGetSpecialization(name: string, subDisciplineId: string): Promise<CourseSpecialization> {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    
    // Check if specialization already exists
    const [existing] = await db
      .select()
      .from(courseSpecializations)
      .where(
        and(
          eq(courseSpecializations.subDisciplineId, subDisciplineId),
          eq(courseSpecializations.slug, slug)
        )
      );
    
    if (existing) {
      return existing;
    }
    
    // Create new specialization
    const [newSpec] = await db
      .insert(courseSpecializations)
      .values({
        subDisciplineId,
        name,
        slug,
      })
      .returning();
    return newSpec;
  }

  async incrementSpecializationUsage(id: string): Promise<void> {
    await db
      .update(courseSpecializations)
      .set({ 
        usageCount: sql`${courseSpecializations.usageCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(courseSpecializations.id, id));
  }

  // Student profile operations
  async getStudentProfileById(id: string): Promise<StudentProfile | undefined> {
    const [profile] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.id, id));
    return profile;
  }

  async getStudentProfileByUserId(userId: string): Promise<StudentProfile | undefined> {
    const [profile] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, userId));
    return profile;
  }

  async getStudentProfileByEmail(email: string): Promise<StudentProfile | undefined> {
    const result = await db
      .select({ studentProfile: studentProfiles })
      .from(studentProfiles)
      .innerJoin(users, eq(studentProfiles.userId, users.id))
      .where(eq(users.email, email.toLowerCase()));
    return result[0]?.studentProfile;
  }

  async createStudentProfile(profileData: InsertStudentProfile): Promise<StudentProfile> {
    const [profile] = await db
      .insert(studentProfiles)
      // drizzle-orm 0.45 tightened JSON column inference; cast needed for
      // englishTestScores which contains nested optional fields typed as unknown
      .values(profileData as any)
      .returning();
    return profile;
  }

  async updateStudentProfile(id: string, data: Partial<InsertStudentProfile>): Promise<StudentProfile> {
    const [profile] = await db
      .update(studentProfiles)
      // same JSON-column inference tightening as createStudentProfile above
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(studentProfiles.id, id))
      .returning();
    return profile;
  }

  async markWelcomeEmailSent(profileId: string): Promise<void> {
    await db
      .update(studentProfiles)
      .set({ welcomeEmailSent: true, updatedAt: new Date() })
      .where(eq(studentProfiles.id, profileId));
  }

  async updateReminderTracking(profileId: string): Promise<void> {
    const profile = await this.getStudentProfileById(profileId);
    if (!profile) return;
    
    await db
      .update(studentProfiles)
      .set({
        reminderCount: (profile.reminderCount || 0) + 1,
        lastReminderSentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(studentProfiles.id, profileId));
  }

  async getStudentsNeedingReminders(): Promise<Array<{
    id: string;
    email: string;
    firstName: string | null;
    profileCompletionPercentage: number | null;
    reminderCount: number | null;
    lastReminderSentAt: Date | null;
    createdAt: Date | null;
  }>> {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    // Get students with incomplete profiles (< 100%) who haven't hit max reminders (3)
    // and are eligible based on their signup date and last reminder
    const result = await db
      .select({
        id: studentProfiles.id,
        email: users.email,
        firstName: studentProfiles.firstName,
        profileCompletionPercentage: studentProfiles.profileCompletionPercentage,
        reminderCount: studentProfiles.reminderCount,
        lastReminderSentAt: studentProfiles.lastReminderSentAt,
        createdAt: studentProfiles.createdAt,
      })
      .from(studentProfiles)
      .innerJoin(users, eq(studentProfiles.userId, users.id))
      .where(
        and(
          lt(studentProfiles.profileCompletionPercentage, 100),
          or(
            isNull(studentProfiles.reminderCount),
            lt(studentProfiles.reminderCount, 3)
          ),
          // Only users who signed up at least 3 days ago
          lt(studentProfiles.createdAt, threeDaysAgo)
        )
      );
    
    // Filter based on reminder logic:
    // - Reminder 1: 3+ days after signup, no previous reminder
    // - Reminder 2: 7+ days after signup, 4+ days since last reminder
    // - Reminder 3: 14+ days after signup, 7+ days since last reminder
    return (result as any[]).filter(student => {
      const reminderCount = student.reminderCount || 0;
      const signupDate = student.createdAt ? new Date(student.createdAt) : now;
      const lastReminder = student.lastReminderSentAt ? new Date(student.lastReminderSentAt) : null;
      
      if (reminderCount === 0) {
        // First reminder: 3+ days after signup
        return signupDate <= threeDaysAgo;
      } else if (reminderCount === 1) {
        // Second reminder: 7+ days after signup, 4+ days since last
        const fourDaysAfterLast = lastReminder ? new Date(lastReminder.getTime() + 4 * 24 * 60 * 60 * 1000) : now;
        return signupDate <= sevenDaysAgo && now >= fourDaysAfterLast;
      } else if (reminderCount === 2) {
        // Third reminder: 14+ days after signup, 7+ days since last
        const sevenDaysAfterLast = lastReminder ? new Date(lastReminder.getTime() + 7 * 24 * 60 * 60 * 1000) : now;
        return signupDate <= fourteenDaysAgo && now >= sevenDaysAfterLast;
      }
      return false;
    });
  }

  // Application operations
  async getApplicationById(id: string): Promise<Application | undefined> {
    const [application] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, id));
    return application;
  }

  async getApplicationsByStudentId(studentId: string): Promise<Application[]> {
    return await db
      .select()
      .from(applications)
      .where(eq(applications.studentId, studentId));
  }

  async getApplicationsByUniversityId(universityId: string): Promise<Application[]> {
    const universityCourses = await db
      .select()
      .from(courses)
      .where(eq(courses.universityId, universityId));
    
    const courseIds = universityCourses.map(c => c.id);
    if (courseIds.length === 0) return [];

    const allApplications = await db.select().from(applications);
    return allApplications.filter(app => app.courseId && courseIds.includes(app.courseId)) as any[];
  }

  async createApplication(applicationData: InsertApplication): Promise<Application> {
    const [application] = await db
      .insert(applications)
      .values(applicationData)
      .returning();
    return application;
  }

  async updateApplicationStatus(id: string, status: string): Promise<Application> {
    const [application] = await db
      .update(applications)
      .set({ status, updatedAt: new Date() })
      .where(eq(applications.id, id))
      .returning();
    return application;
  }

  // Team member operations
  async getTeamMembersByUniversityId(universityId: string): Promise<UniversityTeamMember[]> {
    return await db
      .select()
      .from(universityTeamMembers)
      .where(eq(universityTeamMembers.universityId, universityId));
  }

  async getTeamMemberByUserId(userId: string): Promise<UniversityTeamMember | undefined> {
    const [member] = await db
      .select()
      .from(universityTeamMembers)
      .where(eq(universityTeamMembers.userId, userId));
    return member;
  }

  async getTeamMemberByUserAndUniversity(userId: string, universityId: string): Promise<UniversityTeamMember | undefined> {
    const [member] = await db
      .select()
      .from(universityTeamMembers)
      .where(
        and(
          eq(universityTeamMembers.userId, userId),
          eq(universityTeamMembers.universityId, universityId)
        )
      );
    return member;
  }

  async createTeamMember(teamMemberData: InsertUniversityTeamMember): Promise<UniversityTeamMember> {
    const [member] = await db
      .insert(universityTeamMembers)
      .values(teamMemberData)
      .returning();
    return member;
  }

  async updateTeamMemberRole(id: string, role: string): Promise<UniversityTeamMember> {
    const [member] = await db
      .update(universityTeamMembers)
      .set({ role, updatedAt: new Date() })
      .where(eq(universityTeamMembers.id, id))
      .returning();
    return member;
  }

  async deactivateTeamMember(id: string): Promise<UniversityTeamMember> {
    const [member] = await db
      .update(universityTeamMembers)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(universityTeamMembers.id, id))
      .returning();
    return member;
  }

  async deleteTeamMember(id: string): Promise<void> {
    await db.delete(universityTeamMembers).where(eq(universityTeamMembers.id, id));
  }
  
  // Admin team member operations
  async getAllAdminTeamMembers(): Promise<AdminTeamMember[]> {
    return await db
      .select()
      .from(adminTeamMembers);
  }

  async getAdminTeamMemberByUserId(userId: string): Promise<AdminTeamMember | undefined> {
    const [member] = await db
      .select()
      .from(adminTeamMembers)
      .where(eq(adminTeamMembers.userId, userId));
    return member;
  }

  async createAdminTeamMember(teamMemberData: InsertAdminTeamMember): Promise<AdminTeamMember> {
    const [member] = await db
      .insert(adminTeamMembers)
      .values(teamMemberData)
      .returning();
    return member;
  }

  async updateAdminTeamMemberRole(id: string, role: string): Promise<AdminTeamMember> {
    const [member] = await db
      .update(adminTeamMembers)
      .set({ role, updatedAt: new Date() })
      .where(eq(adminTeamMembers.id, id))
      .returning();
    return member;
  }

  async deleteAdminTeamMember(id: string): Promise<void> {
    await db.delete(adminTeamMembers).where(eq(adminTeamMembers.id, id));
  }
  
  // Platform statistics
  async getPlatformStats(): Promise<{ institutionCount: number; courseCount: number }> {
    const allUniversities = await db.select().from(universities);
    const allCourses = await db.select().from(courses).where(eq(courses.isActive, true));
    
    return {
      institutionCount: allUniversities.length,
      courseCount: allCourses.length,
    };
  }
  
  // Referral operations
  async generateReferralCode(): Promise<string> {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    let isUnique = false;
    
    while (!isUnique) {
      code = '';
      for (let i = 0; i < 8; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      const existing = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.referralCode, code))
        .limit(1);
      
      if (existing.length === 0) {
        isUnique = true;
      }
    }
    
    return code;
  }
  
  async validateReferralCode(code: string): Promise<StudentProfile | null> {
    const [profile] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.referralCode, code))
      .limit(1);
    
    return profile || null;
  }
  
  async createReferral(data: InsertReferral): Promise<Referral> {
    const [referral] = await db.insert(referrals).values(data).returning();
    return referral;
  }
  
  async getReferralsByReferrerId(referrerId: string): Promise<Array<Referral & { referredStudent: StudentProfile }>> {
    const results = await db
      .select({
        referral: referrals,
        referredStudent: studentProfiles,
      })
      .from(referrals)
      .innerJoin(studentProfiles, eq(referrals.referredId, studentProfiles.id))
      .where(eq(referrals.referrerId, referrerId))
      .orderBy(desc(referrals.createdAt));
    
    return results.map(r => ({
      ...r.referral,
      referredStudent: r.referredStudent,
    }));
  }
  
  async getReferralStats(studentProfileId: string): Promise<{
    totalReferrals: number;
    pendingReferrals: number;
    completedReferrals: number;
    totalBonus: number;
  }> {
    const allReferrals = await db
      .select()
      .from(referrals)
      .where(eq(referrals.referrerId, studentProfileId));
    
    const totalReferrals = allReferrals.length;
    const pendingReferrals = allReferrals.filter(r => r.status === 'pending').length;
    const completedReferrals = allReferrals.filter(r => r.status === 'completed').length;
    const totalBonus = allReferrals
      .filter(r => r.bonusAmount)
      .reduce((sum, r) => sum + parseFloat(r.bonusAmount || '0'), 0);
    
    return {
      totalReferrals,
      pendingReferrals,
      completedReferrals,
      totalBonus,
    };
  }
  
  async updateReferralStatus(referralId: string, status: string, bonusAmount?: number): Promise<Referral> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };
    
    if (bonusAmount !== undefined) {
      updateData.bonusAmount = bonusAmount.toString();
    }
    
    if (status === 'completed' && bonusAmount !== undefined) {
      updateData.bonusPaidAt = new Date();
    }
    
    const [updated] = await db
      .update(referrals)
      .set(updateData)
      .where(eq(referrals.id, referralId))
      .returning();
    
    return updated;
  }
  
  // Referral invitation operations
  async createReferralInvitation(data: InsertReferralInvitation): Promise<ReferralInvitation> {
    const [invitation] = await db.insert(referralInvitations).values(data).returning();
    return invitation;
  }
  
  async getInvitationsByReferrerId(referrerId: string): Promise<ReferralInvitation[]> {
    return await db
      .select()
      .from(referralInvitations)
      .where(eq(referralInvitations.referrerId, referrerId))
      .orderBy(desc(referralInvitations.createdAt));
  }
  
  async getInvitationByEmail(email: string): Promise<ReferralInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(referralInvitations)
      .where(eq(referralInvitations.inviteeEmail, email.toLowerCase()))
      .orderBy(desc(referralInvitations.createdAt))
      .limit(1);
    return invitation;
  }
  
  async updateReferralInvitation(id: string, data: Partial<InsertReferralInvitation>): Promise<ReferralInvitation> {
    const [updated] = await db
      .update(referralInvitations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(referralInvitations.id, id))
      .returning();
    return updated;
  }
  
  async markInvitationAsRegistered(email: string, registeredStudentId: string): Promise<ReferralInvitation | null> {
    const invitation = await this.getInvitationByEmail(email);
    if (!invitation) return null;
    
    const [updated] = await db
      .update(referralInvitations)
      .set({
        status: 'registered',
        registeredAt: new Date(),
        registeredStudentId,
        updatedAt: new Date(),
      })
      .where(eq(referralInvitations.id, invitation.id))
      .returning();
    
    return updated;
  }
  
  // Student education operations
  async getEducationsByStudentProfileId(studentProfileId: string): Promise<StudentEducation[]> {
    return await db
      .select()
      .from(studentEducations)
      .where(eq(studentEducations.studentProfileId, studentProfileId));
  }

  async getEducationById(id: string): Promise<StudentEducation | undefined> {
    const [education] = await db
      .select()
      .from(studentEducations)
      .where(eq(studentEducations.id, id));
    return education;
  }

  async createEducation(educationData: InsertStudentEducation): Promise<StudentEducation> {
    const [education] = await db
      .insert(studentEducations)
      .values(educationData)
      .returning();
    return education;
  }

  async updateEducation(id: string, data: Partial<InsertStudentEducation>): Promise<StudentEducation> {
    const [education] = await db
      .update(studentEducations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(studentEducations.id, id))
      .returning();
    return education;
  }

  async deleteEducation(id: string): Promise<void> {
    await db.delete(studentEducations).where(eq(studentEducations.id, id));
  }
  
  // Student language score operations
  async getLanguageScoresByStudentProfileId(studentProfileId: string): Promise<StudentLanguageScore[]> {
    return await db
      .select()
      .from(studentLanguageScores)
      .where(eq(studentLanguageScores.studentProfileId, studentProfileId));
  }

  async getLanguageScoreById(id: string): Promise<StudentLanguageScore | undefined> {
    const [score] = await db
      .select()
      .from(studentLanguageScores)
      .where(eq(studentLanguageScores.id, id));
    return score;
  }

  async createLanguageScore(scoreData: InsertStudentLanguageScore): Promise<StudentLanguageScore> {
    const [score] = await db
      .insert(studentLanguageScores)
      .values(scoreData)
      .returning();
    return score;
  }

  async updateLanguageScore(id: string, data: Partial<InsertStudentLanguageScore>): Promise<StudentLanguageScore> {
    const [score] = await db
      .update(studentLanguageScores)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(studentLanguageScores.id, id))
      .returning();
    return score;
  }

  async deleteLanguageScore(id: string): Promise<void> {
    await db.delete(studentLanguageScores).where(eq(studentLanguageScores.id, id));
  }
  
  // Course English requirements operations
  async getEnglishRequirementsByCourseId(courseId: string): Promise<CourseEnglishRequirement[]> {
    return await db
      .select()
      .from(courseEnglishRequirements)
      .where(eq(courseEnglishRequirements.courseId, courseId));
  }

  async getEnglishRequirementById(id: string): Promise<CourseEnglishRequirement | undefined> {
    const [requirement] = await db
      .select()
      .from(courseEnglishRequirements)
      .where(eq(courseEnglishRequirements.id, id));
    return requirement;
  }

  async createEnglishRequirement(requirementData: InsertCourseEnglishRequirement): Promise<CourseEnglishRequirement> {
    const [requirement] = await db
      .insert(courseEnglishRequirements)
      .values(requirementData)
      .returning();
    return requirement;
  }

  async updateEnglishRequirement(id: string, data: Partial<InsertCourseEnglishRequirement>): Promise<CourseEnglishRequirement> {
    const [requirement] = await db
      .update(courseEnglishRequirements)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(courseEnglishRequirements.id, id))
      .returning();
    return requirement;
  }

  async deleteEnglishRequirement(id: string): Promise<void> {
    await db.delete(courseEnglishRequirements).where(eq(courseEnglishRequirements.id, id));
  }
  
  // Student employment operations (optional)
  async getEmploymentsByStudentProfileId(studentProfileId: string): Promise<StudentEmployment[]> {
    return await db
      .select()
      .from(studentEmployments)
      .where(eq(studentEmployments.studentProfileId, studentProfileId));
  }

  async getEmploymentById(id: string): Promise<StudentEmployment | undefined> {
    const [employment] = await db
      .select()
      .from(studentEmployments)
      .where(eq(studentEmployments.id, id));
    return employment;
  }

  async createEmployment(employment: InsertStudentEmployment): Promise<StudentEmployment> {
    const [created] = await db.insert(studentEmployments).values(employment).returning();
    return created;
  }

  async updateEmployment(id: string, data: Partial<InsertStudentEmployment>): Promise<StudentEmployment> {
    const [updated] = await db
      .update(studentEmployments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(studentEmployments.id, id))
      .returning();
    return updated;
  }

  async deleteEmployment(id: string): Promise<void> {
    await db.delete(studentEmployments).where(eq(studentEmployments.id, id));
  }
  
  // Contact submission operations
  async getAllContactSubmissions(filters?: { status?: string; category?: string; assignedTo?: string }): Promise<ContactSubmission[]> {
    let query = db.select().from(contactSubmissions);
    
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(contactSubmissions.status, filters.status));
    }
    if (filters?.category) {
      conditions.push(eq(contactSubmissions.category, filters.category));
    }
    if (filters?.assignedTo) {
      conditions.push(eq(contactSubmissions.assignedTo, filters.assignedTo));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(contactSubmissions.createdAt));
  }

  async getContactSubmissionById(id: string): Promise<ContactSubmission | undefined> {
    const [submission] = await db
      .select()
      .from(contactSubmissions)
      .where(eq(contactSubmissions.id, id));
    return submission;
  }

  async createContactSubmission(submissionData: InsertContactSubmission): Promise<ContactSubmission> {
    const [submission] = await db
      .insert(contactSubmissions)
      .values(submissionData)
      .returning();
    return submission;
  }

  async updateContactSubmission(id: string, data: Partial<InsertContactSubmission>): Promise<ContactSubmission> {
    const [submission] = await db
      .update(contactSubmissions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(contactSubmissions.id, id))
      .returning();
    return submission;
  }

  async deleteContactSubmission(id: string): Promise<void> {
    await db.delete(contactSubmissions).where(eq(contactSubmissions.id, id));
  }
  
  // Document folder operations
  async getFolderById(id: string): Promise<DocumentFolder | undefined> {
    const [folder] = await db
      .select()
      .from(documentFolders)
      .where(eq(documentFolders.id, id));
    return folder;
  }

  async getFoldersByOwnerId(ownerId: string): Promise<DocumentFolder[]> {
    return await db
      .select()
      .from(documentFolders)
      .where(eq(documentFolders.ownerId, ownerId))
      .orderBy(desc(documentFolders.isDefault), documentFolders.sortOrder);
  }

  async getDefaultFolders(ownerId: string): Promise<DocumentFolder[]> {
    return await db
      .select()
      .from(documentFolders)
      .where(
        and(
          eq(documentFolders.ownerId, ownerId),
          eq(documentFolders.isDefault, true)
        )
      );
  }

  async createFolder(folderData: InsertDocumentFolder): Promise<DocumentFolder> {
    const [folder] = await db
      .insert(documentFolders)
      .values(folderData)
      .returning();
    return folder;
  }

  async updateFolder(id: string, data: Partial<InsertDocumentFolder>): Promise<DocumentFolder> {
    const [folder] = await db
      .update(documentFolders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(documentFolders.id, id))
      .returning();
    return folder;
  }

  async deleteFolder(id: string): Promise<void> {
    await db.delete(documentFolders).where(eq(documentFolders.id, id));
  }
  
  // Document operations
  async getDocumentById(id: string): Promise<Document | undefined> {
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id));
    return document;
  }

  async getDocumentsByStudentProfileId(studentProfileId: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(and(
        eq(documents.studentProfileId, studentProfileId),
        eq(documents.isActive, true)
      ))
      .orderBy(desc(documents.createdAt));
  }

  async getDocumentsByFolderId(folderId: string | null): Promise<Document[]> {
    if (folderId === null) {
      return await db
        .select()
        .from(documents)
        .where(and(
          isNull(documents.folderId),
          eq(documents.isActive, true)
        ))
        .orderBy(desc(documents.createdAt));
    }
    
    return await db
      .select()
      .from(documents)
      .where(and(
        eq(documents.folderId, folderId),
        eq(documents.isActive, true)
      ))
      .orderBy(desc(documents.createdAt));
  }

  async getDocumentsByApplicationId(applicationId: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(and(
        eq(documents.applicationId, applicationId),
        eq(documents.isActive, true)
      ));
  }

  async getAllDocuments(filters?: { status?: string; type?: string; senderId?: string; recipientId?: string }): Promise<Document[]> {
    let query = db.select().from(documents);
    
    const conditions = [eq(documents.isActive, true)];
    if (filters?.status) {
      conditions.push(eq(documents.status, filters.status));
    }
    if (filters?.type) {
      conditions.push(eq(documents.type, filters.type));
    }
    if (filters?.senderId) {
      conditions.push(eq(documents.senderId, filters.senderId));
    }
    if (filters?.recipientId) {
      conditions.push(eq(documents.recipientId, filters.recipientId));
    }
    
    query = query.where(and(...conditions)) as any;
    
    return await query.orderBy(desc(documents.createdAt));
  }

  async createDocument(documentData: InsertDocument): Promise<Document> {
    const [document] = await db
      .insert(documents)
      .values(documentData)
      .returning();
    return document;
  }

  async updateDocument(id: string, data: Partial<InsertDocument>): Promise<Document> {
    const [document] = await db
      .update(documents)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return document;
  }

  async updateDocumentStatus(id: string, status: string, reviewNotes?: string, reviewedBy?: string): Promise<Document> {
    const updateData: any = {
      status,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    };
    
    if (reviewNotes !== undefined) {
      updateData.reviewNotes = reviewNotes;
    }
    if (reviewedBy !== undefined) {
      updateData.reviewedBy = reviewedBy;
    }
    
    const [document] = await db
      .update(documents)
      .set(updateData)
      .where(eq(documents.id, id))
      .returning();
    return document;
  }

  async deleteDocument(id: string): Promise<void> {
    await db
      .update(documents)
      .set({ isActive: false })
      .where(eq(documents.id, id));
  }
  
  // Document comment operations
  async getCommentById(id: string): Promise<DocumentComment | undefined> {
    const [comment] = await db
      .select()
      .from(documentComments)
      .where(eq(documentComments.id, id));
    return comment;
  }

  async getCommentsByDocumentId(documentId: string): Promise<DocumentComment[]> {
    return await db
      .select()
      .from(documentComments)
      .where(eq(documentComments.documentId, documentId))
      .orderBy(desc(documentComments.createdAt));
  }

  async createComment(commentData: InsertDocumentComment): Promise<DocumentComment> {
    const [comment] = await db
      .insert(documentComments)
      .values(commentData)
      .returning();
    return comment;
  }

  async updateComment(id: string, data: Partial<InsertDocumentComment>): Promise<DocumentComment> {
    const [comment] = await db
      .update(documentComments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(documentComments.id, id))
      .returning();
    return comment;
  }

  async deleteComment(id: string): Promise<void> {
    await db.delete(documentComments).where(eq(documentComments.id, id));
  }
  
  // Document request operations
  async getDocumentRequestById(id: string): Promise<DocumentRequest | undefined> {
    const [request] = await db
      .select()
      .from(documentRequests)
      .where(eq(documentRequests.id, id));
    return request;
  }

  async getDocumentRequestsByStudentId(studentId: string): Promise<DocumentRequest[]> {
    return await db
      .select()
      .from(documentRequests)
      .where(eq(documentRequests.studentId, studentId))
      .orderBy(desc(documentRequests.createdAt));
  }

  async getDocumentRequestsByUniversityId(universityId: string): Promise<DocumentRequest[]> {
    return await db
      .select()
      .from(documentRequests)
      .where(eq(documentRequests.universityId, universityId))
      .orderBy(desc(documentRequests.createdAt));
  }

  async getDocumentRequestsByApplicationId(applicationId: string): Promise<DocumentRequest[]> {
    return await db
      .select()
      .from(documentRequests)
      .where(eq(documentRequests.applicationId, applicationId))
      .orderBy(desc(documentRequests.createdAt));
  }

  async createDocumentRequest(requestData: InsertDocumentRequest): Promise<DocumentRequest> {
    const [request] = await db
      .insert(documentRequests)
      .values(requestData)
      .returning();
    return request;
  }

  async updateDocumentRequest(id: string, data: Partial<InsertDocumentRequest>): Promise<DocumentRequest> {
    const [request] = await db
      .update(documentRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(documentRequests.id, id))
      .returning();
    return request;
  }

  async deleteDocumentRequest(id: string): Promise<void> {
    await db.delete(documentRequests).where(eq(documentRequests.id, id));
  }

  // Blog operations
  private blogWithAuthorSelect() {
    return {
      ...getTableColumns(blogs),
      authorName: sql<string | null>`NULLIF(TRIM(CONCAT(COALESCE(${users.firstName}, ''), ' ', COALESCE(${users.lastName}, ''))), '')`,
      authorAvatar: users.profileImageUrl,
      authorRole: users.role,
    };
  }

  async getAllBlogs(filters?: { status?: string; category?: string; tag?: string; authorId?: string }): Promise<BlogWithAuthor[]> {
    const conditions = [];
    
    if (filters?.status) {
      conditions.push(eq(blogs.status, filters.status as "draft" | "published"));
    }
    if (filters?.category) {
      conditions.push(eq(blogs.category, filters.category));
    }
    if (filters?.authorId) {
      conditions.push(eq(blogs.authorId, filters.authorId));
    }
    
    const baseQuery = db
      .select(this.blogWithAuthorSelect())
      .from(blogs)
      .leftJoin(users, eq(blogs.authorId, users.id));
    
    if (conditions.length > 0) {
      return await baseQuery.where(and(...conditions)).orderBy(desc(blogs.createdAt));
    }
    
    return await baseQuery.orderBy(desc(blogs.createdAt));
  }

  async getPublishedBlogs(filters?: { category?: string; tag?: string; market?: string; limit?: number; offset?: number }): Promise<{ blogs: BlogWithAuthor[]; total: number }> {
    const conditions = [eq(blogs.status, "published")];
    
    if (filters?.category) {
      conditions.push(eq(blogs.category, filters.category));
    }

    if (filters?.market) {
      conditions.push(sql`${filters.market} = ANY(${blogs.availableMarkets})`);
    }
    
    const limit = filters?.limit || 10;
    const offset = filters?.offset || 0;
    
    const [blogList, totalResult] = await Promise.all([
      db
        .select(this.blogWithAuthorSelect())
        .from(blogs)
        .leftJoin(users, eq(blogs.authorId, users.id))
        .where(and(...conditions))
        .orderBy(sql`${blogs.publishedAt} DESC NULLS LAST`, desc(blogs.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ id: blogs.id }).from(blogs).where(and(...conditions))
    ]);
    
    return { blogs: blogList, total: totalResult.length };
  }

  async getBlogById(id: string): Promise<BlogWithAuthor | undefined> {
    const [result] = await db
      .select(this.blogWithAuthorSelect())
      .from(blogs)
      .leftJoin(users, eq(blogs.authorId, users.id))
      .where(eq(blogs.id, id));
    return result;
  }

  async getBlogBySlug(slug: string): Promise<BlogWithAuthor | undefined> {
    const [result] = await db
      .select(this.blogWithAuthorSelect())
      .from(blogs)
      .leftJoin(users, eq(blogs.authorId, users.id))
      .where(eq(blogs.slug, slug));
    return result;
  }

  async getAllAdminStaff(): Promise<Array<{ id: string; firstName: string | null; lastName: string | null; profileImageUrl: string | null; role: string | null }>> {
    const staff = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        role: users.role,
      })
      .from(users)
      .innerJoin(adminTeamMembers, eq(adminTeamMembers.userId, users.id))
      .where(eq(adminTeamMembers.isActive, true))
      .orderBy(users.firstName);
    return staff;
  }

  async createBlog(blog: InsertBlog): Promise<Blog> {
    const [newBlog] = await db.insert(blogs).values(blog as any).returning();
    return newBlog;
  }

  async updateBlog(id: string, data: Partial<InsertBlog>): Promise<Blog> {
    const [blog] = await db
      .update(blogs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(blogs.id, id))
      .returning();
    return blog;
  }

  async publishBlog(id: string): Promise<Blog> {
    const [blog] = await db
      .update(blogs)
      .set({ 
        status: "published", 
        publishedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(blogs.id, id))
      .returning();
    return blog;
  }

  async unpublishBlog(id: string): Promise<Blog> {
    const [blog] = await db
      .update(blogs)
      .set({ 
        status: "draft",
        updatedAt: new Date() 
      })
      .where(eq(blogs.id, id))
      .returning();
    return blog;
  }

  async deleteBlog(id: string): Promise<void> {
    await db.delete(blogs).where(eq(blogs.id, id));
  }

  // Contact inquiry operations
  async getAllContactInquiries(filters?: { status?: string; type?: string; assignedTo?: string }): Promise<ContactInquiry[]> {
    const conditions = [];
    
    if (filters?.status) {
      conditions.push(eq(contactInquiries.status, filters.status as "new" | "in_progress" | "responded" | "closed"));
    }
    if (filters?.type) {
      conditions.push(eq(contactInquiries.inquiryType, filters.type as "student" | "institution"));
    }
    if (filters?.assignedTo) {
      conditions.push(eq(contactInquiries.assignedTo, filters.assignedTo));
    }
    
    const query = db.select().from(contactInquiries);
    
    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(desc(contactInquiries.createdAt));
    }
    
    return await query.orderBy(desc(contactInquiries.createdAt));
  }

  async getContactInquiryById(id: string): Promise<ContactInquiry | undefined> {
    const [inquiry] = await db.select().from(contactInquiries).where(eq(contactInquiries.id, id));
    return inquiry;
  }

  async createContactInquiry(inquiry: InsertContactInquiry): Promise<ContactInquiry> {
    const [newInquiry] = await db.insert(contactInquiries).values(inquiry).returning();
    return newInquiry;
  }

  async updateContactInquiry(id: string, data: Partial<InsertContactInquiry>): Promise<ContactInquiry> {
    const [inquiry] = await db
      .update(contactInquiries)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(contactInquiries.id, id))
      .returning();
    return inquiry;
  }

  async updateContactInquiryStatus(id: string, status: "new" | "in_progress" | "responded" | "closed"): Promise<ContactInquiry> {
    const updateData: any = { status, updatedAt: new Date() };
    if (status === "responded") {
      updateData.respondedAt = new Date();
    }
    
    const [inquiry] = await db
      .update(contactInquiries)
      .set(updateData)
      .where(eq(contactInquiries.id, id))
      .returning();
    return inquiry;
  }

  async assignContactInquiry(id: string, assignedTo: string): Promise<ContactInquiry> {
    const [inquiry] = await db
      .update(contactInquiries)
      .set({ assignedTo, updatedAt: new Date() })
      .where(eq(contactInquiries.id, id))
      .returning();
    return inquiry;
  }

  // ============================================
  // CRM SYSTEM IMPLEMENTATIONS
  // ============================================

  // Task operations
  async getTaskById(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async getTasksByAssignee(userId: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.assignedToId, userId))
      .orderBy(desc(tasks.dueDate));
  }

  async getTasksByApplicationId(applicationId: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.applicationId, applicationId))
      .orderBy(desc(tasks.createdAt));
  }

  async getAllTasks(filters?: { 
    status?: string; 
    priority?: string; 
    assignedToId?: string;
    involvedUserId?: string; // tasks where user is assignee OR creator
    applicationId?: string;
    category?: string;
  }): Promise<Task[]> {
    const conditions = [];
    
    if (filters?.status) {
      conditions.push(eq(tasks.status, filters.status as any));
    }
    if (filters?.priority) {
      conditions.push(eq(tasks.priority, filters.priority as any));
    }
    if (filters?.involvedUserId) {
      conditions.push(or(
        eq(tasks.assignedToId, filters.involvedUserId),
        eq(tasks.createdById, filters.involvedUserId)
      ));
    } else if (filters?.assignedToId) {
      conditions.push(eq(tasks.assignedToId, filters.assignedToId));
    }
    if (filters?.applicationId) {
      conditions.push(eq(tasks.applicationId, filters.applicationId));
    }
    if (filters?.category) {
      conditions.push(eq(tasks.category, filters.category as any));
    }
    
    if (conditions.length > 0) {
      return await db
        .select()
        .from(tasks)
        .where(and(...conditions))
        .orderBy(desc(tasks.createdAt));
    }
    
    return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
  }

  async getTasksWithRelations(filters?: { 
    status?: string; 
    priority?: string; 
    assignedToId?: string;
    involvedUserId?: string;
    applicationId?: string;
    category?: string;
  }): Promise<TaskWithRelations[]> {
    const taskList = await this.getAllTasks(filters);
    
    const tasksWithRelations: TaskWithRelations[] = await Promise.all(
      taskList.map(async (task) => {
        // Get assigned user
        let assignedTo = null;
        if (task.assignedToId) {
          const [user] = await db.select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            profileImageUrl: users.profileImageUrl,
          }).from(users).where(eq(users.id, task.assignedToId));
          assignedTo = user || null;
        }

        // Get creator
        let createdBy = null;
        if (task.createdById) {
          const [user] = await db.select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            profileImageUrl: users.profileImageUrl,
          }).from(users).where(eq(users.id, task.createdById));
          createdBy = user || null;
        }

        // Get application info
        let application = null;
        if (task.applicationId) {
          const [app] = await db.select().from(applications).where(eq(applications.id, task.applicationId));
          if (app) {
            // Get student name
            const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, app.studentId));
            // Get course name
            const [course] = app.courseId ? await db.select().from(courses).where(eq(courses.id, app.courseId)) : [];
            
            application = {
              id: app.id,
              currentStage: app.currentStage,
              studentName: profile ? `${profile.firstName} ${profile.lastName}` : undefined,
              courseName: course?.title,
            };
          }
        }

        return {
          ...task,
          assignedTo,
          createdBy,
          application,
        };
      })
    );

    return tasksWithRelations;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(id: string, data: UpdateTask): Promise<Task> {
    const [task] = await db
      .update(tasks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  async deleteTask(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async completeTask(id: string): Promise<Task> {
    const [task] = await db
      .update(tasks)
      .set({ 
        status: 'completed', 
        completedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  // Task notes operations
  async getTaskNotes(taskId: string): Promise<TaskNoteWithAuthor[]> {
    const notes = await db
      .select()
      .from(taskNotes)
      .where(eq(taskNotes.taskId, taskId))
      .orderBy(taskNotes.createdAt);

    return Promise.all(notes.map(async (note) => {
      let author = null;
      if (note.authorId) {
        const [user] = await db.select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        }).from(users).where(eq(users.id, note.authorId));
        author = user || null;
      }
      return { ...note, author };
    }));
  }

  async createTaskNote(data: InsertTaskNote): Promise<TaskNote> {
    const [note] = await db.insert(taskNotes).values(data).returning();
    return note;
  }

  async updateTaskNote(noteId: string, content: string): Promise<TaskNote> {
    const [note] = await db
      .update(taskNotes)
      .set({ content })
      .where(eq(taskNotes.id, noteId))
      .returning();
    return note;
  }

  async deleteTaskNote(noteId: string): Promise<void> {
    await db.delete(taskNotes).where(eq(taskNotes.id, noteId));
  }

  // Application internal notes operations
  async getNoteById(id: string): Promise<ApplicationInternalNote | undefined> {
    const [note] = await db.select().from(applicationInternalNotes).where(eq(applicationInternalNotes.id, id));
    return note;
  }

  async getNotesByApplicationId(applicationId: string): Promise<ApplicationInternalNote[]> {
    return await db
      .select()
      .from(applicationInternalNotes)
      .where(eq(applicationInternalNotes.applicationId, applicationId))
      .orderBy(desc(applicationInternalNotes.createdAt));
  }

  async createNote(note: InsertApplicationInternalNote): Promise<ApplicationInternalNote> {
    const [newNote] = await db.insert(applicationInternalNotes).values(note).returning();
    return newNote;
  }

  async updateNote(id: string, data: Partial<InsertApplicationInternalNote>): Promise<ApplicationInternalNote> {
    const [note] = await db
      .update(applicationInternalNotes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(applicationInternalNotes.id, id))
      .returning();
    return note;
  }

  async deleteNote(id: string): Promise<void> {
    await db.delete(applicationInternalNotes).where(eq(applicationInternalNotes.id, id));
  }

  async toggleNotePin(id: string): Promise<ApplicationInternalNote> {
    const [existingNote] = await db.select().from(applicationInternalNotes).where(eq(applicationInternalNotes.id, id));
    if (!existingNote) {
      throw new Error('Note not found');
    }
    
    const [note] = await db
      .update(applicationInternalNotes)
      .set({ 
        isPinned: !existingNote.isPinned,
        updatedAt: new Date() 
      })
      .where(eq(applicationInternalNotes.id, id))
      .returning();
    return note;
  }

  // Follow-up reminder operations
  async getReminderById(id: string): Promise<FollowUpReminder | undefined> {
    const [reminder] = await db.select().from(followUpReminders).where(eq(followUpReminders.id, id));
    return reminder;
  }

  async getRemindersByUserId(userId: string): Promise<FollowUpReminder[]> {
    return await db
      .select()
      .from(followUpReminders)
      .where(eq(followUpReminders.userId, userId))
      .orderBy(desc(followUpReminders.reminderAt));
  }

  async getUpcomingReminders(userId: string): Promise<FollowUpReminder[]> {
    return await db
      .select()
      .from(followUpReminders)
      .where(
        and(
          eq(followUpReminders.userId, userId),
          eq(followUpReminders.isCompleted, false)
        )
      )
      .orderBy(followUpReminders.reminderAt);
  }

  async getDueReminders(): Promise<FollowUpReminder[]> {
    return await db
      .select()
      .from(followUpReminders)
      .where(
        and(
          lte(followUpReminders.reminderAt, new Date()),
          eq(followUpReminders.isCompleted, false),
          eq(followUpReminders.notificationSent, false)
        )
      )
      .orderBy(followUpReminders.reminderAt);
  }

  async getRemindersByApplicationId(applicationId: string): Promise<FollowUpReminder[]> {
    return await db
      .select()
      .from(followUpReminders)
      .where(eq(followUpReminders.applicationId, applicationId))
      .orderBy(desc(followUpReminders.reminderAt));
  }

  async getRemindersByCrmContactId(crmContactId: string): Promise<FollowUpReminder[]> {
    return await db
      .select()
      .from(followUpReminders)
      .where(eq(followUpReminders.crmContactId, crmContactId))
      .orderBy(desc(followUpReminders.reminderAt));
  }

  async getRemindersByAccInvoiceId(accInvoiceId: string): Promise<FollowUpReminder[]> {
    return await db
      .select()
      .from(followUpReminders)
      .where(eq(followUpReminders.accInvoiceId, accInvoiceId))
      .orderBy(desc(followUpReminders.reminderAt));
  }

  async getRemindersByAccountId(accountId: string): Promise<FollowUpReminder[]> {
    return await db
      .select()
      .from(followUpReminders)
      .where(eq(followUpReminders.accountId, accountId))
      .orderBy(desc(followUpReminders.reminderAt));
  }

  async createReminder(reminder: InsertFollowUpReminder): Promise<FollowUpReminder> {
    const [newReminder] = await db.insert(followUpReminders).values(reminder).returning();
    return newReminder;
  }

  async updateReminder(id: string, data: Partial<InsertFollowUpReminder>): Promise<FollowUpReminder> {
    const [reminder] = await db
      .update(followUpReminders)
      .set(data)
      .where(eq(followUpReminders.id, id))
      .returning();
    return reminder;
  }

  async completeReminder(id: string): Promise<FollowUpReminder> {
    const [reminder] = await db
      .update(followUpReminders)
      .set({ 
        isCompleted: true,
        completedAt: new Date()
      })
      .where(eq(followUpReminders.id, id))
      .returning();
    return reminder;
  }

  async deleteReminder(id: string): Promise<void> {
    await db.delete(followUpReminders).where(eq(followUpReminders.id, id));
  }

  // Workload summary operations
  async getTeamWorkloadSummary(): Promise<WorkloadSummary[]> {
    // Get all admin/platform_admin users (Supabase authenticated)
    const adminUsers = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.userType, 'admin'),
          eq(users.userType, 'platform_admin')
        )
      );

    const workloadSummaries: WorkloadSummary[] = await Promise.all(
      adminUsers.map(async (user) => {
        // Get role from admin_team_members if exists, otherwise infer from userType
        const [teamMember] = await db
          .select({ role: adminTeamMembers.role })
          .from(adminTeamMembers)
          .where(eq(adminTeamMembers.userId, user.id));
        
        const role = teamMember?.role || (user.userType === 'platform_admin' ? 'cto' : 'consultant');
        
        // Get task counts
        const allTasks = await db
          .select()
          .from(tasks)
          .where(eq(tasks.assignedToId, user.id));
        
        const now = new Date();
        const pendingTasks = allTasks.filter(t => t.status === 'pending').length;
        const inProgressTasks = allTasks.filter(t => t.status === 'in_progress').length;
        const completedTasks = allTasks.filter(t => t.status === 'completed').length;
        const overdueTasks = allTasks.filter(t => 
          t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed' && t.status !== 'cancelled'
        ).length;

        // Get assigned applications count
        const assignedApps = await db
          .select()
          .from(applications)
          .where(eq(applications.assignedConsultantId, user.id));

        // Calculate average task completion time
        const completedTasksWithTimes = allTasks.filter(t => t.status === 'completed' && t.completedAt && t.createdAt);
        let avgTaskCompletionTime: number | undefined;
        if (completedTasksWithTimes.length > 0) {
          const totalHours = completedTasksWithTimes.reduce((sum, t) => {
            const created = new Date(t.createdAt!).getTime();
            const completed = new Date(t.completedAt!).getTime();
            return sum + ((completed - created) / (1000 * 60 * 60));
          }, 0);
          avgTaskCompletionTime = Math.round(totalHours / completedTasksWithTimes.length);
        }

        // Count active applications (not completed or cancelled)
        const activeApps = assignedApps.filter(a => 
          !['enrolled', 'rejected', 'withdrawn', 'cancelled'].includes((a as any).currentStage || '')
        );

        return {
          userId: user.id,
          firstName: user.firstName || null,
          lastName: user.lastName || null,
          email: user.email || null,
          role: role,
          profileImageUrl: user.profileImageUrl || null,
          totalTasks: allTasks.length,
          pendingTasks,
          inProgressTasks,
          completedTasks,
          overdueTasks,
          totalApplications: assignedApps.length,
          activeApplications: activeApps.length,
          avgTaskCompletionTime,
        };
      })
    );

    return workloadSummaries;
  }

  // ============================================
  // CMS CONTENT BLOCKS IMPLEMENTATIONS
  // ============================================

  // Testimonial operations
  async getTestimonialById(id: string): Promise<Testimonial | undefined> {
    const [testimonial] = await db.select().from(testimonials).where(eq(testimonials.id, id));
    return testimonial;
  }

  async getAllTestimonials(filters?: { status?: string; isFeatured?: boolean; showOnPage?: string }): Promise<Testimonial[]> {
    let query = db.select().from(testimonials);
    const conditions = [];
    
    if (filters?.status) {
      conditions.push(eq(testimonials.status, filters.status as any));
    }
    if (filters?.isFeatured !== undefined) {
      conditions.push(eq(testimonials.isFeatured, filters.isFeatured));
    }
    if (filters?.showOnPage) {
      conditions.push(sql`${filters.showOnPage} = ANY(${testimonials.showOnPage})`);
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(testimonials.displayOrder);
  }

  async getPublishedTestimonials(page?: string): Promise<Testimonial[]> {
    let query: any = db.select().from(testimonials).where(eq(testimonials.status, 'published'));
    
    if (page) {
      query = query.where(
        and(
          eq(testimonials.status, 'published'),
          sql`${page} = ANY(${testimonials.showOnPage})`
        )
      ) as any;
    }
    
    return await query.orderBy(testimonials.displayOrder);
  }

  async createTestimonial(testimonialData: InsertTestimonial): Promise<Testimonial> {
    const [testimonial] = await db.insert(testimonials).values(testimonialData).returning();
    return testimonial;
  }

  async updateTestimonial(id: string, data: UpdateTestimonial): Promise<Testimonial> {
    const updateData: any = { ...data, updatedAt: new Date() };
    if (data.status === 'published') {
      updateData.publishedAt = new Date();
    }
    const [testimonial] = await db
      .update(testimonials)
      .set(updateData)
      .where(eq(testimonials.id, id))
      .returning();
    return testimonial;
  }

  async deleteTestimonial(id: string): Promise<void> {
    await db.delete(testimonials).where(eq(testimonials.id, id));
  }

  // FAQ operations
  async getFaqById(id: string): Promise<Faq | undefined> {
    const [faq] = await db.select().from(faqs).where(eq(faqs.id, id));
    return faq;
  }

  async getAllFaqs(filters?: { status?: string; category?: string; showOnPage?: string }): Promise<Faq[]> {
    let query = db.select().from(faqs);
    const conditions = [];
    
    if (filters?.status) {
      conditions.push(eq(faqs.status, filters.status as any));
    }
    if (filters?.category) {
      conditions.push(eq(faqs.category, filters.category as any));
    }
    if (filters?.showOnPage) {
      conditions.push(sql`${filters.showOnPage} = ANY(${faqs.showOnPage})`);
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(faqs.displayOrder);
  }

  async getPublishedFaqs(category?: string, page?: string): Promise<Faq[]> {
    const conditions = [eq(faqs.status, 'published')];
    
    if (category) {
      conditions.push(eq(faqs.category, category as any));
    }
    if (page) {
      conditions.push(sql`${page} = ANY(${faqs.showOnPage})`);
    }
    
    return await db
      .select()
      .from(faqs)
      .where(and(...conditions))
      .orderBy(faqs.displayOrder);
  }

  async createFaq(faqData: InsertFaq): Promise<Faq> {
    const [faq] = await db.insert(faqs).values(faqData).returning();
    return faq;
  }

  async updateFaq(id: string, data: UpdateFaq): Promise<Faq> {
    const [faq] = await db
      .update(faqs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(faqs.id, id))
      .returning();
    return faq;
  }

  async deleteFaq(id: string): Promise<void> {
    await db.delete(faqs).where(eq(faqs.id, id));
  }

  // Public team member operations
  async getPublicTeamMemberById(id: string): Promise<PublicTeamMember | undefined> {
    const [member] = await db.select().from(publicTeamMembers).where(eq(publicTeamMembers.id, id));
    return member;
  }

  async getAllPublicTeamMembers(filters?: { status?: string; isFeatured?: boolean }): Promise<PublicTeamMember[]> {
    let query = db.select().from(publicTeamMembers);
    const conditions = [];
    
    if (filters?.status) {
      conditions.push(eq(publicTeamMembers.status, filters.status as any));
    }
    if (filters?.isFeatured !== undefined) {
      conditions.push(eq(publicTeamMembers.isFeatured, filters.isFeatured));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(publicTeamMembers.displayOrder);
  }

  async getPublishedPublicTeamMembers(): Promise<PublicTeamMember[]> {
    return await db
      .select()
      .from(publicTeamMembers)
      .where(eq(publicTeamMembers.status, 'published'))
      .orderBy(publicTeamMembers.displayOrder);
  }

  async createPublicTeamMember(memberData: InsertPublicTeamMember): Promise<PublicTeamMember> {
    const [member] = await db.insert(publicTeamMembers).values(memberData).returning();
    return member;
  }

  async updatePublicTeamMember(id: string, data: UpdatePublicTeamMember): Promise<PublicTeamMember> {
    const [member] = await db
      .update(publicTeamMembers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(publicTeamMembers.id, id))
      .returning();
    return member;
  }

  async deletePublicTeamMember(id: string): Promise<void> {
    await db.delete(publicTeamMembers).where(eq(publicTeamMembers.id, id));
  }

  // Site settings operations
  async getSiteSettingByKey(key: string): Promise<SiteSetting | undefined> {
    const [setting] = await db.select().from(siteSettings).where(eq(siteSettings.settingKey, key));
    return setting;
  }

  async getAllSiteSettings(category?: string): Promise<SiteSetting[]> {
    if (category) {
      return await db.select().from(siteSettings).where(eq(siteSettings.category, category));
    }
    return await db.select().from(siteSettings);
  }

  async getPublicSiteSettings(): Promise<SiteSetting[]> {
    return await db.select().from(siteSettings).where(eq(siteSettings.isPublic, true));
  }

  async createSiteSetting(settingData: InsertSiteSetting): Promise<SiteSetting> {
    const [setting] = await db.insert(siteSettings).values(settingData).returning();
    return setting;
  }

  async updateSiteSetting(key: string, data: UpdateSiteSetting): Promise<SiteSetting> {
    const [setting] = await db
      .update(siteSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(siteSettings.settingKey, key))
      .returning();
    return setting;
  }

  async deleteSiteSetting(id: string): Promise<void> {
    await db.delete(siteSettings).where(eq(siteSettings.id, id));
  }

  // Content snippet operations
  async getContentSnippetById(id: string): Promise<ContentSnippet | undefined> {
    const [snippet] = await db.select().from(contentSnippets).where(eq(contentSnippets.id, id));
    return snippet;
  }

  async getContentSnippetByKey(key: string): Promise<ContentSnippet | undefined> {
    const [snippet] = await db.select().from(contentSnippets).where(eq(contentSnippets.snippetKey, key));
    return snippet;
  }

  async getAllContentSnippets(filters?: { status?: string; pageLocation?: string }): Promise<ContentSnippet[]> {
    let query = db.select().from(contentSnippets);
    const conditions = [];
    
    if (filters?.status) {
      conditions.push(eq(contentSnippets.status, filters.status as any));
    }
    if (filters?.pageLocation) {
      conditions.push(eq(contentSnippets.pageLocation, filters.pageLocation));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query;
  }

  async getPublishedContentSnippets(pageLocation?: string): Promise<ContentSnippet[]> {
    const conditions = [eq(contentSnippets.status, 'published')];
    
    if (pageLocation) {
      conditions.push(eq(contentSnippets.pageLocation, pageLocation));
    }
    
    return await db
      .select()
      .from(contentSnippets)
      .where(and(...conditions));
  }

  async createContentSnippet(snippetData: InsertContentSnippet): Promise<ContentSnippet> {
    const [snippet] = await db.insert(contentSnippets).values(snippetData).returning();
    return snippet;
  }

  async updateContentSnippet(id: string, data: UpdateContentSnippet): Promise<ContentSnippet> {
    // Get current snippet for version tracking
    const [current] = await db.select().from(contentSnippets).where(eq(contentSnippets.id, id));
    
    const updateData: any = { 
      ...data, 
      updatedAt: new Date(),
      version: (current?.version || 0) + 1,
      previousVersionId: current?.id
    };
    
    if (data.status === 'published') {
      updateData.publishedAt = new Date();
    }
    
    const [snippet] = await db
      .update(contentSnippets)
      .set(updateData)
      .where(eq(contentSnippets.id, id))
      .returning();
    return snippet;
  }

  async deleteContentSnippet(id: string): Promise<void> {
    await db.delete(contentSnippets).where(eq(contentSnippets.id, id));
  }

  // ============================================
  // GLOBAL REGION SYSTEM IMPLEMENTATIONS
  // ============================================

  // Region operations
  async getRegionById(id: string): Promise<Region | undefined> {
    const [region] = await db.select().from(regions).where(eq(regions.id, id));
    return region;
  }

  async getRegionByCode(code: string): Promise<Region | undefined> {
    const [region] = await db.select().from(regions).where(eq(regions.code, code.toUpperCase()));
    return region;
  }

  async getRegionByDomainPattern(domain: string): Promise<Region | undefined> {
    // Match domain against patterns like '.com.au', '.com.bd'
    const allRegions = await db.select().from(regions).where(eq(regions.isActive, true));
    
    for (const region of allRegions) {
      if (region.domainPattern && domain.endsWith(region.domainPattern)) {
        return region;
      }
      if (region.primaryDomain && domain.includes(region.primaryDomain)) {
        return region;
      }
    }
    
    // Return default region if no match
    return this.getDefaultRegion();
  }

  async getAllRegions(activeOnly: boolean = false): Promise<Region[]> {
    if (activeOnly) {
      return await db.select().from(regions)
        .where(eq(regions.isActive, true))
        .orderBy(regions.displayOrder);
    }
    return await db.select().from(regions).orderBy(regions.displayOrder);
  }

  async getRegionWithDetails(id: string): Promise<RegionWithDetails | undefined> {
    const region = await this.getRegionById(id);
    if (!region) return undefined;

    const pathways = await this.getAllPathways(true);
    const visaReqs = await this.getVisaRequirementsByRegionId(id);
    
    // Count course variants for this region
    const variants = await db.select().from(courseRegionVariants)
      .where(eq(courseRegionVariants.regionId, id));

    return {
      ...region,
      pathways,
      visaRequirements: visaReqs,
      courseVariantCount: variants.length,
    };
  }

  async createRegion(regionData: InsertRegion): Promise<Region> {
    const [region] = await db.insert(regions).values({
      ...regionData,
      code: regionData.code.toUpperCase(),
    }).returning();
    return region;
  }

  async updateRegion(id: string, data: UpdateRegion): Promise<Region> {
    const updateData = { ...data, updatedAt: new Date() };
    if (data.code) {
      updateData.code = data.code.toUpperCase();
    }
    const [region] = await db.update(regions)
      .set(updateData)
      .where(eq(regions.id, id))
      .returning();
    return region;
  }

  async deleteRegion(id: string): Promise<void> {
    await db.delete(regions).where(eq(regions.id, id));
  }

  async getDefaultRegion(): Promise<Region | undefined> {
    const [region] = await db.select().from(regions)
      .where(and(eq(regions.isDefault, true), eq(regions.isActive, true)));
    return region;
  }

  // Student pathway operations
  async getPathwayById(id: string): Promise<StudentPathway | undefined> {
    const [pathway] = await db.select().from(studentPathways).where(eq(studentPathways.id, id));
    return pathway;
  }

  async getPathwayByCode(code: string): Promise<StudentPathway | undefined> {
    const [pathway] = await db.select().from(studentPathways)
      .where(eq(studentPathways.code, code.toLowerCase()));
    return pathway;
  }

  async getAllPathways(activeOnly: boolean = false): Promise<StudentPathway[]> {
    if (activeOnly) {
      return await db.select().from(studentPathways)
        .where(eq(studentPathways.isActive, true))
        .orderBy(studentPathways.displayOrder);
    }
    return await db.select().from(studentPathways).orderBy(studentPathways.displayOrder);
  }

  async createPathway(pathwayData: InsertStudentPathway): Promise<StudentPathway> {
    const [pathway] = await db.insert(studentPathways).values({
      ...pathwayData,
      code: pathwayData.code.toLowerCase(),
    }).returning();
    return pathway;
  }

  async updatePathway(id: string, data: Partial<InsertStudentPathway>): Promise<StudentPathway> {
    const updateData: any = { ...data };
    if (data.code) {
      updateData.code = data.code.toLowerCase();
    }
    const [pathway] = await db.update(studentPathways)
      .set(updateData)
      .where(eq(studentPathways.id, id))
      .returning();
    return pathway;
  }

  async deletePathway(id: string): Promise<void> {
    await db.delete(studentPathways).where(eq(studentPathways.id, id));
  }

  // Course region variant operations
  async getVariantById(id: string): Promise<CourseRegionVariant | undefined> {
    const [variant] = await db.select().from(courseRegionVariants)
      .where(eq(courseRegionVariants.id, id));
    return variant;
  }

  async getVariantsByCourseId(courseId: string): Promise<CourseRegionVariant[]> {
    return await db.select().from(courseRegionVariants)
      .where(eq(courseRegionVariants.courseId, courseId));
  }

  async getVariantsByRegionId(regionId: string): Promise<CourseRegionVariant[]> {
    return await db.select().from(courseRegionVariants)
      .where(eq(courseRegionVariants.regionId, regionId));
  }

  async getVariant(courseId: string, regionId: string, pathwayId?: string): Promise<CourseRegionVariant | undefined> {
    // Try to find exact match first (with pathway)
    if (pathwayId) {
      const [exactMatch] = await db.select().from(courseRegionVariants)
        .where(and(
          eq(courseRegionVariants.courseId, courseId),
          eq(courseRegionVariants.regionId, regionId),
          eq(courseRegionVariants.pathwayId, pathwayId)
        ));
      if (exactMatch) return exactMatch;
    }

    // Fall back to region-only variant (pathway = null, applies to all)
    const [regionOnlyMatch] = await db.select().from(courseRegionVariants)
      .where(and(
        eq(courseRegionVariants.courseId, courseId),
        eq(courseRegionVariants.regionId, regionId),
        isNull(courseRegionVariants.pathwayId)
      ));
    
    return regionOnlyMatch;
  }

  async getVariantWithRelations(courseId: string, regionId: string, pathwayId?: string): Promise<CourseRegionVariantWithRelations | undefined> {
    const variant = await this.getVariant(courseId, regionId, pathwayId);
    if (!variant) return undefined;

    const course = await this.getCourseById(courseId);
    const region = await this.getRegionById(regionId);
    const pathway = variant.pathwayId ? await this.getPathwayById(variant.pathwayId) : undefined;
    const visaReq = variant.visaRequirementId ? await this.getVisaRequirementById(variant.visaRequirementId) : undefined;

    return {
      ...variant,
      course: course ? {
        id: course.id,
        title: course.title,
        subject: course.subject,
        level: course.level,
        universityId: course.universityId,
      } : undefined,
      region,
      pathway,
      visaRequirement: visaReq,
    };
  }

  async createVariant(variantData: InsertCourseRegionVariant): Promise<CourseRegionVariant> {
    // drizzle-orm 0.45 tightened JSON column inference; cast needed for
    // englishRequirements nested optional fields typed as unknown
    const [variant] = await db.insert(courseRegionVariants).values(variantData as any).returning();
    return variant;
  }

  async updateVariant(id: string, data: UpdateCourseRegionVariant): Promise<CourseRegionVariant> {
    const [variant] = await db.update(courseRegionVariants)
      // same JSON-column inference tightening as createVariant above
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(courseRegionVariants.id, id))
      .returning();
    return variant;
  }

  async deleteVariant(id: string): Promise<void> {
    await db.delete(courseRegionVariants).where(eq(courseRegionVariants.id, id));
  }

  async deleteVariantsByCourseId(courseId: string): Promise<void> {
    await db.delete(courseRegionVariants).where(eq(courseRegionVariants.courseId, courseId));
  }

  // Visa requirement operations
  async getVisaRequirementById(id: string): Promise<VisaRequirement | undefined> {
    const [requirement] = await db.select().from(visaRequirements)
      .where(eq(visaRequirements.id, id));
    return requirement;
  }

  async getVisaRequirementsByRegionId(regionId: string): Promise<VisaRequirement[]> {
    return await db.select().from(visaRequirements)
      .where(eq(visaRequirements.regionId, regionId));
  }

  async getVisaRequirement(regionId: string, pathwayId?: string): Promise<VisaRequirement | undefined> {
    // Try exact match first
    if (pathwayId) {
      const [exactMatch] = await db.select().from(visaRequirements)
        .where(and(
          eq(visaRequirements.regionId, regionId),
          eq(visaRequirements.pathwayId, pathwayId)
        ));
      if (exactMatch) return exactMatch;
    }

    // Fall back to region-level requirement
    const [regionMatch] = await db.select().from(visaRequirements)
      .where(and(
        eq(visaRequirements.regionId, regionId),
        isNull(visaRequirements.pathwayId)
      ));
    
    return regionMatch;
  }

  async createVisaRequirement(requirementData: InsertVisaRequirement): Promise<VisaRequirement> {
    const [requirement] = await db.insert(visaRequirements).values(requirementData).returning();
    return requirement;
  }

  async updateVisaRequirement(id: string, data: UpdateVisaRequirement): Promise<VisaRequirement> {
    const [requirement] = await db.update(visaRequirements)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(visaRequirements.id, id))
      .returning();
    return requirement;
  }

  async deleteVisaRequirement(id: string): Promise<void> {
    await db.delete(visaRequirements).where(eq(visaRequirements.id, id));
  }

  // Localized content operations
  async getLocalizedContentById(id: string): Promise<LocalizedContent | undefined> {
    const [content] = await db.select().from(localizedContent)
      .where(eq(localizedContent.id, id));
    return content;
  }

  async getLocalizedContent(entityType: string, entityId: string, locale: string): Promise<LocalizedContent | undefined> {
    const [content] = await db.select().from(localizedContent)
      .where(and(
        eq(localizedContent.entityType, entityType as any),
        eq(localizedContent.entityId, entityId),
        eq(localizedContent.locale, locale)
      ));
    return content;
  }

  async getLocalizedContentsByEntity(entityType: string, entityId: string): Promise<LocalizedContent[]> {
    return await db.select().from(localizedContent)
      .where(and(
        eq(localizedContent.entityType, entityType as any),
        eq(localizedContent.entityId, entityId)
      ));
  }

  async getAllLocalizedContent(filters?: { entityType?: string; locale?: string; isReviewed?: boolean }): Promise<LocalizedContent[]> {
    const conditions = [];
    
    if (filters?.entityType) {
      conditions.push(eq(localizedContent.entityType, filters.entityType as any));
    }
    if (filters?.locale) {
      conditions.push(eq(localizedContent.locale, filters.locale));
    }
    if (filters?.isReviewed !== undefined) {
      conditions.push(eq(localizedContent.isReviewed, filters.isReviewed));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(localizedContent).where(and(...conditions));
    }
    return await db.select().from(localizedContent);
  }

  async createLocalizedContent(contentData: InsertLocalizedContent): Promise<LocalizedContent> {
    const [content] = await db.insert(localizedContent).values(contentData).returning();
    return content;
  }

  async updateLocalizedContent(id: string, data: UpdateLocalizedContent): Promise<LocalizedContent> {
    const [content] = await db.update(localizedContent)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(localizedContent.id, id))
      .returning();
    return content;
  }

  async deleteLocalizedContent(id: string): Promise<void> {
    await db.delete(localizedContent).where(eq(localizedContent.id, id));
  }

  // Course resolution with region fallback
  async resolveCourseForRegion(courseId: string, regionCode: string, pathwayCode?: string): Promise<ResolvedCourseData | undefined> {
    // Get base course
    const course = await this.getCourseById(courseId);
    if (!course) return undefined;

    // Get region
    const region = await this.getRegionByCode(regionCode);
    if (!region) return undefined;

    // Get pathway if provided
    const pathway = pathwayCode ? await this.getPathwayByCode(pathwayCode) : undefined;

    // Get variant with fallback logic:
    // 1. Try exact match (course + region + pathway)
    // 2. Try region-only match (course + region, pathway = null)
    // 3. Fall back to base course data
    const variant = await this.getVariant(courseId, region.id, pathway?.id);

    // Get visa requirement
    const visaReq = variant?.visaRequirementId 
      ? await this.getVisaRequirementById(variant.visaRequirementId)
      : await this.getVisaRequirement(region.id, pathway?.id);

    // Get localized content for course
    const localized = await this.getLocalizedContent('course', courseId, region.defaultLocale || 'en');

    // Merge base course with variant overrides
    return {
      id: course.id,
      title: course.title,
      description: course.description,
      subject: course.subject,
      discipline: course.discipline,
      level: course.level,
      duration: course.duration,
      
      // Pricing: prefer variant, fall back to base course
      tuitionFee: variant?.tuitionFee?.toString() || course.fees?.toString() || null,
      currency: variant?.tuitionCurrency || region.defaultCurrency || 'AUD',
      applicationFee: variant?.applicationFee?.toString() || course.applicationFees?.toString() || null,
      costOfLiving: variant?.costOfLiving?.toString() || null,
      scholarshipMin: variant?.scholarshipMin ?? (course as any).scholarshipPercentageMin ?? null,
      scholarshipMax: variant?.scholarshipMax ?? (course as any).scholarshipPercentageMax ?? null,
      
      // Requirements: prefer variant, fall back to base course
      englishRequirements: variant?.englishRequirements || course.englishRequirementsStructured || null,
      academicRequirements: variant?.academicRequirements || null,
      minimumAge: variant?.minimumAge ?? course.minimumAge ?? null,
      
      // Region info
      regionCode: region.code,
      pathwayCode: pathway?.code || null,
      visaRequired: pathway?.requiresVisa || false,
      visaInfo: visaReq || null,
      
      // Localized content
      localizedTitle: (localized?.content as any)?.title,
      localizedDescription: (localized?.content as any)?.description,
    };
  }
  
  // Qualification equivalencies operations
  async batchSaveQualificationEquivalencies(equivalencies: Array<{
    sourceQualification: { country: string; name: string; levelCategory: string };
    targetQualification: { country: string; name: string; levelCategory: string };
    sourceGradeMin: string;
    sourceGradeMax?: string;
    targetEquivalent: string;
    confidenceLevel?: string;
    notes?: string;
  }>): Promise<number> {
    let savedCount = 0;
    
    for (const equiv of equivalencies) {
      try {
        // Get or create source qualification type
        let [sourceQual] = await db
          .select()
          .from(academicQualificationTypes)
          .where(
            and(
              eq(academicQualificationTypes.country, equiv.sourceQualification.country),
              eq(academicQualificationTypes.name, equiv.sourceQualification.name),
              eq(academicQualificationTypes.levelCategory, equiv.sourceQualification.levelCategory as any)
            )
          );
        
        if (!sourceQual) {
          [sourceQual] = await db
            .insert(academicQualificationTypes)
            .values({
              country: equiv.sourceQualification.country,
              name: equiv.sourceQualification.name,
              levelCategory: equiv.sourceQualification.levelCategory as any,
              isActive: true,
            })
            .returning();
        }
        
        // Get or create target qualification type
        let [targetQual] = await db
          .select()
          .from(academicQualificationTypes)
          .where(
            and(
              eq(academicQualificationTypes.country, equiv.targetQualification.country),
              eq(academicQualificationTypes.name, equiv.targetQualification.name),
              eq(academicQualificationTypes.levelCategory, equiv.targetQualification.levelCategory as any)
            )
          );
        
        if (!targetQual) {
          [targetQual] = await db
            .insert(academicQualificationTypes)
            .values({
              country: equiv.targetQualification.country,
              name: equiv.targetQualification.name,
              levelCategory: equiv.targetQualification.levelCategory as any,
              isActive: true,
            })
            .returning();
        }
        
        // Check if equivalency already exists (match on source, target, min AND max for uniqueness)
        const matchConditions = [
          eq(qualificationEquivalencies.sourceQualificationId, sourceQual.id),
          eq(qualificationEquivalencies.targetQualificationId, targetQual.id),
          eq(qualificationEquivalencies.sourceGradeMin, equiv.sourceGradeMin),
        ];
        
        // Include sourceGradeMax in matching to ensure correct row updates
        if (equiv.sourceGradeMax) {
          matchConditions.push(eq(qualificationEquivalencies.sourceGradeMax, equiv.sourceGradeMax));
        } else {
          matchConditions.push(isNull(qualificationEquivalencies.sourceGradeMax));
        }
        
        const [existingEquiv] = await db
          .select()
          .from(qualificationEquivalencies)
          .where(and(...matchConditions));
        
        if (existingEquiv) {
          // Update existing equivalency
          await db
            .update(qualificationEquivalencies)
            .set({
              sourceGradeMax: equiv.sourceGradeMax || null,
              targetEquivalent: equiv.targetEquivalent,
              confidenceLevel: equiv.confidenceLevel || 'standard',
              notes: equiv.notes || null,
              updatedAt: new Date(),
            })
            .where(eq(qualificationEquivalencies.id, existingEquiv.id));
        } else {
          // Insert new equivalency
          await db
            .insert(qualificationEquivalencies)
            .values({
              sourceQualificationId: sourceQual.id,
              targetQualificationId: targetQual.id,
              sourceGradeMin: equiv.sourceGradeMin,
              sourceGradeMax: equiv.sourceGradeMax || null,
              targetEquivalent: equiv.targetEquivalent,
              confidenceLevel: equiv.confidenceLevel || 'standard',
              notes: equiv.notes || null,
              isActive: true,
            });
        }
        
        savedCount++;
      } catch (error) {
        console.error("Error saving equivalency:", error);
        // Continue with other equivalencies
      }
    }
    
    return savedCount;
  }
  
  // AI Settings operations
  async getAiSetting(settingKey: string): Promise<AiSetting | undefined> {
    const [setting] = await db
      .select()
      .from(aiSettings)
      .where(eq(aiSettings.settingKey, settingKey));
    return setting;
  }
  
  async getAllAiSettings(): Promise<AiSetting[]> {
    return await db.select().from(aiSettings);
  }
  
  async upsertAiSetting(settingKey: string, data: Partial<InsertAiSetting>): Promise<AiSetting> {
    const existing = await this.getAiSetting(settingKey);
    
    if (existing) {
      const [updated] = await db
        .update(aiSettings)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(aiSettings.settingKey, settingKey))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(aiSettings)
        .values({
          settingKey,
          modelId: data.modelId || 'anthropic/claude-3.5-sonnet',
          provider: data.provider || 'openrouter',
          ...data,
        })
        .returning();
      return created;
    }
  }
  
  // API Key operations
  async createApiKey(data: { 
    name: string; 
    keyHash: string; 
    keyPrefix: string; 
    permissions: string[]; 
    createdByUserId: string; 
    description?: string; 
    expiresAt?: Date; 
    rateLimitPerMinute?: number; 
    rateLimitPerHour?: number;
  }): Promise<ApiKey> {
    const [created] = await db
      .insert(apiKeys)
      .values({
        name: data.name,
        keyHash: data.keyHash,
        keyPrefix: data.keyPrefix,
        permissions: data.permissions,
        createdByUserId: data.createdByUserId,
        description: data.description,
        expiresAt: data.expiresAt,
        rateLimitPerMinute: data.rateLimitPerMinute || 100,
        rateLimitPerHour: data.rateLimitPerHour || 1000,
      })
      .returning();
    return created;
  }
  
  async getApiKeyById(id: string): Promise<ApiKey | undefined> {
    const [key] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, id));
    return key;
  }
  
  async getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined> {
    const [key] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.keyHash, keyHash));
    return key;
  }
  
  async getAllApiKeys(): Promise<ApiKey[]> {
    return await db
      .select()
      .from(apiKeys)
      .orderBy(desc(apiKeys.createdAt));
  }
  
  async updateApiKey(id: string, data: Partial<{ 
    name: string; 
    permissions: string[]; 
    description: string; 
    isActive: boolean; 
    rateLimitPerMinute: number; 
    rateLimitPerHour: number;
  }>): Promise<ApiKey> {
    const [updated] = await db
      .update(apiKeys)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(apiKeys.id, id))
      .returning();
    return updated;
  }
  
  async revokeApiKey(id: string, revokedByUserId: string): Promise<ApiKey> {
    const [revoked] = await db
      .update(apiKeys)
      .set({
        isActive: false,
        revokedAt: new Date(),
        revokedByUserId,
        updatedAt: new Date(),
      })
      .where(eq(apiKeys.id, id))
      .returning();
    return revoked;
  }
  
  async incrementApiKeyUsage(id: string, ipAddress: string): Promise<void> {
    await db
      .update(apiKeys)
      .set({
        usageCount: sql`${apiKeys.usageCount} + 1`,
        lastUsedAt: new Date(),
        lastUsedIp: ipAddress,
        updatedAt: new Date(),
      })
      .where(eq(apiKeys.id, id));
  }
  
  // API Key Usage Logs operations
  async createApiKeyUsageLog(data: { 
    apiKeyId: string; 
    endpoint: string; 
    method: string; 
    statusCode?: number; 
    resourceType?: string; 
    resourceId?: string; 
    ipAddress?: string; 
    userAgent?: string;
  }): Promise<ApiKeyUsageLog> {
    const [log] = await db
      .insert(apiKeyUsageLogs)
      .values(data)
      .returning();
    return log;
  }
  
  async getApiKeyUsageLogs(apiKeyId: string, limit: number = 100): Promise<ApiKeyUsageLog[]> {
    return await db
      .select()
      .from(apiKeyUsageLogs)
      .where(eq(apiKeyUsageLogs.apiKeyId, apiKeyId))
      .orderBy(desc(apiKeyUsageLogs.createdAt))
      .limit(limit);
  }

  async getTeamKpiReport(from: Date, to: Date): Promise<{
    userId: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    profileImageUrl: string | null;
    role: string | null;
    leadsAdded: number;
    appsEnrolled: number;
    tasksCompleted: number;
    tasksAssigned: number;
  }[]> {
    // Get all admin/platform_admin users
    const adminUsers = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        profileImageUrl: users.profileImageUrl,
        userType: users.userType,
      })
      .from(users)
      .where(
        or(
          eq(users.userType, 'admin'),
          eq(users.userType, 'platform_admin')
        )
      );

    // Query 1: leads added grouped by createdByUserId in crmContacts
    const leadsRows = await db
      .select({
        userId: crmContacts.createdByUserId,
        cnt: count(),
      })
      .from(crmContacts)
      .where(
        and(
          gte(crmContacts.createdAt, from),
          lte(crmContacts.createdAt, to)
        )
      )
      .groupBy(crmContacts.createdByUserId);

    // Query 2: applications reaching 'Application Won' stage grouped by assignedConsultantId
    const appsRows = await db
      .select({
        userId: applications.assignedConsultantId,
        cnt: count(),
      })
      .from(applications)
      .where(
        and(
          eq(applications.currentStage, 'Application Won'),
          gte(applications.updatedAt, from),
          lte(applications.updatedAt, to)
        )
      )
      .groupBy(applications.assignedConsultantId);

    // Query 3a: tasks completed grouped by assignedToId
    const tasksCompletedRows = await db
      .select({
        userId: tasks.assignedToId,
        cnt: count(),
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.status, 'completed'),
          gte(tasks.completedAt, from),
          lte(tasks.completedAt, to)
        )
      )
      .groupBy(tasks.assignedToId);

    // Query 3b: tasks assigned (total assigned in period) grouped by assignedToId
    const tasksAssignedRows = await db
      .select({
        userId: tasks.assignedToId,
        cnt: count(),
      })
      .from(tasks)
      .where(
        and(
          gte(tasks.createdAt, from),
          lte(tasks.createdAt, to)
        )
      )
      .groupBy(tasks.assignedToId);

    // Build lookup maps
    const leadsMap = new Map<string, number>();
    for (const row of leadsRows) {
      if (row.userId) leadsMap.set(row.userId, Number(row.cnt));
    }

    const appsMap = new Map<string, number>();
    for (const row of appsRows) {
      if (row.userId) appsMap.set(row.userId, Number(row.cnt));
    }

    const tasksCompletedMap = new Map<string, number>();
    for (const row of tasksCompletedRows) {
      if (row.userId) tasksCompletedMap.set(row.userId, Number(row.cnt));
    }

    const tasksAssignedMap = new Map<string, number>();
    for (const row of tasksAssignedRows) {
      if (row.userId) tasksAssignedMap.set(row.userId, Number(row.cnt));
    }

    // Get roles from adminTeamMembers
    const teamMembers = await db.select().from(adminTeamMembers);
    const roleMap = new Map<string, string>();
    for (const m of teamMembers) {
      if (m.userId) roleMap.set(m.userId, m.role || 'consultant');
    }

    return adminUsers.map((user) => {
      const role = roleMap.get(user.id) || (user.userType === 'platform_admin' ? 'cto' : 'consultant');
      return {
        userId: user.id,
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        email: user.email || null,
        profileImageUrl: user.profileImageUrl || null,
        role,
        leadsAdded: leadsMap.get(user.id) ?? 0,
        appsEnrolled: appsMap.get(user.id) ?? 0,
        tasksCompleted: tasksCompletedMap.get(user.id) ?? 0,
        tasksAssigned: tasksAssignedMap.get(user.id) ?? 0,
      };
    });
  }
}

export const storage = new DatabaseStorage();
