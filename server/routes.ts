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
} from "@shared/schema";
import { eq, and, or, desc, not } from "drizzle-orm";
import { z } from "zod";
import {
  generateUniversityDescription,
  generateCourseDescription,
  generateStudentBio,
  generateCareerGoals,
  generateInstitutionSmallDescription,
  generateInstitutionFullDescription,
  generateInstitutionGalleryImages,
} from "./ai";
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
} from "./csvImportUtils";
import {
  notifyNewApplication,
  notifyApplicationStatusChange,
  notifyTeamMemberAdded,
  createNotification,
} from "./notifications";
import express from "express";
import {
  parseCSV,
  validateUniversityRow,
  validateCourseRow,
  transformUniversityRow,
  transformCourseRow,
  generateUniversitiesSampleCSV,
  generateCoursesSampleCSV,
} from "./csvImportUtils";
import { importBatches, insertImportBatchSchema } from "@shared/schema";

type UniversityRole = 'super_admin' | 'admin' | 'course_manager' | 'application_manager';
type AdminRole = 'super_admin' | 'support_manager' | 'support_staff' | 'operations_staff';

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

async function checkAdminAccess(
  userId: string,
  requiredRoles?: AdminRole[]
): Promise<{ role: AdminRole } | null> {
  const user = await storage.getUser(userId);
  
  if (!user || user.userType !== 'admin') {
    return null;
  }
  
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
      
      // If admin user, include their admin team member role
      if (user && user.userType === 'admin') {
        const adminMember = await storage.getAdminTeamMemberByUserId(userId);
        res.json({
          ...user,
          adminRole: adminMember?.role || null,
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

      res.json({ galleryImages: galleryPaths });
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

  // Logo Upload Route
  app.post("/api/university/upload-logo", isAuthenticated, upload.single('logo'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkUniversityAccess(userId, ['super_admin', 'admin']);
      
      if (!access) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Resize to 160x160 with circular processing
      const resizedBuffer = await sharp(req.file.buffer)
        .resize(160, 160, { fit: 'cover' })
        .png()
        .toBuffer();

      // Save to public directory
      const filename = `college-logo-${access.university.id}-${Date.now()}.png`;
      const localPath = path.join(process.cwd(), 'public', 'institutions');
      await fs.mkdir(localPath, { recursive: true });
      await fs.writeFile(path.join(localPath, filename), resizedBuffer);
      
      const logoPath = `/institutions/${filename}`;

      // Update university with new logo
      await storage.updateUniversity(access.university.id, {
        ...access.university,
        logo: logoPath,
      });

      res.json({ logoPath });
    } catch (error) {
      console.error("Error uploading logo:", error);
      res.status(500).json({ message: "Failed to upload logo" });
    }
  });

  // Public institutions route - only show approved and active institutions
  app.get("/api/institutions", async (req, res) => {
    try {
      const allInstitutions = await storage.getAllUniversities();
      // Filter to only show approved and active institutions
      const institutions = allInstitutions.filter(i => 
        i.approvalStatus === 'approved' && i.isActive
      );
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

  // Course routes
  app.get("/api/courses", async (req, res) => {
    try {
      const courses = await storage.getAllCourses();
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
      
      res.json({
        ...course,
        university,
      });
    } catch (error) {
      console.error("Error fetching course:", error);
      res.status(500).json({ message: "Failed to fetch course" });
    }
  });

  // Public lead creation endpoint (no auth required)
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
      
      // Create the lead
      const lead = await storage.createLead(leadData);
      
      // Create notifications for all admins and consultants
      const adminUsers = await db.select().from(users).where(eq(users.userType, 'admin'));
      const adminTeamMembers = await storage.getAllAdminTeamMembers();
      
      const notificationRecords = [];
      
      // Notify admin users
      for (const admin of adminUsers) {
        notificationRecords.push({
          userId: admin.id,
          type: 'new_lead',
          title: 'New Student Inquiry',
          message: `${leadData.firstName} ${leadData.lastName} requested information about ${course.title}`,
          link: '/admin/leads',
          metadata: { leadId: lead.id, courseId: course.id },
        });
      }
      
      // Notify consultant team members
      for (const member of adminTeamMembers) {
        notificationRecords.push({
          userId: member.userId,
          type: 'new_lead',
          title: 'New Student Inquiry',
          message: `${leadData.firstName} ${leadData.lastName} requested information about ${course.title}`,
          link: '/admin/leads',
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
      const profile = await storage.getStudentProfileByUserId(userId);

      if (!profile) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      res.json({ 
        referralCode: profile.referralCode,
        referralLink: `${req.protocol}://${req.get('host')}/signup?ref=${profile.referralCode}`
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
        uploadsBase = null;
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

      // Check profile completion before allowing application
      const educations = await storage.getEducationsByStudentProfileId(profile.id);
      const languageScores = await storage.getLanguageScoresByStudentProfileId(profile.id);
      const completionResult = calculateProfileCompletion(profile, educations, languageScores);

      if (!completionResult.isComplete) {
        return res.status(403).json({
          message: "Please complete your profile 100% before applying to courses",
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
      const stats = await storage.getPlatformStats();
      res.json(stats);
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
      const { field, educationLevel, fieldOfStudy } = req.body;

      let content = "";
      if (field === "bio") {
        content = await generateStudentBio(educationLevel, fieldOfStudy);
      } else if (field === "careerGoals") {
        content = await generateCareerGoals(educationLevel, fieldOfStudy);
      } else {
        return res.status(400).json({ message: "Invalid field" });
      }

      res.json({ content });
    } catch (error: any) {
      console.error("Error generating content:", error);
      
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
        location,
        email,
        phone,
        website,
        userId: institutionUserId,
        providerType,
        numberOfCampuses,
        establishedYear,
        scholarshipPercentage,
        topDisciplines,
      } = req.body;

      if (!name || !location) {
        return res.status(400).json({ message: "Name and location are required" });
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
        location,
        contactEmail: email || null,
        contactPhone: phone || null,
        website: website || null,
        userId: institutionUserId || null,
        providerType: providerType || null,
        numberOfCampuses: numberOfCampuses || null,
        establishedYear: establishedYear || null,
        scholarshipPercentage: scholarshipPercentage || null,
        topDisciplines: topDisciplines || null,
      });

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

      const courseData = req.body;

      if (!courseData.title || !courseData.universityId) {
        return res.status(400).json({ message: "Title and university ID are required" });
      }

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
      const updateData = req.body;

      // If universityId is being updated, verify the institution exists
      if (updateData.universityId) {
        const institution = await storage.getUniversityById(updateData.universityId);
        if (!institution) {
          return res.status(400).json({ message: "Institution not found" });
        }
      }

      const updatedCourse = await storage.updateCourse(courseId, updateData);
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

      if (type === 'courses') {
        // Pre-fetch all universities for course validation
        const allUniversities = await storage.getAllUniversities();
        allUniversities.forEach(uni => {
          universitiesMap.set(uni.name.toLowerCase(), uni.id);
        });
      }

      // Validate each row and create structured data
      parseResult.data.forEach((row, index) => {
        const rowErrors = type === 'universities'
          ? validateUniversityRow(row, index + 1)
          : validateCourseRow(row, index + 1, universitiesMap);

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
            // Import universities
            for (const row of validRows) {
              try {
                const universityData = transformUniversityRow(row.data);
                await storage.createUniversity(universityData);
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

            // Import courses
            for (const row of validRows) {
              try {
                const courseData = transformCourseRow(row.data, universitiesMap);
                await storage.createCourse(courseData);
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
      
      if (!sessionId || sessionId === false) {
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
  
  return httpServer;
}
