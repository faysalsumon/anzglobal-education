import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { parse as parseCookie } from "cookie";
import { unsign as unsignCookie } from "cookie-signature";
import { storage } from "./storage";
import { db } from "./db";
import { setupAuth, isAuthenticated } from "./replitAuth";
import passport from "passport";
import {
  insertUniversitySchema,
  insertCourseSchema,
  insertSubDisciplineSchema,
  insertStudentProfileSchema,
  insertApplicationSchema,
  insertAdminTeamMemberSchema,
  insertStudentEducationSchema,
  insertStudentLanguageScoreSchema,
  insertFavoriteSchema,
  insertCourseComparisonSchema,
  insertNotificationSchema,
  insertConversationSchema,
  insertMessageSchema,
  insertStudentLeadSchema,
  insertContactSubmissionSchema,
  insertBlogSchema,
  insertContactInquirySchema,
  rejectionSchema,
  users,
  universities,
  courses,
  applications,
  studentProfiles,
  favorites,
  courseComparisons,
  notifications,
  conversations,
  messages,
  sessions,
  importBatches,
  insertImportBatchSchema,
  activityLogs,
  // CRM imports
  insertTaskSchema,
  updateTaskSchema,
  insertApplicationInternalNoteSchema,
  insertFollowUpReminderSchema,
  tasks,
  applicationInternalNotes,
  followUpReminders,
  adminTeamMembers,
  crmLeads,
  leadStatusHistory,
  // CMS imports
  insertTestimonialSchema,
  updateTestimonialSchema,
  insertFaqSchema,
  updateFaqSchema,
  insertPublicTeamMemberSchema,
  updatePublicTeamMemberSchema,
  insertSiteSettingSchema,
  updateSiteSettingSchema,
  insertContentSnippetSchema,
  updateContentSnippetSchema,
} from "@shared/schema";
import { eq, and, or, desc, not, inArray, sql as dsql } from "drizzle-orm";
import { z } from "zod";
import {
  generateUniversityDescription,
  generateCourseDescription,
  generateStudentBio,
  generateCareerGoals,
  generateInstitutionSmallDescription,
  generateInstitutionFullDescription,
  generateInstitutionGalleryImages,
  extractInstitutionDataFromWebsite,
  extractCourseDataFromWebsite,
  parseNaturalLanguageQuery,
  parseNaturalLanguageInstitutionQuery,
} from "./ai";
import { buildKnowledgeBase } from "./knowledge-base";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { calculateProfileCompletion } from "./profileCompletion";
import { hashPassword, verifyPassword, generateVerificationToken, getUserDisplayName } from "./auth-utils";
import {
  parseCSV,
  validateUniversityRow,
  validateCourseRow,
  normalizeUniversityRow,
  normalizeCourseRow,
  transformUniversityRow,
  transformCourseRow,
  ValidationError,
  ParsedCSVRow,
  generateUniversitiesSampleCSV,
  generateCoursesSampleCSV,
} from "./csvImportUtils";
import {
  notifyNewApplication,
  notifyApplicationStatusChange,
  notifyTeamMemberAdded,
  createNotification,
} from "./notifications";
import { sendContactInquiryEmails } from "./email-service";
import { logActivity, logApprove, logReject, logCreate, logDelete, logUpdate, logStatusChange } from "./activity-logger";
import express from "express";

// Environment-aware rate limiting for AI extraction endpoint
// DEV: 30/hr, PREVIEW: 15/hr, PROD: 5/hr
function getAIExtractionRateLimit(): number {
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'development') {
    return 30; // More generous for testing
  } else if (env === 'preview') {
    return 15; // Moderate for staging
  } else {
    return 5; // Conservative for production
  }
}

// Rate limiter state storage
const aiExtractionRateLimits = new Map<string, { count: number; resetTime: number }>();

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
}

function checkAIExtractionRateLimit(userId: string, isSuperAdmin: boolean = false): RateLimitResult {
  const now = Date.now();
  const limit = isSuperAdmin ? 100 : getAIExtractionRateLimit(); // Super admins get 100/hr
  const userLimit = aiExtractionRateLimits.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or create new limit window (1 hour)
    const resetTime = now + 60 * 60 * 1000;
    aiExtractionRateLimits.set(userId, {
      count: 1,
      resetTime,
    });
    return {
      allowed: true,
      remaining: limit - 1,
      resetTime,
      limit,
    };
  }

  if (userLimit.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: userLimit.resetTime,
      limit,
    };
  }

  userLimit.count++;
  return {
    allowed: true,
    remaining: limit - userLimit.count,
    resetTime: userLimit.resetTime,
    limit,
  };
}

// Helper function to rebuild AI knowledge base asynchronously
// This is called after course/institution approval, edit, or delete operations
async function triggerKnowledgeBaseRebuild(operation: string): Promise<void> {
  // Fire-and-forget async rebuild - don't await, don't block the response
  buildKnowledgeBase()
    .then(() => {
      console.log(`✅ Knowledge base rebuilt successfully after ${operation}`);
    })
    .catch((error) => {
      // Log error but don't fail the main operation
      console.error(`❌ Failed to rebuild knowledge base after ${operation}:`, error);
    });
}

type UniversityRole = 'super_admin' | 'admin' | 'course_manager' | 'application_manager';
type AdminRole = 'super_admin' | 'platform_admin' | 'support_manager' | 'support_staff' | 'operations_staff';

const addAdminTeamMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['super_admin', 'support_manager', 'support_staff', 'operations_staff']),
});

const updateAdminTeamMemberRoleSchema = z.object({
  role: z.enum(['super_admin', 'support_manager', 'support_staff', 'operations_staff']),
});

async function checkUniversityAccess(
  userId: string,
  requiredRoles?: UniversityRole[]
): Promise<{ university: any; role: UniversityRole } | null> {
  const university = await storage.getUniversityByUserId(userId);
  
  if (university) {
    return { university, role: 'super_admin' };
  }
  
  const teamMember = await storage.getTeamMemberByUserId(userId);
  if (!teamMember || !teamMember.isActive) {
    return null;
  }
  
  const universityData = await storage.getUniversityById(teamMember.universityId);
  if (!universityData) {
    return null;
  }
  
  if (requiredRoles && !requiredRoles.includes(teamMember.role as UniversityRole)) {
    return null;
  }
  
  return { university: universityData, role: teamMember.role as UniversityRole };
}

export async function checkAdminAccess(
  userId: string,
  requiredRoles?: AdminRole[]
): Promise<{ role: AdminRole } | null> {
  const user = await storage.getUser(userId);
  
  if (!user || user.userType !== 'admin') {
    return null;
  }
  
  // Check if user has role directly in users table (for direct admin creation)
  // Note: This supports admins created directly in DB (e.g., for testing) without admin_team_members entries.
  // Production admins should ideally have admin_team_members entries for full team management features.
  if (user.role && ['super_admin', 'platform_admin', 'support_manager', 'support_staff', 'operations_staff'].includes(user.role)) {
    const userRole = user.role as AdminRole;
    if (requiredRoles && !requiredRoles.includes(userRole)) {
      return null;
    }
    return { role: userRole };
  }
  
  // Otherwise check admin_team_members table
  const adminMember = await storage.getAdminTeamMemberByUserId(userId);
  if (!adminMember || !adminMember.isActive) {
    return null;
  }
  
  if (requiredRoles && !requiredRoles.includes(adminMember.role as AdminRole)) {
    return null;
  }
  
  return { role: adminMember.role as AdminRole };
}

// Configure multer for file uploads
const allowedMimeTypes = [
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  // Documents
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'text/plain',
  'text/csv',
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for documents
  },
  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed. Supported types: PDF, DOC, DOCX, XLS, XLSX, images (JPG, PNG, GIF, WebP), TXT, CSV`));
    }
  },
});

// CSV upload configuration - restricted to CSV only with 2MB limit for bulk imports
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit for CSV files
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Serve uploaded files from the public directory
  app.use('/students', express.static(path.join(process.cwd(), 'public', 'students')));
  app.use('/institutions', express.static(path.join(process.cwd(), 'public', 'institutions')));
  app.use('/admins', express.static(path.join(process.cwd(), 'public', 'admins')));
  
  // Serve attached assets (stock images, generated images, etc.)
  app.use('/attached_assets', express.static(path.join(process.cwd(), 'attached_assets')));

  // Get current authenticated user
  app.get("/api/auth/me", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user.claims?.sub || user.id;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get user from database
      const dbUser = await storage.getUser(userId);
      if (!dbUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get additional profile based on user type
      let profile = null;
      if (dbUser.userType === 'student') {
        profile = await storage.getStudentProfileByUserId(userId);
      } else if (dbUser.userType === 'university') {
        profile = await storage.getUniversityByUserId(userId);
      }

      res.json({
        user: {
          id: dbUser.id,
          email: dbUser.email,
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
          userType: dbUser.userType,
          role: dbUser.role,
          isActive: dbUser.isActive,
          profileImageUrl: dbUser.profileImageUrl,
        },
        profile,
      });
    } catch (error) {
      console.error("Get current user error:", error);
      res.status(500).json({ message: "Failed to get user information" });
    }
  });

  // Student OIDC login - sets session flag and redirects to main login
  app.get("/api/student/login", (req, res, next) => {
    // Set a flag in session to indicate this is a student login
    if (req.session) {
      (req.session as any).loginIntent = 'student';
      (req.session as any).studentLoginRedirect = '/student/documents';
    }
    // Redirect to the main OIDC login
    res.redirect('/api/login');
  });

  // Email/Password Auth Routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      // Find user by email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);
      
      if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Verify password
      const isValid = await verifyPassword(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({ message: "Account is deactivated" });
      }
      
      // Update last login
      await db
        .update(users)
        .set({ lastLogin: new Date() })
        .where(eq(users.id, user.id));
      
      // Create user object for passport
      const passportUser = {
        claims: {
          sub: user.id,
          email: user.email,
        },
      };
      
      // Use passport's login method to properly serialize the session
      req.logIn(passportUser, (err) => {
        if (err) {
          console.error("Login error:", err);
          return res.status(500).json({ message: "Login failed - session error" });
        }
        
        // Return only safe, non-sensitive user data
        const safeUserData = {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userType: user.userType,
          role: user.role,
          isActive: user.isActive,
          lastLogin: new Date(),
        };
        
        res.json(safeUserData);
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });
  
  app.post("/api/auth/logout", (req, res) => {
    req.session?.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // If admin user, include their admin team member role with fallback to user.role
      if (user && user.userType === 'admin') {
        const adminMember = await storage.getAdminTeamMemberByUserId(userId);
        res.json({
          ...user,
          // Prefer adminTeamMember role, fallback to user.role for compatibility
          adminRole: adminMember?.role || user.role || null,
        });
      } else {
        res.json(user);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/auth/set-user-type", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { userType } = req.body;

      if (!["university", "student", "admin"].includes(userType)) {
        return res.status(400).json({ message: "Invalid user type" });
      }

      const user = await storage.upsertUser({
        id: userId,
        userType,
      });

      res.json(user);
    } catch (error: any) {
      console.error("Error setting user type:", error);
      res.status(500).json({ message: "Failed to set user type" });
    }
  });

  // Notification routes
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const userNotifications = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(notifications.createdAt);
      
      res.json(userNotifications.reverse()); // Most recent first
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread-count", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const unreadNotifications = await db
        .select()
        .from(notifications)
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ));
      
      res.json({ count: unreadNotifications.length });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notificationId = req.params.id;
      
      // Verify notification belongs to user
      const notification = await db
        .select()
        .from(notifications)
        .where(and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        ))
        .limit(1);
      
      if (!notification || notification.length === 0) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      const [updated] = await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, notificationId))
        .returning();
      
      res.json(updated);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.patch("/api/notifications/mark-all-read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ));
      
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  app.delete("/api/notifications/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notificationId = req.params.id;
      
      // Verify notification belongs to user
      const notification = await db
        .select()
        .from(notifications)
        .where(and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        ))
        .limit(1);
      
      if (!notification || notification.length === 0) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      await db
        .delete(notifications)
        .where(eq(notifications.id, notificationId));
      
      res.json({ message: "Notification deleted" });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // University routes
  app.get("/api/university/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkUniversityAccess(userId);
      
      if (!access) {
        return res.status(404).json({ message: "University profile not found" });
      }
      
      res.json(access.university);
    } catch (error) {
      console.error("Error fetching university:", error);
      res.status(500).json({ message: "Failed to fetch university" });
    }
  });

  app.post("/api/university/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check if user is creating or updating
      const ownerUniversity = await storage.getUniversityByUserId(userId);
      const teamAccess = await checkUniversityAccess(userId, ['super_admin', 'admin']);
      
      let university;
      let isNewInstitution = false;
      
      // Remove approval-related fields that only admins can modify
      const { approvalStatus, rejectionReason, submittedForApprovalAt, approvedAt, approvedBy, ...safeData } = req.body;
      
      if (ownerUniversity) {
        // User owns a university - they can update it (but not approval fields)
        const data = insertUniversitySchema.parse({ ...safeData, userId: ownerUniversity.userId });
        university = await storage.updateUniversity(ownerUniversity.id, data);
      } else if (teamAccess) {
        // User is a team member with admin/super_admin role - they can update (but not approval fields)
        const data = insertUniversitySchema.parse({ ...safeData, userId: teamAccess.university.userId });
        university = await storage.updateUniversity(teamAccess.university.id, data);
      } else {
        // User doesn't own a university and isn't a team member - allow creation with pending status
        const data = insertUniversitySchema.parse({ 
          ...safeData, 
          userId,
          approvalStatus: 'pending',
          submittedForApprovalAt: new Date()
        });
        await storage.upsertUser({ id: userId, userType: "university" });
        university = await storage.createUniversity(data);
        isNewInstitution = true;
        
        // Create notifications for all active platform admins
        const admins = await db
          .select()
          .from(users)
          .where(and(
            eq(users.userType, 'admin'),
            eq(users.isActive, true)
          ));
        
        for (const admin of admins) {
          await createNotification({
            userId: admin.id,
            type: 'institution_approval_request',
            title: 'New Institution Pending Approval',
            message: `${university.name} has been submitted for approval`,
            link: `/admin/dashboard#institutions`,
            metadata: {
              institutionId: university.id,
              institutionName: university.name,
              submittedBy: userId
            }
          });
        }
      }

      res.json(university);
    } catch (error: any) {
      console.error("Error saving university:", error);
      res.status(400).json({ message: error.message || "Failed to save university" });
    }
  });

  // Institution management endpoints for institution admins
  app.get("/api/university/my-institutions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get all institutions created by this user
      const userInstitutions = await db
        .select()
        .from(universities)
        .where(eq(universities.userId, userId))
        .orderBy(desc(universities.createdAt));
      
      res.json(userInstitutions);
    } catch (error) {
      console.error("Error fetching user institutions:", error);
      res.status(500).json({ message: "Failed to fetch institutions" });
    }
  });

  app.post("/api/university/institutions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Remove approval-related fields that only admins can modify
      const { approvalStatus, rejectionReason, submittedForApprovalAt, approvedAt, approvedBy, ...safeData } = req.body;
      
      // Create institution with pending status
      const data = insertUniversitySchema.parse({ 
        ...safeData, 
        userId,
        approvalStatus: 'pending',
        submittedForApprovalAt: new Date()
      });
      
      const institution = await storage.createUniversity(data);
      
      // Create notifications for all active platform admins
      const admins = await db
        .select()
        .from(users)
        .where(and(
          eq(users.userType, 'admin'),
          eq(users.isActive, true)
        ));
      
      for (const admin of admins) {
        await createNotification({
          userId: admin.id,
          type: 'institution_approval_request',
          title: 'New Institution Pending Approval',
          message: `${institution.name} has been submitted for approval`,
          link: `/admin/dashboard#institutions`,
          metadata: {
            institutionId: institution.id,
            institutionName: institution.name,
            submittedBy: userId
          }
        });
      }

      res.json(institution);
    } catch (error: any) {
      console.error("Error creating institution:", error);
      res.status(400).json({ message: error.message || "Failed to create institution" });
    }
  });

  app.patch("/api/university/institutions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const institutionId = req.params.id;
      
      // Check ownership
      const institution = await storage.getUniversityById(institutionId);
      if (!institution || institution.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to edit this institution" });
      }
      
      // Remove approval-related fields that only admins can modify
      const { approvalStatus, rejectionReason, submittedForApprovalAt, approvedAt, approvedBy, ...safeData } = req.body;
      
      const data = insertUniversitySchema.parse(safeData);
      const updated = await storage.updateUniversity(institutionId, data);
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating institution:", error);
      res.status(400).json({ message: error.message || "Failed to update institution" });
    }
  });

  app.delete("/api/university/institutions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const institutionId = req.params.id;
      
      // Check ownership
      const institution = await storage.getUniversityById(institutionId);
      if (!institution || institution.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this institution" });
      }
      
      // Delete institution (cascades to courses)
      await db.delete(universities).where(eq(universities.id, institutionId));
      
      res.json({ message: "Institution deleted successfully" });
    } catch (error) {
      console.error("Error deleting institution:", error);
      res.status(500).json({ message: "Failed to delete institution" });
    }
  });

  // AI Generation Routes
  app.post("/api/university/generate-small-description", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Allow authenticated users to generate content (they may not have a university record yet)
      const ownerUniversity = await storage.getUniversityByUserId(userId);
      const teamAccess = await checkUniversityAccess(userId, ['super_admin', 'admin']);
      
      if (!ownerUniversity && !teamAccess) {
        // User is authenticated but doesn't own a university yet - this is okay for initial profile creation
        // We'll allow it as long as they're authenticated
      }

      const { name, location, providerType } = req.body;
      if (!name || !location) {
        return res.status(400).json({ message: "Name and location are required" });
      }

      const description = await generateInstitutionSmallDescription(name, location, providerType);
      res.json({ description });
    } catch (error: any) {
      console.error("Error generating small description:", error);
      
      // Handle AI configuration and OpenAI-specific errors
      if (error?.code === 'ai_not_configured' || error?.status === 503) {
        return res.status(503).json({ 
          message: "AI features are not yet configured. OpenAI integration will be set up in a later stage of platform development." 
        });
      }
      
      if (error?.error?.code === 'insufficient_quota' || error?.status === 429) {
        return res.status(429).json({ 
          message: "OpenAI API quota exceeded. Please add credits to your OpenAI account at platform.openai.com/settings/organization/billing" 
        });
      }
      
      if (error?.error?.code === 'invalid_api_key') {
        return res.status(401).json({ 
          message: "Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable." 
        });
      }
      
      res.status(500).json({ message: "Failed to generate description. Please try again." });
    }
  });

  app.post("/api/university/generate-full-description", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Allow authenticated users to generate content (they may not have a university record yet)
      const ownerUniversity = await storage.getUniversityByUserId(userId);
      const teamAccess = await checkUniversityAccess(userId, ['super_admin', 'admin']);
      
      if (!ownerUniversity && !teamAccess) {
        // User is authenticated but doesn't own a university yet - this is okay for initial profile creation
        // We'll allow it as long as they're authenticated
      }

      const { name, location, providerType, topDisciplines } = req.body;
      if (!name || !location) {
        return res.status(400).json({ message: "Name and location are required" });
      }

      const description = await generateInstitutionFullDescription(
        name, 
        location, 
        providerType, 
        topDisciplines
      );
      res.json({ description });
    } catch (error: any) {
      console.error("Error generating full description:", error);
      
      // Handle AI configuration and OpenAI-specific errors
      if (error?.code === 'ai_not_configured' || error?.status === 503) {
        return res.status(503).json({ 
          message: "AI features are not yet configured. OpenAI integration will be set up in a later stage of platform development." 
        });
      }
      
      if (error?.error?.code === 'insufficient_quota' || error?.status === 429) {
        return res.status(429).json({ 
          message: "OpenAI API quota exceeded. Please add credits to your OpenAI account at platform.openai.com/settings/organization/billing" 
        });
      }
      
      if (error?.error?.code === 'invalid_api_key') {
        return res.status(401).json({ 
          message: "Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable." 
        });
      }
      
      res.status(500).json({ message: "Failed to generate description. Please try again." });
    }
  });

  app.post("/api/university/generate-gallery", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Allow authenticated users to generate content (they may not have a university record yet)
      const ownerUniversity = await storage.getUniversityByUserId(userId);
      const teamAccess = await checkUniversityAccess(userId, ['super_admin', 'admin']);
      
      if (!ownerUniversity && !teamAccess) {
        // User is authenticated but doesn't own a university yet - this is okay for initial profile creation
        // We'll allow it as long as they're authenticated
      }

      const { name, location, providerType } = req.body;
      if (!name || !location) {
        return res.status(400).json({ message: "Name and location are required" });
      }

      const imageUrls = await generateInstitutionGalleryImages(name, location, providerType);
      
      // Download and resize images, then upload to object storage
      const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
      if (!bucketId) {
        throw new Error("Object storage not configured");
      }

      const publicDir = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "public";
      const galleryPaths: string[] = [];

      for (let i = 0; i < imageUrls.length; i++) {
        try {
          // Fetch the image
          const response = await fetch(imageUrls[i]);
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // Resize to 600x400
          const resizedBuffer = await sharp(buffer)
            .resize(600, 400, { fit: 'cover' })
            .jpeg({ quality: 85 })
            .toBuffer();

          // Upload to object storage
          const institutionId = ownerUniversity?.id || teamAccess?.university.id || userId;
          const filename = `gallery-${institutionId}-${Date.now()}-${i}.jpg`;
          const filepath = `${publicDir}/institutions/${filename}`;
          
          // Write to object storage (you'll need to implement this based on Replit's object storage API)
          // For now, we'll save locally in public directory
          const localPath = path.join(process.cwd(), 'public', 'institutions');
          await fs.mkdir(localPath, { recursive: true });
          await fs.writeFile(path.join(localPath, filename), resizedBuffer);
          
          galleryPaths.push(`/institutions/${filename}`);
        } catch (error) {
          console.error(`Error processing gallery image ${i}:`, error);
        }
      }

      res.json({ institutionGallery: galleryPaths });
    } catch (error: any) {
      console.error("Error generating gallery:", error);
      
      // Handle OpenAI-specific errors with user-friendly messages
      if (error?.error?.code === 'insufficient_quota' || error?.status === 429) {
        return res.status(429).json({ 
          message: "OpenAI API quota exceeded. Please add credits to your OpenAI account at platform.openai.com/settings/organization/billing" 
        });
      }
      
      if (error?.error?.code === 'invalid_api_key') {
        return res.status(401).json({ 
          message: "Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable." 
        });
      }
      
      res.status(500).json({ message: "Failed to generate gallery. Please try again." });
    }
  });

  // Logo Upload Route - allows both university users and platform admins
  app.post("/api/university/upload-logo", isAuthenticated, upload.single('logo'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check if user has university access OR admin access
      const universityAccess = await checkUniversityAccess(userId, ['super_admin', 'admin']);
      const adminAccess = await checkAdminAccess(userId, ['super_admin', 'support_manager']);
      
      if (!universityAccess && !adminAccess) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Resize to 160x160 automatically (regardless of uploaded size)
      const resizedBuffer = await sharp(req.file.buffer)
        .resize(160, 160, { fit: 'cover' })
        .png()
        .toBuffer();

      // Save to public directory
      const universityId = universityAccess?.university.id || 'admin-upload';
      const filename = `college-logo-${universityId}-${Date.now()}.png`;
      const localPath = path.join(process.cwd(), 'public', 'institutions');
      await fs.mkdir(localPath, { recursive: true });
      await fs.writeFile(path.join(localPath, filename), resizedBuffer);
      
      const logoPath = `/institutions/${filename}`;

      // If university user, update their university profile immediately
      // If admin user, just return the path (they'll use it in their form)
      if (universityAccess) {
        await storage.updateUniversity(universityAccess.university.id, {
          ...universityAccess.university,
          logo: logoPath,
        });
      }

      res.json({ logoPath });
    } catch (error) {
      console.error("Error uploading logo:", error);
      res.status(500).json({ message: "Failed to upload logo" });
    }
  });

  // Gallery Image Upload Route - allows uploading multiple gallery images
  app.post("/api/university/upload-gallery-image", isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check if user has university access OR admin access
      const universityAccess = await checkUniversityAccess(userId, ['super_admin', 'admin']);
      const adminAccess = await checkAdminAccess(userId, ['super_admin', 'support_manager']);
      
      if (!universityAccess && !adminAccess) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Resize to 600x400 for gallery consistency
      const resizedBuffer = await sharp(req.file.buffer)
        .resize(600, 400, { fit: 'cover' })
        .jpeg({ quality: 85 })
        .toBuffer();

      // Save to public directory
      const universityId = universityAccess?.university.id || adminAccess ? 'admin-upload' : userId;
      const filename = `gallery-${universityId}-${Date.now()}.jpg`;
      const localPath = path.join(process.cwd(), 'public', 'institutions');
      await fs.mkdir(localPath, { recursive: true });
      await fs.writeFile(path.join(localPath, filename), resizedBuffer);
      
      const imagePath = `/institutions/${filename}`;

      res.json({ imagePath });
    } catch (error) {
      console.error("Error uploading gallery image:", error);
      res.status(500).json({ message: "Failed to upload gallery image" });
    }
  });

  // AI-powered Single Gallery Image Generation
  app.post("/api/university/generate-gallery-image", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check if user has university access OR admin access
      const universityAccess = await checkUniversityAccess(userId, ['super_admin', 'admin']);
      const adminAccess = await checkAdminAccess(userId, ['super_admin', 'support_manager']);
      
      if (!universityAccess && !adminAccess) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { prompt } = req.body;
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ message: "Image prompt is required" });
      }

      // Generate single image with DALL-E
      const response = await generateInstitutionGalleryImages(
        prompt,
        "custom prompt",
        ""
      );

      if (!response || response.length === 0) {
        throw new Error("No image generated");
      }

      // Download and resize the generated image
      const imageUrl = response[0];
      const fetchResponse = await fetch(imageUrl);
      const arrayBuffer = await fetchResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Resize to 600x400
      const resizedBuffer = await sharp(buffer)
        .resize(600, 400, { fit: 'cover' })
        .jpeg({ quality: 85 })
        .toBuffer();

      // Save to public directory
      const universityId = universityAccess?.university.id || 'admin-upload';
      const filename = `gallery-ai-${universityId}-${Date.now()}.jpg`;
      const localPath = path.join(process.cwd(), 'public', 'institutions');
      await fs.mkdir(localPath, { recursive: true });
      await fs.writeFile(path.join(localPath, filename), resizedBuffer);
      
      const imagePath = `/institutions/${filename}`;

      res.json({ imagePath });
    } catch (error: any) {
      console.error("Error generating gallery image:", error);
      
      // Handle OpenAI-specific errors
      if (error?.error?.code === 'insufficient_quota' || error?.status === 429) {
        return res.status(429).json({ 
          message: "OpenAI API quota exceeded. Please add credits to your OpenAI account." 
        });
      }
      
      if (error?.error?.code === 'invalid_api_key') {
        return res.status(401).json({ 
          message: "Invalid OpenAI API key configured." 
        });
      }
      
      res.status(500).json({ message: "Failed to generate image. Please try again." });
    }
  });

  // Filter metadata endpoint - returns available filter options with counts
  app.get("/api/institutions/filter-metadata", async (req, res) => {
    try {
      const allInstitutions = await storage.getAllUniversities();
      const approvedInstitutions = allInstitutions.filter(i => 
        i.approvalStatus === 'approved' && i.isActive
      );

      // Extract unique values for each filter category
      const countries = Array.from(new Set(approvedInstitutions.map(i => i.country).filter(Boolean)));
      const providerTypes = Array.from(new Set(approvedInstitutions.map(i => i.providerType).filter(Boolean)));
      const deliveryModes = Array.from(new Set(approvedInstitutions.flatMap(i => i.deliveryModes || []).filter(Boolean)));
      const intakePeriods = Array.from(new Set(approvedInstitutions.flatMap(i => i.intakePeriods || []).filter(Boolean)));
      const facilities = Array.from(new Set(approvedInstitutions.flatMap(i => i.facilities || []).filter(Boolean)));
      const accreditationStatuses = Array.from(new Set(approvedInstitutions.map(i => i.accreditationStatus).filter(Boolean)));
      const rankingBands = Array.from(new Set(approvedInstitutions.map(i => i.rankingBand).filter(Boolean)));
      const allTags = Array.from(new Set(approvedInstitutions.flatMap(i => i.tags || []).filter(Boolean)));
      const allDisciplines = Array.from(new Set(approvedInstitutions.flatMap(i => i.topDisciplines || []).filter(Boolean)));

      // Calculate ranges
      const scholarshipRanges = approvedInstitutions
        .map(i => ({ min: i.scholarshipPercentageMin, max: i.scholarshipPercentageMax }))
        .filter(r => r.min !== null || r.max !== null);
      const tuitionRanges = approvedInstitutions
        .map(i => ({ min: i.tuitionFeesMin, max: i.tuitionFeesMax }))
        .filter(r => r.min !== null || r.max !== null);

      res.json({
        countries: countries.sort(),
        providerTypes: providerTypes.sort(),
        deliveryModes: deliveryModes.sort(),
        intakePeriods: intakePeriods.sort(),
        facilities: facilities.sort(),
        accreditationStatuses: accreditationStatuses.sort(),
        rankingBands: rankingBands.sort(),
        tags: allTags.sort(),
        disciplines: allDisciplines.sort(),
        scholarshipRange: {
          min: scholarshipRanges.length > 0 ? Math.min(...scholarshipRanges.map(r => r.min || 0).filter(v => v > 0)) : 0,
          max: scholarshipRanges.length > 0 ? Math.max(...scholarshipRanges.map(r => r.max || 0)) : 100,
        },
        tuitionRange: {
          min: tuitionRanges.length > 0 ? Math.min(...tuitionRanges.map(r => Number(r.min) || 0).filter(v => v > 0)) : 0,
          max: tuitionRanges.length > 0 ? Math.max(...tuitionRanges.map(r => Number(r.max) || 0)) : 100000,
        },
        totalCount: approvedInstitutions.length,
      });
    } catch (error) {
      console.error("Error fetching filter metadata:", error);
      res.status(500).json({ message: "Failed to fetch filter metadata" });
    }
  });

  // API endpoint for scraping panel - returns all universities (approved and pending)
  app.get("/api/universities", async (req, res) => {
    try {
      const allUniversities = await storage.getAllUniversities();
      // Return in format expected by scraping panel
      const universities = allUniversities.map(u => ({
        id: u.id,
        name: u.name,
        country: u.country || 'Unknown'
      }));
      res.json({ universities });
    } catch (error) {
      console.error("Error fetching universities:", error);
      res.status(500).json({ message: "Failed to fetch universities" });
    }
  });

  // Public institutions route with comprehensive filtering support
  app.get("/api/institutions", async (req, res) => {
    try {
      const allInstitutions = await storage.getAllUniversities();
      let institutions = allInstitutions.filter(i => 
        i.approvalStatus === 'approved' && i.isActive
      );

      // Apply filters from query parameters
      const {
        search,
        countries,
        providerTypes,
        deliveryModes,
        intakePeriods,
        facilities,
        disciplines,
        tags,
        scholarshipMin,
        scholarshipMax,
        tuitionMin,
        tuitionMax,
        accreditationStatus,
        rankingBand,
        internationalSupport,
      } = req.query;

      // Search filter (name, description, disciplines)
      if (search && typeof search === 'string') {
        const searchLower = search.toLowerCase();
        institutions = institutions.filter(i =>
          i.name.toLowerCase().includes(searchLower) ||
          i.description?.toLowerCase().includes(searchLower) ||
          i.topDisciplines?.some(d => d.toLowerCase().includes(searchLower))
        );
      }

      // Country filter (multi-select)
      if (countries) {
        const countryList = Array.isArray(countries) ? countries : [countries];
        institutions = institutions.filter(i => i.country && countryList.includes(i.country));
      }

      // Provider type filter (multi-select)
      if (providerTypes) {
        const typeList = Array.isArray(providerTypes) ? providerTypes : [providerTypes];
        institutions = institutions.filter(i => i.providerType && typeList.includes(i.providerType));
      }

      // Delivery modes filter (array overlap)
      if (deliveryModes) {
        const modeList = Array.isArray(deliveryModes) ? deliveryModes : [deliveryModes];
        institutions = institutions.filter(i => 
          i.deliveryModes && i.deliveryModes.some(mode => modeList.includes(mode))
        );
      }

      // Intake periods filter (array overlap)
      if (intakePeriods) {
        const intakeList = Array.isArray(intakePeriods) ? intakePeriods : [intakePeriods];
        institutions = institutions.filter(i => 
          i.intakePeriods && i.intakePeriods.some(intake => intakeList.includes(intake))
        );
      }

      // Facilities filter (array overlap)
      if (facilities) {
        const facilityList = Array.isArray(facilities) ? facilities : [facilities];
        institutions = institutions.filter(i => 
          i.facilities && i.facilities.some(facility => facilityList.includes(facility))
        );
      }

      // Disciplines filter (array overlap)
      if (disciplines) {
        const disciplineList = Array.isArray(disciplines) ? disciplines : [disciplines];
        institutions = institutions.filter(i => 
          i.topDisciplines && i.topDisciplines.some(disc => disciplineList.includes(disc))
        );
      }

      // Tags filter (array overlap)
      if (tags) {
        const tagList = Array.isArray(tags) ? tags : [tags];
        institutions = institutions.filter(i => 
          i.tags && i.tags.some(tag => tagList.includes(tag))
        );
      }

      // Scholarship range filter
      if (scholarshipMin !== undefined || scholarshipMax !== undefined) {
        const minVal = scholarshipMin ? parseFloat(scholarshipMin as string) : 0;
        const maxVal = scholarshipMax ? parseFloat(scholarshipMax as string) : 100;
        institutions = institutions.filter(i => {
          if (!i.scholarshipPercentageMin && !i.scholarshipPercentageMax) return false;
          const instMin = i.scholarshipPercentageMin || 0;
          const instMax = i.scholarshipPercentageMax || 100;
          // Check if ranges overlap
          return instMax >= minVal && instMin <= maxVal;
        });
      }

      // Tuition range filter
      if (tuitionMin !== undefined || tuitionMax !== undefined) {
        const minVal = tuitionMin ? parseFloat(tuitionMin as string) : 0;
        const maxVal = tuitionMax ? parseFloat(tuitionMax as string) : Number.MAX_SAFE_INTEGER;
        institutions = institutions.filter(i => {
          if (!i.tuitionFeesMin && !i.tuitionFeesMax) return false;
          const instMin = parseFloat(i.tuitionFeesMin as any) || 0;
          const instMax = parseFloat(i.tuitionFeesMax as any) || Number.MAX_SAFE_INTEGER;
          // Check if ranges overlap
          return instMax >= minVal && instMin <= maxVal;
        });
      }

      // Accreditation status filter
      if (accreditationStatus && typeof accreditationStatus === 'string') {
        institutions = institutions.filter(i => i.accreditationStatus === accreditationStatus);
      }

      // Ranking band filter
      if (rankingBand && typeof rankingBand === 'string') {
        institutions = institutions.filter(i => i.rankingBand === rankingBand);
      }

      // International student support filter
      if (internationalSupport === 'true') {
        institutions = institutions.filter(i => i.internationalStudentSupport === true);
      }

      res.json(institutions);
    } catch (error) {
      console.error("Error fetching institutions:", error);
      res.status(500).json({ message: "Failed to fetch institutions" });
    }
  });

  // Get single institution by ID - only show if approved and active
  app.get("/api/institutions/:id", async (req, res) => {
    try {
      const institution = await storage.getUniversityById(req.params.id);
      if (!institution) {
        return res.status(404).json({ message: "Institution not found" });
      }
      // Only return if approved and active
      if (institution.approvalStatus !== 'approved' || !institution.isActive) {
        return res.status(404).json({ message: "Institution not found" });
      }
      res.json(institution);
    } catch (error) {
      console.error("Error fetching institution:", error);
      res.status(500).json({ message: "Failed to fetch institution" });
    }
  });

  // Get disciplines with course counts
  app.get("/api/disciplines", async (req, res) => {
    try {
      const allCourses = await storage.getAllCourses();
      const allUniversities = await storage.getAllUniversities();
      
      // Count courses per discipline (only approved and active courses from approved institutions)
      const disciplineCounts: Record<string, number> = {};
      
      allCourses.forEach(course => {
        if (!course.discipline) return; // Skip courses without discipline
        
        const university = allUniversities.find(u => u.id === course.universityId);
        
        // Only count approved courses from approved institutions
        if (course.approvalStatus === 'approved' && 
            course.isActive &&
            university?.approvalStatus === 'approved' &&
            university?.isActive) {
          disciplineCounts[course.discipline] = (disciplineCounts[course.discipline] || 0) + 1;
        }
      });
      
      // Convert to array format with discipline name and count
      const disciplines = Object.entries(disciplineCounts)
        .map(([name, count]) => ({ name, count }))
        .filter(d => d.count > 0) // Only return disciplines with at least one course
        .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
      
      res.json(disciplines);
    } catch (error) {
      console.error("Error fetching disciplines:", error);
      res.status(500).json({ message: "Failed to fetch disciplines" });
    }
  });

  // Get course levels with counts
  app.get("/api/course-levels", async (req, res) => {
    try {
      const allCourses = await storage.getAllCourses();
      const allUniversities = await storage.getAllUniversities();
      
      // Count courses per level (only approved and active courses from approved institutions)
      const levelCounts: Record<string, number> = {};
      
      allCourses.forEach(course => {
        if (!course.level) return; // Skip courses without level
        
        const university = allUniversities.find(u => u.id === course.universityId);
        
        // Only count approved courses from approved institutions
        if (course.approvalStatus === 'approved' && 
            course.isActive &&
            university?.approvalStatus === 'approved' &&
            university?.isActive) {
          levelCounts[course.level] = (levelCounts[course.level] || 0) + 1;
        }
      });
      
      // Define the order of levels
      const levelOrder = [
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
      ];
      
      // Convert to array format with level name and count, ordered by educational progression
      const levels = levelOrder
        .map(name => ({ name, count: levelCounts[name] || 0 }))
        .filter(l => l.count > 0); // Only return levels with at least one course
      
      res.json(levels);
    } catch (error) {
      console.error("Error fetching course levels:", error);
      res.status(500).json({ message: "Failed to fetch course levels" });
    }
  });

  // Sub-discipline routes
  app.get("/api/sub-disciplines", async (req, res) => {
    try {
      const { discipline } = req.query;
      
      if (discipline && typeof discipline === 'string') {
        const subDisciplines = await storage.getSubDisciplines(discipline);
        res.json(subDisciplines);
      } else {
        const subDisciplines = await storage.getSubDisciplines();
        res.json(subDisciplines);
      }
    } catch (error) {
      console.error("Error fetching sub-disciplines:", error);
      res.status(500).json({ message: "Failed to fetch sub-disciplines" });
    }
  });

  app.post("/api/sub-disciplines", isAuthenticated, async (req, res) => {
    try {
      // Validate request body
      const validated = insertSubDisciplineSchema.parse(req.body);
      
      // Create sub-discipline with optimistic slug deduplication
      const subDiscipline = await storage.createSubDiscipline(validated);
      
      res.status(201).json(subDiscipline);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid sub-discipline data", errors: error.errors });
        return;
      }
      console.error("Error creating sub-discipline:", error);
      res.status(500).json({ message: "Failed to create sub-discipline" });
    }
  });


  // Course routes - only show approved and active courses from approved institutions
  app.get("/api/courses", async (req, res) => {
    try {
      const { discipline, universityId } = req.query;
      const allCourses = await storage.getAllCourses();
      const allUniversities = await storage.getAllUniversities();
      
      // Filter to only show approved courses from approved institutions
      let courses = allCourses.filter(course => {
        const university = allUniversities.find(u => u.id === course.universityId);
        const isApprovedAndActive = course.approvalStatus === 'approved' && 
               course.isActive &&
               university?.approvalStatus === 'approved' &&
               university?.isActive;
        
        if (!isApprovedAndActive) return false;
        
        // Apply universityId filter if provided
        if (universityId && typeof universityId === 'string') {
          if (course.universityId !== universityId) return false;
        }
        
        // Apply discipline filter if provided
        if (discipline && typeof discipline === 'string') {
          if (course.discipline !== discipline) return false;
        }
        
        return true;
      });
      
      res.json(courses);
    } catch (error) {
      console.error("Error fetching courses:", error);
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  app.get("/api/courses/:id", async (req, res) => {
    try {
      const course = await storage.getCourseById(req.params.id);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      // Fetch the associated university
      const university = await storage.getUniversityById(course.universityId);
      
      // Only return if course and university are approved and active
      if (course.approvalStatus !== 'approved' || !course.isActive) {
        return res.status(404).json({ message: "Course not found" });
      }
      if (!university || university.approvalStatus !== 'approved' || !university.isActive) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      res.json({
        ...course,
        university,
      });
    } catch (error) {
      console.error("Error fetching course:", error);
      res.status(500).json({ message: "Failed to fetch course" });
    }
  });

  // Natural language course search endpoint
  app.post("/api/courses/natural-search", async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== 'string' || !query.trim()) {
        return res.status(400).json({ message: "Search query is required" });
      }

      // Parse the natural language query using AI
      let parsedParams = await parseNaturalLanguageQuery(query.trim());
      
      // Ensure parsedParams has safe defaults
      parsedParams = {
        originalQuery: query.trim(),
        subject: parsedParams.subject || undefined,
        discipline: parsedParams.discipline || undefined,
        subDiscipline: parsedParams.subDiscipline || undefined,
        level: parsedParams.level || undefined,
        location: parsedParams.location || undefined,
        country: parsedParams.country || undefined,
        campusCity: parsedParams.campusCity || undefined,
        minFees: parsedParams.minFees !== undefined ? Number(parsedParams.minFees) : undefined,
        maxFees: parsedParams.maxFees !== undefined ? Number(parsedParams.maxFees) : undefined,
      };
      
      // Get all approved courses with campus data
      const allCourses = await storage.getAllCourses();
      const allUniversities = await storage.getAllUniversities();
      
      // Load sub-disciplines for filtering
      const allSubDisciplines = await storage.getSubDisciplines();
      
      // Map parsed sub-discipline name to ID if provided
      let subDisciplineId: string | undefined;
      if (parsedParams.subDiscipline) {
        const matchedSubDiscipline = allSubDisciplines.find(sd => 
          sd.name.toLowerCase().includes(parsedParams.subDiscipline!.toLowerCase()) ||
          parsedParams.subDiscipline!.toLowerCase().includes(sd.name.toLowerCase())
        );
        subDisciplineId = matchedSubDiscipline?.id;
      }
      
      // Filter courses based on parsed parameters
      let filteredCourses = allCourses.filter(course => {
        const university = allUniversities.find(u => u.id === course.universityId);
        
        // Only include approved courses from approved institutions
        if (course.approvalStatus !== 'approved' || !course.isActive) return false;
        if (!university || university.approvalStatus !== 'approved' || !university.isActive) return false;
        
        // Apply filters from natural language query
        
        // Subject filter
        if (parsedParams.subject) {
          const subjectMatch = course.subject?.toLowerCase().includes(parsedParams.subject.toLowerCase()) ||
                              course.title?.toLowerCase().includes(parsedParams.subject.toLowerCase());
          if (!subjectMatch) return false;
        }
        
        // Discipline filter
        if (parsedParams.discipline) {
          const disciplineMatch = course.discipline?.toLowerCase().includes(parsedParams.discipline.toLowerCase());
          if (!disciplineMatch) return false;
        }
        
        // Sub-discipline filter (match by ID after looking up from name)
        if (subDisciplineId && course.subDisciplineId !== subDisciplineId) {
          return false;
        }
        
        // Level filter
        if (parsedParams.level) {
          const levelMatch = course.level?.toLowerCase() === parsedParams.level.toLowerCase();
          if (!levelMatch) return false;
        }
        
        // Fees filter
        if (parsedParams.minFees !== undefined || parsedParams.maxFees !== undefined) {
          const courseFees = Number(course.fees) || 0;
          if (parsedParams.minFees !== undefined && courseFees < parsedParams.minFees) return false;
          if (parsedParams.maxFees !== undefined && courseFees > parsedParams.maxFees) return false;
        }
        
        // Location filter (city/state)
        if (parsedParams.location) {
          const locationMatch = course.location?.toLowerCase().includes(parsedParams.location.toLowerCase()) ||
                                university?.campusAddresses?.toString().toLowerCase().includes(parsedParams.location.toLowerCase());
          if (!locationMatch) return false;
        }
        
        // Country filter
        if (parsedParams.country) {
          const countryMatch = course.country?.toLowerCase().includes(parsedParams.country.toLowerCase()) ||
                              university?.country?.toLowerCase().includes(parsedParams.country.toLowerCase());
          if (!countryMatch) return false;
        }
        
        // Campus city filter (using normalized campus data with flexible matching)
        if (parsedParams.campusCity) {
          const normalizeCity = (city: string) => {
            return city
              .toLowerCase()
              .trim()
              // Remove state/country suffixes like ", VIC", ", NSW", ", Australia"
              .replace(/,\s*(vic|nsw|qld|sa|wa|tas|nt|act|australia|bangladesh)\b.*$/i, '')
              // Remove common suburb indicators like "CBD"
              .replace(/\s+(cbd|city|metro|central)\b/i, '')
              .trim();
          };

          const searchCity = normalizeCity(parsedParams.campusCity);
          // Check campusLocations array (string array of location names)
          const hasCampusInCity = course.campusLocations?.some((location: string) => {
            if (!location) return false;
            const normalizedLocation = normalizeCity(location);
            // Flexible matching after normalization
            return normalizedLocation === searchCity || 
                   normalizedLocation.includes(searchCity) ||
                   searchCity.includes(normalizedLocation);
          });
          if (!hasCampusInCity) return false;
        }
        
        return true;
      });
      
      // Add university data to each course
      const coursesWithUniversity = filteredCourses.map(course => ({
        ...course,
        university: allUniversities.find(u => u.id === course.universityId),
      }));
      
      // Sort by relevance (for now, just by fees)
      coursesWithUniversity.sort((a, b) => {
        const aFees = Number(a.fees) || 0;
        const bFees = Number(b.fees) || 0;
        return aFees - bFees;
      });
      
      res.json({
        courses: coursesWithUniversity,
        parsedParams,
        totalResults: coursesWithUniversity.length,
      });
    } catch (error: any) {
      console.error("Error in natural language search:", error);
      
      // Handle AI not configured error
      if (error.code === 'ai_not_configured') {
        return res.status(503).json({ message: error.message });
      }
      
      res.status(500).json({ message: "Failed to process search query" });
    }
  });

  // Natural language institution search endpoint
  app.post("/api/institutions/natural-search", async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== 'string' || !query.trim()) {
        return res.status(400).json({ message: "Search query is required" });
      }

      // Parse the natural language query using AI
      let parsedParams = await parseNaturalLanguageInstitutionQuery(query.trim());
      
      // Ensure parsedParams has safe defaults
      parsedParams = {
        originalQuery: query.trim(),
        searchTerm: parsedParams.searchTerm || undefined,
        providerType: parsedParams.providerType || undefined,
        location: parsedParams.location || undefined,
        country: parsedParams.country || undefined,
        topDisciplines: parsedParams.topDisciplines || undefined,
      };
      
      // Get all approved institutions
      const allInstitutions = await storage.getAllUniversities();
      
      // Filter institutions based on parsed parameters
      let filteredInstitutions = allInstitutions.filter(institution => {
        // Only include approved and active institutions
        if (institution.approvalStatus !== 'approved' || !institution.isActive) return false;
        
        // Apply filters from natural language query
        
        // Search term filter (name, description)
        if (parsedParams.searchTerm) {
          const searchLower = parsedParams.searchTerm.toLowerCase();
          const nameMatch = institution.name?.toLowerCase().includes(searchLower);
          const descMatch = institution.description?.toLowerCase().includes(searchLower);
          if (!nameMatch && !descMatch) return false;
        }
        
        // Provider type filter
        if (parsedParams.providerType) {
          const typeMatch = institution.providerType?.toLowerCase().includes(parsedParams.providerType.toLowerCase());
          if (!typeMatch) return false;
        }
        
        // Country filter
        if (parsedParams.country) {
          const countryMatch = institution.country?.toLowerCase() === parsedParams.country.toLowerCase();
          if (!countryMatch) return false;
        }
        
        // Location filter (check in campusAddresses if available)
        if (parsedParams.location) {
          const locationLower = parsedParams.location.toLowerCase();
          let locationMatch = false;
          
          // Check campusAddresses JSONB field
          if (institution.campusAddresses && Array.isArray(institution.campusAddresses)) {
            locationMatch = institution.campusAddresses.some((campus: any) => 
              campus.city?.toLowerCase().includes(locationLower) ||
              campus.state?.toLowerCase().includes(locationLower) ||
              campus.address?.toLowerCase().includes(locationLower)
            );
          }
          
          if (!locationMatch) return false;
        }
        
        // Top disciplines filter
        if (parsedParams.topDisciplines && parsedParams.topDisciplines.length > 0) {
          if (!institution.topDisciplines || institution.topDisciplines.length === 0) return false;
          
          const hasMatchingDiscipline = parsedParams.topDisciplines.some(searchDiscipline =>
            institution.topDisciplines!.some(instDiscipline =>
              instDiscipline.toLowerCase().includes(searchDiscipline.toLowerCase())
            )
          );
          
          if (!hasMatchingDiscipline) return false;
        }
        
        return true;
      });
      
      // Sort by name
      filteredInstitutions.sort((a, b) => a.name.localeCompare(b.name));
      
      res.json({
        institutions: filteredInstitutions,
        parsedParams,
        totalResults: filteredInstitutions.length,
      });
    } catch (error: any) {
      console.error("Error in natural language institution search:", error);
      
      // Handle AI not configured error
      if (error.code === 'ai_not_configured') {
        return res.status(503).json({ message: error.message });
      }
      
      res.status(500).json({ message: "Failed to process search query" });
    }
  });

  // Public lead creation endpoint (no auth required) - also creates CRM lead for unified management
  // TODO: Add rate limiting to prevent spam/abuse
  app.post("/api/public/leads", async (req, res) => {
    try {
      // Normalize and sanitize input BEFORE validation
      const normalizedInput = {
        ...req.body,
        email: req.body.email?.trim().toLowerCase() || '',
        phone: req.body.phone?.trim() || '',
        firstName: req.body.firstName?.trim() || '',
        lastName: req.body.lastName?.trim() || '',
      };
      
      // Validate normalized input
      const leadData = insertStudentLeadSchema.parse(normalizedInput);
      
      // Validate that course exists and belongs to the specified university
      const course = await storage.getCourseById(leadData.courseId);
      if (!course) {
        return res.status(400).json({ message: "Invalid course" });
      }
      
      if (course.universityId !== leadData.universityId) {
        return res.status(400).json({ message: "Course does not belong to specified university" });
      }
      
      // Create the legacy student lead (for backwards compatibility)
      const lead = await storage.createLead(leadData);
      
      // Also create a CRM lead for unified lead management
      try {
        const [crmLead] = await db.insert(crmLeads).values({
          firstName: leadData.firstName,
          lastName: leadData.lastName,
          email: leadData.email,
          phone: leadData.phone,
          leadStatus: "not_contacted" as const,
          leadRating: "warm" as const,
          leadCreationMethod: "website_form" as const,
          courseName: course.title,
          courseId: course.id,
          universityId: course.universityId,
          notes: `Course Inquiry via Course Page\n\nVisa Status: ${leadData.visaStatus?.replace('_', ' ') || 'Not specified'}`,
          referrer: req.headers["referer"] || undefined,
        }).returning();
        
        // Create initial status history
        await db.insert(leadStatusHistory).values({
          leadId: crmLead.id,
          fromStatus: null,
          toStatus: "not_contacted" as const,
          notes: `Lead auto-created from course inquiry for ${course.title}`,
        });
        
        console.log("CRM lead created from course inquiry:", crmLead.id);
      } catch (crmError) {
        // Log error but don't fail the lead submission
        console.error("Error creating CRM lead from course inquiry:", crmError);
      }
      
      // Create notifications for all admins and consultants
      const adminUsers = await db.select().from(users).where(eq(users.userType, 'admin'));
      const adminTeamMembersList = await storage.getAllAdminTeamMembers();
      
      const notificationRecords = [];
      
      // Notify admin users
      for (const admin of adminUsers) {
        notificationRecords.push({
          userId: admin.id,
          type: 'new_lead',
          title: 'New Student Inquiry',
          message: `${leadData.firstName} ${leadData.lastName} requested information about ${course.title}`,
          link: '/admin#crm-leads',
          metadata: { leadId: lead.id, courseId: course.id },
        });
      }
      
      // Notify consultant team members
      for (const member of adminTeamMembersList) {
        notificationRecords.push({
          userId: member.userId,
          type: 'new_lead',
          title: 'New Student Inquiry',
          message: `${leadData.firstName} ${leadData.lastName} requested information about ${course.title}`,
          link: '/admin#crm-leads',
          metadata: { leadId: lead.id, courseId: course.id },
        });
      }
      
      // Batch insert notifications
      if (notificationRecords.length > 0) {
        await db.insert(notifications).values(notificationRecords);
      }
      
      res.status(201).json({ message: "Thank you! We'll be in touch soon." });
    } catch (error: any) {
      console.error("Error creating lead:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Please check your information and try again" });
      }
      res.status(500).json({ message: "Unable to submit your request. Please try again later." });
    }
  });

  app.get("/api/university/courses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkUniversityAccess(userId);

      if (!access) {
        return res.json([]);
      }

      const courses = await storage.getCoursesByUniversityId(access.university.id);
      res.json(courses);
    } catch (error) {
      console.error("Error fetching university courses:", error);
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  app.post("/api/courses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkUniversityAccess(userId, ['super_admin', 'admin', 'course_manager']);

      if (!access) {
        return res.status(403).json({ message: "Only course managers and admins can create courses" });
      }

      const data = insertCourseSchema.parse({
        ...req.body,
        universityId: access.university.id,
      });

      const course = await storage.createCourse(data);
      
      // Increment sub-discipline usage count if a sub-discipline was assigned
      if (course.subDisciplineId) {
        await storage.incrementSubDisciplineUsage(course.subDisciplineId);
      }
      
      res.json(course);
    } catch (error: any) {
      console.error("Error creating course:", error);
      res.status(400).json({ message: error.message || "Failed to create course" });
    }
  });

  app.put("/api/courses/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkUniversityAccess(userId, ['super_admin', 'admin', 'course_manager']);

      if (!access) {
        return res.status(403).json({ message: "Only course managers and admins can update courses" });
      }

      const course = await storage.getCourseById(req.params.id);
      if (!course || course.universityId !== access.university.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const data = insertCourseSchema.parse({
        ...req.body,
        universityId: access.university.id,
      });

      const updated = await storage.updateCourse(req.params.id, data);
      
      // Increment sub-discipline usage count if a new sub-discipline was assigned
      if (updated.subDisciplineId && updated.subDisciplineId !== course.subDisciplineId) {
        await storage.incrementSubDisciplineUsage(updated.subDisciplineId);
      }
      
      // Trigger async knowledge base rebuild
      triggerKnowledgeBaseRebuild('course update');
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating course:", error);
      res.status(400).json({ message: error.message || "Failed to update course" });
    }
  });

  // Student profile routes
  app.get("/api/student/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfileByUserId(userId);

      if (!profile) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      res.json(profile);
    } catch (error) {
      console.error("Error fetching student profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.post("/api/student/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertStudentProfileSchema.parse({ ...req.body, userId });

      const existing = await storage.getStudentProfileByUserId(userId);
      
      if (existing) {
        return res.status(409).json({ message: "Profile already exists. Use PUT to update." });
      }

      // Generate unique referral code
      const referralCode = await storage.generateReferralCode();

      // Update user type to student
      await storage.upsertUser({ id: userId, userType: "student" });
      const profile = await storage.createStudentProfile({ ...data, referralCode });

      // If a referral code was provided, create a referral record
      if (data.referredByCode) {
        const referrer = await storage.validateReferralCode(data.referredByCode);
        if (referrer) {
          await storage.createReferral({
            referrerId: referrer.id,
            referredId: profile.id,
            referralCode: data.referredByCode,
            status: 'pending',
          });
        }
      }

      res.json(profile);
    } catch (error: any) {
      console.error("Error creating student profile:", error);
      res.status(400).json({ message: error.message || "Failed to create profile" });
    }
  });

  // PUT /api/student/profile - Update existing profile
  app.put("/api/student/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getStudentProfileByUserId(userId);

      if (!existing) {
        return res.status(404).json({ message: "Profile not found. Create it first with POST." });
      }

      const { userId: _, ...sanitizedBody } = req.body;
      const data = insertStudentProfileSchema.partial().parse(sanitizedBody);
      const profile = await storage.updateStudentProfile(existing.id, data);

      res.json(profile);
    } catch (error: any) {
      console.error("Error updating student profile:", error);
      res.status(400).json({ message: error.message || "Failed to update profile" });
    }
  });

  // POST /api/student/upload-profile-photo - Upload profile photo
  app.post("/api/student/upload-profile-photo", isAuthenticated, upload.single('photo'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfileByUserId(userId);
      
      if (!profile) {
        return res.status(404).json({ message: "Profile not found. Create profile first." });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Resize to 200x200 with cover
      const resizedBuffer = await sharp(req.file.buffer)
        .resize(200, 200, { fit: 'cover' })
        .jpeg({ quality: 85 })
        .toBuffer();

      // Save to public directory
      const filename = `student-profile-${profile.id}-${Date.now()}.jpg`;
      const localPath = path.join(process.cwd(), 'public', 'students');
      await fs.mkdir(localPath, { recursive: true });
      await fs.writeFile(path.join(localPath, filename), resizedBuffer);
      
      const photoPath = `/students/${filename}`;

      // Update profile with new photo
      await storage.updateStudentProfile(profile.id, {
        ...profile,
        profileImageUrl: photoPath,
      });

      res.json({ photoPath });
    } catch (error) {
      console.error("Error uploading profile photo:", error);
      res.status(500).json({ message: "Failed to upload photo" });
    }
  });

  // GET /api/admin/profile - Get admin profile details
  app.get("/api/admin/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.userType !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin access required." });
      }

      // Return safe user data (exclude sensitive fields)
      const { password, verificationToken, resetPasswordToken, ...safeUserData } = user;
      res.json(safeUserData);
    } catch (error) {
      console.error("Error fetching admin profile:", error);
      res.status(500).json({ message: "Failed to fetch admin profile" });
    }
  });

  // PUT /api/admin/profile - Update admin profile details
  app.put("/api/admin/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.userType !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin access required." });
      }

      // Only allow updating specific fields
      const allowedFields = ['firstName', 'lastName', 'profileImageUrl'];
      const updates: any = {};
      
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      const updatedUser = await storage.updateUser(userId, updates);
      
      // Return safe user data (exclude sensitive fields)
      const { password, verificationToken, resetPasswordToken, ...safeUserData } = updatedUser;
      res.json(safeUserData);
    } catch (error: any) {
      console.error("Error updating admin profile:", error);
      res.status(400).json({ message: error.message || "Failed to update admin profile" });
    }
  });

  // POST /api/admin/upload-profile-photo - Upload admin profile photo
  app.post("/api/admin/upload-profile-photo", isAuthenticated, upload.single('photo'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.userType !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin access required." });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Validate file type
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: "Invalid file type. Please upload a JPEG, PNG, or GIF image." });
      }

      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024;
      if (req.file.size > maxSize) {
        return res.status(400).json({ message: "File too large. Maximum size is 5MB." });
      }

      let resizedBuffer: Buffer;
      try {
        // Validate that the buffer is actually a valid image by trying to get metadata
        await sharp(req.file.buffer).metadata();
        
        // Resize to 200x200 with cover
        resizedBuffer = await sharp(req.file.buffer)
          .resize(200, 200, { fit: 'cover' })
          .jpeg({ quality: 85 })
          .toBuffer();
      } catch (sharpError: any) {
        console.error("Sharp processing error:", sharpError);
        return res.status(400).json({ 
          message: "Invalid or corrupted image file. Please try a different image." 
        });
      }

      // Save to public directory
      const filename = `admin-profile-${user.id}-${Date.now()}.jpg`;
      const localPath = path.join(process.cwd(), 'public', 'admins');
      await fs.mkdir(localPath, { recursive: true });
      await fs.writeFile(path.join(localPath, filename), resizedBuffer);
      
      const photoPath = `/admins/${filename}`;

      // Update user with new profile photo
      await storage.updateUser(user.id, {
        profileImageUrl: photoPath,
      });

      res.json({ photoPath });
    } catch (error) {
      console.error("Error uploading admin profile photo:", error);
      res.status(500).json({ message: "Failed to upload photo" });
    }
  });

  // GET /api/student/profile/completion - Check profile completion status
  app.get("/api/student/profile/completion", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfileByUserId(userId);
      
      let educations: any[] = [];
      let languageScores: any[] = [];
      
      if (profile) {
        educations = await storage.getEducationsByStudentProfileId(profile.id);
        languageScores = await storage.getLanguageScoresByStudentProfileId(profile.id);
      }
      
      const completionResult = calculateProfileCompletion(profile, educations, languageScores);
      res.json(completionResult);
    } catch (error) {
      console.error("Error checking profile completion:", error);
      res.status(500).json({ message: "Failed to check profile completion" });
    }
  });

  // Student education history routes
  app.get("/api/student/educations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfileByUserId(userId);

      if (!profile) {
        return res.json([]);
      }

      const educations = await storage.getEducationsByStudentProfileId(profile.id);
      res.json(educations);
    } catch (error) {
      console.error("Error fetching educations:", error);
      res.status(500).json({ message: "Failed to fetch education history" });
    }
  });

  app.post("/api/student/educations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfileByUserId(userId);

      if (!profile) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const data = insertStudentEducationSchema.parse({
        ...req.body,
        studentProfileId: profile.id,
      });

      const education = await storage.createEducation(data);
      res.json(education);
    } catch (error: any) {
      console.error("Error creating education:", error);
      res.status(400).json({ message: error.message || "Failed to create education record" });
    }
  });

  app.put("/api/student/educations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfileByUserId(userId);

      if (!profile) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const education = await storage.getEducationById(req.params.id);
      if (!education || education.studentProfileId !== profile.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { studentProfileId, ...sanitizedBody } = req.body;
      const data = insertStudentEducationSchema.partial().parse(sanitizedBody);
      const updated = await storage.updateEducation(req.params.id, data);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating education:", error);
      res.status(400).json({ message: error.message || "Failed to update education record" });
    }
  });

  app.delete("/api/student/educations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfileByUserId(userId);

      if (!profile) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const education = await storage.getEducationById(req.params.id);
      if (!education || education.studentProfileId !== profile.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await storage.deleteEducation(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting education:", error);
      res.status(400).json({ message: error.message || "Failed to delete education record" });
    }
  });

  // Student language scores routes
  app.get("/api/student/language-scores", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfileByUserId(userId);

      if (!profile) {
        return res.json([]);
      }

      const scores = await storage.getLanguageScoresByStudentProfileId(profile.id);
      res.json(scores);
    } catch (error) {
      console.error("Error fetching language scores:", error);
      res.status(500).json({ message: "Failed to fetch language scores" });
    }
  });

  app.post("/api/student/language-scores", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfileByUserId(userId);

      if (!profile) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const data = insertStudentLanguageScoreSchema.parse({
        ...req.body,
        studentProfileId: profile.id,
      });

      const score = await storage.createLanguageScore(data);
      res.json(score);
    } catch (error: any) {
      console.error("Error creating language score:", error);
      res.status(400).json({ message: error.message || "Failed to create language score" });
    }
  });

  app.put("/api/student/language-scores/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfileByUserId(userId);

      if (!profile) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const score = await storage.getLanguageScoreById(req.params.id);
      if (!score || score.studentProfileId !== profile.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { studentProfileId, ...sanitizedBody } = req.body;
      const data = insertStudentLanguageScoreSchema.partial().parse(sanitizedBody);
      const updated = await storage.updateLanguageScore(req.params.id, data);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating language score:", error);
      res.status(400).json({ message: error.message || "Failed to update language score" });
    }
  });

  app.delete("/api/student/language-scores/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfileByUserId(userId);

      if (!profile) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const score = await storage.getLanguageScoreById(req.params.id);
      if (!score || score.studentProfileId !== profile.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await storage.deleteLanguageScore(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting language score:", error);
      res.status(400).json({ message: error.message || "Failed to delete language score" });
    }
  });

  // Application routes
  app.get("/api/student/applications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfileByUserId(userId);

      if (!profile) {
        return res.json([]);
      }

      const applications = await storage.getApplicationsByStudentId(profile.id);
      res.json(applications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  // Referral routes
  app.get("/api/student/referral/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfileByUserId(userId);

      if (!profile) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const stats = await storage.getReferralStats(profile.id);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching referral stats:", error);
      res.status(500).json({ message: "Failed to fetch referral stats" });
    }
  });

  app.get("/api/student/referral/list", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfileByUserId(userId);

      if (!profile) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const referrals = await storage.getReferralsByReferrerId(profile.id);
      res.json(referrals);
    } catch (error) {
      console.error("Error fetching referrals:", error);
      res.status(500).json({ message: "Failed to fetch referrals" });
    }
  });

  app.get("/api/student/referral/code", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let profile = await storage.getStudentProfileByUserId(userId);

      if (!profile) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      // Auto-generate referral code for existing profiles that don't have one
      if (!profile.referralCode) {
        const referralCode = await storage.generateReferralCode();
        profile = await storage.updateStudentProfile(profile.id, { referralCode });
      }

      res.json({ 
        referralCode: profile.referralCode,
        referralLink: `${req.protocol}://${req.get('host')}/login?ref=${profile.referralCode}`
      });
    } catch (error) {
      console.error("Error fetching referral code:", error);
      res.status(500).json({ message: "Failed to fetch referral code" });
    }
  });

  app.post("/api/student/referral/validate", async (req: any, res) => {
    try {
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({ message: "Referral code is required" });
      }

      const referrer = await storage.validateReferralCode(code);

      if (!referrer) {
        return res.status(404).json({ message: "Invalid referral code" });
      }

      res.json({ valid: true, referrerName: `${referrer.firstName || ''} ${referrer.lastName || ''}`.trim() });
    } catch (error) {
      console.error("Error validating referral code:", error);
      res.status(500).json({ message: "Failed to validate referral code" });
    }
  });

  // Bank details for affiliate payouts
  app.get("/api/student/bank-details", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfileByUserId(userId);

      if (!profile) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      res.json({
        bankAccountHolderName: profile.bankAccountHolderName || "",
        bankName: profile.bankName || "",
        bankBsbCode: profile.bankBsbCode || "",
        bankAccountNumber: profile.bankAccountNumber || "",
      });
    } catch (error) {
      console.error("Error fetching bank details:", error);
      res.status(500).json({ message: "Failed to fetch bank details" });
    }
  });

  app.put("/api/student/bank-details", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfileByUserId(userId);

      if (!profile) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const { bankAccountHolderName, bankName, bankBsbCode, bankAccountNumber } = req.body;

      await db
        .update(studentProfiles)
        .set({
          bankAccountHolderName,
          bankName,
          bankBsbCode,
          bankAccountNumber,
          updatedAt: new Date(),
        })
        .where(eq(studentProfiles.id, profile.id));

      res.json({ message: "Bank details updated successfully" });
    } catch (error) {
      console.error("Error updating bank details:", error);
      res.status(500).json({ message: "Failed to update bank details" });
    }
  });

  // Favorites routes
  app.get("/api/student/favorites", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfileByUserId(userId);

      if (!profile) {
        return res.json([]);
      }

      const studentFavorites = await db
        .select()
        .from(favorites)
        .where(eq(favorites.studentProfileId, profile.id));

      res.json(studentFavorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.post("/api/student/favorites", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let profile = await storage.getStudentProfileByUserId(userId);

      // Auto-create minimal student profile if it doesn't exist
      if (!profile) {
        const [newProfile] = await db
          .insert(studentProfiles)
          .values({ userId })
          .returning();
        profile = newProfile;
      }

      const validatedData = insertFavoriteSchema.parse({
        ...req.body,
        studentProfileId: profile.id,
      });

      const [newFavorite] = await db
        .insert(favorites)
        .values(validatedData)
        .returning();

      res.status(201).json(newFavorite);
    } catch (error: any) {
      console.error("Error creating favorite:", error);
      if (error.code === '23505') {
        return res.status(409).json({ message: "Item already favorited" });
      }
      res.status(400).json({ message: error.message || "Failed to create favorite" });
    }
  });

  app.delete("/api/student/favorites/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfileByUserId(userId);

      if (!profile) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const [favorite] = await db
        .select()
        .from(favorites)
        .where(eq(favorites.id, req.params.id));

      if (!favorite || favorite.studentProfileId !== profile.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await db.delete(favorites).where(eq(favorites.id, req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting favorite:", error);
      res.status(400).json({ message: error.message || "Failed to delete favorite" });
    }
  });

  app.post("/api/student/favorites/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfileByUserId(userId);

      if (!profile) {
        return res.json({});
      }

      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ message: "Items must be an array" });
      }

      const statusMap: Record<string, boolean> = {};

      for (const item of items) {
        const [favorite] = await db
          .select()
          .from(favorites)
          .where(
            and(
              eq(favorites.studentProfileId, profile.id),
              eq(favorites.itemType, item.itemType),
              eq(favorites.itemId, item.itemId)
            )
          );

        statusMap[`${item.itemType}-${item.itemId}`] = !!favorite;
      }

      res.json(statusMap);
    } catch (error) {
      console.error("Error checking favorite status:", error);
      res.status(500).json({ message: "Failed to check favorite status" });
    }
  });

  // Course Comparison routes
  app.get("/api/student/comparisons", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfileByUserId(userId);

      if (!profile) {
        return res.json([]);
      }

      const comparisons = await db
        .select()
        .from(courseComparisons)
        .where(eq(courseComparisons.studentProfileId, profile.id));

      res.json(comparisons);
    } catch (error) {
      console.error("Error fetching comparisons:", error);
      res.status(500).json({ message: "Failed to fetch comparisons" });
    }
  });

  app.post("/api/student/comparisons", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let profile = await storage.getStudentProfileByUserId(userId);

      // Auto-create minimal student profile if it doesn't exist
      if (!profile) {
        const [newProfile] = await db
          .insert(studentProfiles)
          .values({ userId })
          .returning();
        profile = newProfile;
      }

      const validatedData = insertCourseComparisonSchema.parse({
        ...req.body,
        studentProfileId: profile.id,
      });

      const [newComparison] = await db
        .insert(courseComparisons)
        .values(validatedData)
        .returning();

      res.status(201).json(newComparison);
    } catch (error: any) {
      console.error("Error creating comparison:", error);
      if (error.code === '23505') {
        return res.status(409).json({ message: "Course already in comparison" });
      }
      res.status(400).json({ message: error.message || "Failed to add to comparison" });
    }
  });

  app.delete("/api/student/comparisons/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfileByUserId(userId);

      if (!profile) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const [comparison] = await db
        .select()
        .from(courseComparisons)
        .where(eq(courseComparisons.id, req.params.id));

      if (!comparison || comparison.studentProfileId !== profile.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await db.delete(courseComparisons).where(eq(courseComparisons.id, req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting comparison:", error);
      res.status(400).json({ message: error.message || "Failed to delete comparison" });
    }
  });

  app.delete("/api/student/comparisons", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfileByUserId(userId);

      if (!profile) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      await db.delete(courseComparisons).where(eq(courseComparisons.studentProfileId, profile.id));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error clearing comparisons:", error);
      res.status(400).json({ message: error.message || "Failed to clear comparisons" });
    }
  });

  app.post("/api/student/comparisons/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfileByUserId(userId);

      if (!profile) {
        return res.json({});
      }

      const { courseIds } = req.body;
      if (!Array.isArray(courseIds)) {
        return res.status(400).json({ message: "courseIds must be an array" });
      }

      const statusMap: Record<string, boolean> = {};

      for (const courseId of courseIds) {
        const [comparison] = await db
          .select()
          .from(courseComparisons)
          .where(
            and(
              eq(courseComparisons.studentProfileId, profile.id),
              eq(courseComparisons.courseId, courseId)
            )
          );

        statusMap[courseId] = !!comparison;
      }

      res.json(statusMap);
    } catch (error) {
      console.error("Error checking comparison status:", error);
      res.status(500).json({ message: "Failed to check comparison status" });
    }
  });

  // ============================================================================
  // DOCUMENT MANAGEMENT ROUTES
  // ============================================================================

  // Document Folders - Student Routes
  app.get("/api/student/documents/folders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfileByUserId(userId);

      if (!profile) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const folders = await storage.getFoldersByOwnerId(userId); // Fixed: use userId, not profile.id
      res.json(folders);
    } catch (error) {
      console.error("Error fetching folders:", error);
      res.status(500).json({ message: "Failed to fetch folders" });
    }
  });

  app.post("/api/student/documents/folders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfileByUserId(userId);

      if (!profile) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const { name, color } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Folder name is required" });
      }

      const folder = await storage.createFolder({
        ownerId: userId, // Fixed: use userId, not profile.id
        ownerType: 'student',
        studentProfileId: profile.id,
        name,
        color: color || "#6366f1",
        isDefault: false,
      });

      res.json(folder);
    } catch (error) {
      console.error("Error creating folder:", error);
      res.status(500).json({ message: "Failed to create folder" });
    }
  });

  app.patch("/api/student/documents/folders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfileByUserId(userId);

      if (!profile) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const folder = await storage.getFolderById(req.params.id);
      if (!folder || folder.ownerId !== profile.id) {
        return res.status(404).json({ message: "Folder not found" });
      }

      if (folder.isDefault) {
        return res.status(400).json({ message: "Cannot modify default folders" });
      }

      const updated = await storage.updateFolder(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating folder:", error);
      res.status(500).json({ message: "Failed to update folder" });
    }
  });

  app.delete("/api/student/documents/folders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfileByUserId(userId);

      if (!profile) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const folder = await storage.getFolderById(req.params.id);
      if (!folder || folder.ownerId !== profile.id) {
        return res.status(404).json({ message: "Folder not found" });
      }

      if (folder.isDefault) {
        return res.status(400).json({ message: "Cannot delete default folders" });
      }

      await storage.deleteFolder(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting folder:", error);
      res.status(500).json({ message: "Failed to delete folder" });
    }
  });

  // Documents - Student Routes
  app.get("/api/student/documents", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfileByUserId(userId);

      if (!profile) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const documents = await storage.getDocumentsByStudentProfileId(profile.id);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.post("/api/student/documents/upload", isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfileByUserId(userId);

      if (!profile) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }

      const { folderId, type, description } = req.body;

      // Verify folder ownership if provided
      if (folderId) {
        const folder = await storage.getFolderById(folderId);
        if (!folder || folder.ownerId !== userId) { // Fixed: use userId, not profile.id
          return res.status(404).json({ message: "Folder not found" });
        }
      }

      // Upload to object storage or local directory
      // Use object storage if available, otherwise fall back to local uploads directory
      let uploadsBase = process.env.PRIVATE_OBJECT_DIR;
      
      // Check if object storage directory exists, otherwise use local directory
      try {
        if (uploadsBase) {
          await fs.access(uploadsBase);
        }
      } catch {
        uploadsBase = undefined;
      }
      
      // Fall back to local uploads directory if object storage not available
      if (!uploadsBase) {
        uploadsBase = path.join(process.cwd(), 'uploads');
      }
      
      const fileName = `${Date.now()}-${req.file.originalname}`;
      const uploadsDir = path.join(uploadsBase, 'documents', profile.id);
      const filePath = path.join(uploadsDir, fileName);
      
      console.log('[UPLOAD] Uploading to:', filePath);
      console.log('[UPLOAD] Creating directory:', uploadsDir);
      
      // Ensure directory exists
      await fs.mkdir(uploadsDir, { recursive: true });
      await fs.writeFile(filePath, req.file.buffer);
      
      console.log('[UPLOAD] File uploaded successfully');

      const document = await storage.createDocument({
        type: type || 'other',
        title: req.file.originalname,
        filePath,
        fileName: req.file.originalname,
        senderId: userId,
        senderType: 'student',
        studentProfileId: profile.id,
        folderId: folderId || null,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        status: 'pending',
        description: description || null,
      });

      res.json(document);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  app.patch("/api/student/documents/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfileByUserId(userId);

      if (!profile) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const document = await storage.getDocumentById(req.params.id);
      if (!document || document.studentProfileId !== profile.id) {
        return res.status(404).json({ message: "Document not found" });
      }

      const updated = await storage.updateDocument(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating document:", error);
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  app.delete("/api/student/documents/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfileByUserId(userId);

      if (!profile) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const document = await storage.getDocumentById(req.params.id);
      if (!document || document.studentProfileId !== profile.id) {
        return res.status(404).json({ message: "Document not found" });
      }

      await storage.deleteDocument(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Document Comments
  app.get("/api/documents/:documentId/comments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const document = await storage.getDocumentById(req.params.documentId);

      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Verify access (student owner or university with application)
      const profile = await storage.getStudentProfileByUserId(userId);
      const isOwner = profile && document.studentProfileId === profile.id;

      if (!isOwner) {
        const access = await checkUniversityAccess(userId);
        if (!access) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const comments = await storage.getCommentsByDocumentId(req.params.documentId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post("/api/documents/:documentId/comments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const document = await storage.getDocumentById(req.params.documentId);

      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ message: "Comment content is required" });
      }

      const comment = await storage.createComment({
        documentId: req.params.documentId,
        userId,
        content,
      });

      res.json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  // Document Requests
  app.get("/api/student/document-requests", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfileByUserId(userId);

      if (!profile) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const requests = await storage.getDocumentRequestsByStudentId(profile.id);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching document requests:", error);
      res.status(500).json({ message: "Failed to fetch document requests" });
    }
  });

  app.get("/api/university/applications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkUniversityAccess(userId);

      if (!access) {
        return res.json([]);
      }

      const applications = await storage.getApplicationsByUniversityId(access.university.id);
      
      // Enrich applications with student user details for messaging
      const enrichedApplications = await Promise.all(
        applications.map(async (app) => {
          const studentProfile = await db
            .select()
            .from(studentProfiles)
            .where(eq(studentProfiles.id, app.studentId))
            .then(r => r[0]);
          
          const studentUser = studentProfile?.userId 
            ? await storage.getUser(studentProfile.userId) 
            : null;
          
          return {
            ...app,
            student: {
              userId: studentUser?.id,
              profileId: studentProfile?.id,
              name: `${studentProfile?.firstName || ''} ${studentProfile?.lastName || ''}`.trim() || 'Unknown',
              email: studentUser?.email,
            },
          };
        })
      );
      
      res.json(enrichedApplications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  // Team Management Routes
  app.get("/api/university/team", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkUniversityAccess(userId);

      if (!access) {
        return res.status(404).json({ message: "University not found" });
      }

      const teamMembers = await storage.getTeamMembersByUniversityId(access.university.id);
      res.json(teamMembers);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  app.post("/api/university/team", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkUniversityAccess(userId, ['super_admin', 'admin']);

      if (!access) {
        return res.status(403).json({ message: "Only super admins and admins can add team members" });
      }

      const { email, role } = req.body;

      if (!email || !role) {
        return res.status(400).json({ message: "Email and role are required" });
      }

      if (!['super_admin', 'admin', 'course_manager', 'application_manager'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      // Check if user exists by email
      const existingUsers = await db.select().from(users).where(eq(users.email, email));
      let teamMemberUser = existingUsers[0];

      // If user doesn't exist, create a placeholder
      if (!teamMemberUser) {
        const [newUser] = await db.insert(users).values({
          email,
          userType: 'university',
        }).returning();
        teamMemberUser = newUser;
      }

      // Check if already a team member
      const existing = await storage.getTeamMemberByUserAndUniversity(teamMemberUser.id, access.university.id);
      if (existing) {
        return res.status(400).json({ message: "User is already a team member" });
      }

      const teamMember = await storage.createTeamMember({
        universityId: access.university.id,
        userId: teamMemberUser.id,
        role,
        invitedBy: userId,
        isActive: true,
      });

      // Send notification to new team member
      try {
        await notifyTeamMemberAdded({
          userId: teamMemberUser.id,
          universityName: access.university.name,
          role,
        });
      } catch (notificationError) {
        console.error("Error sending notification:", notificationError);
        // Don't fail the team member creation if notification fails
      }

      res.json(teamMember);
    } catch (error: any) {
      console.error("Error adding team member:", error);
      res.status(500).json({ message: error.message || "Failed to add team member" });
    }
  });

  app.patch("/api/university/team/:id/role", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkUniversityAccess(userId, ['super_admin', 'admin']);

      if (!access) {
        return res.status(403).json({ message: "Only super admins and admins can update roles" });
      }

      const { role } = req.body;

      if (!role || !['super_admin', 'admin', 'course_manager', 'application_manager'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const teamMember = await storage.updateTeamMemberRole(req.params.id, role);
      res.json(teamMember);
    } catch (error) {
      console.error("Error updating team member role:", error);
      res.status(500).json({ message: "Failed to update team member role" });
    }
  });

  app.delete("/api/university/team/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkUniversityAccess(userId, ['super_admin', 'admin']);

      if (!access) {
        return res.status(403).json({ message: "Only super admins and admins can remove team members" });
      }

      await storage.deleteTeamMember(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing team member:", error);
      res.status(500).json({ message: "Failed to remove team member" });
    }
  });

  app.post("/api/applications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfileByUserId(userId);

      if (!profile) {
        return res.status(400).json({ message: "Please create student profile first" });
      }

      // Calculate profile completion for informational purposes
      const educations = await storage.getEducationsByStudentProfileId(profile.id);
      const languageScores = await storage.getLanguageScoresByStudentProfileId(profile.id);
      const completionResult = calculateProfileCompletion(profile, educations, languageScores);

      // Require 100% profile completion (personal info + at least 1 education + at least 1 language score)
      if (!completionResult.isComplete) {
        return res.status(403).json({
          message: "Please complete your profile (100%) before applying. Required: personal information, at least one education record, and at least one language test score.",
          completion: completionResult,
        });
      }

      const data = insertApplicationSchema.parse({
        ...req.body,
        studentId: profile.id,
      });

      const application = await storage.createApplication(data);
      
      // Send notification to university
      try {
        const course = await storage.getCourseById(application.courseId);
        if (course) {
          const university = await storage.getUniversityById(course.universityId);
          if (university && university.userId) {
            await notifyNewApplication({
              universityUserId: university.userId,
              studentName: `${profile.firstName} ${profile.lastName}`,
              courseName: course.title,
              applicationId: application.id,
            });
          }
        }
      } catch (notificationError) {
        console.error("Error sending notification:", notificationError);
        // Don't fail the application creation if notification fails
      }
      
      res.json(application);
    } catch (error: any) {
      console.error("Error creating application:", error);
      res.status(400).json({ message: error.message || "Failed to create application" });
    }
  });

  app.patch("/api/applications/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { status } = req.body;

      if (!["pending", "reviewing", "accepted", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      // Get the application and verify access
      const application = await storage.getApplicationById(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      const course = await storage.getCourseById(application.courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      // Check if user has access to this university
      const access = await checkUniversityAccess(userId, ['super_admin', 'admin', 'application_manager']);
      if (!access || access.university.id !== course.universityId) {
        return res.status(403).json({ message: "Only application managers and admins can update application status" });
      }

      const updated = await storage.updateApplicationStatus(req.params.id, status);
      
      // Send notification to student
      try {
        const studentProfile = await storage.getStudentProfileById(application.studentId);
        const university = await storage.getUniversityById(course.universityId);
        if (studentProfile && university) {
          await notifyApplicationStatusChange({
            studentUserId: studentProfile.userId,
            courseName: course.title,
            institutionName: university.name,
            status,
            applicationId: application.id,
          });
        }
      } catch (notificationError) {
        console.error("Error sending notification:", notificationError);
        // Don't fail the status update if notification fails
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating application:", error);
      res.status(500).json({ message: "Failed to update application" });
    }
  });

  // Public platform statistics endpoint
  app.get("/api/platform/stats", async (req, res) => {
    try {
      // Only count approved institutions and courses for public stats
      const allInstitutions = await storage.getAllUniversities();
      const allCourses = await storage.getAllCourses();
      
      const approvedInstitutions = allInstitutions.filter(i => i.approvalStatus === 'approved' && i.isActive);
      const approvedCourses = allCourses.filter(c => {
        const institution = allInstitutions.find(i => i.id === c.universityId);
        return c.approvalStatus === 'approved' && 
               c.isActive && 
               institution?.approvalStatus === 'approved' && 
               institution?.isActive;
      });
      
      res.json({
        institutionCount: approvedInstitutions.length,
        courseCount: approvedCourses.length
      });
    } catch (error) {
      console.error("Error fetching platform stats:", error);
      res.status(500).json({ message: "Failed to fetch platform statistics" });
    }
  });

  // AI generation routes
  app.post("/api/ai/generate-university-description", isAuthenticated, async (req, res) => {
    try {
      const { name, location } = req.body;

      if (!name || !location) {
        return res.status(400).json({ message: "Name and location are required" });
      }

      const description = await generateUniversityDescription(name, location);
      res.json({ description });
    } catch (error: any) {
      console.error("Error generating description:", error);
      
      // Handle AI configuration and OpenAI-specific errors
      if (error?.code === 'ai_not_configured' || error?.status === 503) {
        return res.status(503).json({ 
          message: "AI features are not yet configured. OpenAI integration will be set up in a later stage of platform development." 
        });
      }
      
      if (error?.error?.code === 'insufficient_quota' || error?.status === 429) {
        return res.status(429).json({ 
          message: "OpenAI API quota exceeded. Please add credits to your OpenAI account at platform.openai.com/settings/organization/billing" 
        });
      }
      
      if (error?.error?.code === 'invalid_api_key') {
        return res.status(401).json({ 
          message: "Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable." 
        });
      }
      
      res.status(500).json({ message: "Failed to generate description. Please try again." });
    }
  });

  app.post("/api/ai/generate-course-description", isAuthenticated, async (req, res) => {
    try {
      const { title, subject, level } = req.body;

      if (!title || !subject || !level) {
        return res.status(400).json({ message: "Title, subject, and level are required" });
      }

      const description = await generateCourseDescription(title, subject, level);
      res.json({ description });
    } catch (error: any) {
      console.error("Error generating description:", error);
      
      // Handle AI configuration and OpenAI-specific errors
      if (error?.code === 'ai_not_configured' || error?.status === 503) {
        return res.status(503).json({ 
          message: "AI features are not yet configured. OpenAI integration will be set up in a later stage of platform development." 
        });
      }
      
      if (error?.error?.code === 'insufficient_quota' || error?.status === 429) {
        return res.status(429).json({ 
          message: "OpenAI API quota exceeded. Please add credits to your OpenAI account at platform.openai.com/settings/organization/billing" 
        });
      }
      
      if (error?.error?.code === 'invalid_api_key') {
        return res.status(401).json({ 
          message: "Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable." 
        });
      }
      
      res.status(500).json({ message: "Failed to generate description. Please try again." });
    }
  });

  app.post("/api/ai/generate-student-content", isAuthenticated, async (req, res) => {
    try {
      const { field, personalInfo, educationHistory, languageTests, bioFormData } = req.body;

      // Build profile data object from all sources
      const profileData = {
        personalInfo,
        educationHistory,
        languageTests,
        bioFormData,
      };

      let content = "";
      if (field === "bio") {
        content = await generateStudentBio(profileData);
      } else if (field === "careerGoals") {
        content = await generateCareerGoals(profileData);
      } else {
        return res.status(400).json({ message: "Invalid field" });
      }

      res.json({ content });
    } catch (error: any) {
      console.error("Error generating content:", error);
      
      // Handle AI configuration errors
      if (error?.code === 'ai_not_configured' || error?.status === 503) {
        return res.status(503).json({ 
          message: "AI features are not yet configured. OpenAI integration will be set up in a later stage of platform development." 
        });
      }
      
      // Handle OpenAI-specific errors with user-friendly messages
      if (error?.error?.code === 'insufficient_quota' || error?.status === 429) {
        return res.status(429).json({ 
          message: "OpenAI API quota exceeded. Please add credits to your OpenAI account at platform.openai.com/settings/organization/billing" 
        });
      }
      
      if (error?.error?.code === 'invalid_api_key') {
        return res.status(401).json({ 
          message: "Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable." 
        });
      }
      
      res.status(500).json({ message: "Failed to generate content. Please try again." });
    }
  });

  // Admin routes
  
  // Admin team management routes
  app.get("/api/admin/team", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId);

      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const teamMembers = await storage.getAllAdminTeamMembers();
      
      const teamMembersWithUsers = await Promise.all(
        teamMembers.map(async (member) => {
          const user = await storage.getUser(member.userId);
          return {
            ...member,
            user: {
              id: user?.id,
              email: user?.email,
              firstName: user?.firstName,
              lastName: user?.lastName,
            },
          };
        })
      );

      res.json(teamMembersWithUsers);
    } catch (error) {
      console.error("Error fetching admin team members:", error);
      res.status(500).json({ message: "Failed to fetch admin team members" });
    }
  });

  app.post("/api/admin/team", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin']);

      if (!access) {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const validatedData = addAdminTeamMemberSchema.parse(req.body);
      const { email, role } = validatedData;

      const existingUser = await db.select().from(users).where(eq(users.email, email));
      let targetUserId: string;

      if (existingUser.length > 0) {
        targetUserId = existingUser[0].id;
        
        await storage.upsertUser({
          id: targetUserId,
          userType: "admin",
        });
      } else {
        const newUser = await storage.upsertUser({
          email,
          userType: "admin",
        });
        targetUserId = newUser.id;
      }

      const existingMember = await storage.getAdminTeamMemberByUserId(targetUserId);
      if (existingMember) {
        return res.status(400).json({ message: "User is already an admin team member" });
      }

      const teamMember = await storage.createAdminTeamMember({
        userId: targetUserId,
        role,
        invitedBy: userId,
        isActive: true,
      });

      const user = await storage.getUser(targetUserId);
      res.json({
        ...teamMember,
        user: {
          id: user?.id,
          email: user?.email,
          firstName: user?.firstName,
          lastName: user?.lastName,
        },
      });
    } catch (error: any) {
      console.error("Error adding admin team member:", error);
      res.status(400).json({ message: error.message || "Failed to add admin team member" });
    }
  });

  app.patch("/api/admin/team/:id/role", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin']);

      if (!access) {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const validatedData = updateAdminTeamMemberRoleSchema.parse(req.body);
      const { role } = validatedData;

      const allMembers = await storage.getAllAdminTeamMembers();
      const targetMember = allMembers.find(m => m.id === req.params.id);
      
      if (!targetMember) {
        return res.status(404).json({ message: "Admin team member not found" });
      }

      if (targetMember.role === 'super_admin' && role !== 'super_admin') {
        const superAdminCount = allMembers.filter(m => m.role === 'super_admin' && m.isActive).length;
        if (superAdminCount <= 1) {
          return res.status(400).json({ message: "Cannot demote the last super admin" });
        }
      }

      const updated = await storage.updateAdminTeamMemberRole(req.params.id, role);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating admin team member role:", error);
      res.status(400).json({ message: error.message || "Failed to update role" });
    }
  });

  app.delete("/api/admin/team/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin']);

      if (!access) {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const allMembers = await storage.getAllAdminTeamMembers();
      const targetMember = allMembers.find(m => m.id === req.params.id);
      
      if (!targetMember) {
        return res.status(404).json({ message: "Admin team member not found" });
      }

      if (targetMember.userId === userId) {
        return res.status(400).json({ message: "Cannot delete your own admin account" });
      }

      if (targetMember.role === 'super_admin') {
        const superAdminCount = allMembers.filter(m => m.role === 'super_admin' && m.isActive).length;
        if (superAdminCount <= 1) {
          return res.status(400).json({ message: "Cannot delete the last super admin" });
        }
      }

      await storage.deleteAdminTeamMember(req.params.id);
      res.json({ message: "Admin team member removed successfully" });
    } catch (error: any) {
      console.error("Error deleting admin team member:", error);
      res.status(400).json({ message: error.message || "Failed to remove admin team member" });
    }
  });

  // Institution and Course Approval Routes
  app.patch("/api/admin/institutions/:id/approve", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'support_manager']);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const institution = await storage.getUniversityById(req.params.id);
      if (!institution) {
        return res.status(404).json({ message: "Institution not found" });
      }

      const updated = await storage.updateUniversity(req.params.id, {
        approvalStatus: 'approved',
        approvedAt: new Date(),
        approvedBy: userId,
      });

      // Log activity
      await logApprove({
        req,
        entityType: 'institution',
        entityId: req.params.id,
        entityName: institution.name,
      });

      // Trigger async knowledge base rebuild
      triggerKnowledgeBaseRebuild('institution approval');

      res.json(updated);
    } catch (error: any) {
      console.error("Error approving institution:", error);
      res.status(400).json({ message: error.message || "Failed to approve institution" });
    }
  });

  app.patch("/api/admin/institutions/:id/reject", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'support_manager']);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const institution = await storage.getUniversityById(req.params.id);
      if (!institution) {
        return res.status(404).json({ message: "Institution not found" });
      }

      const validatedData = rejectionSchema.parse(req.body);
      const { reason } = validatedData;

      const updated = await storage.updateUniversity(req.params.id, {
        approvalStatus: 'rejected',
        rejectionReason: reason,
      });

      // Log activity
      await logReject({
        req,
        entityType: 'institution',
        entityId: req.params.id,
        entityName: institution.name,
        reason,
      });

      // Trigger async knowledge base rebuild (remove rejected institution from AI)
      triggerKnowledgeBaseRebuild('institution rejection');

      res.json(updated);
    } catch (error: any) {
      console.error("Error rejecting institution:", error);
      res.status(400).json({ message: error.message || "Failed to reject institution" });
    }
  });

  app.patch("/api/admin/courses/:id/approve", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'support_manager']);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const course = await storage.getCourseById(req.params.id);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      const updated = await storage.updateCourse(req.params.id, {
        approvalStatus: 'approved',
        approvedAt: new Date(),
        approvedBy: userId,
      } as any);

      // Log activity
      await logApprove({
        req,
        entityType: 'course',
        entityId: req.params.id,
        entityName: course.title,
      });

      // Trigger async knowledge base rebuild
      triggerKnowledgeBaseRebuild('course approval');

      res.json(updated);
    } catch (error: any) {
      console.error("Error approving course:", error);
      res.status(400).json({ message: error.message || "Failed to approve course" });
    }
  });

  app.patch("/api/admin/courses/:id/reject", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'support_manager']);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const course = await storage.getCourseById(req.params.id);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      const validatedData = rejectionSchema.parse(req.body);
      const { reason } = validatedData;

      const updated = await storage.updateCourse(req.params.id, {
        approvalStatus: 'rejected',
        rejectionReason: reason,
      } as any);

      // Log activity
      await logReject({
        req,
        entityType: 'course',
        entityId: req.params.id,
        entityName: course.title,
        reason,
      });

      // Trigger async knowledge base rebuild (remove rejected course from AI)
      triggerKnowledgeBaseRebuild('course rejection');

      res.json(updated);
    } catch (error: any) {
      console.error("Error rejecting course:", error);
      res.status(400).json({ message: error.message || "Failed to reject course" });
    }
  });

  // Super Admin User Management Routes
  app.get("/api/super-admin/users", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Only super_admin and support_manager can view users
      const access = await checkAdminAccess(userId, ['super_admin', 'support_manager']);
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Get all users and sanitize sensitive fields
      const allUsers = await db.select().from(users);
      const sanitizedUsers = allUsers.map(({ 
        password, 
        verificationToken, 
        verificationTokenExpiry, 
        resetPasswordToken, 
        resetPasswordExpiry,
        ...safeUser 
      }) => safeUser);
      
      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/super-admin/users/:id/role", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Only super_admin and support_manager can modify users
      const access = await checkAdminAccess(userId, ['super_admin', 'support_manager']);
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { userType, role } = req.body;
      const targetUserId = req.params.id;

      if (!["student", "university", "admin", "super_admin"].includes(userType)) {
        return res.status(400).json({ message: "Invalid user type" });
      }

      // Update user
      const [updatedUser] = await db
        .update(users)
        .set({ userType, role: role || 'user', updatedAt: new Date() })
        .where(eq(users.id, targetUserId))
        .returning();

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { 
        password, 
        verificationToken, 
        verificationTokenExpiry, 
        resetPasswordToken, 
        resetPasswordExpiry,
        ...userData 
      } = updatedUser;
      res.json(userData);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.patch("/api/super-admin/users/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'support_manager']);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { isActive } = req.body;
      const targetUserId = req.params.id;

      if (targetUserId === userId) {
        return res.status(400).json({ message: "Cannot deactivate your own account" });
      }

      const [updatedUser] = await db
        .update(users)
        .set({ isActive, updatedAt: new Date() })
        .where(eq(users.id, targetUserId))
        .returning();

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { 
        password, 
        verificationToken, 
        verificationTokenExpiry, 
        resetPasswordToken, 
        resetPasswordExpiry,
        ...userData 
      } = updatedUser;
      res.json(userData);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  // Create new user
  app.post("/api/super-admin/users", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'support_manager']);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { email, password, firstName, lastName, userType, role } = req.body;

      if (!email || !password || !firstName || !lastName || !userType) {
        return res.status(400).json({ message: "Email, password, first name, last name, and user type are required" });
      }

      // Check if user with email already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user
      const [newUser] = await db
        .insert(users)
        .values({
          email: email.toLowerCase(),
          password: hashedPassword,
          firstName,
          lastName,
          userType,
          role: role || 'user',
          isActive: true,
          emailVerified: true, // Auto-verify for admin-created accounts
        })
        .returning();

      const { 
        password: _, 
        verificationToken, 
        verificationTokenExpiry, 
        resetPasswordToken, 
        resetPasswordExpiry,
        ...userData 
      } = newUser;

      res.status(201).json(userData);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Update user details
  app.patch("/api/super-admin/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'support_manager']);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const targetUserId = req.params.id;
      const { email, firstName, lastName, password } = req.body;

      const updateData: any = { updatedAt: new Date() };

      if (email) {
        // Check if new email is already taken by another user
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .limit(1);

        if (existingUser && existingUser.id !== targetUserId) {
          return res.status(400).json({ message: "Email already in use" });
        }

        updateData.email = email.toLowerCase();
      }

      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (password) {
        updateData.password = await hashPassword(password);
      }

      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, targetUserId))
        .returning();

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { 
        password: _, 
        verificationToken, 
        verificationTokenExpiry, 
        resetPasswordToken, 
        resetPasswordExpiry,
        ...userData 
      } = updatedUser;

      res.json(userData);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Delete user
  app.delete("/api/super-admin/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'support_manager']);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const targetUserId = req.params.id;

      if (targetUserId === userId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      // Check if user exists
      const [userToDelete] = await db
        .select()
        .from(users)
        .where(eq(users.id, targetUserId))
        .limit(1);

      if (!userToDelete) {
        return res.status(404).json({ message: "User not found" });
      }

      // Delete user (this will cascade delete related data based on schema constraints)
      await db.delete(users).where(eq(users.id, targetUserId));

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Bulk delete users
  app.post("/api/super-admin/users/bulk-delete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'support_manager']);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { userIds } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ message: "userIds must be a non-empty array" });
      }

      // Prevent deleting self
      if (userIds.includes(userId)) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      // Delete users
      const result = await db.delete(users).where(
        or(...userIds.map(id => eq(users.id, id)))
      );

      res.json({ 
        message: `Successfully deleted ${userIds.length} user(s)`,
        count: userIds.length 
      });
    } catch (error) {
      console.error("Error bulk deleting users:", error);
      res.status(500).json({ message: "Failed to delete users" });
    }
  });

  // Bulk delete institutions
  app.post("/api/super-admin/institutions/bulk-delete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin']);
      
      if (!access) {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const { institutionIds } = req.body;

      if (!Array.isArray(institutionIds) || institutionIds.length === 0) {
        return res.status(400).json({ message: "institutionIds must be a non-empty array" });
      }

      // Delete institutions
      await db.delete(universities).where(
        or(...institutionIds.map(id => eq(universities.id, id)))
      );

      res.json({ 
        message: `Successfully deleted ${institutionIds.length} institution(s)`,
        count: institutionIds.length 
      });
    } catch (error) {
      console.error("Error bulk deleting institutions:", error);
      res.status(500).json({ message: "Failed to delete institutions" });
    }
  });

  // Bulk update institution status
  app.post("/api/super-admin/institutions/bulk-update-status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin']);
      
      if (!access) {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const { institutionIds, status } = req.body;

      if (!Array.isArray(institutionIds) || institutionIds.length === 0) {
        return res.status(400).json({ message: "institutionIds must be a non-empty array" });
      }

      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }

      // Update institutions
      await db.update(universities)
        .set({ approvalStatus: status, updatedAt: new Date() })
        .where(or(...institutionIds.map(id => eq(universities.id, id))));

      res.json({ 
        message: `Successfully updated ${institutionIds.length} institution(s) to ${status}`,
        count: institutionIds.length 
      });
    } catch (error) {
      console.error("Error bulk updating institutions:", error);
      res.status(500).json({ message: "Failed to update institutions" });
    }
  });

  // Bulk delete courses
  app.post("/api/super-admin/courses/bulk-delete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin']);
      
      if (!access) {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const { courseIds } = req.body;

      if (!Array.isArray(courseIds) || courseIds.length === 0) {
        return res.status(400).json({ message: "courseIds must be a non-empty array" });
      }

      // Delete courses
      await db.delete(courses).where(
        or(...courseIds.map(id => eq(courses.id, id)))
      );

      res.json({ 
        message: `Successfully deleted ${courseIds.length} course(s)`,
        count: courseIds.length 
      });
    } catch (error) {
      console.error("Error bulk deleting courses:", error);
      res.status(500).json({ message: "Failed to delete courses" });
    }
  });

  // Bulk update course status
  app.post("/api/super-admin/courses/bulk-update-status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin']);
      
      if (!access) {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const { courseIds, status } = req.body;

      if (!Array.isArray(courseIds) || courseIds.length === 0) {
        return res.status(400).json({ message: "courseIds must be a non-empty array" });
      }

      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }

      // Update courses
      await db.update(courses)
        .set({ approvalStatus: status, updatedAt: new Date() })
        .where(or(...courseIds.map(id => eq(courses.id, id))));

      res.json({ 
        message: `Successfully updated ${courseIds.length} course(s) to ${status}`,
        count: courseIds.length 
      });
    } catch (error) {
      console.error("Error bulk updating courses:", error);
      res.status(500).json({ message: "Failed to update courses" });
    }
  });

  // Get all institutions (for super admin)
  app.get("/api/super-admin/institutions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'support_manager']);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const allInstitutions = await storage.getAllUniversities();
      res.json(allInstitutions);
    } catch (error) {
      console.error("Error fetching institutions:", error);
      res.status(500).json({ message: "Failed to fetch institutions" });
    }
  });

  // Get AI extraction quota status
  app.get("/api/admin/ai-extraction/quota", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check if user has access to AI features
      const access = await checkAdminAccess(userId, ['super_admin']);
      
      if (!access) {
        return res.status(403).json({ 
          message: "Super admin access required" 
        });
      }

      // Get current quota status without consuming a request
      const now = Date.now();
      const userLimit = aiExtractionRateLimits.get(userId);
      const isSuperAdmin = true;
      const limit = isSuperAdmin ? 100 : getAIExtractionRateLimit();
      
      if (!userLimit || now > userLimit.resetTime) {
        // No current limit or expired - user has full quota
        return res.json({
          limit,
          remaining: limit,
          used: 0,
          resetTime: now + 60 * 60 * 1000,
          resetDate: new Date(now + 60 * 60 * 1000).toISOString()
        });
      }

      const remaining = Math.max(0, limit - userLimit.count);
      const resetDate = new Date(userLimit.resetTime);
      
      res.json({
        limit,
        remaining,
        used: userLimit.count,
        resetTime: userLimit.resetTime,
        resetDate: resetDate.toISOString()
      });
    } catch (error) {
      console.error("Error checking AI extraction quota:", error);
      res.status(500).json({ message: "Failed to check quota status" });
    }
  });

  // AI-powered institution data extraction from website
  // SECURITY: Restricted to super_admin only + rate limited due to SSRF risks
  // Only allows extraction from allowlisted educational domains (.edu, .ac.*, university/college domains)
  app.post("/api/admin/extract-institution-data", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // SECURITY: Restrict to super_admin only (most trusted role)
      const access = await checkAdminAccess(userId, ['super_admin']);
      
      if (!access) {
        return res.status(403).json({ 
          message: "Super admin access required. This feature is restricted for security reasons." 
        });
      }

      // SECURITY: Environment-aware rate limiting with super admin bypass
      const rateLimitResult = checkAIExtractionRateLimit(userId, true); // Super admins get higher limits
      
      if (!rateLimitResult.allowed) {
        const resetDate = new Date(rateLimitResult.resetTime);
        const minutesUntilReset = Math.ceil((rateLimitResult.resetTime - Date.now()) / 60000);
        
        console.log(`[Rate Limit] User ${userId} exceeded limit. Reset at ${resetDate.toISOString()}`);
        
        return res.status(429).json({ 
          message: `Rate limit exceeded. You can make ${rateLimitResult.limit} requests per hour. Please try again in ${minutesUntilReset} minutes.`,
          rateLimit: {
            limit: rateLimitResult.limit,
            remaining: 0,
            resetTime: rateLimitResult.resetTime,
            resetDate: resetDate.toISOString()
          }
        });
      }
      
      // Log successful rate limit check
      console.log(`[Rate Limit] User ${userId} - ${rateLimitResult.remaining}/${rateLimitResult.limit} requests remaining`);

      const { url } = req.body;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ message: "Website URL is required" });
      }

      // Validate URL format
      try {
        new URL(url);
      } catch {
        return res.status(400).json({ message: "Invalid URL format" });
      }

      // Extract data using AI
      const extractedData = await extractInstitutionDataFromWebsite(url);
      
      res.json({ 
        success: true,
        data: extractedData 
      });
    } catch (error: any) {
      console.error("Error extracting institution data:", error);
      
      // Handle AI configuration and OpenAI-specific errors
      if (error?.code === 'ai_not_configured' || error?.status === 503) {
        return res.status(503).json({ 
          message: "AI features are not yet configured. OpenAI integration will be set up in a later stage of platform development." 
        });
      }
      
      if (error?.error?.code === 'insufficient_quota' || error?.status === 429) {
        return res.status(429).json({ 
          message: "OpenAI API quota exceeded. Please add credits to your OpenAI account at platform.openai.com/settings/organization/billing" 
        });
      }
      
      if (error?.error?.code === 'invalid_api_key') {
        return res.status(401).json({ 
          message: "Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable." 
        });
      }
      
      res.status(500).json({ 
        message: error.message || "Failed to extract institution data. Please try again." 
      });
    }
  });

  // AI-powered course data extraction from website
  // SECURITY: Restricted to super_admin only + rate limited due to SSRF risks
  // Only allows extraction from allowlisted educational domains (.edu, .ac.*, university/college domains)
  app.post("/api/admin/extract-course-data", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // SECURITY: Restrict to super_admin only (most trusted role)
      const access = await checkAdminAccess(userId, ['super_admin']);
      
      if (!access) {
        return res.status(403).json({ 
          message: "Super admin access required. This feature is restricted for security reasons." 
        });
      }

      // SECURITY: Environment-aware rate limiting with super admin bypass
      const rateLimitResult = checkAIExtractionRateLimit(userId, true); // Super admins get higher limits
      
      if (!rateLimitResult.allowed) {
        const resetDate = new Date(rateLimitResult.resetTime);
        const minutesUntilReset = Math.ceil((rateLimitResult.resetTime - Date.now()) / 60000);
        
        console.log(`[Rate Limit] User ${userId} exceeded limit. Reset at ${resetDate.toISOString()}`);
        
        return res.status(429).json({ 
          message: `Rate limit exceeded. You can make ${rateLimitResult.limit} requests per hour. Please try again in ${minutesUntilReset} minutes.`,
          rateLimit: {
            limit: rateLimitResult.limit,
            remaining: 0,
            resetTime: rateLimitResult.resetTime,
            resetDate: resetDate.toISOString()
          }
        });
      }
      
      // Log successful rate limit check
      console.log(`[Rate Limit] User ${userId} - ${rateLimitResult.remaining}/${rateLimitResult.limit} requests remaining`);

      const { url } = req.body;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ message: "Course website URL is required" });
      }

      // Validate URL format
      try {
        new URL(url);
      } catch {
        return res.status(400).json({ message: "Invalid URL format" });
      }

      // Extract data using AI
      const extractedData = await extractCourseDataFromWebsite(url);
      
      res.json({ 
        success: true,
        data: extractedData 
      });
    } catch (error: any) {
      console.error("Error extracting course data:", error);
      
      // Handle AI configuration and OpenAI-specific errors
      if (error?.code === 'ai_not_configured' || error?.status === 503) {
        return res.status(503).json({ 
          message: "AI features are not yet configured. OpenAI integration will be set up in a later stage of platform development." 
        });
      }
      
      if (error?.error?.code === 'insufficient_quota' || error?.status === 429) {
        return res.status(429).json({ 
          message: "OpenAI API quota exceeded. Please add credits to your OpenAI account at platform.openai.com/settings/organization/billing" 
        });
      }
      
      if (error?.error?.code === 'invalid_api_key') {
        return res.status(401).json({ 
          message: "Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable." 
        });
      }
      
      res.status(500).json({ 
        message: error.message || "Failed to extract course data. Please try again." 
      });
    }
  });

  // Create new institution
  app.post("/api/super-admin/institutions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'support_manager']);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const {
        name,
        description,
        country,
        contactEmail,
        contactPhone,
        website,
        userId: institutionUserId,
        providerType,
        numberOfCampuses,
        establishedYear,
        scholarshipPercentageMin,
        scholarshipPercentageMax,
        topDisciplines,
        logo,
        topCourses,
        institutionGallery,
        campusAddresses,
        hasScholarship,
        smallDescription,
        fullDescription,
        tuitionFeesMin,
        tuitionFeesMax,
        tuitionCurrency,
        deliveryModes,
        intakePeriods,
        accreditationStatus,
        rankingBand,
        facilities,
        internationalStudentSupport,
        tags,
      } = req.body;

      if (!name || !country) {
        return res.status(400).json({ message: "Name and country are required" });
      }

      // If userId is provided, verify the user exists and is university type
      if (institutionUserId) {
        const institutionUser = await storage.getUser(institutionUserId);
        if (!institutionUser) {
          return res.status(400).json({ message: "Specified user does not exist" });
        }
        if (institutionUser.userType !== 'university') {
          return res.status(400).json({ message: "User must be of type 'university'" });
        }
      }

      const newInstitution = await storage.createUniversity({
        name,
        description: description || null,
        country,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        website: website || null,
        userId: institutionUserId || null,
        providerType: providerType || null,
        numberOfCampuses: numberOfCampuses || null,
        establishedYear: establishedYear || null,
        scholarshipPercentageMin: scholarshipPercentageMin || null,
        scholarshipPercentageMax: scholarshipPercentageMax || null,
        topDisciplines: topDisciplines || null,
        logo: logo || null,
        topCourses: topCourses || null,
        institutionGallery: institutionGallery || null,
        campusAddresses: campusAddresses || null,
        smallDescription: smallDescription || null,
        fullDescription: fullDescription || null,
        tuitionFeesMin: tuitionFeesMin || null,
        tuitionFeesMax: tuitionFeesMax || null,
        tuitionCurrency: tuitionCurrency || "AUD",
        deliveryModes: deliveryModes || null,
        intakePeriods: intakePeriods || null,
        accreditationStatus: accreditationStatus || null,
        rankingBand: rankingBand || null,
        facilities: facilities || null,
        internationalStudentSupport: internationalStudentSupport || null,
        tags: tags || null,
      });

      // Trigger async knowledge base rebuild
      triggerKnowledgeBaseRebuild('super-admin institution creation');

      res.status(201).json(newInstitution);
    } catch (error) {
      console.error("Error creating institution:", error);
      res.status(500).json({ message: "Failed to create institution" });
    }
  });

  // Update institution
  app.patch("/api/super-admin/institutions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'support_manager']);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const institutionId = req.params.id;
      const updateData = req.body;

      // If userId is being updated, verify the user exists and is university type
      if (updateData.userId) {
        const institutionUser = await storage.getUser(updateData.userId);
        if (!institutionUser) {
          return res.status(400).json({ message: "Specified user does not exist" });
        }
        if (institutionUser.userType !== 'university') {
          return res.status(400).json({ message: "User must be of type 'university'" });
        }
      }

      const updatedInstitution = await storage.updateUniversity(institutionId, updateData);
      
      // Trigger async knowledge base rebuild
      triggerKnowledgeBaseRebuild('super-admin institution update');
      
      res.json(updatedInstitution);
    } catch (error) {
      console.error("Error updating institution:", error);
      res.status(500).json({ message: "Failed to update institution" });
    }
  });

  // Delete institution
  app.delete("/api/super-admin/institutions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'support_manager']);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const institutionId = req.params.id;

      // Check if institution exists
      const institution = await storage.getUniversityById(institutionId);
      if (!institution) {
        return res.status(404).json({ message: "Institution not found" });
      }

      // Delete institution (this will cascade delete related courses based on schema constraints)
      await db.delete(universities).where(eq(universities.id, institutionId));

      // Trigger async knowledge base rebuild (remove deleted institution and its courses from AI)
      triggerKnowledgeBaseRebuild('institution deletion');

      res.json({ message: "Institution deleted successfully" });
    } catch (error) {
      console.error("Error deleting institution:", error);
      res.status(500).json({ message: "Failed to delete institution" });
    }
  });

  // Toggle institution active status
  app.patch("/api/super-admin/institutions/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'support_manager']);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const institutionId = req.params.id;
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: "isActive must be a boolean" });
      }

      const updatedInstitution = await storage.updateUniversity(institutionId, { isActive });
      
      // Trigger async knowledge base rebuild (active/inactive affects AI visibility)
      triggerKnowledgeBaseRebuild('institution status toggle');
      
      res.json(updatedInstitution);
    } catch (error) {
      console.error("Error updating institution status:", error);
      res.status(500).json({ message: "Failed to update institution status" });
    }
  });

  // Approve institution
  app.patch("/api/super-admin/institutions/:id/approve", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'support_manager']);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const institutionId = req.params.id;
      
      // Get the institution to notify the owner
      const institution = await storage.getUniversityById(institutionId);
      if (!institution) {
        return res.status(404).json({ message: "Institution not found" });
      }

      // Update approval status
      const updatedInstitution = await storage.updateUniversity(institutionId, { 
        approvalStatus: 'approved',
        approvedAt: new Date(),
        approvedBy: userId
      });

      // Notify the institution owner
      if (institution.userId) {
        await createNotification({
          userId: institution.userId,
          type: 'institution_approved',
          title: 'Institution Approved',
          message: `Your institution "${institution.name}" has been approved and is now publicly visible`,
          link: `/university/profile`,
          metadata: {
            institutionId: institution.id,
            institutionName: institution.name,
            approvedBy: userId
          }
        });
      }

      res.json(updatedInstitution);
    } catch (error) {
      console.error("Error approving institution:", error);
      res.status(500).json({ message: "Failed to approve institution" });
    }
  });

  // Reject institution
  app.patch("/api/super-admin/institutions/:id/reject", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'support_manager']);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const institutionId = req.params.id;
      const { rejectionReason } = req.body;
      
      // Get the institution to notify the owner
      const institution = await storage.getUniversityById(institutionId);
      if (!institution) {
        return res.status(404).json({ message: "Institution not found" });
      }

      // Update approval status
      const updatedInstitution = await storage.updateUniversity(institutionId, { 
        approvalStatus: 'rejected',
        rejectionReason: rejectionReason || null
      });

      // Notify the institution owner
      if (institution.userId) {
        await createNotification({
          userId: institution.userId,
          type: 'institution_rejected',
          title: 'Institution Requires Changes',
          message: `Your institution "${institution.name}" requires updates. ${rejectionReason || 'Please review and resubmit.'}`,
          link: `/university/profile`,
          metadata: {
            institutionId: institution.id,
            institutionName: institution.name,
            rejectionReason: rejectionReason || null
          }
        });
      }

      res.json(updatedInstitution);
    } catch (error) {
      console.error("Error rejecting institution:", error);
      res.status(500).json({ message: "Failed to reject institution" });
    }
  });

  // Get all courses (for super admin)
  app.get("/api/super-admin/courses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'support_manager', 'support_staff']);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const [allCourses, allInstitutions] = await Promise.all([
        db.select().from(courses),
        storage.getAllUniversities()
      ]);

      // Add institution name to each course
      const coursesWithInstitution = allCourses.map(course => {
        const institution = allInstitutions.find(i => i.id === course.universityId);
        return {
          ...course,
          institutionName: institution?.name || 'Unknown'
        };
      });

      res.json(coursesWithInstitution);
    } catch (error) {
      console.error("Error fetching courses:", error);
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  // Create new course
  app.post("/api/super-admin/courses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'support_manager']);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Validate and normalize course data (converts empty strings to undefined for numeric fields)
      const validationResult = insertCourseSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid course data", 
          errors: validationResult.error.errors 
        });
      }

      const courseData = validationResult.data;

      // Verify institution exists
      const institution = await storage.getUniversityById(courseData.universityId);
      if (!institution) {
        return res.status(400).json({ message: "Institution not found" });
      }

      const newCourse = await storage.createCourse(courseData);
      res.status(201).json(newCourse);
    } catch (error) {
      console.error("Error creating course:", error);
      res.status(500).json({ message: "Failed to create course" });
    }
  });

  // Update course
  app.patch("/api/super-admin/courses/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'support_manager']);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const courseId = req.params.id;
      const rawData = req.body;
      
      // Sanitize data: convert empty strings to null for all typed fields
      const integerFields = [
        'durationMonths', 'durationWeeks', 
        'scholarshipPercentageMin', 'scholarshipPercentageMax', 
        'minimumAge'
      ];
      
      const decimalFields = [
        'fees', 'costOfLiving', 'applicationFees'
      ];
      
      // Enum and other fields that can't accept empty strings
      const nullableStringFields = [
        'discipline', 'subDiscipline', 'level', 'approvalStatus'
      ];
      
      const updateData: Record<string, any> = { ...rawData };
      
      // Handle integer fields
      for (const field of integerFields) {
        if (field in updateData && (updateData[field] === '' || updateData[field] === null)) {
          updateData[field] = null;
        } else if (field in updateData && typeof updateData[field] === 'string') {
          const parsed = parseInt(updateData[field], 10);
          updateData[field] = isNaN(parsed) ? null : parsed;
        }
      }
      
      // Handle decimal fields
      for (const field of decimalFields) {
        if (field in updateData && (updateData[field] === '' || updateData[field] === null)) {
          updateData[field] = null;
        } else if (field in updateData && typeof updateData[field] === 'string') {
          const parsed = parseFloat(updateData[field]);
          updateData[field] = isNaN(parsed) ? null : parsed.toString();
        }
      }
      
      // Handle enum/nullable string fields - convert empty strings to null
      for (const field of nullableStringFields) {
        if (field in updateData && updateData[field] === '') {
          updateData[field] = null;
        }
      }

      // If universityId is being updated, verify the institution exists
      if (updateData.universityId) {
        const institution = await storage.getUniversityById(updateData.universityId);
        if (!institution) {
          return res.status(400).json({ message: "Institution not found" });
        }
      }

      const updatedCourse = await storage.updateCourse(courseId, updateData);
      
      // Trigger async knowledge base rebuild
      triggerKnowledgeBaseRebuild('super-admin course update');
      
      res.json(updatedCourse);
    } catch (error) {
      console.error("Error updating course:", error);
      res.status(500).json({ message: "Failed to update course" });
    }
  });

  // Delete course
  app.delete("/api/super-admin/courses/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'support_manager']);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const courseId = req.params.id;

      // Check if course exists
      const course = await storage.getCourseById(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      await storage.deleteCourse(courseId);
      
      // Trigger async knowledge base rebuild (remove deleted course from AI)
      triggerKnowledgeBaseRebuild('course deletion');
      
      res.json({ message: "Course deleted successfully" });
    } catch (error) {
      console.error("Error deleting course:", error);
      res.status(500).json({ message: "Failed to delete course" });
    }
  });

  // Toggle course active status
  app.patch("/api/super-admin/courses/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'support_manager']);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const courseId = req.params.id;
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: "isActive must be a boolean" });
      }

      const updatedCourse = await storage.updateCourse(courseId, { isActive });
      
      // Trigger async knowledge base rebuild (active/inactive affects AI visibility)
      triggerKnowledgeBaseRebuild('course status toggle');
      
      res.json(updatedCourse);
    } catch (error) {
      console.error("Error updating course status:", error);
      res.status(500).json({ message: "Failed to update course status" });
    }
  });

  // Get all student leads (student profiles)
  app.get("/api/super-admin/student-leads", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'support_manager', 'support_staff']);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const allUsers = await storage.getAllUsers();
      const students = allUsers.filter(u => u.userType === 'student');

      const studentLeads = await Promise.all(
        students.map(async (student) => {
          const profile = await storage.getStudentProfileByUserId(student.id);
          return {
            userId: student.id,
            email: student.email,
            firstName: profile?.firstName || student.firstName,
            lastName: profile?.lastName || student.lastName,
            phone: profile?.phone,
            nationality: profile?.nationality,
            country: profile?.country,
            educationLevel: profile?.educationLevel,
            fieldOfStudy: profile?.fieldOfStudy,
            createdAt: student.createdAt,
            profileComplete: !!profile,
          };
        })
      );

      res.json(studentLeads);
    } catch (error) {
      console.error("Error fetching student leads:", error);
      res.status(500).json({ message: "Failed to fetch student leads" });
    }
  });

  // Get all inquiry leads (information requests from course pages)
  app.get("/api/admin/leads", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'support_manager', 'support_staff']);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Get filter parameters from query
      const filters: any = {};
      if (req.query.status) filters.status = req.query.status;
      if (req.query.courseId) filters.courseId = req.query.courseId;
      if (req.query.universityId) filters.universityId = req.query.universityId;

      const leads = await storage.getAllLeads(filters);

      // Enrich leads with course and university information
      const enrichedLeads = await Promise.all(
        leads.map(async (lead) => {
          const [course, university] = await Promise.all([
            storage.getCourseById(lead.courseId),
            storage.getUniversityById(lead.universityId),
          ]);

          return {
            ...lead,
            course: course ? {
              id: course.id,
              title: course.title,
              level: course.level,
              subject: course.subject,
            } : null,
            university: university ? {
              id: university.id,
              name: university.name,
            } : null,
          };
        })
      );

      res.json(enrichedLeads);
    } catch (error) {
      console.error("Error fetching inquiry leads:", error);
      res.status(500).json({ message: "Failed to fetch inquiry leads" });
    }
  });

  // Update inquiry lead status and notes
  app.patch("/api/admin/leads/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'support_manager']);
      
      if (!access) {
        return res.status(403).json({ message: "Only super admins and support managers can update leads" });
      }

      const leadId = req.params.id;
      const { status, notes } = req.body;

      const updateData: any = {};
      if (status) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;

      const updatedLead = await storage.updateLead(leadId, updateData);

      // Fetch related data for response
      const [course, university] = await Promise.all([
        storage.getCourseById(updatedLead.courseId),
        storage.getUniversityById(updatedLead.universityId),
      ]);

      res.json({
        ...updatedLead,
        course: course ? {
          id: course.id,
          title: course.title,
          level: course.level,
          subject: course.subject,
        } : null,
        university: university ? {
          id: university.id,
          name: university.name,
        } : null,
      });
    } catch (error) {
      console.error("Error updating inquiry lead:", error);
      res.status(500).json({ message: "Failed to update inquiry lead" });
    }
  });

  // ============================================
  // Contact Submission Routes
  // ============================================
  
  // Public contact form submission endpoint (no auth required)
  // TODO: Add rate limiting to prevent spam/abuse
  app.post("/api/public/contact", async (req, res) => {
    try {
      // Normalize and sanitize input BEFORE validation
      const normalizedInput = {
        ...req.body,
        name: req.body.name?.trim() || '',
        email: req.body.email?.trim().toLowerCase() || '',
        phone: req.body.phone?.trim() || '',
        subject: req.body.subject?.trim() || '',
        message: req.body.message?.trim() || '',
        category: req.body.category?.trim() || 'general',
      };
      
      // Validate normalized input
      const contactData = insertContactSubmissionSchema.parse(normalizedInput);
      
      // Create the contact submission
      const submission = await storage.createContactSubmission(contactData);
      
      // Create notifications for all admins and consultants
      const adminUsers = await db.select().from(users).where(eq(users.userType, 'admin'));
      const adminTeamMembers = await storage.getAllAdminTeamMembers();
      
      const notificationRecords = [];
      
      // Notify admin users
      for (const admin of adminUsers) {
        notificationRecords.push({
          userId: admin.id,
          type: 'contact_submission',
          title: 'New Contact Form Submission',
          message: `${contactData.name} submitted a ${contactData.category} inquiry`,
          link: '/admin/contact',
          metadata: { submissionId: submission.id, category: contactData.category },
        });
      }
      
      // Notify consultant team members
      for (const member of adminTeamMembers) {
        notificationRecords.push({
          userId: member.userId,
          type: 'contact_submission',
          title: 'New Contact Form Submission',
          message: `${contactData.name} submitted a ${contactData.category} inquiry`,
          link: '/admin/contact',
          metadata: { submissionId: submission.id, category: contactData.category },
        });
      }
      
      // Batch insert notifications
      if (notificationRecords.length > 0) {
        await db.insert(notifications).values(notificationRecords);
      }
      
      res.status(201).json({ message: "Thank you for contacting us! We'll respond shortly." });
    } catch (error: any) {
      console.error("Error creating contact submission:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to submit contact form" });
    }
  });

  // Get all contact submissions (admin only)
  app.get("/api/admin/contact", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'support_manager', 'support_staff']);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Get filter parameters from query
      const filters: any = {};
      if (req.query.status) filters.status = req.query.status;
      if (req.query.category) filters.category = req.query.category;
      if (req.query.assignedTo) filters.assignedTo = req.query.assignedTo;

      const submissions = await storage.getAllContactSubmissions(filters);

      // Enrich submissions with assigned user information
      const enrichedSubmissions = await Promise.all(
        submissions.map(async (submission) => {
          let assignedUser = null;
          if (submission.assignedTo) {
            assignedUser = await storage.getUser(submission.assignedTo);
          }

          return {
            ...submission,
            assignedUser: assignedUser ? {
              id: assignedUser.id,
              firstName: assignedUser.firstName,
              lastName: assignedUser.lastName,
              email: assignedUser.email,
            } : null,
          };
        })
      );

      res.json(enrichedSubmissions);
    } catch (error) {
      console.error("Error fetching contact submissions:", error);
      res.status(500).json({ message: "Failed to fetch contact submissions" });
    }
  });

  // Update contact submission (admin only)
  app.patch("/api/admin/contact/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'support_manager']);
      
      if (!access) {
        return res.status(403).json({ message: "Only super admins and support managers can update contact submissions" });
      }

      const submissionId = req.params.id;
      const { status, priority, assignedTo, notes } = req.body;

      const updateData: any = {};
      if (status) updateData.status = status;
      if (priority) updateData.priority = priority;
      if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
      if (notes !== undefined) updateData.notes = notes;

      const updatedSubmission = await storage.updateContactSubmission(submissionId, updateData);

      // Create notification if assigned to a user
      if (assignedTo) {
        await db.insert(notifications).values({
          userId: assignedTo,
          type: 'contact_assigned',
          title: 'Contact Submission Assigned',
          message: `You have been assigned a ${updatedSubmission.category} inquiry from ${updatedSubmission.name}`,
          link: '/admin/contact',
          metadata: { submissionId: updatedSubmission.id },
        });
      }

      // Fetch assigned user data for response
      let assignedUser = null;
      if (updatedSubmission.assignedTo) {
        assignedUser = await storage.getUser(updatedSubmission.assignedTo);
      }

      res.json({
        ...updatedSubmission,
        assignedUser: assignedUser ? {
          id: assignedUser.id,
          firstName: assignedUser.firstName,
          lastName: assignedUser.lastName,
          email: assignedUser.email,
        } : null,
      });
    } catch (error) {
      console.error("Error updating contact submission:", error);
      res.status(500).json({ message: "Failed to update contact submission" });
    }
  });

  // Delete contact submission (super admin only)
  app.delete("/api/admin/contact/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin']);
      
      if (!access) {
        return res.status(403).json({ message: "Only super admins can delete contact submissions" });
      }

      const submissionId = req.params.id;
      await storage.deleteContactSubmission(submissionId);

      res.json({ message: "Contact submission deleted successfully" });
    } catch (error) {
      console.error("Error deleting contact submission:", error);
      res.status(500).json({ message: "Failed to delete contact submission" });
    }
  });

  // Get all applications
  app.get("/api/super-admin/applications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'support_manager', 'support_staff']);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const allApplications = await db.select().from(applications);

      const enrichedApplications = await Promise.all(
        allApplications.map(async (app) => {
          const [studentProfile, course] = await Promise.all([
            db.select().from(studentProfiles).where(eq(studentProfiles.id, app.studentId)).then(r => r[0]),
            storage.getCourseById(app.courseId),
          ]);

          let university = null;
          if (course) {
            university = await storage.getUniversityById(course.universityId);
          }

          const studentUser = studentProfile?.userId 
            ? await storage.getUser(studentProfile.userId) 
            : null;

          return {
            id: app.id,
            status: app.status,
            createdAt: app.createdAt,
            personalStatement: app.personalStatement,
            additionalInfo: app.additionalInfo,
            student: {
              id: studentProfile?.id,
              name: `${studentProfile?.firstName || ''} ${studentProfile?.lastName || ''}`.trim() || 'Unknown',
              email: studentUser?.email,
              nationality: studentProfile?.nationality,
            },
            course: {
              id: course?.id,
              title: course?.title || 'Unknown Course',
              level: course?.level,
              subject: course?.subject,
            },
            university: {
              id: university?.id,
              name: university?.name || 'Unknown University',
            },
          };
        })
      );

      res.json(enrichedApplications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  // ===== CHAT ROUTES =====
  
  // Get total unread message count for current user
  app.get("/api/conversations/unread-count", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user.claims?.sub || user.id;
      
      // Count all unread messages where current user is the recipient
      const unreadMessages = await db
        .select()
        .from(messages)
        .innerJoin(conversations, eq(messages.conversationId, conversations.id))
        .where(
          and(
            eq(messages.isRead, false),
            not(eq(messages.senderId, userId)), // Not sent by current user
            or(
              eq(conversations.participant1Id, userId),
              eq(conversations.participant2Id, userId)
            )
          )
        );
      
      res.json({ count: unreadMessages.length });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });
  
  // Get all conversations for current user
  app.get("/api/conversations", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user.claims?.sub || user.id;
      
      // Find all conversations where user is participant1 or participant2
      const userConversations = await db
        .select()
        .from(conversations)
        .where(
          or(
            eq(conversations.participant1Id, userId),
            eq(conversations.participant2Id, userId)
          )
        )
        .orderBy(desc(conversations.lastMessageAt));
      
      // Get participant details and unread count for each conversation
      const enrichedConversations = await Promise.all(
        userConversations.map(async (conv) => {
          // Get the other participant's ID
          const otherParticipantId = conv.participant1Id === userId 
            ? conv.participant2Id 
            : conv.participant1Id;
          
          // Get other participant details
          const otherUser = await db
            .select()
            .from(users)
            .where(eq(users.id, otherParticipantId))
            .limit(1);
          
          // Count unread messages in this conversation
          const unreadMessages = await db
            .select()
            .from(messages)
            .where(
              and(
                eq(messages.conversationId, conv.id),
                eq(messages.isRead, false),
                eq(messages.senderId, otherParticipantId) // Only count messages sent by other user
              )
            );
          
          // Get last message in conversation
          const lastMessage = await db
            .select()
            .from(messages)
            .where(eq(messages.conversationId, conv.id))
            .orderBy(desc(messages.createdAt))
            .limit(1);
          
          return {
            ...conv,
            otherParticipant: otherUser[0] || null,
            unreadCount: unreadMessages.length,
            lastMessage: lastMessage[0] || null,
          };
        })
      );
      
      res.json(enrichedConversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });
  
  // Get or create conversation with another user
  app.post("/api/conversations", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user.claims?.sub || user.id;
      const { otherUserId } = req.body;
      
      if (!otherUserId) {
        return res.status(400).json({ message: "otherUserId is required" });
      }
      
      if (otherUserId === userId) {
        return res.status(400).json({ message: "Cannot create conversation with yourself" });
      }
      
      // Get current user details to check userType
      const currentUser = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (!currentUser[0]) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // RESTRICTION: Students cannot initiate conversations
      if (currentUser[0].userType === 'student') {
        return res.status(403).json({ 
          message: "Students cannot initiate conversations. Please wait for a university or platform administrator to contact you." 
        });
      }
      
      // Get other user details
      const otherUser = await db
        .select()
        .from(users)
        .where(eq(users.id, otherUserId))
        .limit(1);
      
      if (!otherUser[0]) {
        return res.status(404).json({ message: "Recipient user not found" });
      }
      
      // RESTRICTION: If university is messaging a student, verify student has submitted an application
      if (currentUser[0].userType === 'university' && otherUser[0].userType === 'student') {
        // Get student profile from user ID
        const studentProfile = await db
          .select()
          .from(studentProfiles)
          .where(eq(studentProfiles.userId, otherUserId))
          .limit(1);
        
        if (!studentProfile[0]) {
          return res.status(404).json({ message: "Student profile not found" });
        }
        
        // Check if student has submitted any application to courses from this university
        // Need to join applications -> courses to check course.universityId
        const studentApplications = await db
          .select()
          .from(applications)
          .innerJoin(courses, eq(applications.courseId, courses.id))
          .where(
            and(
              eq(applications.studentId, studentProfile[0].id),
              eq(courses.universityId, userId)
            )
          )
          .limit(1);
        
        if (studentApplications.length === 0) {
          return res.status(403).json({ 
            message: "Can only message students who have submitted applications to your institution." 
          });
        }
      }
      
      // Admins can message anyone (no restrictions)
      
      // Check if conversation already exists (in either direction)
      const existingConversation = await db
        .select()
        .from(conversations)
        .where(
          or(
            and(
              eq(conversations.participant1Id, userId),
              eq(conversations.participant2Id, otherUserId)
            ),
            and(
              eq(conversations.participant1Id, otherUserId),
              eq(conversations.participant2Id, userId)
            )
          )
        )
        .limit(1);
      
      if (existingConversation.length > 0) {
        return res.json(existingConversation[0]);
      }
      
      // Create new conversation
      const newConversation = await db
        .insert(conversations)
        .values({
          participant1Id: userId,
          participant2Id: otherUserId,
        })
        .returning();
      
      res.json(newConversation[0]);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });
  
  // Get messages for a conversation
  app.get("/api/conversations/:id/messages", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user.claims?.sub || user.id;
      const conversationId = req.params.id;
      
      // Verify user is participant in this conversation
      const conversation = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);
      
      if (conversation.length === 0) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      if (
        conversation[0].participant1Id !== userId &&
        conversation[0].participant2Id !== userId
      ) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get all messages for this conversation
      const conversationMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(messages.createdAt);
      
      res.json(conversationMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });
  
  // Mark message as read
  app.patch("/api/messages/:id/read", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user.claims?.sub || user.id;
      const messageId = req.params.id;
      
      // Get message and verify it exists
      const message = await db
        .select()
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);
      
      if (message.length === 0) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      // Verify user is the recipient (not the sender)
      if (message[0].senderId === userId) {
        return res.status(400).json({ message: "Cannot mark own message as read" });
      }
      
      // Get conversation and verify user is participant
      const conversation = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, message[0].conversationId))
        .limit(1);
      
      if (
        conversation.length === 0 ||
        (conversation[0].participant1Id !== userId &&
          conversation[0].participant2Id !== userId)
      ) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Mark as read
      const updatedMessage = await db
        .update(messages)
        .set({ isRead: true })
        .where(eq(messages.id, messageId))
        .returning();
      
      res.json(updatedMessage[0]);
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });
  
  // Mark all messages in a conversation as read
  app.patch("/api/conversations/:id/mark-read", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user.claims?.sub || user.id;
      const conversationId = req.params.id;
      
      // Verify user is participant in this conversation
      const conversation = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);
      
      if (conversation.length === 0) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      if (
        conversation[0].participant1Id !== userId &&
        conversation[0].participant2Id !== userId
      ) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Mark all unread messages from the other participant as read
      const otherParticipantId = conversation[0].participant1Id === userId
        ? conversation[0].participant2Id
        : conversation[0].participant1Id;
      
      await db
        .update(messages)
        .set({ isRead: true })
        .where(
          and(
            eq(messages.conversationId, conversationId),
            eq(messages.senderId, otherParticipantId),
            eq(messages.isRead, false)
          )
        );
      
      res.json({ message: "All messages marked as read" });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({ message: "Failed to mark messages as read" });
    }
  });

  // ========================================
  // BLOG ROUTES
  // ========================================

  // Get all blogs (admin only - includes drafts)
  app.get("/api/admin/blogs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { status, category, authorId } = req.query;
      const blogs = await storage.getAllBlogs({ 
        status: status as string, 
        category: category as string,
        authorId: authorId as string 
      });
      
      res.json(blogs);
    } catch (error) {
      console.error("Error fetching blogs:", error);
      res.status(500).json({ message: "Failed to fetch blogs" });
    }
  });

  // Get single blog by ID (admin only)
  app.get("/api/admin/blogs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const blog = await storage.getBlogById(req.params.id);
      if (!blog) {
        return res.status(404).json({ message: "Blog not found" });
      }
      
      res.json(blog);
    } catch (error) {
      console.error("Error fetching blog:", error);
      res.status(500).json({ message: "Failed to fetch blog" });
    }
  });

  // Create new blog post (admin only)
  app.post("/api/admin/blogs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const blogData = insertBlogSchema.parse(req.body);
      
      // Check if slug already exists
      const existingBlog = await storage.getBlogBySlug(blogData.slug);
      if (existingBlog) {
        return res.status(400).json({ message: "A blog with this slug already exists" });
      }

      const newBlog = await storage.createBlog({
        ...blogData,
        authorId: userId,
      } as any);
      
      res.status(201).json(newBlog);
    } catch (error) {
      console.error("Error creating blog:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create blog" });
    }
  });

  // Update blog post (admin only)
  app.patch("/api/admin/blogs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const blog = await storage.getBlogById(req.params.id);
      if (!blog) {
        return res.status(404).json({ message: "Blog not found" });
      }

      // If slug is being changed, check for duplicates
      if (req.body.slug && req.body.slug !== blog.slug) {
        const existingBlog = await storage.getBlogBySlug(req.body.slug);
        if (existingBlog) {
          return res.status(400).json({ message: "A blog with this slug already exists" });
        }
      }

      const updatedBlog = await storage.updateBlog(req.params.id, req.body);
      res.json(updatedBlog);
    } catch (error) {
      console.error("Error updating blog:", error);
      res.status(500).json({ message: "Failed to update blog" });
    }
  });

  // Publish blog post (admin only)
  app.post("/api/admin/blogs/:id/publish", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const blog = await storage.getBlogById(req.params.id);
      if (!blog) {
        return res.status(404).json({ message: "Blog not found" });
      }

      const publishedBlog = await storage.publishBlog(req.params.id);
      res.json(publishedBlog);
    } catch (error) {
      console.error("Error publishing blog:", error);
      res.status(500).json({ message: "Failed to publish blog" });
    }
  });

  // Unpublish blog post (admin only)
  app.post("/api/admin/blogs/:id/unpublish", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const blog = await storage.getBlogById(req.params.id);
      if (!blog) {
        return res.status(404).json({ message: "Blog not found" });
      }

      const unpublishedBlog = await storage.unpublishBlog(req.params.id);
      res.json(unpublishedBlog);
    } catch (error) {
      console.error("Error unpublishing blog:", error);
      res.status(500).json({ message: "Failed to unpublish blog" });
    }
  });

  // Delete blog post (admin only)
  app.delete("/api/admin/blogs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const blog = await storage.getBlogById(req.params.id);
      if (!blog) {
        return res.status(404).json({ message: "Blog not found" });
      }

      await storage.deleteBlog(req.params.id);
      res.json({ message: "Blog deleted successfully" });
    } catch (error) {
      console.error("Error deleting blog:", error);
      res.status(500).json({ message: "Failed to delete blog" });
    }
  });

  // Seed blog posts (admin only) - Creates 10 SEO-friendly blog posts about International Education
  app.post("/api/admin/blogs/seed", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const blogPosts = [
        {
          title: "Top 10 Reasons Why International Students Choose Australia for Higher Education",
          slug: "top-reasons-international-students-choose-australia",
          excerpt: "Discover why over 750,000 international students choose Australia as their study destination. From world-class universities to post-study work opportunities.",
          content: `# Top 10 Reasons Why International Students Choose Australia for Higher Education

Australia has become one of the world's most popular destinations for international students, hosting over 750,000 students from across the globe. But what makes Australia so attractive for higher education?

## 1. World-Class Universities

Australia is home to 43 universities, with 7 consistently ranked in the global top 100. Institutions like the University of Melbourne, Australian National University, and the University of Sydney offer cutting-edge research and teaching excellence.

## 2. Globally Recognized Qualifications

Australian degrees are recognized and respected worldwide. The Australian Qualifications Framework (AQF) ensures that all qualifications meet rigorous quality standards.

## 3. Diverse Range of Courses

From engineering to healthcare, business to creative arts, Australian institutions offer over 22,000 courses across all fields of study. Whether you're pursuing undergraduate, postgraduate, or vocational training, you'll find the right program.

## 4. Post-Study Work Opportunities

The Temporary Graduate visa (subclass 485) allows international graduates to work in Australia for 2-4 years after completing their studies. This valuable work experience enhances your career prospects globally.

## 5. Multicultural Society

Australia is one of the world's most multicultural nations, with residents from over 200 countries. International students feel welcome and find communities that share their cultural background.

## 6. High Quality of Life

Australian cities consistently rank among the world's most liveable. With excellent healthcare, low crime rates, and beautiful natural environments, students enjoy a high quality of life.

## 7. Support Services for Students

Australian institutions provide comprehensive support services including academic assistance, career counseling, mental health support, and accommodation services specifically designed for international students.

## 8. Work While You Study

International students can work up to 48 hours per fortnight during semester, with unlimited hours during breaks. This helps offset living costs while gaining valuable work experience.

## 9. Pathway to Permanent Residency

Australia offers clear pathways from student visa to permanent residency for skilled graduates. Many courses are aligned with occupations on the skilled occupation list.

## 10. Beautiful Climate and Lifestyle

From Sydney's beaches to Melbourne's culture, Brisbane's sunshine to Perth's natural beauty, Australia offers an incredible lifestyle that combines study with adventure.

## Start Your Australian Education Journey

Ready to take the next step? Contact ANZ Global Education to explore courses and universities that match your goals and aspirations.`,
          category: "Study in Australia",
          tags: ["international students", "australian universities", "study abroad", "higher education", "student visa"],
          metaTitle: "Top 10 Reasons International Students Choose Australia | Study in Australia",
          metaDescription: "Discover why 750,000+ international students choose Australia. World-class universities, work opportunities, and pathways to residency await.",
          featuredImageUrl: "/attached_assets/stock_images/international_studen_c500be12.jpg",
          ogImageUrl: "/attached_assets/stock_images/international_studen_c500be12.jpg",
          status: "published" as const,
          publishedAt: new Date(),
          authorId: userId,
        },
        {
          title: "Complete Guide to Australian Student Visa (Subclass 500) Application Process",
          slug: "australian-student-visa-subclass-500-guide",
          excerpt: "Step-by-step guide to applying for an Australian Student Visa. Learn about requirements, documents needed, and tips for a successful application.",
          content: `# Complete Guide to Australian Student Visa (Subclass 500) Application Process

Applying for an Australian Student Visa can seem overwhelming, but with proper preparation, the process is straightforward. This comprehensive guide walks you through everything you need to know.

## What is the Student Visa Subclass 500?

The Student Visa (subclass 500) allows international students to study full-time at registered education providers in Australia. It's the primary visa for international students at all education levels.

## Eligibility Requirements

### Basic Requirements
- Enrolled in a full-time course at a CRICOS-registered institution
- Genuine Temporary Entrant (GTE) requirement
- English language proficiency
- Financial capacity to support your stay
- Health insurance (OSHC)
- Good character and health requirements

### Age Requirements
- At least 6 years old to study in Australia
- No maximum age for student visa applications

## Required Documents

### Essential Documents
1. **Confirmation of Enrolment (CoE)** - From your education provider
2. **Passport** - Valid for at least 6 months
3. **Genuine Temporary Entrant Statement** - Explaining your study intentions
4. **English Test Results** - IELTS, TOEFL, PTE, or equivalent
5. **Financial Evidence** - Showing AU$21,041 per year for living costs

### Supporting Documents
- Academic transcripts and certificates
- Proof of previous employment (if applicable)
- Evidence of family ties to home country
- Health insurance confirmation

## Financial Requirements 2024

| Expense | Annual Amount (AUD) |
|---------|---------------------|
| Living costs | $21,041 |
| Course fees | As per institution |
| School-age dependents | $8,000 per child |
| Partner accompaniment | Additional funds required |

## Application Process

### Step 1: Receive Your CoE
After accepting your offer and paying the required deposit, your institution will issue a Confirmation of Enrolment.

### Step 2: Create an ImmiAccount
Register for an ImmiAccount on the Department of Home Affairs website.

### Step 3: Complete the Application
Fill out the online application form accurately and upload all required documents.

### Step 4: Pay the Visa Fee
The current visa application charge is AUD 710 (subject to change).

### Step 5: Health Examination
Complete any required health examinations at approved clinics.

### Step 6: Wait for Decision
Processing times vary but typically range from 4-6 weeks.

## Tips for a Successful Application

1. **Apply early** - Allow plenty of time for processing
2. **Be honest** - Provide accurate information throughout
3. **Organize documents** - Keep everything clearly labeled and accessible
4. **Demonstrate genuine intentions** - Be clear about your study and return plans
5. **Meet English requirements** - Prepare well for language tests

## Common Mistakes to Avoid

- Incomplete applications
- Inconsistent information
- Missing documents
- Insufficient financial evidence
- Weak GTE statement

## Need Help with Your Visa Application?

ANZ Global Education provides comprehensive visa guidance. Our experts can help you prepare a strong application and avoid common pitfalls.`,
          category: "Student Visa",
          tags: ["student visa", "subclass 500", "visa application", "immigration", "australia visa"],
          metaTitle: "Australian Student Visa 500 Guide 2024 | Complete Application Process",
          metaDescription: "Step-by-step guide to Australian Student Visa subclass 500. Requirements, documents, costs & tips for successful application.",
          featuredImageUrl: "/attached_assets/stock_images/international_studen_536b236a.jpg",
          ogImageUrl: "/attached_assets/stock_images/international_studen_536b236a.jpg",
          status: "published" as const,
          publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          authorId: userId,
        },
        {
          title: "How to Choose the Right Course and University in Australia: A Comprehensive Guide",
          slug: "how-to-choose-course-university-australia",
          excerpt: "Making the right choice for your education is crucial. Learn how to evaluate universities, compare courses, and find the perfect fit for your career goals.",
          content: `# How to Choose the Right Course and University in Australia

Choosing where and what to study in Australia is one of the most important decisions you'll make. This guide helps you navigate the options and find your perfect match.

## Understanding the Australian Education System

Australia offers education at multiple levels:
- **Vocational Education and Training (VET)** - Practical, job-focused training
- **Undergraduate Studies** - Bachelor's degrees (3-4 years)
- **Postgraduate Studies** - Master's and doctoral programs
- **Research Degrees** - PhD and research-based programs

## Step 1: Define Your Career Goals

Before looking at courses, consider:
- What career do you envision?
- What skills do you need to develop?
- What industry interests you?
- What are the job prospects in your field?

## Step 2: Research Course Options

### Key Factors to Consider

**Course Content**
- Examine the curriculum and subjects
- Look for practical components like internships
- Check if the course is industry-accredited

**Course Duration**
- Bachelor's degrees: 3-4 years
- Master's degrees: 1-2 years
- Diplomas: 1-2 years
- Certificates: 6 months - 1 year

**Entry Requirements**
- Academic qualifications needed
- English language requirements
- Any prerequisite subjects

## Step 3: Evaluate Universities

### Ranking Considerations
- QS World University Rankings
- Times Higher Education Rankings
- Subject-specific rankings

### Beyond Rankings
- Industry connections and partnerships
- Research opportunities
- Graduate employment rates
- Student support services

### Location Factors
- Cost of living in the city
- Climate and lifestyle
- Employment opportunities
- Cultural communities

## Step 4: Compare Costs

### Tuition Fees by Study Level
| Level | Annual Fee Range (AUD) |
|-------|------------------------|
| Undergraduate | $20,000 - $45,000 |
| Postgraduate | $22,000 - $50,000 |
| VET Courses | $4,000 - $22,000 |
| Research Degrees | $20,000 - $45,000 |

### Living Cost Variations
- Sydney/Melbourne: Higher costs
- Adelaide/Brisbane: Moderate costs
- Regional areas: Lower costs

## Step 5: Check Pathway Options

Many students use pathway programs:
- **Foundation Programs** - Prepare for undergraduate study
- **Pathway Programs** - Guaranteed entry upon completion
- **Package Offers** - English course + degree program

## Step 6: Consider Post-Study Opportunities

Look for courses that offer:
- Work-integrated learning
- Industry placements
- Networking opportunities
- Skills in demand for Australian jobs

## Red Flags to Watch For

- Institutions without CRICOS registration
- Courses not recognized by professional bodies
- Unusually low fees that seem too good to be true
- Limited student support services

## Make an Informed Decision

At ANZ Global Education, we help students find their perfect course match. Our counselors provide personalized guidance based on your goals, budget, and preferences.`,
          category: "Course Selection",
          tags: ["university selection", "course guide", "australian courses", "career planning", "education advice"],
          metaTitle: "How to Choose the Right Course & University in Australia 2024",
          metaDescription: "Expert guide to selecting the best Australian university and course. Compare rankings, costs, and career outcomes to make the right choice.",
          featuredImageUrl: "/attached_assets/stock_images/international_studen_5bf0ade5.jpg",
          ogImageUrl: "/attached_assets/stock_images/international_studen_5bf0ade5.jpg",
          status: "published" as const,
          publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          authorId: userId,
        },
        {
          title: "Cost of Living in Australia for International Students: 2024 Budget Guide",
          slug: "cost-of-living-australia-international-students-2024",
          excerpt: "Plan your finances effectively with our comprehensive guide to living costs in Australia. From accommodation to groceries, learn how to budget smartly.",
          content: `# Cost of Living in Australia for International Students: 2024 Budget Guide

Understanding living costs is essential for planning your Australian education. This guide provides realistic estimates and money-saving tips to help you budget effectively.

## Official Living Cost Requirement

The Australian government requires students to show access to:
- **$21,041 per year** for the primary student
- **$7,362 additional** for a partner
- **$3,152 additional** per child

## Monthly Budget Breakdown

### Sydney & Melbourne (Higher Cost Cities)

| Expense | Monthly Cost (AUD) |
|---------|-------------------|
| Accommodation | $1,200 - $2,000 |
| Food & Groceries | $400 - $600 |
| Transportation | $150 - $200 |
| Utilities | $100 - $150 |
| Mobile & Internet | $70 - $100 |
| Entertainment | $150 - $300 |
| Books & Supplies | $50 - $100 |
| **Total** | **$2,120 - $3,450** |

### Brisbane, Perth & Adelaide (Moderate Cost Cities)

| Expense | Monthly Cost (AUD) |
|---------|-------------------|
| Accommodation | $800 - $1,500 |
| Food & Groceries | $350 - $500 |
| Transportation | $100 - $150 |
| Utilities | $80 - $120 |
| Mobile & Internet | $60 - $90 |
| Entertainment | $100 - $200 |
| Books & Supplies | $50 - $100 |
| **Total** | **$1,540 - $2,660** |

## Accommodation Options

### Types of Accommodation

**On-Campus Student Housing**
- Cost: $200-$500 per week
- Pros: Convenient, inclusive of utilities, social environment
- Cons: Limited availability, may require early application

**Off-Campus Shared Housing**
- Cost: $150-$350 per week
- Pros: More affordable, independence
- Cons: Need to manage utilities and housemates

**Homestay**
- Cost: $250-$350 per week
- Pros: Includes meals, cultural immersion
- Cons: Less independence, house rules

**Private Rental**
- Cost: $300-$600 per week
- Pros: Complete privacy and independence
- Cons: Higher cost, lease commitments

## Money-Saving Tips

### Accommodation
- Consider living further from city center
- Share with other students
- Look for student-specific housing providers

### Food
- Cook at home instead of eating out
- Shop at budget supermarkets (Aldi, Costco)
- Use student discount apps

### Transportation
- Get a student concession card
- Walk or cycle when possible
- Use monthly travel passes

### General Savings
- Use student discounts (UNiDAYS, Student Edge)
- Buy second-hand textbooks
- Take advantage of free campus events

## Working While Studying

International students can work:
- **Up to 48 hours per fortnight** during semester
- **Unlimited hours** during scheduled breaks

### Average Hourly Wages
- Hospitality: $23-$28
- Retail: $22-$27
- Tutoring: $30-$50
- Administration: $25-$35

## Banking in Australia

### Setting Up a Bank Account
- Open an account before arriving if possible
- Major banks: Commonwealth, Westpac, NAB, ANZ
- Many offer student accounts with no monthly fees

### Transferring Money
- Use international transfer services (Wise, OFX)
- Compare exchange rates
- Set up direct debits for rent

## Plan Your Budget Today

Contact ANZ Global Education for personalized financial planning advice and help finding affordable study options in Australia.`,
          category: "Student Life",
          tags: ["cost of living", "budget", "student finance", "accommodation", "money saving"],
          metaTitle: "Cost of Living in Australia 2024 | International Student Budget Guide",
          metaDescription: "Complete 2024 guide to living costs in Australia for students. Accommodation, food, transport costs with city comparisons and saving tips.",
          featuredImageUrl: "/attached_assets/stock_images/international_studen_30cc3d7f.jpg",
          ogImageUrl: "/attached_assets/stock_images/international_studen_30cc3d7f.jpg",
          status: "published" as const,
          publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          authorId: userId,
        },
        {
          title: "Pathways to Permanent Residency in Australia After Graduation",
          slug: "permanent-residency-australia-after-graduation",
          excerpt: "Explore the various pathways from student visa to permanent residency in Australia. Understand skilled migration, state sponsorship, and employer nomination options.",
          content: `# Pathways to Permanent Residency in Australia After Graduation

For many international students, studying in Australia is not just about education—it's the first step toward building a life in this beautiful country. Understanding your options for permanent residency helps you plan strategically.

## Post-Study Work Rights

### Temporary Graduate Visa (Subclass 485)

After completing your studies, you may be eligible for:

**Graduate Work Stream**
- 18 months for qualification related to skilled occupation
- Must apply within 6 months of completing studies

**Post-Study Work Stream**
- 2 years for Bachelor's or Master's (coursework)
- 3 years for Master's (research)
- 4 years for Doctoral degree

**Extended Post-Study Work Rights**
Graduates from regional areas may be eligible for additional 1-2 years.

## Skilled Migration Options

### Skilled Independent Visa (Subclass 189)

**Key Features**
- Points-based visa
- No sponsorship required
- Permanent residency from grant

**Points Required:** Minimum 65 points

### Points Test Components

| Factor | Maximum Points |
|--------|---------------|
| Age | 30 |
| English | 20 |
| Skilled Employment | 20 |
| Australian Study | 10 |
| Education | 20 |
| Specialist Education | 10 |
| NAATI Credentials | 5 |
| Partner Skills | 10 |
| State/Regional Nomination | 15 |

## State Nominated Visas

### Subclass 190 (State Nominated)
- Requires nomination by an Australian state
- 5 additional points for invitation
- 2-year commitment to live in nominating state
- Immediate permanent residency

### Subclass 491 (Skilled Regional)
- Requires nomination by state or relative sponsorship
- 15 additional points
- 3-year provisional visa leading to PR (subclass 191)
- Must live in regional Australia

## Employer Sponsored Pathways

### Temporary Skill Shortage (Subclass 482)
- Employer sponsors you for a skilled role
- Medium-term stream: Up to 4 years
- Pathway to PR through subclass 186 after 3 years

### Employer Nomination Scheme (Subclass 186)
- Direct permanent residency through employer
- Requires 3 years of work experience
- Or transition from 482 visa

## Courses That Lead to PR

High-demand occupations often include:

**Engineering**
- Civil, Mechanical, Electrical, Mining

**Healthcare**
- Nursing, Medicine, Pharmacy, Allied Health

**IT**
- Software Development, Cybersecurity, Data Science

**Trades**
- Electrical, Plumbing, Carpentry

**Accounting**
- With CA/CPA accreditation

## Regional Study Benefits

Studying in regional Australia provides advantages:
- Additional 5 points for regional study
- Extended post-study work rights
- Priority processing for some visas
- Lower competition for state nomination

## Timeline to PR

| Pathway | Typical Timeline |
|---------|-----------------|
| 189 (Skilled Independent) | 2-4 years after study |
| 190 (State Nominated) | 2-3 years after study |
| 186 (Employer Sponsored) | 3-4 years after study |
| 491/191 (Regional) | 3-5 years after study |

## Tips for Success

1. **Choose courses on skilled occupation lists**
2. **Maximize your English score** (aim for 8+ bands)
3. **Gain relevant work experience** during and after study
4. **Consider regional study locations**
5. **Get professional skills assessed** early
6. **Stay informed** about policy changes

## Start Your Migration Journey

ANZ Global Education helps students choose courses aligned with their migration goals. Our advisors understand the connection between education and immigration pathways.`,
          category: "Immigration",
          tags: ["permanent residency", "skilled migration", "PR pathway", "graduate visa", "australian immigration"],
          metaTitle: "Pathways to PR in Australia After Graduation | Immigration Guide 2024",
          metaDescription: "Complete guide to permanent residency after studying in Australia. Skilled migration, employer sponsorship & state nomination explained.",
          featuredImageUrl: "/attached_assets/stock_images/international_studen_8f925c25.jpg",
          ogImageUrl: "/attached_assets/stock_images/international_studen_8f925c25.jpg",
          status: "published" as const,
          publishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          authorId: userId,
        },
        {
          title: "Best Cities in Australia for International Students: Where Should You Study?",
          slug: "best-cities-australia-international-students",
          excerpt: "Compare Australia's top study destinations. From vibrant Melbourne to sunny Brisbane, discover which city matches your lifestyle and academic goals.",
          content: `# Best Cities in Australia for International Students: Where Should You Study?

Australia offers diverse cities, each with unique characteristics. This guide compares the top study destinations to help you find your perfect match.

## Sydney: The Global City

**Population:** 5.3 million
**International Students:** 250,000+

### Universities
- University of Sydney (World Rank: 19)
- UNSW Sydney (World Rank: 19)
- University of Technology Sydney
- Macquarie University

### Pros
- Iconic landmarks and harbor lifestyle
- Strong job market and business hub
- Excellent public transport
- Diverse cultural communities

### Cons
- Highest living costs in Australia
- Competitive housing market
- Traffic congestion

### Cost of Living
**Average monthly budget:** $2,500-$3,500

## Melbourne: The Cultural Capital

**Population:** 5.1 million
**International Students:** 220,000+

### Universities
- University of Melbourne (World Rank: 14)
- Monash University (World Rank: 42)
- RMIT University
- Deakin University

### Pros
- World's most liveable city reputation
- Thriving arts and food scene
- Four seasons climate
- Excellent coffee culture

### Cons
- Unpredictable weather
- Growing living costs
- Urban sprawl

### Cost of Living
**Average monthly budget:** $2,200-$3,200

## Brisbane: The Sunshine State Capital

**Population:** 2.5 million
**International Students:** 90,000+

### Universities
- University of Queensland (World Rank: 43)
- Queensland University of Technology
- Griffith University

### Pros
- Subtropical climate year-round
- More affordable than Sydney/Melbourne
- Friendly, relaxed atmosphere
- Growing job market

### Cons
- Fewer entertainment options
- Hot, humid summers
- Limited public transport in some areas

### Cost of Living
**Average monthly budget:** $1,800-$2,500

## Perth: The West Coast Gem

**Population:** 2.1 million
**International Students:** 60,000+

### Universities
- University of Western Australia (World Rank: 72)
- Curtin University
- Murdoch University

### Pros
- Beautiful beaches and nature
- Lower population density
- Strong mining/resources industry
- Same timezone as Asia

### Cons
- Geographic isolation
- Limited nightlife options
- Hot, dry summers

### Cost of Living
**Average monthly budget:** $1,700-$2,400

## Adelaide: The Festival City

**Population:** 1.4 million
**International Students:** 40,000+

### Universities
- University of Adelaide (World Rank: 89)
- University of South Australia
- Flinders University

### Pros
- Most affordable major city
- Relaxed pace of life
- Famous wine regions nearby
- Strong regional migration pathways

### Cons
- Smaller job market
- Less diverse food options
- Fewer entertainment venues

### Cost of Living
**Average monthly budget:** $1,500-$2,200

## Comparison Table

| City | Livability | Affordability | Job Market | Climate | Universities |
|------|-----------|---------------|------------|---------|--------------|
| Sydney | ★★★★★ | ★★☆☆☆ | ★★★★★ | ★★★★☆ | ★★★★★ |
| Melbourne | ★★★★★ | ★★★☆☆ | ★★★★★ | ★★★☆☆ | ★★★★★ |
| Brisbane | ★★★★☆ | ★★★★☆ | ★★★★☆ | ★★★★★ | ★★★★☆ |
| Perth | ★★★★☆ | ★★★★☆ | ★★★★☆ | ★★★★★ | ★★★★☆ |
| Adelaide | ★★★★☆ | ★★★★★ | ★★★☆☆ | ★★★★☆ | ★★★★☆ |

## Making Your Choice

Consider these factors:
- Your budget and financial situation
- Career goals and industry preferences
- Climate preferences
- Lifestyle priorities
- Migration goals (regional benefits)

## Let Us Help You Decide

ANZ Global Education counselors have firsthand knowledge of all Australian cities. Contact us for personalized advice on choosing your study destination.`,
          category: "Study in Australia",
          tags: ["australian cities", "study destination", "sydney", "melbourne", "brisbane", "perth", "adelaide"],
          metaTitle: "Best Cities in Australia for Students 2024 | City Comparison Guide",
          metaDescription: "Compare Sydney, Melbourne, Brisbane, Perth & Adelaide for international students. Cost of living, universities, and lifestyle compared.",
          featuredImageUrl: "/attached_assets/stock_images/australian_education_86689ef6.jpg",
          ogImageUrl: "/attached_assets/stock_images/australian_education_86689ef6.jpg",
          status: "published" as const,
          publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          authorId: userId,
        },
        {
          title: "IELTS vs PTE vs TOEFL: Which English Test is Best for Australian Universities?",
          slug: "ielts-pte-toefl-comparison-australian-universities",
          excerpt: "Choosing the right English proficiency test can impact your study abroad journey. Compare IELTS, PTE, and TOEFL to find the best option for your needs.",
          content: `# IELTS vs PTE vs TOEFL: Which English Test is Best for Australian Universities?

English proficiency tests are a crucial requirement for studying in Australia. This guide compares the three most accepted tests to help you make the right choice.

## Overview of Tests

### IELTS (International English Language Testing System)
- **Format:** Paper or computer-based
- **Duration:** 2 hours 45 minutes
- **Scoring:** 0-9 band scale
- **Validity:** 2 years

### PTE Academic (Pearson Test of English)
- **Format:** Computer-based only
- **Duration:** 2 hours
- **Scoring:** 10-90 scale
- **Validity:** 2 years

### TOEFL iBT (Test of English as a Foreign Language)
- **Format:** Computer-based only
- **Duration:** 3 hours
- **Scoring:** 0-120 total
- **Validity:** 2 years

## Score Comparison Chart

| IELTS | PTE | TOEFL iBT | Level |
|-------|-----|-----------|-------|
| 9.0 | 89-90 | 118-120 | Expert |
| 8.5 | 83-88 | 115-117 | Very High |
| 8.0 | 79-82 | 110-114 | High |
| 7.5 | 73-78 | 102-109 | Good |
| 7.0 | 65-72 | 94-101 | Competent |
| 6.5 | 58-64 | 79-93 | Modest |
| 6.0 | 50-57 | 60-78 | Limited |

## Typical University Requirements

### Undergraduate Programs
- IELTS: 6.0-6.5 overall
- PTE: 50-58 overall
- TOEFL: 60-79 overall

### Postgraduate Programs
- IELTS: 6.5-7.0 overall
- PTE: 58-65 overall
- TOEFL: 79-94 overall

### Professional Courses (Medicine, Law)
- IELTS: 7.0-7.5 overall
- PTE: 65-79 overall
- TOEFL: 94-109 overall

## IELTS: Detailed Analysis

### Advantages
- Most widely recognized globally
- Available in both paper and computer formats
- Human interaction in speaking test
- Well-established preparation materials

### Disadvantages
- Speaking test conducted separately
- Longer wait for results (13 days paper, 3-5 days computer)
- Subjective speaking assessment
- Limited test dates in some locations

### Best For
- Students who prefer face-to-face speaking tests
- Those with strong handwriting skills (paper test)
- Students applying to UK and European institutions too

## PTE Academic: Detailed Analysis

### Advantages
- Fastest results (typically 48 hours)
- Fully computer-based, including speaking
- AI scoring reduces bias
- More test dates and locations
- Multiple attempts allow improvement

### Disadvantages
- Requires comfort with computer-based testing
- Speaking recorded, not live interaction
- Less traditional format may feel unfamiliar
- Some find the integrated tasks challenging

### Best For
- Tech-savvy students comfortable with computers
- Those who need quick results
- Students who may need multiple attempts
- Those applying primarily to Australian institutions

## TOEFL iBT: Detailed Analysis

### Advantages
- Widely accepted in USA and Canada too
- Integrated tasks test multiple skills simultaneously
- Extensive preparation resources available
- Consistent global scoring

### Disadvantages
- Longest test duration (3 hours)
- American English focused
- Speaking recorded on computer
- Higher fee in some countries

### Best For
- Students also considering USA/Canada
- Those familiar with American English
- Academic researchers and scholars

## Factors to Consider

### 1. University Acceptance
Check which tests your target universities accept. Most Australian universities accept all three.

### 2. Test Availability
Consider test dates and locations in your area.

### 3. Your Strengths
- Strong typist? → PTE or TOEFL
- Better with handwriting? → IELTS Paper
- Prefer live conversation? → IELTS

### 4. Time Constraints
- Need results fast? → PTE
- Can wait 2 weeks? → IELTS or TOEFL

### 5. Budget
Average test fees:
- IELTS: AUD $395
- PTE: AUD $410
- TOEFL: AUD $330

## Preparation Tips

1. **Take practice tests** to identify your level
2. **Focus on weaknesses** revealed by practice
3. **Maintain consistent study schedule**
4. **Use official preparation materials**
5. **Simulate real test conditions**

## Our Recommendation

For Australian university applications, **PTE Academic** often provides the most convenience with quick results and frequent test dates. However, if you're also applying to UK or US universities, IELTS or TOEFL may offer broader acceptance.

## Get Expert Guidance

ANZ Global Education helps students prepare for English tests and choose the right option for their goals. Contact us for personalized advice.`,
          category: "Admissions",
          tags: ["IELTS", "PTE", "TOEFL", "english test", "university admission", "test preparation"],
          metaTitle: "IELTS vs PTE vs TOEFL 2024 | Best English Test for Australia",
          metaDescription: "Compare IELTS, PTE Academic & TOEFL iBT for Australian universities. Score comparison, pros/cons & expert recommendations.",
          featuredImageUrl: "/attached_assets/stock_images/australian_education_35baf418.jpg",
          ogImageUrl: "/attached_assets/stock_images/australian_education_35baf418.jpg",
          status: "published" as const,
          publishedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
          authorId: userId,
        },
        {
          title: "Scholarships for International Students in Australia: Complete 2024 Guide",
          slug: "scholarships-international-students-australia-2024",
          excerpt: "Discover funding opportunities to reduce your study costs. From government scholarships to university grants, learn how to secure financial support.",
          content: `# Scholarships for International Students in Australia: Complete 2024 Guide

Scholarships can significantly reduce the cost of studying in Australia. This comprehensive guide covers major funding opportunities available to international students.

## Types of Scholarships

### 1. Australian Government Scholarships
### 2. University-Specific Scholarships
### 3. External/Private Scholarships
### 4. Country-Specific Scholarships

## Australian Government Scholarships

### Australia Awards Scholarships

**Value:** Full tuition, living expenses, airfare, health insurance
**Duration:** Full course duration
**Eligibility:**
- Citizens of participating countries
- Not hold Australian citizenship
- Meet academic and English requirements

**Application:** Through your country's Australian diplomatic mission

### Research Training Program (RTP)

**Value:** Tuition fees + living allowance (approx. $32,192/year)
**For:** Domestic and international research students
**Eligibility:** High academic achievement, research proposal

### Destination Australia Program

**Value:** Up to $15,000 per year
**For:** Students studying in regional Australia
**Eligibility:** Enrolled at regional campus

## Top University Scholarships

### University of Melbourne

**Melbourne International Undergraduate Scholarship**
- Value: 50% or 100% fee remission
- Based on academic excellence

**Graduate Research Scholarships**
- Full tuition + living allowance
- For Master's and PhD research students

### University of Sydney

**Sydney Scholars Award**
- Value: $6,000-$40,000
- Based on academic achievement

**Vice-Chancellor's International Scholarships**
- Value: Up to $40,000 per year

### UNSW Sydney

**UNSW International Scientia Coursework Scholarship**
- Value: Up to $20,000 per year
- Based on academic merit

**International Academic Excellence Award**
- Value: $10,000 one-time payment

### Monash University

**Monash International Leadership Scholarship**
- Value: $10,000 per year
- Based on academic and leadership qualities

**Monash International Merit Scholarship**
- Value: $10,000 partial tuition

### University of Queensland

**UQ International Excellence Scholarship**
- Value: Up to $20,000 per year
- Duration: Full program length

## Scholarship by Study Level

### Undergraduate Scholarships

| University | Scholarship | Value |
|------------|------------|-------|
| ANU | International Student Scholarship | Up to 50% tuition |
| UQ | UQ Excellence Scholarship | $12,000/year |
| UNSW | Academic Excellence Award | $10,000 |
| Deakin | Merit Scholarship | 20% fee reduction |

### Postgraduate Scholarships

| University | Scholarship | Value |
|------------|------------|-------|
| Melbourne | Melbourne International Fee Remission | 25-100% tuition |
| Sydney | International Postgraduate Award | Full tuition |
| Monash | Faculty International Scholarships | $10,000 |
| UWA | Global Excellence Scholarship | Up to $48,000 |

### Research Scholarships

| Program | Value | Duration |
|---------|-------|----------|
| RTP Scholarship | Full tuition + $32,192 stipend | 3-4 years |
| University PhD Scholarships | Full tuition + living allowance | Program length |

## Country-Specific Opportunities

### For Indian Students
- Australia India Institute Scholarships
- Tata Scholarships
- Various state government schemes

### For Chinese Students
- China Scholarship Council Partnership
- Confucius Institute Scholarships
- University partnerships with Chinese institutions

### For Southeast Asian Students
- Australia-ASEAN Scholarships
- Country-specific bilateral agreements

## Application Tips

### 1. Start Early
Many scholarships have deadlines 6-12 months before course start.

### 2. Prepare Strong Applications
- Academic transcripts with high grades
- Well-written personal statement
- Strong recommendation letters
- Evidence of leadership/community service

### 3. Apply to Multiple Scholarships
Increase your chances by applying to several opportunities.

### 4. Meet All Requirements
Carefully check eligibility criteria and submit complete applications.

### 5. Highlight Unique Qualities
Stand out by showcasing what makes you special.

## Common Mistakes to Avoid

- Missing deadlines
- Incomplete applications
- Generic personal statements
- Ignoring eligibility requirements
- Not proofreading applications

## Timeline for Applications

| Month | Action |
|-------|--------|
| 12 months before | Research scholarship options |
| 10 months before | Prepare documents, get references |
| 8 months before | Submit early applications |
| 6 months before | Submit remaining applications |
| 4 months before | Follow up on applications |
| 2 months before | Accept offers, plan travel |

## Get Help Finding Scholarships

ANZ Global Education maintains a database of scholarship opportunities matched to student profiles. Contact us to discover scholarships you may qualify for.`,
          category: "Scholarships",
          tags: ["scholarships", "financial aid", "funding", "university scholarships", "government scholarships"],
          metaTitle: "Scholarships for International Students Australia 2024 | Complete Guide",
          metaDescription: "Discover $10,000-$40,000 scholarships for international students in Australia. Government, university & private funding opportunities.",
          featuredImageUrl: "/attached_assets/stock_images/australian_education_da32e024.jpg",
          ogImageUrl: "/attached_assets/stock_images/australian_education_da32e024.jpg",
          status: "published" as const,
          publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          authorId: userId,
        },
        {
          title: "Working While Studying in Australia: Rights, Rules, and Opportunities",
          slug: "working-while-studying-australia-guide",
          excerpt: "Learn about your work rights as an international student in Australia. Understand the rules, find job opportunities, and balance work with studies effectively.",
          content: `# Working While Studying in Australia: Rights, Rules, and Opportunities

Working part-time while studying is a valuable way to gain experience, supplement your income, and build networks in Australia. This guide covers everything you need to know.

## Work Rights for International Students

### Current Work Conditions (2024)

**During Semester**
- Up to 48 hours per fortnight
- Measured from Monday of each fortnight

**During Scheduled Breaks**
- Unlimited working hours
- Includes semester breaks and summer holidays

**Research Students**
- May have unlimited work rights
- Check your visa conditions

## Understanding Work Limits

### What Counts Toward 48 Hours?

**Included:**
- Paid employment
- Self-employment
- Volunteer work with token payment
- Internships with compensation

**Not Included:**
- Unpaid volunteering
- Work as part of course requirements
- Unpaid internships (genuine placements)

### Fortnightly Calculation

Your work hours reset every fortnight starting Monday. For example:
- Week 1: Work 30 hours
- Week 2: Work 18 hours (reaching 48 hours total)
- Week 3 (new fortnight): Reset to 0

## Finding Part-Time Jobs

### Popular Job Types for Students

**Hospitality**
- Cafes, restaurants, bars
- Average pay: $23-$28/hour
- Flexible hours, tips possible

**Retail**
- Supermarkets, clothing stores
- Average pay: $22-$27/hour
- Weekend and evening shifts

**Tutoring**
- Language tutoring, academic subjects
- Average pay: $30-$50/hour
- Flexible, uses your expertise

**Administrative Work**
- Reception, data entry, office support
- Average pay: $25-$35/hour
- Regular business hours

**On-Campus Jobs**
- Library assistant, lab assistant
- Average pay: $25-$32/hour
- Convenient location, understanding employers

## Where to Find Jobs

### Online Platforms
- **Seek.com.au** - Australia's largest job site
- **Indeed.com.au** - Global job platform
- **LinkedIn** - Professional networking
- **Jora** - Entry-level positions
- **Gumtree** - Local classifieds

### University Resources
- Career services job boards
- On-campus employment portals
- Career fairs and networking events

### Direct Applications
- Walk-in applications at local businesses
- Shopping center job days
- Hospitality precincts

## Your Rights as a Worker

### Minimum Wage (2024)
- **National Minimum Wage:** $23.23/hour
- Casual employees receive additional 25% loading
- Penalty rates apply for weekends and public holidays

### Workplace Protections
- Fair treatment regardless of visa status
- Safe working conditions
- Superannuation contributions (if earning $450+/month)
- Leave entitlements for permanent employees

### Warning Signs of Exploitation
- Cash-in-hand payments below minimum wage
- Threats about visa status
- Excessive unpaid work trials
- No payslips provided

## Tax and Superannuation

### Tax File Number (TFN)
- Apply online through ATO
- Required before starting work
- Prevents higher tax withholding

### Tax Rates for Students
- First $18,200 = Tax-free threshold
- $18,201-$45,000 = 19% tax rate
- Most students pay little or no tax

### Superannuation
- Employer contributes 11.5% of salary
- You can access when leaving Australia permanently
- Or transfer to home country pension (if applicable)

## Balancing Work and Study

### Recommended Hours by Study Load

| Course Type | Recommended Work Hours |
|-------------|------------------------|
| Full-time coursework | 15-20 hours/week |
| Research degree | 10-15 hours/week |
| Intensive programs | 10-15 hours/week |

### Tips for Balance
1. **Prioritize study** - Grades matter for your future
2. **Choose flexible employers** - Who understand student commitments
3. **Work near campus** - Reduce commute time
4. **Use break periods** - Work more during holidays
5. **Communicate with employers** - Be upfront about exam periods

## Building Career Experience

### Beyond Part-Time Work
- **Internships** - Industry-specific experience
- **Volunteering** - Build networks and skills
- **Industry events** - Networking opportunities
- **Professional associations** - Join student chapters

### Transferable Skills
Every job teaches valuable skills:
- Customer service
- Communication
- Time management
- Teamwork
- Problem-solving

## Get Support

ANZ Global Education provides career guidance and can connect you with employers who value international students. Contact us for assistance.`,
          category: "Student Life",
          tags: ["part-time work", "student employment", "work rights", "jobs australia", "work visa"],
          metaTitle: "Working While Studying in Australia 2024 | Student Work Rights Guide",
          metaDescription: "Complete guide to working as an international student in Australia. Work rights, finding jobs, tax requirements & balancing study.",
          featuredImageUrl: "/attached_assets/stock_images/australian_education_c53ef220.jpg",
          ogImageUrl: "/attached_assets/stock_images/australian_education_c53ef220.jpg",
          status: "published" as const,
          publishedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
          authorId: userId,
        },
        {
          title: "Life in Australia: What International Students Need to Know Before Arriving",
          slug: "life-in-australia-international-students-guide",
          excerpt: "Prepare for your Australian adventure with this comprehensive guide. From culture to daily life, learn what to expect before you arrive.",
          content: `# Life in Australia: What International Students Need to Know Before Arriving

Moving to Australia is an exciting adventure. This guide helps you understand Australian life and culture so you can hit the ground running.

## Australian Culture and Values

### Core Values
- **Equality** - Everyone is treated the same
- **Mateship** - Friendship and loyalty are valued
- **Fair go** - Everyone deserves a chance
- **Laid-back attitude** - Relaxed approach to life
- **Directness** - Australians say what they mean

### Communication Style
- Informal and friendly
- First names commonly used (even with professors)
- Humor and sarcasm are common
- "No worries" means "you're welcome"

### Social Etiquette
- Punctuality is expected
- Queue (line up) properly
- Personal space is valued
- Tipping is not expected but appreciated

## Weather and Climate

### Climate Zones
Australia has diverse climates:

**Northern Australia (Tropical)**
- Wet and dry seasons
- Hot year-round
- Monsoon rains December-March

**Southern Australia (Temperate)**
- Four distinct seasons
- Warm summers, cool winters
- Melbourne known for changeable weather

**Central Australia (Arid)**
- Desert climate
- Very hot summers, cold nights

### Seasons (Remember: Southern Hemisphere!)
- **Summer:** December-February
- **Autumn:** March-May
- **Winter:** June-August
- **Spring:** September-November

## Health and Safety

### Health Insurance (OSHC)
- **Mandatory** for all student visa holders
- Must maintain throughout your stay
- Covers doctor visits, hospital, and some extras

### Staying Safe
Australia is generally very safe, but:
- Be sun-smart (high UV levels)
- Swim between the flags at beaches
- Be aware of wildlife (spiders, snakes in rural areas)
- Stay hydrated in hot weather

### Emergency Numbers
- **000** - Police, Fire, Ambulance
- **131 444** - Non-emergency police
- **1800 022 222** - Healthdirect (24/7 health advice)

## Transportation

### Getting Around

**Public Transport**
- Each city has its own system
- Get a transport card (Opal, Myki, go card)
- Student concessions available

**Cycling**
- Popular in many cities
- Helmets are mandatory
- Bike lanes in urban areas

**Driving**
- Drive on the LEFT side
- International license valid for 3 months
- Then convert to Australian license

### City Transport Cards
| City | Card Name |
|------|-----------|
| Sydney | Opal |
| Melbourne | Myki |
| Brisbane | go card |
| Perth | SmartRider |
| Adelaide | MetroCard |

## Shopping and Daily Life

### Supermarkets
- **Coles and Woolworths** - Major chains
- **Aldi** - Budget-friendly
- **IGA** - Local/convenient
- **Asian groceries** - In most suburbs

### Shopping Hours
- Generally 9am-5:30pm weekdays
- Extended hours Thursday/Friday
- Sunday hours vary by state

### Mobile Phones
- Major providers: Telstra, Optus, Vodafone
- Prepaid and contract options
- Student plans available

## Food and Dining

### Australian Food Culture
- Multicultural cuisine
- Café culture is huge
- BBQ (barbie) is a social tradition
- Fresh produce and seafood

### Budget Eating Tips
- Cook at home
- Student meal deals
- Lunch specials at restaurants
- Food courts offer variety

### Must-Try Australian Foods
- Vegemite (spread)
- Meat pies
- Tim Tams (chocolate biscuit)
- Pavlova (dessert)
- Fish and chips

## Making Friends

### Meeting People
- Join university clubs and societies
- Attend orientation events
- Participate in sports
- Volunteer in your community
- Language exchange programs

### Australian Social Life
- BBQs and outdoor gatherings
- Coffee catch-ups
- Beach activities
- Sporting events
- Pub culture

## Useful Australian Slang

| Slang | Meaning |
|-------|---------|
| Arvo | Afternoon |
| Brekkie | Breakfast |
| Cheers | Thanks |
| Mate | Friend |
| Reckon | Think/believe |
| Servo | Gas station |
| Uni | University |

## Before You Arrive Checklist

- [ ] Valid passport and visa
- [ ] OSHC confirmation
- [ ] Accommodation booking (first few weeks)
- [ ] Some Australian dollars
- [ ] Important documents (copies stored online)
- [ ] Power adapter (Type I plugs)
- [ ] Weather-appropriate clothing

## We're Here to Help

ANZ Global Education provides pre-departure orientations and ongoing support for international students. Contact us with any questions about life in Australia.`,
          category: "Student Life",
          tags: ["australian culture", "student life", "living in australia", "preparation", "international students"],
          metaTitle: "Life in Australia for International Students | Pre-Arrival Guide 2024",
          metaDescription: "Everything international students need to know before arriving in Australia. Culture, climate, safety, transport & daily life guide.",
          featuredImageUrl: "/attached_assets/stock_images/australian_education_bbee3bb8.jpg",
          ogImageUrl: "/attached_assets/stock_images/australian_education_bbee3bb8.jpg",
          status: "published" as const,
          publishedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
          authorId: userId,
        },
      ];

      // Create blogs one by one, skipping any that already exist
      const createdBlogs = [];
      const skippedBlogs = [];

      for (const blogData of blogPosts) {
        // Check if slug already exists
        const existing = await storage.getBlogBySlug(blogData.slug);
        if (existing) {
          skippedBlogs.push(blogData.slug);
          continue;
        }

        const newBlog = await storage.createBlog(blogData as any);
        createdBlogs.push(newBlog);
      }

      res.json({
        message: "Blog posts seeded successfully",
        created: createdBlogs.length,
        skipped: skippedBlogs.length,
        skippedSlugs: skippedBlogs,
        blogs: createdBlogs,
      });
    } catch (error) {
      console.error("Error seeding blogs:", error);
      res.status(500).json({ message: "Failed to seed blogs", error: String(error) });
    }
  });

  // ========================================
  // ADMIN AFFILIATE MANAGEMENT ROUTES
  // ========================================

  // Get all affiliates (users with referral codes)
  app.get("/api/admin/affiliates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Get all student profiles with referral codes (affiliates)
      const affiliates = await db
        .select({
          profile: studentProfiles,
          user: users,
        })
        .from(studentProfiles)
        .innerJoin(users, eq(studentProfiles.userId, users.id))
        .where(dsql`${studentProfiles.referralCode} IS NOT NULL`);

      // Get referral stats for each affiliate
      const affiliatesWithStats = await Promise.all(
        affiliates.map(async ({ profile, user }) => {
          const stats = await storage.getReferralStats(profile.id);
          return {
            id: profile.id,
            userId: profile.userId,
            firstName: profile.firstName,
            lastName: profile.lastName,
            email: user.email,
            referralCode: profile.referralCode,
            bankAccountHolderName: profile.bankAccountHolderName,
            bankName: profile.bankName,
            bankBsbCode: profile.bankBsbCode,
            bankAccountNumber: profile.bankAccountNumber ? `****${profile.bankAccountNumber.slice(-4)}` : null,
            createdAt: profile.createdAt,
            stats,
          };
        })
      );

      res.json(affiliatesWithStats);
    } catch (error) {
      console.error("Error fetching affiliates:", error);
      res.status(500).json({ message: "Failed to fetch affiliates" });
    }
  });

  // Get affiliate details with their referrals
  app.get("/api/admin/affiliates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const [profileResult] = await db
        .select({
          profile: studentProfiles,
          user: users,
        })
        .from(studentProfiles)
        .innerJoin(users, eq(studentProfiles.userId, users.id))
        .where(eq(studentProfiles.id, req.params.id));

      if (!profileResult) {
        return res.status(404).json({ message: "Affiliate not found" });
      }

      const { profile, user } = profileResult;
      const stats = await storage.getReferralStats(profile.id);
      const referrals = await storage.getReferralsByReferrerId(profile.id);

      res.json({
        id: profile.id,
        userId: profile.userId,
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: user.email,
        referralCode: profile.referralCode,
        bankAccountHolderName: profile.bankAccountHolderName,
        bankName: profile.bankName,
        bankBsbCode: profile.bankBsbCode,
        bankAccountNumber: profile.bankAccountNumber,
        createdAt: profile.createdAt,
        stats,
        referrals,
      });
    } catch (error) {
      console.error("Error fetching affiliate details:", error);
      res.status(500).json({ message: "Failed to fetch affiliate details" });
    }
  });

  // Mark referral bonus as paid
  app.patch("/api/admin/affiliates/referrals/:referralId/pay", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { referralId } = req.params;
      const { bonusAmount } = req.body;

      // Import referrals table
      const { referrals } = await import("@shared/schema");
      
      const [updatedReferral] = await db
        .update(referrals)
        .set({
          bonusAmount: bonusAmount?.toString() || "50.00",
          bonusPaidAt: new Date(),
          status: "completed",
        })
        .where(eq(referrals.id, referralId))
        .returning();

      if (!updatedReferral) {
        return res.status(404).json({ message: "Referral not found" });
      }

      // Log activity
      await logActivity({
        userId,
        action: "updated",
        entityType: "application", // Using application as closest entity type for referral tracking
        entityId: referralId,
        description: `Marked referral bonus as paid ($${bonusAmount || "50.00"})`,
      });

      res.json(updatedReferral);
    } catch (error) {
      console.error("Error marking referral as paid:", error);
      res.status(500).json({ message: "Failed to update referral payment" });
    }
  });

  // Batch mark referrals as paid
  app.post("/api/admin/affiliates/referrals/batch-pay", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { referralIds, bonusAmount } = req.body;

      if (!Array.isArray(referralIds) || referralIds.length === 0) {
        return res.status(400).json({ message: "referralIds array is required" });
      }

      // Import referrals table
      const { referrals } = await import("@shared/schema");

      const updatedReferrals = await db
        .update(referrals)
        .set({
          bonusAmount: bonusAmount?.toString() || "50.00",
          bonusPaidAt: new Date(),
          status: "completed",
        })
        .where(inArray(referrals.id, referralIds))
        .returning();

      // Log activity
      await logActivity({
        userId,
        action: "updated",
        entityType: "application", // Using application as closest entity type for referral tracking
        entityId: referralIds.join(","),
        description: `Batch marked ${updatedReferrals.length} referrals as paid ($${bonusAmount || "50.00"} each)`,
      });

      res.json({
        message: `${updatedReferrals.length} referrals marked as paid`,
        referrals: updatedReferrals,
      });
    } catch (error) {
      console.error("Error batch marking referrals as paid:", error);
      res.status(500).json({ message: "Failed to batch update referrals" });
    }
  });

  // Public routes for viewing published blogs
  // Get published blogs with pagination
  app.get("/api/blogs", async (req, res) => {
    try {
      const { category, tag, limit, offset } = req.query;
      
      const result = await storage.getPublishedBlogs({
        category: category as string,
        tag: tag as string,
        limit: limit ? parseInt(limit as string) : 10,
        offset: offset ? parseInt(offset as string) : 0,
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching published blogs:", error);
      res.status(500).json({ message: "Failed to fetch blogs" });
    }
  });

  // Get single published blog by slug
  app.get("/api/blogs/:slug", async (req, res) => {
    try {
      const blog = await storage.getBlogBySlug(req.params.slug);
      
      if (!blog || blog.status !== "published") {
        return res.status(404).json({ message: "Blog not found" });
      }
      
      res.json(blog);
    } catch (error) {
      console.error("Error fetching blog:", error);
      res.status(500).json({ message: "Failed to fetch blog" });
    }
  });

  // ========================================
  // CONTACT INQUIRY ROUTES
  // ========================================

  // Create contact inquiry (public) - also creates CRM lead for unified lead management
  app.post("/api/contact/inquiry", async (req, res) => {
    console.log("Contact inquiry endpoint hit");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    
    try {
      // Parse and validate the request body
      const inquiryData = insertContactInquirySchema.parse(req.body);
      
      // Add tracking information
      const fullInquiryData = {
        ...inquiryData,
        status: "new" as const,
        ipAddress: req.ip || req.connection.remoteAddress || undefined,
        userAgent: req.headers["user-agent"] || undefined,
        referrer: req.headers["referer"] || undefined,
      };
      
      // Create the inquiry
      const inquiry = await storage.createContactInquiry(fullInquiryData);
      
      // Also create a CRM lead for unified lead management
      try {
        // Parse name for student inquiries
        let firstName = "";
        let lastName = "";
        if (inquiry.inquiryType === "student" && inquiry.studentName) {
          const nameParts = inquiry.studentName.trim().split(" ");
          firstName = nameParts[0] || "";
          lastName = nameParts.slice(1).join(" ") || "";
        } else if (inquiry.inquiryType === "institution" && inquiry.contactPerson) {
          const nameParts = inquiry.contactPerson.trim().split(" ");
          firstName = nameParts[0] || "";
          lastName = nameParts.slice(1).join(" ") || "";
        }
        
        // Create CRM lead from contact inquiry
        const [crmLead] = await db.insert(crmLeads).values({
          firstName: firstName || "Unknown",
          lastName: lastName || "Contact",
          email: inquiry.email,
          phone: inquiry.phone || "",
          country: inquiry.country || undefined,
          leadStatus: "not_contacted" as const,
          leadRating: "warm" as const,
          leadCreationMethod: "website_form" as const,
          interestedIn: inquiry.courseInterest || inquiry.partnershipType || undefined,
          notes: `Contact Inquiry (${inquiry.inquiryType}):\n\n${inquiry.message}${inquiry.institutionName ? `\n\nInstitution: ${inquiry.institutionName}` : ""}${inquiry.website ? `\nWebsite: ${inquiry.website}` : ""}${inquiry.studyLevel ? `\nStudy Level: ${inquiry.studyLevel}` : ""}${inquiry.visaStatus ? `\nVisa Status: ${inquiry.visaStatus}` : ""}`,
          referrer: req.headers["referer"] || undefined,
        }).returning();
        
        // Create initial status history
        await db.insert(leadStatusHistory).values({
          leadId: crmLead.id,
          fromStatus: null,
          toStatus: "not_contacted" as const,
          notes: `Lead auto-created from ${inquiry.inquiryType} contact form submission`,
        });
        
        console.log("CRM lead created from contact inquiry:", crmLead.id);
      } catch (crmError) {
        // Log error but don't fail the inquiry submission
        console.error("Error creating CRM lead from contact inquiry:", crmError);
      }
      
      // Send email notifications (don't wait for them to complete)
      sendContactInquiryEmails({
        id: inquiry.id,
        inquiryType: inquiry.inquiryType,
        // Student fields
        studentName: inquiry.studentName || undefined,
        // Institution fields
        institutionName: inquiry.institutionName || undefined,
        contactPerson: inquiry.contactPerson || undefined,
        // Common fields
        email: inquiry.email,
        phone: inquiry.phone || undefined,
        message: inquiry.message,
        // Additional fields
        country: inquiry.country || undefined,
        courseInterest: inquiry.courseInterest || undefined,
        studyLevel: inquiry.studyLevel || undefined,
        visaStatus: inquiry.visaStatus || undefined,
        website: inquiry.website || undefined,
        partnershipType: inquiry.partnershipType || undefined,
      }).catch(error => {
        // Log error but don't fail the inquiry submission
        console.error("Error sending email notifications:", error);
      });
      
      res.json({ 
        message: "Inquiry submitted successfully. You will receive a confirmation email shortly.",
        id: inquiry.id
      });
    } catch (error: any) {
      console.error("Error submitting contact inquiry:", error);
      
      // Handle Zod validation errors
      if (error.name === "ZodError") {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to submit inquiry" });
    }
  });

  // Get all contact inquiries (admin only)
  app.get("/api/admin/contact/inquiries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { status, type, assignedTo } = req.query;
      const inquiries = await storage.getAllContactInquiries({
        status: status as string,
        type: type as string,
        assignedTo: assignedTo as string,
      });
      
      res.json(inquiries);
    } catch (error) {
      console.error("Error fetching contact inquiries:", error);
      res.status(500).json({ message: "Failed to fetch inquiries" });
    }
  });

  // Get single contact inquiry (admin only)
  app.get("/api/admin/contact/inquiries/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const inquiry = await storage.getContactInquiryById(req.params.id);
      if (!inquiry) {
        return res.status(404).json({ message: "Inquiry not found" });
      }
      
      res.json(inquiry);
    } catch (error) {
      console.error("Error fetching contact inquiry:", error);
      res.status(500).json({ message: "Failed to fetch inquiry" });
    }
  });

  // Update contact inquiry (admin only)
  app.patch("/api/admin/contact/inquiries/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const inquiry = await storage.getContactInquiryById(req.params.id);
      if (!inquiry) {
        return res.status(404).json({ message: "Inquiry not found" });
      }
      
      const updatedInquiry = await storage.updateContactInquiry(req.params.id, req.body);
      res.json(updatedInquiry);
    } catch (error) {
      console.error("Error updating contact inquiry:", error);
      res.status(500).json({ message: "Failed to update inquiry" });
    }
  });

  // Update contact inquiry status (admin only)
  app.patch("/api/admin/contact/inquiries/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { status } = req.body;
      if (!["new", "in_progress", "responded", "closed"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const inquiry = await storage.getContactInquiryById(req.params.id);
      if (!inquiry) {
        return res.status(404).json({ message: "Inquiry not found" });
      }
      
      const updatedInquiry = await storage.updateContactInquiryStatus(req.params.id, status);
      res.json(updatedInquiry);
    } catch (error) {
      console.error("Error updating contact inquiry status:", error);
      res.status(500).json({ message: "Failed to update inquiry status" });
    }
  });

  // Assign contact inquiry (admin only)
  app.patch("/api/admin/contact/inquiries/:id/assign", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { assignedTo } = req.body;
      if (!assignedTo) {
        return res.status(400).json({ message: "Assigned user ID required" });
      }
      
      const inquiry = await storage.getContactInquiryById(req.params.id);
      if (!inquiry) {
        return res.status(404).json({ message: "Inquiry not found" });
      }
      
      const updatedInquiry = await storage.assignContactInquiry(req.params.id, assignedTo);
      res.json(updatedInquiry);
    } catch (error) {
      console.error("Error assigning contact inquiry:", error);
      res.status(500).json({ message: "Failed to assign inquiry" });
    }
  });

  // ========================================
  // SEO ROUTES
  // ========================================

  // Generate dynamic sitemap.xml with all published blogs, courses, and institutions
  app.get("/sitemap.xml", async (req, res) => {
    try {
      // Fetch all published blogs
      const blogResult = await storage.getPublishedBlogs({
        limit: 10000,
        offset: 0,
      });

      // Fetch all active courses
      const courses = await storage.getAllCourses();
      const activeCourses = courses.filter(c => c.isActive !== false);

      // Fetch all universities
      const universities = await storage.getAllUniversities();

      const blogs = blogResult.blogs;
      const baseUrl = `${req.protocol}://${req.get('host')}`;

      // Build XML sitemap
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/blog</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/courses</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/institutions</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/contact</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
${blogs.map((blog) => `  <url>
    <loc>${baseUrl}/blog/${blog.slug}</loc>
    <lastmod>${blog.updatedAt ? new Date(blog.updatedAt).toISOString().split('T')[0] : new Date(blog.publishedAt || blog.createdAt!).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n')}
${activeCourses.map((course) => `  <url>
    <loc>${baseUrl}/courses/${course.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n')}
${universities.map((uni) => `  <url>
    <loc>${baseUrl}/institutions/${uni.id}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n')}
</urlset>`;

      res.header('Content-Type', 'application/xml');
      res.send(sitemap);
    } catch (error) {
      console.error("Error generating sitemap:", error);
      res.status(500).send("Failed to generate sitemap");
    }
  });

  // Generate dynamic robots.txt with environment-aware sitemap URL
  app.get("/robots.txt", (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    const robotsTxt = `# ANZ Global Education - Robots.txt
# Allow all crawlers including AI bots

# Google and traditional search engines
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

# AI crawlers (GPTBot, Claude, Perplexity, etc.)
User-agent: GPTBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: Applebot
Allow: /

User-agent: ChatGPT-User
Allow: /

# Google's new AI crawler for Vertex AI
User-agent: Google-CloudVertexBot
Allow: /

# Allow all other crawlers
User-agent: *
Allow: /

# Disallow admin and API endpoints
Disallow: /admin/
Disallow: /api/

# Sitemap location (environment-aware)
Sitemap: ${baseUrl}/sitemap.xml
`;

    res.header('Content-Type', 'text/plain');
    res.send(robotsTxt);
  });

  // ========================================
  // CSV BULK IMPORT ROUTES (Admin Only)
  // ========================================

  // Upload and parse CSV file
  app.post("/api/admin/csv-import/upload", isAuthenticated, csvUpload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'support_manager']);

      if (!access) {
        return res.status(403).json({ message: "Super admin or support manager access required" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { type } = req.body; // 'universities' or 'courses'
      
      if (!type || (type !== 'universities' && type !== 'courses')) {
        return res.status(400).json({ message: "Invalid type. Must be 'universities' or 'courses'" });
      }

      // Parse CSV
      const csvContent = req.file.buffer.toString('utf-8');
      const parseResult = parseCSV(csvContent);

      // Check for critical parse errors
      if (parseResult.hasCriticalErrors || parseResult.parseErrors.length > 0) {
        return res.status(400).json({
          message: "CSV parsing failed",
          parseErrors: parseResult.parseErrors,
        });
      }

      // Validate based on type
      let validationErrors: ValidationError[] = [];
      const structuredRows: ParsedCSVRow[] = [];
      let universitiesMap = new Map<string, string>();
      
      // Load existing data for duplicate detection
      let existingNames: Set<string> | undefined;
      let batchNames: Set<string> | undefined;
      let existingCourseKeys: Set<string> | undefined;
      let batchCourseKeys: Set<string> | undefined;
      let validUniversityIds: Set<string> | undefined; // For validating universityId field in courses

      if (type === 'universities') {
        // Load existing university names from DB
        const allUniversities = await storage.getAllUniversities();
        existingNames = new Set(allUniversities.map(u => u.name.toLowerCase()));
        batchNames = new Set(); // Track duplicates within this batch
      } else if (type === 'courses') {
        // Pre-fetch all universities for course validation
        const allUniversities = await storage.getAllUniversities();
        validUniversityIds = new Set<string>(); // Hoist to outer scope
        allUniversities.forEach(uni => {
          universitiesMap.set(uni.name.toLowerCase(), uni.id);
          validUniversityIds!.add(uni.id); // Track valid IDs for universityId field validation
        });
        
        // Load existing course keys from DB
        const allCourses = await storage.getAllCourses();
        existingCourseKeys = new Set(
          allCourses.map(c => `${c.title.toLowerCase()}:${c.universityId}`)
        );
        batchCourseKeys = new Set(); // Track duplicates within this batch
      }

      // Validate each row and create structured data
      parseResult.data.forEach((row, index) => {
        const rowErrors = type === 'universities'
          ? validateUniversityRow(row, index + 1, existingNames, batchNames)
          : validateCourseRow(row, index + 1, universitiesMap, existingCourseKeys, batchCourseKeys, validUniversityIds);

        const normalized = type === 'universities'
          ? normalizeUniversityRow(row)
          : normalizeCourseRow(row);

        structuredRows.push({
          rowIndex: index + 1,
          isValid: rowErrors.length === 0,
          data: normalized,
          errors: rowErrors,
        });

        validationErrors.push(...rowErrors);
      });

      const validCount = structuredRows.filter(r => r.isValid).length;
      const errorCount = structuredRows.filter(r => !r.isValid).length;

      // Store in database
      const [batch] = await db.insert(importBatches).values({
        type: type as 'universities' | 'courses',
        uploadedBy: userId,
        fileName: req.file.originalname,
        rawCsvText: csvContent,
        rawData: structuredRows,
        validationErrors: validationErrors,
        errorCount,
        validCount,
        totalCount: parseResult.totalCount,
      }).returning();

      res.json({
        batchId: batch.id,
        totalCount: batch.totalCount,
        validCount,
        errorCount,
        validationErrors,
        canApprove: errorCount === 0 && validCount > 0,
      });
    } catch (error: any) {
      console.error("Error uploading CSV:", error);
      res.status(500).json({ message: error.message || "Failed to upload CSV" });
    }
  });

  // List all import batches
  app.get("/api/admin/csv-import", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'support_manager', 'support_staff']);

      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const batches = await db
        .select()
        .from(importBatches)
        .orderBy(desc(importBatches.createdAt));

      res.json(batches);
    } catch (error: any) {
      console.error("Error listing CSV batches:", error);
      res.status(500).json({ message: "Failed to list import batches" });
    }
  });

  // Approve and execute import
  app.post("/api/admin/csv-import/:batchId/approve", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'support_manager']);

      if (!access) {
        return res.status(403).json({ message: "Super admin or support manager access required" });
      }

      const { batchId } = req.params;

      // Get batch
      const [batch] = await db
        .select()
        .from(importBatches)
        .where(eq(importBatches.id, batchId));

      if (!batch) {
        return res.status(404).json({ message: "Import batch not found" });
      }

      // Double-check status
      if (batch.status !== 'pending') {
        return res.status(400).json({ message: `Batch is already ${batch.status}` });
      }

      // Check if there are any valid rows to import
      if (batch.validCount === 0) {
        return res.status(400).json({ message: "No valid rows to import" });
      }

      let importedCount = 0;
      const importErrors: string[] = [];

      // Execute import in transaction
      try {
        await db.transaction(async (tx) => {
          const structuredRows = batch.rawData as ParsedCSVRow[];
          const validRows = structuredRows.filter(r => r.isValid);

          if (batch.type === 'universities') {
            // Load existing universities for duplicate detection
            const allUniversities = await storage.getAllUniversities();
            const existingNames = new Set(allUniversities.map(u => u.name.toLowerCase()));
            
            // Import universities
            for (const row of validRows) {
              try {
                const universityData = transformUniversityRow(row.data, userId);
                
                // Skip if name is missing or already exists (idempotency guard)
                if (!universityData.name) {
                  importErrors.push(`Row ${row.rowIndex}: University name is required`);
                  continue;
                }
                
                if (existingNames.has(universityData.name.toLowerCase())) {
                  console.log(`[CSV Import] Skipping duplicate university: ${universityData.name}`);
                  continue;
                }
                
                await storage.createUniversity(universityData as any);
                existingNames.add(universityData.name.toLowerCase()); // Add to set for subsequent rows
                importedCount++;
              } catch (error: any) {
                importErrors.push(`Row ${row.rowIndex}: ${error.message}`);
              }
            }
          } else if (batch.type === 'courses') {
            // Pre-fetch universities map for course import
            const allUniversities = await storage.getAllUniversities();
            const universitiesMap = new Map<string, string>();
            allUniversities.forEach(uni => {
              universitiesMap.set(uni.name.toLowerCase(), uni.id);
            });
            
            // Load existing courses for duplicate detection
            const allCourses = await storage.getAllCourses();
            const existingCourseKeys = new Set(
              allCourses.map(c => `${c.title.toLowerCase()}:${c.universityId}`)
            );

            // Import courses
            for (const row of validRows) {
              try {
                // Derive universityId from either universityName or universityId field
                let universityId: string | undefined;
                if (row.data.universityName) {
                  universityId = universitiesMap.get(row.data.universityName.toLowerCase());
                } else if (row.data.universityId) {
                  universityId = row.data.universityId;
                }
                
                if (!universityId) {
                  importErrors.push(`Row ${row.rowIndex}: Could not determine university ID`);
                  continue;
                }
                
                const courseData = transformCourseRow(row.data, universityId);
                
                // Skip if title is missing
                if (!courseData.title) {
                  importErrors.push(`Row ${row.rowIndex}: Course title is required`);
                  continue;
                }
                
                const courseKey = `${courseData.title.toLowerCase()}:${courseData.universityId}`;
                
                // Skip if already exists (idempotency guard)
                if (existingCourseKeys.has(courseKey)) {
                  console.log(`[CSV Import] Skipping duplicate course: ${courseData.title} for university ${courseData.universityId}`);
                  continue;
                }
                
                await storage.createCourse(courseData as any);
                existingCourseKeys.add(courseKey); // Add to set for subsequent rows
                importedCount++;
              } catch (error: any) {
                importErrors.push(`Row ${row.rowIndex}: ${error.message}`);
              }
            }
          }

          // Update batch status
          await tx
            .update(importBatches)
            .set({
              status: importErrors.length > 0 ? 'failed' : 'approved',
              importedCount,
              processedAt: new Date(),
              notes: importErrors.length > 0
                ? `Imported ${importedCount} of ${validRows.length} valid rows. Errors: ${importErrors.join('; ')}`
                : undefined,
            })
            .where(eq(importBatches.id, batchId));
        });

        res.json({
          message: "Import completed successfully",
          importedCount,
          totalValid: batch.validCount,
          errors: importErrors,
        });
      } catch (error: any) {
        // Update batch as failed
        await db
          .update(importBatches)
          .set({
            status: 'failed',
            processedAt: new Date(),
            notes: `Import failed: ${error.message}`,
          })
          .where(eq(importBatches.id, batchId));

        throw error;
      }
    } catch (error: any) {
      console.error("Error approving import:", error);
      res.status(500).json({ message: error.message || "Failed to approve import" });
    }
  });

  // Reject import batch
  app.post("/api/admin/csv-import/:batchId/reject", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'support_manager']);

      if (!access) {
        return res.status(403).json({ message: "Super admin or support manager access required" });
      }

      const { batchId } = req.params;
      const { notes } = req.body;

      const [batch] = await db
        .select()
        .from(importBatches)
        .where(eq(importBatches.id, batchId));

      if (!batch) {
        return res.status(404).json({ message: "Import batch not found" });
      }

      if (batch.status !== 'pending') {
        return res.status(400).json({ message: `Batch is already ${batch.status}` });
      }

      await db
        .update(importBatches)
        .set({
          status: 'rejected',
          processedAt: new Date(),
          notes,
        })
        .where(eq(importBatches.id, batchId));

      res.json({ message: "Import batch rejected" });
    } catch (error: any) {
      console.error("Error rejecting import:", error);
      res.status(500).json({ message: "Failed to reject import batch" });
    }
  });

  // Download sample CSV templates
  app.get("/api/admin/csv-import/templates/:type", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'support_manager', 'support_staff']);

      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { type } = req.params;

      let csvContent = '';
      let filename = '';

      if (type === 'universities') {
        filename = 'universities_template.csv';
        csvContent = [
          'name,description,location,country,website,studentCount,internationalStudents,yearEstablished',
          'Example University,"A leading institution for higher education","New York, NY",USA,https://example.edu,25000,5000,1850',
          'Tech Institute,"Innovative technology-focused university","San Francisco, CA",USA,https://tech.edu,15000,3000,1965',
        ].join('\n');
      } else if (type === 'courses') {
        filename = 'courses_template.csv';
        csvContent = [
          'universityName,title,subject,level,deliveryMode,duration,durationUnit,tuitionFee,currency,intakeMonths,description,entryRequirements',
          'Example University,Master of Business Administration,Business,postgraduate,on-campus,24,months,45000,USD,"January,September","Comprehensive MBA program with focus on leadership and strategy","Bachelor degree with 3.0 GPA, GMAT 600+"',
          'Tech Institute,Bachelor of Computer Science,Computer Science,undergraduate,on-campus,48,months,35000,USD,"September","Four-year undergraduate program in computer science and software engineering","High school diploma, Mathematics proficiency"',
        ].join('\n');
      } else {
        return res.status(400).json({ message: "Invalid type. Must be 'universities' or 'courses'" });
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);
    } catch (error: any) {
      console.error("Error generating template:", error);
      res.status(500).json({ message: "Failed to generate template" });
    }
  });

  const httpServer = createServer(app);
  
  // WebSocket server for real-time chat with session-based authentication
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Map<string, WebSocket>(); // userId -> WebSocket
  
  wss.on('connection', async (ws: WebSocket, request) => {
    let userId: string | null = null;
    
    console.log('[WS] New WebSocket connection attempt');
    console.log('[WS] Headers:', request.headers.cookie ? 'Has cookie' : 'No cookie');
    
    try {
      // Parse cookies from upgrade request
      const cookies = request.headers.cookie ? parseCookie(request.headers.cookie) : {};
      const sessionCookieName = 'connect.sid';
      const signedSessionId = cookies[sessionCookieName];
      
      console.log('[WS] Session cookie:', signedSessionId ? 'Found' : 'Missing');
      
      if (!signedSessionId) {
        console.log('[WS] Rejecting: No session cookie');
        ws.close(1008, 'Unauthorized: No session cookie');
        return;
      }
      
      // Unsign the session cookie (Express uses cookie-signature)
      // Express prefixes signed cookies with 's:', so we need to strip it before unsigning
      const sessionSecret = process.env.SESSION_SECRET!;
      const cookieValue = signedSessionId.startsWith('s:') 
        ? signedSessionId.slice(2) 
        : signedSessionId;
      const sessionId = unsignCookie(cookieValue, sessionSecret);
      
      console.log('[WS] Session ID after unsigning:', sessionId ? 'Valid' : 'Invalid');
      
      if (!sessionId || sessionId === 'false') {
        console.log('[WS] Rejecting: Invalid session signature');
        ws.close(1008, 'Unauthorized: Invalid session');
        return;
      }
      
      // Query session store to get session data
      const sessionResult = await db
        .select()
        .from(sessions)
        .where(eq(sessions.sid, sessionId as string))
        .limit(1);
      
      console.log('[WS] Session query result:', sessionResult.length > 0 ? 'Found' : 'Not found');
      
      if (sessionResult.length === 0 || !sessionResult[0].sess) {
        console.log('[WS] Rejecting: Session not found in database');
        ws.close(1008, 'Unauthorized: Session not found');
        return;
      }
      
      const sessionData: any = sessionResult[0].sess;
      
      console.log('[WS] Session data structure:', {
        hasPassport: !!sessionData.passport,
        hasUser: !!sessionData.passport?.user,
      });
      
      if (!sessionData.passport || !sessionData.passport.user) {
        console.log('[WS] Rejecting: Invalid or expired session - no passport data');
        ws.close(1008, 'Unauthorized: Invalid or expired session');
        return;
      }
      
      // Get user from session (passport serializes the whole user object)
      const sessionUser = sessionData.passport.user;
      userId = sessionUser.claims?.sub || sessionUser.id;
      
      console.log('[WS] Extracted user ID:', userId || 'None');
      
      if (!userId) {
        console.log('[WS] Rejecting: No user ID in session');
        ws.close(1008, 'Unauthorized: No user in session');
        return;
      }
      
      // Successfully authenticated - register client
      clients.set(userId, ws);
      console.log(`[WS] ✅ Client authenticated successfully: ${userId}`);
      ws.send(JSON.stringify({ type: 'auth_success', userId }));
      
    } catch (error) {
      console.error('[WS] ❌ Authentication error:', error);
      ws.close(1011, 'Authentication failed');
      return;
    }
    
    ws.on('message', async (data: Buffer) => {
      if (!userId) {
        ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
        return;
      }
      
      try {
        const message = JSON.parse(data.toString());
        
        // Handle sending messages
        if (message.type === 'send_message') {
          const { conversationId, content, recipientId } = message;
          
          if (!conversationId || !content || !recipientId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Missing required fields' }));
            return;
          }
          
          // Verify user is participant in this conversation
          const conversation = await db
            .select()
            .from(conversations)
            .where(eq(conversations.id, conversationId))
            .limit(1);
          
          if (
            conversation.length === 0 ||
            (conversation[0].participant1Id !== userId &&
              conversation[0].participant2Id !== userId)
          ) {
            ws.send(JSON.stringify({ type: 'error', message: 'Access denied to conversation' }));
            return;
          }
          
          // Save message to database
          const newMessage = await db.insert(messages).values({
            conversationId,
            senderId: userId,
            content,
            isRead: false,
          }).returning();
          
          // Update conversation's lastMessageAt
          await db.update(conversations)
            .set({ lastMessageAt: new Date() })
            .where(eq(conversations.id, conversationId));
          
          // Create notification for recipient about new message
          const senderUser = await db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);
          
          const senderName = senderUser[0] ? getUserDisplayName(senderUser[0]) : 'Someone';
          const messagePreview = content.length > 50 ? content.substring(0, 50) + '...' : content;
          
          await db.insert(notifications).values({
            userId: recipientId,
            type: 'new_message',
            title: `New message from ${senderName}`,
            message: messagePreview,
            link: `/chat?conversationId=${conversationId}`,
            metadata: { conversationId, messageId: newMessage[0].id, senderId: userId },
          });
          
          // Send message to recipient if they're online
          const recipientSocket = clients.get(recipientId);
          if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
            recipientSocket.send(JSON.stringify({
              type: 'new_message',
              message: newMessage[0],
              conversationId,
            }));
          }
          
          // Send confirmation to sender
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'message_sent',
              message: newMessage[0],
              conversationId,
            }));
          }
        }
        
        // Handle typing indicator
        if (message.type === 'typing') {
          const { conversationId, recipientId, isTyping } = message;
          
          // Verify user is participant in this conversation
          const conversation = await db
            .select()
            .from(conversations)
            .where(eq(conversations.id, conversationId))
            .limit(1);
          
          if (
            conversation.length === 0 ||
            (conversation[0].participant1Id !== userId &&
              conversation[0].participant2Id !== userId)
          ) {
            return; // Silently ignore invalid typing indicators
          }
          
          const recipientSocket = clients.get(recipientId);
          if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
            recipientSocket.send(JSON.stringify({
              type: 'user_typing',
              conversationId,
              userId,
              isTyping,
            }));
          }
        }
        
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });
    
    ws.on('close', () => {
      if (userId) {
        clients.delete(userId);
        console.log(`WebSocket client disconnected: ${userId}`);
      }
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      if (userId) {
        clients.delete(userId);
      }
    });
  });
  
  console.log('WebSocket server initialized on path /ws with session-based authentication');
  
  // Register chat routes
  const { registerChatRoutes } = await import('./chat-routes');
  registerChatRoutes(app);
  console.log('Chat routes registered with RAG-powered AI assistant');

  // Register scraping routes (protected with authentication)
  const scrapingRouter = await import('./scraping-routes');
  app.use('/api/admin/scraping', isAuthenticated, scrapingRouter.default);
  console.log('Scraping routes registered for AI-powered course extraction');

  // Register application workflow routes
  const { registerApplicationWorkflowRoutes } = await import('./application-workflow-routes');
  registerApplicationWorkflowRoutes(app);
  console.log('Application workflow routes registered for CRM-style application management');

  // Register workflow validation routes (business rules)
  const { registerWorkflowValidationRoutes } = await import('./workflow-validation-routes');
  registerWorkflowValidationRoutes(app);
  console.log('Workflow validation routes registered for business rules enforcement');

  // Register CRM routes for leads and contacts management
  const crmRouter = await import('./crm-routes');
  app.use('/api/crm', isAuthenticated, crmRouter.default);
  console.log('CRM routes registered for leads and contacts management');

  // ========== Activity Logs API ==========
  
  // Get all activity logs (admin only) with optional filtering
  app.get("/api/admin/activity-logs", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      const userId = user.id || user.claims?.sub;
      
      // Check admin access
      const adminAccess = await checkAdminAccess(userId);
      if (!adminAccess) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      // Parse query parameters for filtering
      const {
        entityType,
        action,
        actorUserId,
        limit = '50',
        offset = '0',
      } = req.query;
      
      // Build where conditions
      const conditions: any[] = [];
      
      if (entityType) {
        conditions.push(eq(activityLogs.entityType, entityType as any));
      }
      
      if (action) {
        conditions.push(eq(activityLogs.action, action as any));
      }
      
      if (actorUserId) {
        conditions.push(eq(activityLogs.userId, actorUserId as string));
      }
      
      // Fetch activity logs with filters
      const logs = await db.select()
        .from(activityLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(activityLogs.createdAt))
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string));
      
      // Get total count for pagination
      const countResult = await db.select({ count: dsql<number>`count(*)` })
        .from(activityLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
      
      const totalCount = Number(countResult[0]?.count || 0);
      
      res.json({
        logs,
        pagination: {
          total: totalCount,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: parseInt(offset as string) + parseInt(limit as string) < totalCount,
        },
      });
    } catch (error: any) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });
  
  // Get activity logs for a specific entity
  app.get("/api/admin/activity-logs/entity/:entityType/:entityId", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      const userId = user.id || user.claims?.sub;
      
      // Check admin access
      const adminAccess = await checkAdminAccess(userId);
      if (!adminAccess) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { entityType, entityId } = req.params;
      const { limit = '50', offset = '0' } = req.query;
      
      // Fetch entity-specific activity logs
      const logs = await db.select()
        .from(activityLogs)
        .where(and(
          eq(activityLogs.entityType, entityType),
          eq(activityLogs.entityId, entityId)
        ))
        .orderBy(desc(activityLogs.createdAt))
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string));
      
      // Get total count
      const countResult = await db.select({ count: dsql<number>`count(*)` })
        .from(activityLogs)
        .where(and(
          eq(activityLogs.entityType, entityType),
          eq(activityLogs.entityId, entityId)
        ));
      
      const totalCount = Number(countResult[0]?.count || 0);
      
      res.json({
        logs,
        pagination: {
          total: totalCount,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: parseInt(offset as string) + parseInt(limit as string) < totalCount,
        },
      });
    } catch (error: any) {
      console.error("Error fetching entity activity logs:", error);
      res.status(500).json({ message: "Failed to fetch entity activity logs" });
    }
  });
  
  // Get recent activity logs (authenticated users - see their own related activity)
  app.get("/api/activity-logs/recent", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      const userId = user.id || user.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { limit = '20' } = req.query;
      
      // Fetch recent activity logs related to this user
      // This includes actions they performed or actions on their entities
      const logs = await db.select()
        .from(activityLogs)
        .where(eq(activityLogs.userId, userId))
        .orderBy(desc(activityLogs.createdAt))
        .limit(parseInt(limit as string));
      
      res.json({ logs });
    } catch (error: any) {
      console.error("Error fetching recent activity logs:", error);
      res.status(500).json({ message: "Failed to fetch recent activity logs" });
    }
  });

  // ============================================
  // CRM SYSTEM API ENDPOINTS
  // ============================================

  // Helper function to check if user is admin team member
  async function isAdminTeamMember(userId: string): Promise<{ isAdmin: boolean; role: string | null }> {
    const adminMember = await storage.getAdminTeamMemberByUserId(userId);
    if (adminMember && adminMember.isActive) {
      return { isAdmin: true, role: adminMember.role };
    }
    const user = await storage.getUser(userId);
    if (user?.userType === 'admin' || user?.userType === 'super_admin') {
      return { isAdmin: true, role: user.userType };
    }
    return { isAdmin: false, role: null };
  }

  // Get all tasks (admin only) with optional filters
  app.get("/api/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { isAdmin } = await isAdminTeamMember(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { status, priority, assignedToId, applicationId, category, withRelations } = req.query;
      
      const filters = {
        status: status as string | undefined,
        priority: priority as string | undefined,
        assignedToId: assignedToId as string | undefined,
        applicationId: applicationId as string | undefined,
        category: category as string | undefined,
      };
      
      if (withRelations === 'true') {
        const tasks = await storage.getTasksWithRelations(filters);
        return res.json(tasks);
      }
      
      const tasks = await storage.getAllTasks(filters);
      res.json(tasks);
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Get my tasks (assigned to current user)
  app.get("/api/tasks/my-tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { isAdmin } = await isAdminTeamMember(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const tasks = await storage.getTasksWithRelations({ assignedToId: userId });
      res.json(tasks);
    } catch (error: any) {
      console.error("Error fetching my tasks:", error);
      res.status(500).json({ message: "Failed to fetch my tasks" });
    }
  });

  // Get workload summary for all team members
  app.get("/api/tasks/workload-summary", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { isAdmin, role } = await isAdminTeamMember(userId);
      
      // Only super_admin and support_manager can see workload summary
      if (!isAdmin || !['super_admin', 'support_manager'].includes(role || '')) {
        return res.status(403).json({ message: "Only super admins and support managers can view workload summary" });
      }
      
      const summary = await storage.getTeamWorkloadSummary();
      res.json(summary);
    } catch (error: any) {
      console.error("Error fetching workload summary:", error);
      res.status(500).json({ message: "Failed to fetch workload summary" });
    }
  });

  // Get single task by ID
  app.get("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { isAdmin } = await isAdminTeamMember(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const task = await storage.getTaskById(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(task);
    } catch (error: any) {
      console.error("Error fetching task:", error);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  // Create new task
  app.post("/api/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { isAdmin } = await isAdminTeamMember(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const user = await storage.getUser(userId);
      const assignedByName = getUserDisplayName(user || { email: 'Unknown' });
      
      const data = insertTaskSchema.parse({
        ...req.body,
        createdById: userId,
        assignedByName,
      });
      
      const task = await storage.createTask(data);
      
      // Log activity with user attribution
      await logCreate({
        req,
        entityType: 'task',
        entityId: task.id,
        entityName: task.title,
      });
      
      res.json(task);
    } catch (error: any) {
      console.error("Error creating task:", error);
      res.status(400).json({ message: error.message || "Failed to create task" });
    }
  });

  // Update task
  app.patch("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { isAdmin } = await isAdminTeamMember(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const existingTask = await storage.getTaskById(req.params.id);
      if (!existingTask) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const data = updateTaskSchema.parse(req.body);
      const task = await storage.updateTask(req.params.id, data);
      
      // Log activity with user attribution
      await logUpdate({
        req,
        entityType: 'task',
        entityId: task.id,
        entityName: task.title,
        oldData: existingTask,
        newData: task,
      });
      
      res.json(task);
    } catch (error: any) {
      console.error("Error updating task:", error);
      res.status(400).json({ message: error.message || "Failed to update task" });
    }
  });

  // Complete task
  app.post("/api/tasks/:id/complete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { isAdmin } = await isAdminTeamMember(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const existingTask = await storage.getTaskById(req.params.id);
      if (!existingTask) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const task = await storage.completeTask(req.params.id);
      
      // Log activity with user attribution
      await logStatusChange({
        req,
        entityType: 'task',
        entityId: task.id,
        entityName: task.title,
        oldStatus: existingTask.status,
        newStatus: 'completed',
      });
      
      res.json(task);
    } catch (error: any) {
      console.error("Error completing task:", error);
      res.status(500).json({ message: "Failed to complete task" });
    }
  });

  // Delete task
  app.delete("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { isAdmin, role } = await isAdminTeamMember(userId);
      
      // Only super_admin and support_manager can delete tasks
      if (!isAdmin || !['super_admin', 'support_manager'].includes(role || '')) {
        return res.status(403).json({ message: "Only super admins and support managers can delete tasks" });
      }
      
      const existingTask = await storage.getTaskById(req.params.id);
      if (!existingTask) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      await storage.deleteTask(req.params.id);
      
      // Log activity with user attribution
      await logDelete({
        req,
        entityType: 'task',
        entityId: req.params.id,
        entityName: existingTask.title,
      });
      
      res.json({ message: "Task deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // ============================================
  // APPLICATION INTERNAL NOTES API
  // ============================================

  // Get notes for an application
  app.get("/api/applications/:id/notes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { isAdmin } = await isAdminTeamMember(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const applicationId = req.params.id;
      const application = await storage.getApplicationById(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      const notes = await storage.getNotesByApplicationId(applicationId);
      
      // Enrich notes with author information and mentioned user details
      const enrichedNotes = await Promise.all(
        notes.map(async (note) => {
          const author = await storage.getUser(note.authorId);
          
          // Get mentioned user details if any
          let mentionedUsers: { id: string; firstName: string | null; lastName: string | null; email: string | null }[] = [];
          if (note.mentionedUserIds && note.mentionedUserIds.length > 0) {
            mentionedUsers = await Promise.all(
              note.mentionedUserIds.map(async (userId) => {
                const user = await storage.getUser(userId);
                return user ? {
                  id: user.id,
                  firstName: user.firstName,
                  lastName: user.lastName,
                  email: user.email,
                } : { id: userId, firstName: null, lastName: null, email: null };
              })
            );
          }
          
          return {
            ...note,
            author: author ? {
              id: author.id,
              firstName: author.firstName,
              lastName: author.lastName,
              email: author.email,
              profileImageUrl: author.profileImageUrl,
            } : null,
            mentionedUsers,
          };
        })
      );
      
      res.json(enrichedNotes);
    } catch (error: any) {
      console.error("Error fetching notes:", error);
      res.status(500).json({ message: "Failed to fetch notes" });
    }
  });

  // Create note for an application
  app.post("/api/applications/:id/notes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { isAdmin } = await isAdminTeamMember(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const applicationId = req.params.id;
      const application = await storage.getApplicationById(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      const data = insertApplicationInternalNoteSchema.parse({
        ...req.body,
        applicationId,
        authorId: userId,
      });
      
      const note = await storage.createNote(data);
      
      // Log activity with user attribution
      await logCreate({
        req,
        entityType: 'application',
        entityId: applicationId,
        entityName: `Internal note on application`,
        metadata: { noteId: note.id, mentionedUserIds: note.mentionedUserIds },
      });
      
      // Get author info for response
      const author = await storage.getUser(userId);
      const authorName = author?.firstName && author?.lastName 
        ? `${author.firstName} ${author.lastName}` 
        : (author?.email || 'A team member');
      
      // Send notifications to mentioned users (validate against admin team members, skip self-mentions)
      if (note.mentionedUserIds && note.mentionedUserIds.length > 0) {
        // Get all valid admin team member user IDs for validation
        const allAdminMembers = await storage.getAllAdminTeamMembers();
        const validAdminUserIds = new Set(allAdminMembers.filter(m => m.isActive).map(m => m.userId));
        
        for (const mentionedUserId of note.mentionedUserIds) {
          // Skip self-mentions and validate against actual admin team members
          if (mentionedUserId !== userId && validAdminUserIds.has(mentionedUserId)) {
            try {
              await createNotification({
                userId: mentionedUserId,
                type: 'internal_note_mention',
                title: 'You were mentioned in a note',
                message: `${authorName} mentioned you in an internal note on an application`,
                link: `/admin/dashboard#applications`,
                metadata: {
                  noteId: note.id,
                  applicationId: applicationId,
                  mentionedBy: userId,
                  mentionedByName: authorName,
                }
              });
            } catch (notifError) {
              console.warn(`Failed to send mention notification to ${mentionedUserId}:`, notifError);
            }
          }
        }
      }
      
      res.json({
        ...note,
        author: author ? {
          id: author.id,
          firstName: author.firstName,
          lastName: author.lastName,
          email: author.email,
          profileImageUrl: author.profileImageUrl,
        } : null,
      });
    } catch (error: any) {
      console.error("Error creating note:", error);
      res.status(400).json({ message: error.message || "Failed to create note" });
    }
  });

  // Toggle note pin status
  app.post("/api/notes/:id/toggle-pin", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { isAdmin } = await isAdminTeamMember(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const note = await storage.toggleNotePin(req.params.id);
      res.json(note);
    } catch (error: any) {
      console.error("Error toggling note pin:", error);
      res.status(500).json({ message: "Failed to toggle note pin" });
    }
  });

  // Delete note
  app.delete("/api/notes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { isAdmin } = await isAdminTeamMember(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const note = await storage.getNoteById(req.params.id);
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }
      
      // Only the author or super_admin can delete a note
      const { role } = await isAdminTeamMember(userId);
      if (note.authorId !== userId && role !== 'super_admin') {
        return res.status(403).json({ message: "Only the author or super admin can delete this note" });
      }
      
      await storage.deleteNote(req.params.id);
      
      // Log activity
      await logDelete({
        req,
        entityType: 'notification',
        entityId: req.params.id,
        entityName: 'Internal note',
      });
      
      res.json({ message: "Note deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting note:", error);
      res.status(500).json({ message: "Failed to delete note" });
    }
  });

  // ============================================
  // FOLLOW-UP REMINDERS API
  // ============================================

  // Get my upcoming reminders
  app.get("/api/reminders/upcoming", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { isAdmin } = await isAdminTeamMember(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const reminders = await storage.getUpcomingReminders(userId);
      res.json(reminders);
    } catch (error: any) {
      console.error("Error fetching reminders:", error);
      res.status(500).json({ message: "Failed to fetch reminders" });
    }
  });

  // Get all my reminders
  app.get("/api/reminders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { isAdmin } = await isAdminTeamMember(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const reminders = await storage.getRemindersByUserId(userId);
      res.json(reminders);
    } catch (error: any) {
      console.error("Error fetching reminders:", error);
      res.status(500).json({ message: "Failed to fetch reminders" });
    }
  });

  // Create reminder
  app.post("/api/reminders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { isAdmin } = await isAdminTeamMember(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const data = insertFollowUpReminderSchema.parse({
        ...req.body,
        userId, // Set the reminder for the current user
      });
      
      const reminder = await storage.createReminder(data);
      
      // Log activity with user attribution - Use parent entity type since reminders are linked to tasks/applications
      try {
        if (reminder.taskId) {
          await logCreate({
            req,
            entityType: 'task',
            entityId: reminder.taskId,
            entityName: 'Follow-up reminder',
            metadata: { reminderId: reminder.id, reminderAt: reminder.reminderAt },
          });
        } else if (reminder.applicationId) {
          await logCreate({
            req,
            entityType: 'application',
            entityId: reminder.applicationId,
            entityName: 'Follow-up reminder',
            metadata: { reminderId: reminder.id, reminderAt: reminder.reminderAt },
          });
        }
        // Note: Reminders without task or application links are not logged (standalone reminders)
      } catch (logError) {
        console.warn("Activity log warning for reminder creation:", logError);
        // Continue with request - activity logging failure should not block reminder creation
      }
      
      res.json(reminder);
    } catch (error: any) {
      console.error("Error creating reminder:", error);
      res.status(400).json({ message: error.message || "Failed to create reminder" });
    }
  });

  // Complete reminder
  app.post("/api/reminders/:id/complete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { isAdmin } = await isAdminTeamMember(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const existingReminder = await storage.getReminderById(req.params.id);
      if (!existingReminder) {
        return res.status(404).json({ message: "Reminder not found" });
      }
      
      // Only the owner can complete their own reminder
      if (existingReminder.userId !== userId) {
        return res.status(403).json({ message: "You can only complete your own reminders" });
      }
      
      const reminder = await storage.completeReminder(req.params.id);
      res.json(reminder);
    } catch (error: any) {
      console.error("Error completing reminder:", error);
      res.status(500).json({ message: "Failed to complete reminder" });
    }
  });

  // Delete reminder
  app.delete("/api/reminders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { isAdmin } = await isAdminTeamMember(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const reminder = await storage.getReminderById(req.params.id);
      if (!reminder) {
        return res.status(404).json({ message: "Reminder not found" });
      }
      
      // Only the owner or super_admin can delete a reminder
      const { role } = await isAdminTeamMember(userId);
      if (reminder.userId !== userId && role !== 'super_admin') {
        return res.status(403).json({ message: "You can only delete your own reminders" });
      }
      
      await storage.deleteReminder(req.params.id);
      res.json({ message: "Reminder deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting reminder:", error);
      res.status(500).json({ message: "Failed to delete reminder" });
    }
  });

  // Get tasks by application ID
  app.get("/api/applications/:id/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { isAdmin } = await isAdminTeamMember(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const applicationId = req.params.id;
      const tasks = await storage.getTasksByApplicationId(applicationId);
      res.json(tasks);
    } catch (error: any) {
      console.error("Error fetching application tasks:", error);
      res.status(500).json({ message: "Failed to fetch application tasks" });
    }
  });

  // Get admin team members for assignment dropdowns
  app.get("/api/admin/team-members", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { isAdmin } = await isAdminTeamMember(userId);
      
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const teamMembers = await storage.getAllAdminTeamMembers();
      
      // Enrich with user details
      const enrichedMembers = await Promise.all(
        teamMembers.map(async (member) => {
          const user = await storage.getUser(member.userId);
          return {
            ...member,
            user: user ? {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              profileImageUrl: user.profileImageUrl,
            } : null,
          };
        })
      );
      
      res.json(enrichedMembers);
    } catch (error: any) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  // ============================================
  // END CRM SYSTEM API ENDPOINTS
  // ============================================

  // ============================================
  // CMS CONTENT BLOCKS API ENDPOINTS
  // ============================================

  // ----- TESTIMONIALS -----
  
  // Get all testimonials (admin)
  app.get("/api/admin/cms/testimonials", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { status, isFeatured, showOnPage } = req.query;
      const filters: any = {};
      if (status) filters.status = status;
      if (isFeatured !== undefined) filters.isFeatured = isFeatured === 'true';
      if (showOnPage) filters.showOnPage = showOnPage;
      
      const testimonials = await storage.getAllTestimonials(filters);
      res.json(testimonials);
    } catch (error: any) {
      console.error("Error fetching testimonials:", error);
      res.status(500).json({ message: "Failed to fetch testimonials" });
    }
  });

  // Get single testimonial (admin)
  app.get("/api/admin/cms/testimonials/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const testimonial = await storage.getTestimonialById(req.params.id);
      if (!testimonial) {
        return res.status(404).json({ message: "Testimonial not found" });
      }
      
      res.json(testimonial);
    } catch (error: any) {
      console.error("Error fetching testimonial:", error);
      res.status(500).json({ message: "Failed to fetch testimonial" });
    }
  });

  // Create testimonial
  app.post("/api/admin/cms/testimonials", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'platform_admin', 'support_manager']);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const data = insertTestimonialSchema.parse({
        ...req.body,
        createdById: userId,
        updatedById: userId,
      });
      
      const testimonial = await storage.createTestimonial(data);
      
      // Log activity
      await logCreate({
        req,
        entityType: 'testimonial' as any,
        entityId: testimonial.id,
        entityName: testimonial.title,
      });
      
      res.json(testimonial);
    } catch (error: any) {
      console.error("Error creating testimonial:", error);
      res.status(400).json({ message: error.message || "Failed to create testimonial" });
    }
  });

  // Update testimonial
  app.patch("/api/admin/cms/testimonials/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'platform_admin', 'support_manager']);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const existingTestimonial = await storage.getTestimonialById(req.params.id);
      if (!existingTestimonial) {
        return res.status(404).json({ message: "Testimonial not found" });
      }
      
      const data = updateTestimonialSchema.parse({
        ...req.body,
        updatedById: userId,
      });
      
      const testimonial = await storage.updateTestimonial(req.params.id, data);
      
      // Log activity
      await logUpdate({
        req,
        entityType: 'testimonial' as any,
        entityId: testimonial.id,
        entityName: testimonial.title,
        oldData: existingTestimonial,
        newData: testimonial,
      });
      
      res.json(testimonial);
    } catch (error: any) {
      console.error("Error updating testimonial:", error);
      res.status(400).json({ message: error.message || "Failed to update testimonial" });
    }
  });

  // Delete testimonial
  app.delete("/api/admin/cms/testimonials/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin']);
      
      if (!access) {
        return res.status(403).json({ message: "Super admin access required" });
      }
      
      const testimonial = await storage.getTestimonialById(req.params.id);
      if (!testimonial) {
        return res.status(404).json({ message: "Testimonial not found" });
      }
      
      await storage.deleteTestimonial(req.params.id);
      
      // Log activity
      await logDelete({
        req,
        entityType: 'testimonial' as any,
        entityId: req.params.id,
        entityName: testimonial.title,
      });
      
      res.json({ message: "Testimonial deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting testimonial:", error);
      res.status(500).json({ message: "Failed to delete testimonial" });
    }
  });

  // Public endpoint for testimonials
  app.get("/api/public/testimonials", async (req, res) => {
    try {
      const { page } = req.query;
      const testimonials = await storage.getPublishedTestimonials(page as string);
      res.json(testimonials);
    } catch (error: any) {
      console.error("Error fetching public testimonials:", error);
      res.status(500).json({ message: "Failed to fetch testimonials" });
    }
  });

  // ----- FAQs -----

  // Get all FAQs (admin)
  app.get("/api/admin/cms/faqs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { status, category, showOnPage } = req.query;
      const filters: any = {};
      if (status) filters.status = status;
      if (category) filters.category = category;
      if (showOnPage) filters.showOnPage = showOnPage;
      
      const faqs = await storage.getAllFaqs(filters);
      res.json(faqs);
    } catch (error: any) {
      console.error("Error fetching FAQs:", error);
      res.status(500).json({ message: "Failed to fetch FAQs" });
    }
  });

  // Get single FAQ (admin)
  app.get("/api/admin/cms/faqs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const faq = await storage.getFaqById(req.params.id);
      if (!faq) {
        return res.status(404).json({ message: "FAQ not found" });
      }
      
      res.json(faq);
    } catch (error: any) {
      console.error("Error fetching FAQ:", error);
      res.status(500).json({ message: "Failed to fetch FAQ" });
    }
  });

  // Create FAQ
  app.post("/api/admin/cms/faqs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'platform_admin', 'support_manager']);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const data = insertFaqSchema.parse({
        ...req.body,
        createdById: userId,
        updatedById: userId,
      });
      
      const faq = await storage.createFaq(data);
      
      // Log activity
      await logCreate({
        req,
        entityType: 'faq' as any,
        entityId: faq.id,
        entityName: faq.question.substring(0, 50),
      });
      
      res.json(faq);
    } catch (error: any) {
      console.error("Error creating FAQ:", error);
      res.status(400).json({ message: error.message || "Failed to create FAQ" });
    }
  });

  // Update FAQ
  app.patch("/api/admin/cms/faqs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'platform_admin', 'support_manager']);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const existingFaq = await storage.getFaqById(req.params.id);
      if (!existingFaq) {
        return res.status(404).json({ message: "FAQ not found" });
      }
      
      const data = updateFaqSchema.parse({
        ...req.body,
        updatedById: userId,
      });
      
      const faq = await storage.updateFaq(req.params.id, data);
      
      // Log activity
      await logUpdate({
        req,
        entityType: 'faq' as any,
        entityId: faq.id,
        entityName: faq.question.substring(0, 50),
        oldData: existingFaq,
        newData: faq,
      });
      
      res.json(faq);
    } catch (error: any) {
      console.error("Error updating FAQ:", error);
      res.status(400).json({ message: error.message || "Failed to update FAQ" });
    }
  });

  // Delete FAQ
  app.delete("/api/admin/cms/faqs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin']);
      
      if (!access) {
        return res.status(403).json({ message: "Super admin access required" });
      }
      
      const faq = await storage.getFaqById(req.params.id);
      if (!faq) {
        return res.status(404).json({ message: "FAQ not found" });
      }
      
      await storage.deleteFaq(req.params.id);
      
      // Log activity
      await logDelete({
        req,
        entityType: 'faq' as any,
        entityId: req.params.id,
        entityName: faq.question.substring(0, 50),
      });
      
      res.json({ message: "FAQ deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting FAQ:", error);
      res.status(500).json({ message: "Failed to delete FAQ" });
    }
  });

  // Public endpoint for FAQs
  app.get("/api/public/faqs", async (req, res) => {
    try {
      const { category, page } = req.query;
      const faqs = await storage.getPublishedFaqs(category as string, page as string);
      res.json(faqs);
    } catch (error: any) {
      console.error("Error fetching public FAQs:", error);
      res.status(500).json({ message: "Failed to fetch FAQs" });
    }
  });

  // ----- PUBLIC TEAM MEMBERS -----

  // Get all public team members (admin)
  app.get("/api/admin/cms/team-members", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { status, isFeatured } = req.query;
      const filters: any = {};
      if (status) filters.status = status;
      if (isFeatured !== undefined) filters.isFeatured = isFeatured === 'true';
      
      const members = await storage.getAllPublicTeamMembers(filters);
      res.json(members);
    } catch (error: any) {
      console.error("Error fetching public team members:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  // Get single public team member (admin)
  app.get("/api/admin/cms/team-members/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const member = await storage.getPublicTeamMemberById(req.params.id);
      if (!member) {
        return res.status(404).json({ message: "Team member not found" });
      }
      
      res.json(member);
    } catch (error: any) {
      console.error("Error fetching public team member:", error);
      res.status(500).json({ message: "Failed to fetch team member" });
    }
  });

  // Create public team member
  app.post("/api/admin/cms/team-members", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'platform_admin', 'support_manager']);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const data = insertPublicTeamMemberSchema.parse({
        ...req.body,
        createdById: userId,
        updatedById: userId,
      });
      
      const member = await storage.createPublicTeamMember(data);
      
      // Log activity
      await logCreate({
        req,
        entityType: 'public_team_member' as any,
        entityId: member.id,
        entityName: member.name,
      });
      
      res.json(member);
    } catch (error: any) {
      console.error("Error creating public team member:", error);
      res.status(400).json({ message: error.message || "Failed to create team member" });
    }
  });

  // Update public team member
  app.patch("/api/admin/cms/team-members/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'platform_admin', 'support_manager']);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const existingMember = await storage.getPublicTeamMemberById(req.params.id);
      if (!existingMember) {
        return res.status(404).json({ message: "Team member not found" });
      }
      
      const data = updatePublicTeamMemberSchema.parse({
        ...req.body,
        updatedById: userId,
      });
      
      const member = await storage.updatePublicTeamMember(req.params.id, data);
      
      // Log activity
      await logUpdate({
        req,
        entityType: 'public_team_member' as any,
        entityId: member.id,
        entityName: member.name,
        oldData: existingMember,
        newData: member,
      });
      
      res.json(member);
    } catch (error: any) {
      console.error("Error updating public team member:", error);
      res.status(400).json({ message: error.message || "Failed to update team member" });
    }
  });

  // Delete public team member
  app.delete("/api/admin/cms/team-members/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin']);
      
      if (!access) {
        return res.status(403).json({ message: "Super admin access required" });
      }
      
      const member = await storage.getPublicTeamMemberById(req.params.id);
      if (!member) {
        return res.status(404).json({ message: "Team member not found" });
      }
      
      await storage.deletePublicTeamMember(req.params.id);
      
      // Log activity
      await logDelete({
        req,
        entityType: 'public_team_member' as any,
        entityId: req.params.id,
        entityName: member.name,
      });
      
      res.json({ message: "Team member deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting public team member:", error);
      res.status(500).json({ message: "Failed to delete team member" });
    }
  });

  // Public endpoint for team members
  app.get("/api/public/team-members", async (_req, res) => {
    try {
      const members = await storage.getPublishedPublicTeamMembers();
      res.json(members);
    } catch (error: any) {
      console.error("Error fetching public team members:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  // ----- SITE SETTINGS -----

  // Get all site settings (admin)
  app.get("/api/admin/cms/site-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { category } = req.query;
      const settings = await storage.getAllSiteSettings(category as string);
      res.json(settings);
    } catch (error: any) {
      console.error("Error fetching site settings:", error);
      res.status(500).json({ message: "Failed to fetch site settings" });
    }
  });

  // Get single site setting by key (admin)
  app.get("/api/admin/cms/site-settings/:key", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const setting = await storage.getSiteSettingByKey(req.params.key);
      if (!setting) {
        return res.status(404).json({ message: "Site setting not found" });
      }
      
      res.json(setting);
    } catch (error: any) {
      console.error("Error fetching site setting:", error);
      res.status(500).json({ message: "Failed to fetch site setting" });
    }
  });

  // Create site setting
  app.post("/api/admin/cms/site-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'platform_admin', 'support_manager']);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const data = insertSiteSettingSchema.parse({
        ...req.body,
        updatedById: userId,
      });
      
      // Check if setting already exists
      const existing = await storage.getSiteSettingByKey(data.settingKey);
      if (existing) {
        return res.status(400).json({ message: "Setting with this key already exists" });
      }
      
      const setting = await storage.createSiteSetting(data);
      
      // Log activity
      await logCreate({
        req,
        entityType: 'site_setting' as any,
        entityId: setting.id,
        entityName: setting.settingKey,
      });
      
      res.json(setting);
    } catch (error: any) {
      console.error("Error creating site setting:", error);
      res.status(400).json({ message: error.message || "Failed to create site setting" });
    }
  });

  // Update site setting
  app.patch("/api/admin/cms/site-settings/:key", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'platform_admin', 'support_manager']);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const existingSetting = await storage.getSiteSettingByKey(req.params.key);
      if (!existingSetting) {
        return res.status(404).json({ message: "Site setting not found" });
      }
      
      const data = updateSiteSettingSchema.parse({
        ...req.body,
        updatedById: userId,
      });
      
      const setting = await storage.updateSiteSetting(req.params.key, data);
      
      // Log activity
      await logUpdate({
        req,
        entityType: 'site_setting' as any,
        entityId: setting.id,
        entityName: setting.settingKey,
        oldData: existingSetting,
        newData: setting,
      });
      
      res.json(setting);
    } catch (error: any) {
      console.error("Error updating site setting:", error);
      res.status(400).json({ message: error.message || "Failed to update site setting" });
    }
  });

  // Delete site setting
  app.delete("/api/admin/cms/site-settings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin']);
      
      if (!access) {
        return res.status(403).json({ message: "Super admin access required" });
      }
      
      const setting = await storage.getSiteSettingByKey(req.params.id);
      if (!setting) {
        return res.status(404).json({ message: "Site setting not found" });
      }
      
      await storage.deleteSiteSetting(setting.id);
      
      // Log activity
      await logDelete({
        req,
        entityType: 'site_setting' as any,
        entityId: setting.id,
        entityName: setting.settingKey,
      });
      
      res.json({ message: "Site setting deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting site setting:", error);
      res.status(500).json({ message: "Failed to delete site setting" });
    }
  });

  // Public endpoint for site settings
  app.get("/api/public/site-settings", async (_req, res) => {
    try {
      const settings = await storage.getPublicSiteSettings();
      // Convert to key-value pairs for easy consumption
      const settingsMap: Record<string, any> = {};
      settings.forEach(s => {
        settingsMap[s.settingKey] = s.settingValue;
      });
      res.json(settingsMap);
    } catch (error: any) {
      console.error("Error fetching public site settings:", error);
      res.status(500).json({ message: "Failed to fetch site settings" });
    }
  });

  // ----- CONTENT SNIPPETS -----

  // Get all content snippets (admin)
  app.get("/api/admin/cms/content-snippets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { status, pageLocation } = req.query;
      const filters: any = {};
      if (status) filters.status = status;
      if (pageLocation) filters.pageLocation = pageLocation;
      
      const snippets = await storage.getAllContentSnippets(filters);
      res.json(snippets);
    } catch (error: any) {
      console.error("Error fetching content snippets:", error);
      res.status(500).json({ message: "Failed to fetch content snippets" });
    }
  });

  // Get single content snippet (admin)
  app.get("/api/admin/cms/content-snippets/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const snippet = await storage.getContentSnippetById(req.params.id);
      if (!snippet) {
        return res.status(404).json({ message: "Content snippet not found" });
      }
      
      res.json(snippet);
    } catch (error: any) {
      console.error("Error fetching content snippet:", error);
      res.status(500).json({ message: "Failed to fetch content snippet" });
    }
  });

  // Create content snippet
  app.post("/api/admin/cms/content-snippets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'platform_admin', 'support_manager']);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const data = insertContentSnippetSchema.parse({
        ...req.body,
        createdById: userId,
        updatedById: userId,
      });
      
      // Check if snippet with same key exists
      const existing = await storage.getContentSnippetByKey(data.snippetKey);
      if (existing) {
        return res.status(400).json({ message: "Content snippet with this key already exists" });
      }
      
      const snippet = await storage.createContentSnippet(data);
      
      // Log activity
      await logCreate({
        req,
        entityType: 'content_snippet' as any,
        entityId: snippet.id,
        entityName: snippet.title,
      });
      
      res.json(snippet);
    } catch (error: any) {
      console.error("Error creating content snippet:", error);
      res.status(400).json({ message: error.message || "Failed to create content snippet" });
    }
  });

  // Update content snippet
  app.patch("/api/admin/cms/content-snippets/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin', 'platform_admin', 'support_manager']);
      
      if (!access) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const existingSnippet = await storage.getContentSnippetById(req.params.id);
      if (!existingSnippet) {
        return res.status(404).json({ message: "Content snippet not found" });
      }
      
      const data = updateContentSnippetSchema.parse({
        ...req.body,
        updatedById: userId,
      });
      
      const snippet = await storage.updateContentSnippet(req.params.id, data);
      
      // Log activity
      await logUpdate({
        req,
        entityType: 'content_snippet' as any,
        entityId: snippet.id,
        entityName: snippet.title,
        oldData: existingSnippet,
        newData: snippet,
      });
      
      res.json(snippet);
    } catch (error: any) {
      console.error("Error updating content snippet:", error);
      res.status(400).json({ message: error.message || "Failed to update content snippet" });
    }
  });

  // Delete content snippet
  app.delete("/api/admin/cms/content-snippets/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkAdminAccess(userId, ['super_admin']);
      
      if (!access) {
        return res.status(403).json({ message: "Super admin access required" });
      }
      
      const snippet = await storage.getContentSnippetById(req.params.id);
      if (!snippet) {
        return res.status(404).json({ message: "Content snippet not found" });
      }
      
      await storage.deleteContentSnippet(req.params.id);
      
      // Log activity
      await logDelete({
        req,
        entityType: 'content_snippet' as any,
        entityId: req.params.id,
        entityName: snippet.title,
      });
      
      res.json({ message: "Content snippet deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting content snippet:", error);
      res.status(500).json({ message: "Failed to delete content snippet" });
    }
  });

  // Public endpoint for content snippets
  app.get("/api/public/content-snippets", async (req, res) => {
    try {
      const { pageLocation } = req.query;
      const snippets = await storage.getPublishedContentSnippets(pageLocation as string);
      // Convert to key-value pairs for easy consumption
      const snippetsMap: Record<string, { content: string; title: string }> = {};
      snippets.forEach(s => {
        snippetsMap[s.snippetKey] = { content: s.content, title: s.title };
      });
      res.json(snippetsMap);
    } catch (error: any) {
      console.error("Error fetching public content snippets:", error);
      res.status(500).json({ message: "Failed to fetch content snippets" });
    }
  });

  // Get content snippet by key (public)
  app.get("/api/public/content-snippets/:key", async (req, res) => {
    try {
      const snippet = await storage.getContentSnippetByKey(req.params.key);
      if (!snippet || snippet.status !== 'published') {
        return res.status(404).json({ message: "Content snippet not found" });
      }
      res.json({ content: snippet.content, title: snippet.title });
    } catch (error: any) {
      console.error("Error fetching public content snippet:", error);
      res.status(500).json({ message: "Failed to fetch content snippet" });
    }
  });

  // ============================================
  // END CMS CONTENT BLOCKS API ENDPOINTS
  // ============================================

  // Start scraping worker only if Redis is available
  const { checkRedisAvailability } = await import('./scraping-queue');
  const redisAvailable = await checkRedisAvailability();
  
  if (redisAvailable) {
    const { startScrapingWorker } = await import('./scraping-worker');
    startScrapingWorker();
    console.log('Background job processing enabled (Redis connected)');
  } else {
    console.log('Background job processing disabled (Redis not available)');
    console.log('Use POST /api/admin/scraping/jobs/:jobId/process for manual scraping');
  }
  
  return httpServer;
}
