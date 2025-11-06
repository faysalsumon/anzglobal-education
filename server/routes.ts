import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  insertUniversitySchema,
  insertCourseSchema,
  insertStudentProfileSchema,
  insertApplicationSchema,
} from "@shared/schema";
import {
  generateUniversityDescription,
  generateCourseDescription,
  generateStudentBio,
  generateCareerGoals,
} from "./ai";

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

      if (!["university", "student"].includes(userType)) {
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
      const university = await storage.getUniversityByUserId(userId);
      if (!university) {
        return res.status(404).json({ message: "University profile not found" });
      }
      res.json(university);
    } catch (error) {
      console.error("Error fetching university:", error);
      res.status(500).json({ message: "Failed to fetch university" });
    }
  });

  app.post("/api/university/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertUniversitySchema.parse({ ...req.body, userId });

      const existing = await storage.getUniversityByUserId(userId);
      let university;

      if (existing) {
        university = await storage.updateUniversity(existing.id, data);
      } else {
        // Update user type to university
        await storage.upsertUser({ id: userId, userType: "university" });
        university = await storage.createUniversity(data);
      }

      res.json(university);
    } catch (error: any) {
      console.error("Error saving university:", error);
      res.status(400).json({ message: error.message || "Failed to save university" });
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
      const university = await storage.getUniversityByUserId(userId);

      if (!university) {
        return res.json([]);
      }

      const courses = await storage.getCoursesByUniversityId(university.id);
      res.json(courses);
    } catch (error) {
      console.error("Error fetching university courses:", error);
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  app.post("/api/courses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const university = await storage.getUniversityByUserId(userId);

      if (!university) {
        return res.status(400).json({ message: "Please create university profile first" });
      }

      const data = insertCourseSchema.parse({
        ...req.body,
        universityId: university.id,
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
      const university = await storage.getUniversityByUserId(userId);

      if (!university) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const course = await storage.getCourseById(req.params.id);
      if (!course || course.universityId !== university.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const data = insertCourseSchema.parse({
        ...req.body,
        universityId: university.id,
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
      let profile;

      if (existing) {
        profile = await storage.updateStudentProfile(existing.id, data);
      } else {
        // Update user type to student
        await storage.upsertUser({ id: userId, userType: "student" });
        profile = await storage.createStudentProfile(data);
      }

      res.json(profile);
    } catch (error: any) {
      console.error("Error saving student profile:", error);
      res.status(400).json({ message: error.message || "Failed to save profile" });
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

  app.get("/api/university/applications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const university = await storage.getUniversityByUserId(userId);

      if (!university) {
        return res.json([]);
      }

      const applications = await storage.getApplicationsByUniversityId(university.id);
      res.json(applications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  app.post("/api/applications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getStudentProfileByUserId(userId);

      if (!profile) {
        return res.status(400).json({ message: "Please create student profile first" });
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
      const { status } = req.body;

      if (!["pending", "reviewing", "accepted", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const application = await storage.updateApplicationStatus(req.params.id, status);
      res.json(application);
    } catch (error) {
      console.error("Error updating application:", error);
      res.status(500).json({ message: "Failed to update application" });
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

  const httpServer = createServer(app);
  return httpServer;
}
