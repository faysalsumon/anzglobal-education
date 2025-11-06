import {
  users,
  universities,
  courses,
  studentProfiles,
  applications,
  universityTeamMembers,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, like, or } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // University operations
  getUniversityById(id: string): Promise<University | undefined>;
  getUniversityByUserId(userId: string): Promise<University | undefined>;
  createUniversity(university: InsertUniversity): Promise<University>;
  updateUniversity(id: string, data: Partial<InsertUniversity>): Promise<University>;
  
  // Course operations
  getCourseById(id: string): Promise<Course | undefined>;
  getCoursesByUniversityId(universityId: string): Promise<Course[]>;
  getAllCourses(): Promise<Course[]>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: string, data: Partial<InsertCourse>): Promise<Course>;
  
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
  getTeamMemberByUserAndUniversity(userId: string, universityId: string): Promise<UniversityTeamMember | undefined>;
  createTeamMember(teamMember: InsertUniversityTeamMember): Promise<UniversityTeamMember>;
  updateTeamMemberRole(id: string, role: string): Promise<UniversityTeamMember>;
  deactivateTeamMember(id: string): Promise<UniversityTeamMember>;
  deleteTeamMember(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
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
    return await db.select().from(courses).where(eq(courses.isActive, true));
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
}

export const storage = new DatabaseStorage();
