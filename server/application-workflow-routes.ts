import type { Express } from "express";
import { db } from "./db";
import { isAuthenticated } from "./replitAuth";
import {
  applications,
  applicationStageHistory,
  applicationStageDocuments,
  insertApplicationStageHistorySchema,
  insertApplicationStageDocumentSchema,
  users,
  studentProfiles,
  courses,
  universities,
  type Application,
  type ApplicationStageHistory,
  type ApplicationStageDocument,
} from "@shared/schema";
import { eq, and, or, desc, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { logActivity } from "./activity-logger";

// Stage transition validation schema
const stageTransitionSchema = z.object({
  applicationId: z.string().uuid(),
  toStage: z.enum([
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
  ]),
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Application assignment schema
const assignmentSchema = z.object({
  applicationIds: z.array(z.string().uuid()),
  consultantId: z.string().uuid(),
});

// Document upload schema
const stageDocumentUploadSchema = z.object({
  applicationId: z.string().uuid(),
  stage: z.enum([
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
  ]),
  documentType: z.string(),
  documentName: z.string(),
  documentUrl: z.string(),
  isRequired: z.boolean().optional(),
});

// Document verification schema
const documentVerificationSchema = z.object({
  documentId: z.string().uuid(),
  isVerified: z.boolean(),
  verificationNotes: z.string().optional(),
  rejectionReason: z.string().optional(),
});

/**
 * Helper to check if user has admin access
 */
export async function checkAdminAccess(req: any): Promise<{ userId: string; role: string } | null> {
  if (!req.user) return null;

  const userId = req.user.claims?.sub || req.user.id;
  if (!userId) return null;

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, userType: true, role: true },
  });

  if (!user || user.userType !== 'admin') return null;

  return { userId: user.id, role: user.role || 'admin' };
}

/**
 * Helper to check if user has institution access
 */
export async function checkInstitutionAccess(req: any): Promise<{ userId: string; universityId: string } | null> {
  if (!req.user) return null;

  const userId = (req.user.claims?.sub || req.user.id) as string;
  if (!userId) return null;

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, userType: true },
  });

  if (!user || user.userType !== 'university') return null;

  // Get university linked to this user
  const university = await db.query.universities.findFirst({
    where: eq(universities.userId, userId),
    columns: { id: true },
  });

  if (!university) return null;

  return { userId: user.id, universityId: university.id };
}

/**
 * Register application workflow routes
 */
export function registerApplicationWorkflowRoutes(app: Express) {
  // ===========================================
  // STUDENT ROUTES
  // ===========================================

  // Get applications for current student
  app.get("/api/student/applications", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims?.sub || req.user!.id;

      // Get student profile
      const profile = await db.query.studentProfiles.findFirst({
        where: eq(studentProfiles.userId, userId),
      });

      if (!profile) {
        return res.status(404).json({ error: "Student profile not found" });
      }

      // Get all applications with related data
      const studentApplications = await db
        .select({
          application: applications,
          course: courses,
          university: universities,
          consultant: users,
        })
        .from(applications)
        .leftJoin(courses, eq(applications.courseId, courses.id))
        .leftJoin(universities, eq(courses.universityId, universities.id))
        .leftJoin(users, eq(applications.assignedConsultantId, users.id))
        .where(eq(applications.studentId, profile.id))
        .orderBy(desc(applications.createdAt));

      res.json({ applications: studentApplications });
    } catch (error: any) {
      console.error("Error fetching student applications:", error);
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  });

  // Get application stage history
  app.get("/api/student/applications/:id/history", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims?.sub || req.user!.id;
      const { id: applicationId } = req.params;

      // Verify application belongs to student
      const profile = await db.query.studentProfiles.findFirst({
        where: eq(studentProfiles.userId, userId),
      });

      if (!profile) {
        return res.status(404).json({ error: "Student profile not found" });
      }

      const application = await db.query.applications.findFirst({
        where: and(
          eq(applications.id, applicationId),
          eq(applications.studentId, profile.id)
        ),
      });

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      // Get stage history with user details
      const history = await db
        .select({
          history: applicationStageHistory,
          changedByUser: users,
        })
        .from(applicationStageHistory)
        .leftJoin(users, eq(applicationStageHistory.changedBy, users.id))
        .where(eq(applicationStageHistory.applicationId, applicationId))
        .orderBy(desc(applicationStageHistory.createdAt));

      res.json({ history });
    } catch (error: any) {
      console.error("Error fetching stage history:", error);
      res.status(500).json({ error: "Failed to fetch stage history" });
    }
  });

  // Get application documents
  app.get("/api/student/applications/:id/documents", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims?.sub || req.user!.id;
      const { id: applicationId } = req.params;

      // Verify application belongs to student
      const profile = await db.query.studentProfiles.findFirst({
        where: eq(studentProfiles.userId, userId),
      });

      if (!profile) {
        return res.status(404).json({ error: "Student profile not found" });
      }

      const application = await db.query.applications.findFirst({
        where: and(
          eq(applications.id, applicationId),
          eq(applications.studentId, profile.id)
        ),
      });

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      // Get stage documents
      const documents = await db
        .select({
          document: applicationStageDocuments,
          uploadedByUser: users,
          verifiedByUser: users,
        })
        .from(applicationStageDocuments)
        .leftJoin(users, eq(applicationStageDocuments.uploadedBy, users.id))
        .leftJoin(users, eq(applicationStageDocuments.verifiedBy, users.id))
        .where(eq(applicationStageDocuments.applicationId, applicationId))
        .orderBy(desc(applicationStageDocuments.createdAt));

      res.json({ documents });
    } catch (error: any) {
      console.error("Error fetching application documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  // Upload document for current stage
  app.post("/api/student/applications/:id/upload-document", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims?.sub || req.user!.id;
      const { id: applicationId } = req.params;
      const validatedData = stageDocumentUploadSchema.parse(req.body);

      // Verify application belongs to student
      const profile = await db.query.studentProfiles.findFirst({
        where: eq(studentProfiles.userId, userId),
      });

      if (!profile) {
        return res.status(404).json({ error: "Student profile not found" });
      }

      const application = await db.query.applications.findFirst({
        where: and(
          eq(applications.id, applicationId),
          eq(applications.studentId, profile.id)
        ),
      });

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      // Create stage document
      const [document] = await db.insert(applicationStageDocuments).values({
        applicationId: validatedData.applicationId,
        stage: validatedData.stage,
        documentType: validatedData.documentType,
        documentName: validatedData.documentName,
        documentUrl: validatedData.documentUrl,
        isRequired: validatedData.isRequired,
        uploadedBy: userId,
        uploadedByRole: 'student',
        uploadedAt: new Date(),
      }).returning();

      // Log activity
      await logActivity({
        userId,
        action: 'created',
        entityType: 'document',
        entityId: document.id,
        actionDescription: `Uploaded document "${validatedData.documentName}" for ${validatedData.stage} stage`,
        metadata: {
          applicationId: validatedData.applicationId,
          stage: validatedData.stage,
          documentType: validatedData.documentType,
        },
      });

      res.json({ document });
    } catch (error: any) {
      console.error("Error uploading document:", error);
      res.status(400).json({ error: error.message || "Failed to upload document" });
    }
  });

  // ===========================================
  // ADMIN/CONSULTANT ROUTES
  // ===========================================

  // Get all applications (admin view)
  app.get("/api/admin/applications", isAuthenticated, async (req, res) => {
    try {
      const adminAccess = await checkAdminAccess(req);
      if (!adminAccess) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { stage, status, consultantId } = req.query;

      // Build query conditions
      const conditions: any[] = [];
      if (stage) conditions.push(eq(applications.currentStage, stage as any));
      if (status) conditions.push(eq(applications.status, status as string));
      if (consultantId) conditions.push(eq(applications.assignedConsultantId, consultantId as string));

      // Get applications with related data
      const adminApplications = await db
        .select({
          application: applications,
          course: courses,
          university: universities,
          student: studentProfiles,
          consultant: users,
        })
        .from(applications)
        .leftJoin(courses, eq(applications.courseId, courses.id))
        .leftJoin(universities, eq(courses.universityId, universities.id))
        .leftJoin(studentProfiles, eq(applications.studentId, studentProfiles.id))
        .leftJoin(users, eq(applications.assignedConsultantId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(applications.createdAt));

      res.json({ applications: adminApplications });
    } catch (error: any) {
      console.error("Error fetching admin applications:", error);
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  });

  // Assign applications to consultant
  app.post("/api/admin/applications/assign", isAuthenticated, async (req, res) => {
    try {
      const adminAccess = await checkAdminAccess(req);
      if (!adminAccess) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const validatedData = assignmentSchema.parse(req.body);

      // Verify consultant exists and is admin
      const consultant = await db.query.users.findFirst({
        where: eq(users.id, validatedData.consultantId),
      });

      if (!consultant || consultant.userType !== 'admin') {
        return res.status(404).json({ error: "Consultant not found" });
      }

      // Assign applications
      await db
        .update(applications)
        .set({
          assignedConsultantId: validatedData.consultantId,
          assignedAt: new Date(),
        })
        .where(inArray(applications.id, validatedData.applicationIds));

      // Log activity for each assignment
      for (const appId of validatedData.applicationIds) {
        await logActivity({
          userId: adminAccess.userId,
          action: 'assigned',
          entityType: 'application',
          entityId: appId,
          actionDescription: `Assigned application to ${consultant.firstName} ${consultant.lastName}`,
          metadata: {
            consultantId: validatedData.consultantId,
            consultantName: `${consultant.firstName} ${consultant.lastName}`,
          },
        });
      }

      res.json({ message: "Applications assigned successfully", count: validatedData.applicationIds.length });
    } catch (error: any) {
      console.error("Error assigning applications:", error);
      res.status(400).json({ error: error.message || "Failed to assign applications" });
    }
  });

  // Transition application stage
  app.post("/api/admin/applications/transition-stage", isAuthenticated, async (req, res) => {
    try {
      const adminAccess = await checkAdminAccess(req);
      if (!adminAccess) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const validatedData = stageTransitionSchema.parse(req.body);

      // Get current application
      const application = await db.query.applications.findFirst({
        where: eq(applications.id, validatedData.applicationId),
      });

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      const fromStage = application.currentStage;
      const toStage = validatedData.toStage;

      // Calculate duration in previous stage (hours)
      const lastStageChange = await db.query.applicationStageHistory.findFirst({
        where: eq(applicationStageHistory.applicationId, validatedData.applicationId),
        orderBy: desc(applicationStageHistory.createdAt),
      });

      let durationInStage: number | null = null;
      if (lastStageChange && lastStageChange.createdAt) {
        const hoursDiff = Math.floor((Date.now() - new Date(lastStageChange.createdAt).getTime()) / (1000 * 60 * 60));
        durationInStage = hoursDiff;
      }

      // Update application stage
      await db
        .update(applications)
        .set({
          currentStage: toStage,
          updatedAt: new Date(),
        })
        .where(eq(applications.id, validatedData.applicationId));

      // Create stage history record
      await db.insert(applicationStageHistory).values({
        applicationId: validatedData.applicationId,
        fromStage,
        toStage,
        changedBy: adminAccess.userId,
        changedByRole: 'admin',
        notes: validatedData.notes,
        metadata: validatedData.metadata,
        durationInStage,
      });

      // Log activity
      await logActivity({
        userId: adminAccess.userId,
        action: 'status_changed',
        entityType: 'application',
        entityId: validatedData.applicationId,
        actionDescription: `Changed application stage from ${fromStage} to ${toStage}`,
        metadata: {
          fromStage,
          toStage,
          notes: validatedData.notes,
        },
      });

      res.json({ message: "Stage transitioned successfully", fromStage, toStage });
    } catch (error: any) {
      console.error("Error transitioning stage:", error);
      res.status(400).json({ error: error.message || "Failed to transition stage" });
    }
  });

  // Verify/reject document
  app.post("/api/admin/applications/verify-document", isAuthenticated, async (req, res) => {
    try {
      const adminAccess = await checkAdminAccess(req);
      if (!adminAccess) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const validatedData = documentVerificationSchema.parse(req.body);

      // Update document verification
      await db
        .update(applicationStageDocuments)
        .set({
          isVerified: validatedData.isVerified,
          verifiedBy: adminAccess.userId,
          verifiedAt: new Date(),
          verificationNotes: validatedData.verificationNotes,
          rejectionReason: validatedData.rejectionReason,
        })
        .where(eq(applicationStageDocuments.id, validatedData.documentId));

      // Log activity
      await logActivity({
        userId: adminAccess.userId,
        action: validatedData.isVerified ? 'approved' : 'rejected',
        entityType: 'document',
        entityId: validatedData.documentId,
        actionDescription: `${validatedData.isVerified ? 'Verified' : 'Rejected'} application document`,
        metadata: {
          verificationNotes: validatedData.verificationNotes,
          rejectionReason: validatedData.rejectionReason,
        },
      });

      res.json({ message: `Document ${validatedData.isVerified ? 'verified' : 'rejected'} successfully` });
    } catch (error: any) {
      console.error("Error verifying document:", error);
      res.status(400).json({ error: error.message || "Failed to verify document" });
    }
  });

  // Get application statistics (for dashboard)
  app.get("/api/admin/applications/stats", isAuthenticated, async (req, res) => {
    try {
      const adminAccess = await checkAdminAccess(req);
      if (!adminAccess) {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Get counts by stage
      const stageStats = await db
        .select({
          stage: applications.currentStage,
          count: sql<number>`count(*)::int`,
        })
        .from(applications)
        .groupBy(applications.currentStage);

      // Get counts by status
      const statusStats = await db
        .select({
          status: applications.status,
          count: sql<number>`count(*)::int`,
        })
        .from(applications)
        .groupBy(applications.status);

      // Get consultant workload
      const consultantStats = await db
        .select({
          consultantId: applications.assignedConsultantId,
          count: sql<number>`count(*)::int`,
        })
        .from(applications)
        .where(sql`${applications.assignedConsultantId} IS NOT NULL`)
        .groupBy(applications.assignedConsultantId);

      res.json({
        byStage: stageStats,
        byStatus: statusStats,
        byConsultant: consultantStats,
      });
    } catch (error: any) {
      console.error("Error fetching application stats:", error);
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });

  // ===========================================
  // INSTITUTION ROUTES
  // ===========================================

  // Get applications for institution
  app.get("/api/institution/applications", isAuthenticated, async (req, res) => {
    try {
      const institutionAccess = await checkInstitutionAccess(req);
      if (!institutionAccess) {
        return res.status(403).json({ error: "Institution access required" });
      }

      // Get applications for courses belonging to this institution
      const institutionApplications = await db
        .select({
          application: applications,
          course: courses,
          student: studentProfiles,
        })
        .from(applications)
        .leftJoin(courses, eq(applications.courseId, courses.id))
        .leftJoin(studentProfiles, eq(applications.studentId, studentProfiles.id))
        .where(eq(courses.universityId, institutionAccess.universityId))
        .orderBy(desc(applications.createdAt));

      res.json({ applications: institutionApplications });
    } catch (error: any) {
      console.error("Error fetching institution applications:", error);
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  });

  // Upload offer letter (institution only)
  app.post("/api/institution/applications/:id/upload-offer-letter", isAuthenticated, async (req, res) => {
    try {
      const institutionAccess = await checkInstitutionAccess(req);
      if (!institutionAccess) {
        return res.status(403).json({ error: "Institution access required" });
      }

      const { id: applicationId } = req.params;
      const { documentName, documentUrl } = req.body;

      // Verify application belongs to institution
      const application = await db.query.applications.findFirst({
        where: eq(applications.id, applicationId),
      });

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      // Verify course belongs to institution
      const course = await db.query.courses.findFirst({
        where: eq(courses.id, application.courseId),
      });

      if (!course || course.universityId !== institutionAccess.universityId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Upload offer letter to Offer-Letter stage
      const [document] = await db.insert(applicationStageDocuments).values({
        applicationId,
        stage: 'Offer-Letter',
        documentType: 'offer_letter',
        documentName,
        documentUrl,
        isRequired: true,
        uploadedBy: institutionAccess.userId,
        uploadedByRole: 'university',
        uploadedAt: new Date(),
      }).returning();

      // Log activity
      await logActivity({
        userId: institutionAccess.userId,
        action: 'created',
        entityType: 'document',
        entityId: document.id,
        actionDescription: `Uploaded offer letter for application`,
        metadata: {
          applicationId,
          documentType: 'offer_letter',
        },
      });

      res.json({ document, message: "Offer letter uploaded successfully" });
    } catch (error: any) {
      console.error("Error uploading offer letter:", error);
      res.status(400).json({ error: error.message || "Failed to upload offer letter" });
    }
  });

  console.log("Application workflow routes registered");
}
