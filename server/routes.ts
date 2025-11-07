import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  insertUniversitySchema,
  insertCourseSchema,
  insertStudentProfileSchema,
  insertApplicationSchema,
  insertAdminTeamMemberSchema,
  insertStudentEducationSchema,
  insertStudentLanguageScoreSchema,
  users,
} from "@shared/schema";
import { eq } from "drizzle-orm";
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
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
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
      
      if (ownerUniversity) {
        // User owns a university - they can update it
        const data = insertUniversitySchema.parse({ ...req.body, userId: ownerUniversity.userId });
        university = await storage.updateUniversity(ownerUniversity.id, data);
      } else if (teamAccess) {
        // User is a team member with admin/super_admin role - they can update
        const data = insertUniversitySchema.parse({ ...req.body, userId: teamAccess.university.userId });
        university = await storage.updateUniversity(teamAccess.university.id, data);
      } else {
        // User doesn't own a university and isn't a team member - allow creation
        const data = insertUniversitySchema.parse({ ...req.body, userId });
        await storage.upsertUser({ id: userId, userType: "university" });
        university = await storage.createUniversity(data);
      }

      res.json(university);
    } catch (error: any) {
      console.error("Error saving university:", error);
      res.status(400).json({ message: error.message || "Failed to save university" });
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
    } catch (error) {
      console.error("Error generating small description:", error);
      res.status(500).json({ message: "Failed to generate description" });
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
    } catch (error) {
      console.error("Error generating full description:", error);
      res.status(500).json({ message: "Failed to generate description" });
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
          const filename = `gallery-${access.university.id}-${Date.now()}-${i}.jpg`;
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
    } catch (error) {
      console.error("Error generating gallery:", error);
      res.status(500).json({ message: "Failed to generate gallery" });
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

  // Public institutions route
  app.get("/api/institutions", async (req, res) => {
    try {
      const institutions = await storage.getAllUniversities();
      res.json(institutions);
    } catch (error) {
      console.error("Error fetching institutions:", error);
      res.status(500).json({ message: "Failed to fetch institutions" });
    }
  });

  // Get single institution by ID
  app.get("/api/institutions/:id", async (req, res) => {
    try {
      const institution = await storage.getUniversityById(req.params.id);
      if (!institution) {
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
  // Accepts profileImageUrl field for profile photo (client must upload to object storage first using ObjectUploader)
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

  app.get("/api/university/applications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const access = await checkUniversityAccess(userId);

      if (!access) {
        return res.json([]);
      }

      const applications = await storage.getApplicationsByUniversityId(access.university.id);
      res.json(applications);
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
      res.status(500).json({ message: error.message || "Failed to generate description" });
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
      res.status(500).json({ message: error.message || "Failed to generate description" });
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
      res.status(500).json({ message: error.message || "Failed to generate content" });
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

  const httpServer = createServer(app);
  return httpServer;
}
