import type { Express } from "express";
import { db } from "./db";
import { isAuthenticated, getAuthenticatedUserId } from "./replitAuth";
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
import { sendStageTransitionNotification, sendDocumentRequestNotification } from "./email-service";

// Stage transition validation schema
const stageTransitionSchema = z.object({
  applicationId: z.string().min(1),
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
  applicationIds: z.array(z.string().min(1)),
  consultantId: z.string().min(1),
});

// Document upload schema
const stageDocumentUploadSchema = z.object({
  applicationId: z.string().min(1),
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
  documentId: z.string().min(1),
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
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

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

      // Map to expected frontend format
      const formattedApplications = studentApplications.map(item => ({
        application: item.application,
        course: item.course ? {
          id: item.course.id,
          title: item.course.title,
          universityId: item.course.universityId,
          level: item.course.level || 'N/A',
          duration: item.course.duration || 'N/A',
          fees: item.course.fees ? item.course.fees.toString() : 'N/A',
          country: item.course.country || 'N/A',
        } : null,
        university: item.university ? {
          id: item.university.id,
          name: item.university.name,
          logo: item.university.logo,
          country: item.university.country,
        } : null,
        consultant: item.consultant ? {
          id: item.consultant.id,
          firstName: item.consultant.firstName,
          lastName: item.consultant.lastName,
          email: item.consultant.email,
        } : null,
      }));

      res.json({ applications: formattedApplications });
    } catch (error: any) {
      console.error("Error fetching student applications:", error);
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  });

  // Get application stage history
  app.get("/api/student/applications/:id/history", isAuthenticated, async (req, res) => {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
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
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
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
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
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

      // Get document progress for each application
      const documentStats = await db
        .select({
          applicationId: applicationStageDocuments.applicationId,
          totalDocs: sql<number>`count(*)::int`,
          uploadedDocs: sql<number>`count(case when ${applicationStageDocuments.documentUrl} is not null then 1 end)::int`,
          verifiedDocs: sql<number>`count(case when ${applicationStageDocuments.isVerified} = true then 1 end)::int`,
          requiredDocs: sql<number>`count(case when ${applicationStageDocuments.isRequired} = true then 1 end)::int`,
          requiredUploaded: sql<number>`count(case when ${applicationStageDocuments.isRequired} = true and ${applicationStageDocuments.documentUrl} is not null then 1 end)::int`,
        })
        .from(applicationStageDocuments)
        .groupBy(applicationStageDocuments.applicationId);

      // Create a map for quick lookup
      const docStatsMap = new Map(documentStats.map(stat => [stat.applicationId, stat]));

      // Add document progress to each application
      const applicationsWithProgress = adminApplications.map(app => ({
        ...app,
        documentProgress: docStatsMap.get(app.application.id) || {
          totalDocs: 0,
          uploadedDocs: 0,
          verifiedDocs: 0,
          requiredDocs: 0,
          requiredUploaded: 0,
        },
      }));

      res.json({ applications: applicationsWithProgress });
    } catch (error: any) {
      console.error("Error fetching admin applications:", error);
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  });

  // Get single application by ID (admin view)
  app.get("/api/admin/applications/:id", isAuthenticated, async (req, res) => {
    try {
      const adminAccess = await checkAdminAccess(req);
      if (!adminAccess) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { id: applicationId } = req.params;

      // Get application with related data
      const result = await db
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
        .where(eq(applications.id, applicationId))
        .limit(1);

      if (result.length === 0) {
        return res.status(404).json({ error: "Application not found" });
      }

      const appData = result[0];

      // Get student user email
      let studentEmail: string | null = null;
      if (appData.student?.userId) {
        const studentUser = await db.query.users.findFirst({
          where: eq(users.id, appData.student.userId),
        });
        studentEmail = studentUser?.email || null;
      }

      // Get document progress for this application
      const docStats = await db
        .select({
          totalDocs: sql<number>`count(*)::int`,
          uploadedDocs: sql<number>`count(case when ${applicationStageDocuments.documentUrl} is not null then 1 end)::int`,
          verifiedDocs: sql<number>`count(case when ${applicationStageDocuments.isVerified} = true then 1 end)::int`,
          requiredDocs: sql<number>`count(case when ${applicationStageDocuments.isRequired} = true then 1 end)::int`,
          requiredUploaded: sql<number>`count(case when ${applicationStageDocuments.isRequired} = true and ${applicationStageDocuments.documentUrl} is not null then 1 end)::int`,
        })
        .from(applicationStageDocuments)
        .where(eq(applicationStageDocuments.applicationId, applicationId));

      const documentProgress = docStats[0] || {
        totalDocs: 0,
        uploadedDocs: 0,
        verifiedDocs: 0,
        requiredDocs: 0,
        requiredUploaded: 0,
      };

      res.json({
        application: appData.application,
        course: appData.course || { id: '', title: 'Unknown Course', level: null },
        university: appData.university || { id: '', name: 'Unknown University', country: null },
        student: {
          id: appData.student?.id || '',
          firstName: appData.student?.firstName || null,
          lastName: appData.student?.lastName || null,
          email: studentEmail,
          profilePicture: appData.student?.profileImageUrl || null,
          nationality: appData.student?.nationality || null,
          phone: appData.student?.phone || null,
        },
        consultant: appData.consultant ? {
          id: appData.consultant.id,
          firstName: appData.consultant.firstName,
          lastName: appData.consultant.lastName,
          email: appData.consultant.email,
        } : null,
        documentProgress,
      });
    } catch (error: any) {
      console.error("Error fetching admin application:", error);
      res.status(500).json({ error: "Failed to fetch application" });
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

  // Update application details
  app.patch("/api/admin/applications/:id", isAuthenticated, async (req, res) => {
    try {
      const adminAccess = await checkAdminAccess(req);
      if (!adminAccess) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { id: applicationId } = req.params;
      const updateSchema = z.object({
        assignedConsultantId: z.string().uuid().nullable().optional(),
        personalStatement: z.string().optional(),
        additionalInfo: z.string().optional(),
        status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
      });

      const validatedData = updateSchema.parse(req.body);

      // Get current application for comparison
      const currentApplication = await db.query.applications.findFirst({
        where: eq(applications.id, applicationId),
      });

      if (!currentApplication) {
        return res.status(404).json({ error: "Application not found" });
      }

      // Build update object
      const updateData: any = { updatedAt: new Date() };
      const changes: string[] = [];

      if (validatedData.assignedConsultantId !== undefined) {
        updateData.assignedConsultantId = validatedData.assignedConsultantId;
        updateData.assignedAt = validatedData.assignedConsultantId ? new Date() : null;
        changes.push('consultant assignment');
      }
      if (validatedData.personalStatement !== undefined) {
        updateData.personalStatement = validatedData.personalStatement;
        changes.push('personal statement');
      }
      if (validatedData.additionalInfo !== undefined) {
        updateData.additionalInfo = validatedData.additionalInfo;
        changes.push('additional info');
      }
      if (validatedData.status !== undefined) {
        updateData.status = validatedData.status;
        changes.push('status');
      }

      // Update application
      const [updatedApplication] = await db
        .update(applications)
        .set(updateData)
        .where(eq(applications.id, applicationId))
        .returning();

      // Log activity
      await logActivity({
        userId: adminAccess.userId,
        action: 'updated',
        entityType: 'application',
        entityId: applicationId,
        actionDescription: `Updated application: ${changes.join(', ')}`,
        metadata: validatedData,
      });

      res.json({ application: updatedApplication, message: "Application updated successfully" });
    } catch (error: any) {
      console.error("Error updating application:", error);
      res.status(400).json({ error: error.message || "Failed to update application" });
    }
  });

  // Delete application
  app.delete("/api/admin/applications/:id", isAuthenticated, async (req, res) => {
    try {
      const adminAccess = await checkAdminAccess(req);
      if (!adminAccess) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { id: applicationId } = req.params;

      // Get application details for logging
      const application = await db.query.applications.findFirst({
        where: eq(applications.id, applicationId),
      });

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      // Delete application (cascade will handle related records)
      await db.delete(applications).where(eq(applications.id, applicationId));

      // Log activity
      await logActivity({
        userId: adminAccess.userId,
        action: 'deleted',
        entityType: 'application',
        entityId: applicationId,
        actionDescription: `Deleted application`,
        metadata: { deletedApplicationId: applicationId },
      });

      res.json({ message: "Application deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting application:", error);
      res.status(500).json({ error: error.message || "Failed to delete application" });
    }
  });

  // Get documents for application (admin)
  app.get("/api/admin/applications/:id/documents", isAuthenticated, async (req, res) => {
    try {
      const adminAccess = await checkAdminAccess(req);
      if (!adminAccess) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { id: applicationId } = req.params;

      // Get all documents for this application
      const documents = await db
        .select()
        .from(applicationStageDocuments)
        .where(eq(applicationStageDocuments.applicationId, applicationId))
        .orderBy(desc(applicationStageDocuments.createdAt));

      res.json({ documents });
    } catch (error: any) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  // Upload document (admin)
  app.post("/api/admin/applications/:id/documents", isAuthenticated, async (req, res) => {
    try {
      const adminAccess = await checkAdminAccess(req);
      if (!adminAccess) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { id: applicationId } = req.params;
      const validatedData = stageDocumentUploadSchema.parse({ ...req.body, applicationId });

      // Verify application exists
      const application = await db.query.applications.findFirst({
        where: eq(applications.id, applicationId),
      });

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      // Create document record
      const [document] = await db.insert(applicationStageDocuments).values({
        applicationId,
        stage: validatedData.stage,
        documentType: validatedData.documentType,
        documentName: validatedData.documentName,
        documentUrl: validatedData.documentUrl,
        isRequired: validatedData.isRequired || false,
        uploadedBy: adminAccess.userId,
        uploadedByRole: 'admin',
      }).returning();

      // Log activity
      await logActivity({
        userId: adminAccess.userId,
        action: 'created',
        entityType: 'document',
        entityId: document.id,
        actionDescription: `Uploaded document "${validatedData.documentName}" for ${validatedData.stage} stage`,
        metadata: { documentType: validatedData.documentType, stage: validatedData.stage },
      });

      res.json({ document, message: "Document uploaded successfully" });
    } catch (error: any) {
      console.error("Error uploading document:", error);
      res.status(400).json({ error: error.message || "Failed to upload document" });
    }
  });

  // Delete document (admin)
  app.delete("/api/admin/applications/:applicationId/documents/:documentId", isAuthenticated, async (req, res) => {
    try {
      const adminAccess = await checkAdminAccess(req);
      if (!adminAccess) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { applicationId, documentId } = req.params;

      // Verify document exists
      const document = await db.query.applicationStageDocuments.findFirst({
        where: and(
          eq(applicationStageDocuments.id, documentId),
          eq(applicationStageDocuments.applicationId, applicationId)
        ),
      });

      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Delete document
      await db.delete(applicationStageDocuments).where(eq(applicationStageDocuments.id, documentId));

      // Log activity
      await logActivity({
        userId: adminAccess.userId,
        action: 'deleted',
        entityType: 'document',
        entityId: documentId,
        actionDescription: `Deleted document "${document.documentName}"`,
        metadata: { documentName: document.documentName, documentType: document.documentType },
      });

      res.json({ message: "Document deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting document:", error);
      res.status(500).json({ error: error.message || "Failed to delete document" });
    }
  });

  // Request document from student
  app.post("/api/admin/applications/:id/request-document", isAuthenticated, async (req, res) => {
    try {
      const adminAccess = await checkAdminAccess(req);
      if (!adminAccess) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { id: applicationId } = req.params;
      const requestSchema = z.object({
        stage: z.enum([
          'Assessment', 'Collect Docs', 'Documents Verification', 'Offer-Letter',
          'GS-Clearance', 'COE', 'Health Cover', 'Visa Lodgment',
          'Application Won', 'Refusal/Refunds', 'Application Lost',
        ]),
        documentType: z.string(),
        documentName: z.string(),
        isRequired: z.boolean().optional(),
      });

      const validatedData = requestSchema.parse(req.body);

      // Verify application exists and get student info
      const application = await db.query.applications.findFirst({
        where: eq(applications.id, applicationId),
      });

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      // Create pending document request (no URL, not uploaded yet)
      const [documentRequest] = await db.insert(applicationStageDocuments).values({
        applicationId,
        stage: validatedData.stage,
        documentType: validatedData.documentType,
        documentName: validatedData.documentName,
        documentUrl: null, // NULL indicates pending upload
        isRequired: validatedData.isRequired || true,
        uploadedBy: null,
        uploadedByRole: null,
      }).returning();

      // Log activity
      await logActivity({
        userId: adminAccess.userId,
        action: 'created',
        entityType: 'document',
        entityId: documentRequest.id,
        actionDescription: `Requested "${validatedData.documentName}" from student`,
        metadata: { documentType: validatedData.documentType, stage: validatedData.stage, isRequest: true },
      });

      // Send notification to student (if email service is available)
      try {
        await sendDocumentRequestNotification(applicationId);
      } catch (emailError) {
        console.warn("Failed to send document request notification:", emailError);
      }

      res.json({ documentRequest, message: "Document request created successfully" });
    } catch (error: any) {
      console.error("Error requesting document:", error);
      res.status(400).json({ error: error.message || "Failed to request document" });
    }
  });

  // Get admin users (consultants) for assignment dropdown
  app.get("/api/admin/consultants", isAuthenticated, async (req, res) => {
    try {
      const adminAccess = await checkAdminAccess(req);
      if (!adminAccess) {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Get all admin users who can be assigned as consultants
      const adminUsers = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          role: users.role,
        })
        .from(users)
        .where(eq(users.userType, 'admin'));

      res.json({ consultants: adminUsers });
    } catch (error: any) {
      console.error("Error fetching consultants:", error);
      res.status(500).json({ error: "Failed to fetch consultants" });
    }
  });

  // Get stage history for application (admin access)
  app.get("/api/admin/applications/:id/history", isAuthenticated, async (req, res) => {
    try {
      const adminAccess = await checkAdminAccess(req);
      if (!adminAccess) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { id: applicationId } = req.params;

      // Verify application exists
      const application = await db.query.applications.findFirst({
        where: eq(applications.id, applicationId),
      });

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      // Get stage history with user details
      const history = await db
        .select({
          history: applicationStageHistory,
          changedByUser: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
          },
        })
        .from(applicationStageHistory)
        .leftJoin(users, eq(applicationStageHistory.changedBy, users.id))
        .where(eq(applicationStageHistory.applicationId, applicationId))
        .orderBy(desc(applicationStageHistory.createdAt));

      res.json({ history });
    } catch (error: any) {
      console.error("Error fetching application history:", error);
      res.status(500).json({ error: "Failed to fetch history" });
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

  // Request documents from student (institution only)
  app.post("/api/institution/applications/:id/request-documents", isAuthenticated, async (req, res) => {
    try {
      const institutionAccess = await checkInstitutionAccess(req);
      if (!institutionAccess) {
        return res.status(403).json({ error: "Institution access required" });
      }

      const { id: applicationId } = req.params;
      const { documentType, requestNote } = req.body;

      if (!documentType || !requestNote) {
        return res.status(400).json({ error: "Document type and request note are required" });
      }

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

      // Create a document request entry (NOT an upload - students will upload later)
      const [documentRequest] = await db.insert(applicationStageDocuments).values({
        applicationId,
        stage: application.currentStage,
        documentType,
        documentName: `Required: ${documentType}`,
        documentUrl: null, // NULL until student uploads (not empty string)
        isRequired: true,
        uploadedBy: null, // NULL - no upload yet
        uploadedByRole: null,
        uploadedAt: null,
        verificationNotes: requestNote, // Institution's request message to student
      }).returning();

      // Create stage history entry for the document request
      await db.insert(applicationStageHistory).values({
        applicationId,
        fromStage: application.currentStage,
        toStage: application.currentStage, // Same stage, just requesting a document
        changedBy: institutionAccess.userId,
        changedByRole: 'university',
        notes: `Document requested: ${documentType} - ${requestNote}`,
        metadata: { 
          action: 'document_request',
          documentType,
          documentRequestId: documentRequest.id,
        },
      });

      // Log activity
      await logActivity({
        userId: institutionAccess.userId,
        action: 'created',
        entityType: 'document',
        entityId: documentRequest.id,
        actionDescription: `Requested document: ${documentType}`,
        metadata: {
          applicationId,
          documentType,
          requestNote,
        },
      });

      // Send email notification to student
      try {
        const student = await db.query.studentProfiles.findFirst({
          where: eq(studentProfiles.id, application.studentId),
        });

        const university = await db.query.universities.findFirst({
          where: eq(universities.id, course.universityId),
        });

        if (student?.email) {
          await sendDocumentRequestNotification({
            studentEmail: student.email,
            studentName: `${student.firstName} ${student.lastName}`,
            applicationId,
            courseTitle: course.title,
            universityName: university?.name || 'University',
            currentStage: application.currentStage,
            documentTypes: [documentType],
            requestNote,
          });
        }
      } catch (emailError: any) {
        console.error('Failed to send document request email:', emailError.message);
        // Don't fail the request if email fails
      }

      res.json({ documentRequest, message: "Document request sent successfully" });
    } catch (error: any) {
      console.error("Error requesting documents:", error);
      res.status(400).json({ error: error.message || "Failed to request documents" });
    }
  });

  // Get pending document requests for student's application
  app.get("/api/student/applications/:id/pending-documents", isAuthenticated, async (req, res) => {
    try {
      const userId = getAuthenticatedUserId(req);
      const { id: applicationId } = req.params;

      // Verify application belongs to this student
      const studentProfile = await db.query.studentProfiles.findFirst({
        where: eq(studentProfiles.userId, userId),
      });

      if (!studentProfile) {
        return res.status(404).json({ error: "Student profile not found" });
      }

      const application = await db.query.applications.findFirst({
        where: eq(applications.id, applicationId),
      });

      if (!application || application.studentId !== studentProfile.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Fetch pending document requests (isRequired=true, documentUrl=NULL)
      const pendingRequests = await db.query.applicationStageDocuments.findMany({
        where: and(
          eq(applicationStageDocuments.applicationId, applicationId),
          eq(applicationStageDocuments.isRequired, true),
          isNull(applicationStageDocuments.documentUrl)
        ),
        orderBy: (docs, { desc }) => [desc(docs.createdAt)],
      });

      res.json({ pendingRequests });
    } catch (error: any) {
      console.error("Error fetching pending documents:", error);
      res.status(500).json({ error: error.message || "Failed to fetch pending documents" });
    }
  });

  // Transition application stage (institution only - limited stages)
  app.post("/api/institution/applications/:id/transition-stage", isAuthenticated, async (req, res) => {
    try {
      const institutionAccess = await checkInstitutionAccess(req);
      if (!institutionAccess) {
        return res.status(403).json({ error: "Institution access required" });
      }

      const { id: applicationId } = req.params;
      const { toStage, notes } = req.body;

      // Define stages that institutions can transition TO
      const allowedStages = ['Documents Verification', 'Offer-Letter', 'GS-Clearance', 'COE'];
      if (!allowedStages.includes(toStage)) {
        return res.status(403).json({ error: `Institutions can only transition to: ${allowedStages.join(', ')}` });
      }

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

      const fromStage = application.currentStage;

      // Update application stage
      await db.update(applications)
        .set({
          currentStage: toStage as any,
          updatedAt: new Date(),
        })
        .where(eq(applications.id, applicationId));

      // Record stage transition in history
      await db.insert(applicationStageHistory).values({
        applicationId,
        fromStage,
        toStage: toStage as any,
        changedBy: institutionAccess.userId,
        changedByRole: 'university',
        notes: notes || `Stage transitioned by institution`,
        metadata: { transitionedBy: 'institution' },
      });

      // Log activity
      await logActivity({
        userId: institutionAccess.userId,
        action: 'updated',
        entityType: 'application',
        entityId: applicationId,
        actionDescription: `Moved application from ${fromStage} to ${toStage}`,
        metadata: {
          fromStage,
          toStage,
          notes,
        },
      });

      // Send email notification to student
      try {
        const student = await db.query.studentProfiles.findFirst({
          where: eq(studentProfiles.id, application.studentId),
        });

        const university = await db.query.universities.findFirst({
          where: eq(universities.id, course.universityId),
        });

        if (student?.email) {
          await sendStageTransitionNotification({
            studentEmail: student.email,
            studentName: `${student.firstName} ${student.lastName}`,
            applicationId,
            courseTitle: course.title,
            universityName: university?.name || 'University',
            currentStage: toStage,
            previousStage: fromStage,
          });
        }
      } catch (emailError: any) {
        console.error('Failed to send stage transition email:', emailError.message);
        // Don't fail the request if email fails
      }

      res.json({ message: "Stage transitioned successfully", fromStage, toStage });
    } catch (error: any) {
      console.error("Error transitioning stage:", error);
      res.status(400).json({ error: error.message || "Failed to transition stage" });
    }
  });

  console.log("Application workflow routes registered");
}
