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
  referrals,
  type User,
  type UpsertUser,
  type University,
  type InsertUniversity,
  type Course,
  type InsertCourse,
  type CourseWithUniversity,
  type SubDiscipline,
  type InsertSubDiscipline,
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
  type Referral,
  type InsertReferral,
  studentLeads,
  type StudentLead,
  type InsertStudentLead,
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
  type InsertBlog,
  contactInquiries,
  type ContactInquiry,
  type InsertContactInquiry,
  // CRM imports
  tasks,
  applicationInternalNotes,
  followUpReminders,
  type Task,
  type InsertTask,
  type UpdateTask,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, like, or, desc, isNull, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, data: Partial<User>): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;

  // University operations
  getUniversityById(id: string): Promise<University | undefined>;
  getUniversityByUserId(userId: string): Promise<University | undefined>;
  getAllUniversities(): Promise<University[]>;
  createUniversity(university: InsertUniversity): Promise<University>;
  updateUniversity(id: string, data: Partial<InsertUniversity>): Promise<University>;
  deleteUniversity(id: string): Promise<void>;
  
  // Course operations
  getCourseById(id: string): Promise<CourseWithUniversity | undefined>;
  getCoursesByUniversityId(universityId: string): Promise<CourseWithUniversity[]>;
  getAllCourses(): Promise<CourseWithUniversity[]>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: string, data: Partial<InsertCourse>): Promise<Course>;
  deleteCourse(id: string): Promise<void>;
  
  // Sub-discipline operations
  getSubDisciplines(discipline?: string): Promise<SubDiscipline[]>;
  getSubDisciplineById(id: string): Promise<SubDiscipline | undefined>;
  createSubDiscipline(subDiscipline: InsertSubDiscipline): Promise<SubDiscipline>;
  incrementSubDisciplineUsage(id: string): Promise<void>;
  
  // Student profile operations
  getStudentProfileById(id: string): Promise<StudentProfile | undefined>;
  getStudentProfileByUserId(userId: string): Promise<StudentProfile | undefined>;
  createStudentProfile(profile: InsertStudentProfile): Promise<StudentProfile>;
  updateStudentProfile(id: string, data: Partial<InsertStudentProfile>): Promise<StudentProfile>;
  
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
  
  // Student employment operations (optional)
  getEmploymentsByStudentProfileId(studentProfileId: string): Promise<StudentEmployment[]>;
  getEmploymentById(id: string): Promise<StudentEmployment | undefined>;
  createEmployment(employment: InsertStudentEmployment): Promise<StudentEmployment>;
  updateEmployment(id: string, data: Partial<InsertStudentEmployment>): Promise<StudentEmployment>;
  deleteEmployment(id: string): Promise<void>;
  
  // Student lead operations
  getAllLeads(filters?: { status?: string; courseId?: string; universityId?: string }): Promise<StudentLead[]>;
  getLeadById(id: string): Promise<StudentLead | undefined>;
  createLead(lead: InsertStudentLead): Promise<StudentLead>;
  updateLead(id: string, data: Partial<InsertStudentLead>): Promise<StudentLead>;
  
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
  getAllBlogs(filters?: { status?: string; category?: string; tag?: string; authorId?: string }): Promise<Blog[]>;
  getPublishedBlogs(filters?: { category?: string; tag?: string; limit?: number; offset?: number }): Promise<{ blogs: Blog[]; total: number }>;
  getBlogById(id: string): Promise<Blog | undefined>;
  getBlogBySlug(slug: string): Promise<Blog | undefined>;
  createBlog(blog: InsertBlog): Promise<Blog>;
  updateBlog(id: string, data: Partial<InsertBlog>): Promise<Blog>;
  publishBlog(id: string): Promise<Blog>;
  unpublishBlog(id: string): Promise<Blog>;
  deleteBlog(id: string): Promise<void>;
  
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
    applicationId?: string;
    category?: string;
  }): Promise<Task[]>;
  getTasksWithRelations(filters?: { 
    status?: string; 
    priority?: string; 
    assignedToId?: string;
    applicationId?: string;
    category?: string;
  }): Promise<TaskWithRelations[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, data: UpdateTask): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  completeTask(id: string): Promise<Task>;
  
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
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Check if user exists by email (since email is unique and used for OIDC)
    const existingUserByEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, userData.email))
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
        .where(eq(users.email, userData.email))
        .returning();
      return updatedUser;
    }
    
    // If user doesn't exist, insert new user
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
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
    const [university] = await db
      .insert(universities)
      .values(universityData)
      .returning();
    return university;
  }

  async updateUniversity(id: string, data: Partial<InsertUniversity>): Promise<University> {
    const [university] = await db
      .update(universities)
      .set({ ...data, updatedAt: new Date() })
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
    const [course] = await db
      .insert(courses)
      .values(courseData)
      .returning();
    return course;
  }

  async updateCourse(id: string, data: Partial<InsertCourse>): Promise<Course> {
    const [course] = await db
      .update(courses)
      .set({ ...data, updatedAt: new Date() })
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

  async createStudentProfile(profileData: InsertStudentProfile): Promise<StudentProfile> {
    const [profile] = await db
      .insert(studentProfiles)
      .values(profileData)
      .returning();
    return profile;
  }

  async updateStudentProfile(id: string, data: Partial<InsertStudentProfile>): Promise<StudentProfile> {
    const [profile] = await db
      .update(studentProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(studentProfiles.id, id))
      .returning();
    return profile;
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
    return allApplications.filter(app => courseIds.includes(app.courseId));
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
  
  // Student lead operations
  async getAllLeads(filters?: { status?: string; courseId?: string; universityId?: string }): Promise<StudentLead[]> {
    let query = db.select().from(studentLeads);
    
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(studentLeads.status, filters.status));
    }
    if (filters?.courseId) {
      conditions.push(eq(studentLeads.courseId, filters.courseId));
    }
    if (filters?.universityId) {
      conditions.push(eq(studentLeads.universityId, filters.universityId));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(studentLeads.createdAt));
  }

  async getLeadById(id: string): Promise<StudentLead | undefined> {
    const [lead] = await db
      .select()
      .from(studentLeads)
      .where(eq(studentLeads.id, id));
    return lead;
  }

  async createLead(leadData: InsertStudentLead): Promise<StudentLead> {
    const [lead] = await db
      .insert(studentLeads)
      .values(leadData)
      .returning();
    return lead;
  }

  async updateLead(id: string, data: Partial<InsertStudentLead>): Promise<StudentLead> {
    const [lead] = await db
      .update(studentLeads)
      .set(data)
      .where(eq(studentLeads.id, id))
      .returning();
    return lead;
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
        .where(isNull(documents.folderId))
        .orderBy(desc(documents.createdAt));
    }
    
    return await db
      .select()
      .from(documents)
      .where(eq(documents.folderId, folderId))
      .orderBy(desc(documents.createdAt));
  }

  async getDocumentsByApplicationId(applicationId: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.applicationId, applicationId));
  }

  async getAllDocuments(filters?: { status?: string; type?: string; senderId?: string; recipientId?: string }): Promise<Document[]> {
    let query = db.select().from(documents);
    
    const conditions = [];
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
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
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
  async getAllBlogs(filters?: { status?: string; category?: string; tag?: string; authorId?: string }): Promise<Blog[]> {
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
    
    const query = db.select().from(blogs);
    
    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(desc(blogs.createdAt));
    }
    
    return await query.orderBy(desc(blogs.createdAt));
  }

  async getPublishedBlogs(filters?: { category?: string; tag?: string; limit?: number; offset?: number }): Promise<{ blogs: Blog[]; total: number }> {
    const conditions = [eq(blogs.status, "published")];
    
    if (filters?.category) {
      conditions.push(eq(blogs.category, filters.category));
    }
    
    const limit = filters?.limit || 10;
    const offset = filters?.offset || 0;
    
    const query = db.select().from(blogs).where(and(...conditions)).orderBy(desc(blogs.publishedAt));
    
    const [blogList, totalResult] = await Promise.all([
      query.limit(limit).offset(offset),
      db.select().from(blogs).where(and(...conditions))
    ]);
    
    return { blogs: blogList, total: totalResult.length };
  }

  async getBlogById(id: string): Promise<Blog | undefined> {
    const [blog] = await db.select().from(blogs).where(eq(blogs.id, id));
    return blog;
  }

  async getBlogBySlug(slug: string): Promise<Blog | undefined> {
    const [blog] = await db.select().from(blogs).where(eq(blogs.slug, slug));
    return blog;
  }

  async createBlog(blog: InsertBlog): Promise<Blog> {
    const [newBlog] = await db.insert(blogs).values(blog).returning();
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
    if (filters?.assignedToId) {
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
            const [course] = await db.select().from(courses).where(eq(courses.id, app.courseId));
            
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

  async getRemindersByApplicationId(applicationId: string): Promise<FollowUpReminder[]> {
    return await db
      .select()
      .from(followUpReminders)
      .where(eq(followUpReminders.applicationId, applicationId))
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
    // Get all admin team members and their assigned work
    const adminMembers = await db
      .select({
        userId: adminTeamMembers.userId,
        role: adminTeamMembers.role,
      })
      .from(adminTeamMembers)
      .where(eq(adminTeamMembers.isActive, true));

    const workloadSummaries: WorkloadSummary[] = await Promise.all(
      adminMembers.map(async (member) => {
        // Get user details
        const [user] = await db.select().from(users).where(eq(users.id, member.userId));
        
        // Get task counts
        const allTasks = await db
          .select()
          .from(tasks)
          .where(eq(tasks.assignedToId, member.userId));
        
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
          .where(eq(applications.assignedConsultantId, member.userId));

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

        return {
          userId: member.userId,
          userName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown' : 'Unknown',
          userEmail: user?.email || null,
          userRole: member.role,
          profileImageUrl: user?.profileImageUrl || null,
          totalTasks: allTasks.length,
          pendingTasks,
          inProgressTasks,
          completedTasks,
          overdueTasks,
          assignedApplications: assignedApps.length,
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
    let query = db.select().from(testimonials).where(eq(testimonials.status, 'published'));
    
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
}

export const storage = new DatabaseStorage();
