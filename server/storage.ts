import {
  users,
  universities,
  courses,
  studentProfiles,
  applications,
  universityTeamMembers,
  adminTeamMembers,
  studentEducations,
  studentLanguageScores,
  referrals,
  type User,
  type UpsertUser,
  type University,
  type InsertUniversity,
  type Course,
  type InsertCourse,
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
  type Referral,
  type InsertReferral,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, like, or, desc } from "drizzle-orm";

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
  getCourseById(id: string): Promise<Course | undefined>;
  getCoursesByUniversityId(universityId: string): Promise<Course[]>;
  getAllCourses(): Promise<Course[]>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: string, data: Partial<InsertCourse>): Promise<Course>;
  deleteCourse(id: string): Promise<void>;
  
  // Student profile operations
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
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          lastLogin: new Date(),
          updatedAt: new Date(),
        },
      })
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
  async getCourseById(id: string): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    return course;
  }

  async getCoursesByUniversityId(universityId: string): Promise<Course[]> {
    return await db
      .select()
      .from(courses)
      .where(eq(courses.universityId, universityId));
  }

  async getAllCourses(): Promise<Course[]> {
    return await db.select().from(courses);
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

  // Student profile operations
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
}

export const storage = new DatabaseStorage();
