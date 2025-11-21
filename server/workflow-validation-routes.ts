/**
 * Workflow Validation Routes
 * 
 * API endpoints for stage transition validation, document requirements,
 * and SLA monitoring using business rules
 */

import type { Express } from "express";
import { db } from "./db";
import { applications, applicationStageDocuments, type ApplicationStageDocument } from "@shared/schema";
import { eq } from "drizzle-orm";
import { isAuthenticated } from "./replitAuth";
import {
  validateStageTransition,
  getRequiredDocumentsForStage,
  getMissingRequiredDocuments,
  getNextPossibleStages,
  getSLAStatus,
  calculateDaysInStage,
  STAGE_DOCUMENT_REQUIREMENTS,
  STAGE_TRANSITION_RULES,
  ROLE_STAGE_PERMISSIONS,
  STAGE_SLA_CONFIG,
  type UserRole,
  type ApplicationStage,
} from "./workflow-business-rules";

export function registerWorkflowValidationRoutes(app: Express) {
  
  // Get document requirements for a specific stage
  app.get("/api/workflow/stages/:stage/documents", isAuthenticated, async (req, res) => {
    try {
      const { stage } = req.params;
      const requirements = getRequiredDocumentsForStage(stage as ApplicationStage);
      
      res.json({
        stage,
        requirements,
      });
    } catch (error: any) {
      console.error("Error fetching stage document requirements:", error);
      res.status(500).json({ error: error.message || "Failed to fetch requirements" });
    }
  });

  // Validate a stage transition before attempting it
  app.post("/api/workflow/validate-transition", isAuthenticated, async (req, res) => {
    try {
      const { applicationId, toStage, userRole } = req.body;

      if (!applicationId || !toStage || !userRole) {
        return res.status(400).json({ 
          error: "applicationId, toStage, and userRole are required" 
        });
      }

      // Get application current stage
      const application = await db.query.applications.findFirst({
        where: eq(applications.id, applicationId),
      });

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      // Get uploaded document types for this application
      const documents = await db.query.applicationStageDocuments.findMany({
        where: eq(applicationStageDocuments.applicationId, applicationId),
      });

      const uploadedDocumentTypes = documents
        .filter((doc: ApplicationStageDocument) => doc.documentUrl !== null)
        .map((doc: ApplicationStageDocument) => doc.documentType);

      // Validate the transition
      const validationResult = validateStageTransition(
        userRole as UserRole,
        application.currentStage as ApplicationStage,
        toStage as ApplicationStage,
        uploadedDocumentTypes
      );

      res.json(validationResult);
    } catch (error: any) {
      console.error("Error validating stage transition:", error);
      res.status(500).json({ error: error.message || "Failed to validate transition" });
    }
  });

  // Get next possible stages for an application based on user role
  app.get("/api/workflow/applications/:id/next-stages", isAuthenticated, async (req, res) => {
    try {
      const { id: applicationId } = req.params;
      const { userRole } = req.query;

      if (!userRole) {
        return res.status(400).json({ error: "userRole query parameter is required" });
      }

      // Get application current stage
      const application = await db.query.applications.findFirst({
        where: eq(applications.id, applicationId),
      });

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      const nextStages = getNextPossibleStages(
        application.currentStage as ApplicationStage,
        userRole as UserRole
      );

      res.json({
        currentStage: application.currentStage,
        nextPossibleStages: nextStages,
      });
    } catch (error: any) {
      console.error("Error fetching next stages:", error);
      res.status(500).json({ error: error.message || "Failed to fetch next stages" });
    }
  });

  // Get SLA status for an application
  app.get("/api/workflow/applications/:id/sla-status", isAuthenticated, async (req, res) => {
    try {
      const { id: applicationId } = req.params;

      // Get application and its stage history
      const application = await db.query.applications.findFirst({
        where: eq(applications.id, applicationId),
      });

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      // Calculate days in current stage using updatedAt as approximation
      // In production, you'd track stage entry time in stage history
      const daysInStage = calculateDaysInStage(application.updatedAt || new Date());
      const slaStatus = getSLAStatus(
        application.currentStage as ApplicationStage,
        daysInStage
      );

      const slaConfig = STAGE_SLA_CONFIG[application.currentStage as ApplicationStage];

      res.json({
        applicationId,
        currentStage: application.currentStage,
        daysInStage,
        slaStatus,
        standardDays: slaConfig?.standardDays || 0,
        warningDays: slaConfig?.warningDays || 0,
        criticalDays: slaConfig?.criticalDays || 0,
        description: slaConfig?.description || '',
      });
    } catch (error: any) {
      console.error("Error fetching SLA status:", error);
      res.status(500).json({ error: error.message || "Failed to fetch SLA status" });
    }
  });

  // Get missing required documents for an application's current stage
  app.get("/api/workflow/applications/:id/missing-documents", isAuthenticated, async (req, res) => {
    try {
      const { id: applicationId } = req.params;

      // Get application current stage
      const application = await db.query.applications.findFirst({
        where: eq(applications.id, applicationId),
      });

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      // Get uploaded document types
      const documents = await db.query.applicationStageDocuments.findMany({
        where: eq(applicationStageDocuments.applicationId, applicationId),
      });

      const uploadedDocumentTypes = documents
        .filter((doc: ApplicationStageDocument) => doc.documentUrl !== null)
        .map((doc: ApplicationStageDocument) => doc.documentType);

      const missingDocs = getMissingRequiredDocuments(
        application.currentStage as ApplicationStage,
        uploadedDocumentTypes
      );

      res.json({
        currentStage: application.currentStage,
        missingDocuments: missingDocs,
        totalMissing: missingDocs.length,
      });
    } catch (error: any) {
      console.error("Error fetching missing documents:", error);
      res.status(500).json({ error: error.message || "Failed to fetch missing documents" });
    }
  });

  // Get all business rules (for reference/documentation)
  app.get("/api/workflow/business-rules", isAuthenticated, async (req, res) => {
    try {
      res.json({
        stageDocumentRequirements: STAGE_DOCUMENT_REQUIREMENTS,
        stageTransitionRules: STAGE_TRANSITION_RULES,
        roleStagePermissions: ROLE_STAGE_PERMISSIONS,
        stageSLAConfig: STAGE_SLA_CONFIG,
      });
    } catch (error: any) {
      console.error("Error fetching business rules:", error);
      res.status(500).json({ error: error.message || "Failed to fetch business rules" });
    }
  });

  console.log("Workflow validation routes registered");
}
