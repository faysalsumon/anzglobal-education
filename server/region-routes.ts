import { Router, Request, Response } from "express";
import { storage } from "./storage";
import { 
  insertRegionSchema,
  updateRegionSchema,
  insertStudentPathwaySchema,
  insertCourseRegionVariantSchema,
  updateCourseRegionVariantSchema,
  insertVisaRequirementSchema,
  updateVisaRequirementSchema,
  insertLocalizedContentSchema,
  updateLocalizedContentSchema,
} from "@shared/schema";
import { getRegionContext } from "./middleware/region-detection";

export function registerRegionRoutes(router: Router) {
  // ============================================
  // REGION MANAGEMENT ENDPOINTS
  // ============================================
  
  router.get("/api/admin/regions", async (req: Request, res: Response) => {
    try {
      const activeOnly = req.query.active === "true";
      const regions = await storage.getAllRegions(activeOnly);
      res.json(regions);
    } catch (error: any) {
      console.error("Error fetching regions:", error);
      res.status(500).json({ message: "Failed to fetch regions" });
    }
  });

  router.get("/api/admin/regions/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const region = await storage.getRegionWithDetails(id);
      
      if (!region) {
        return res.status(404).json({ message: "Region not found" });
      }
      
      res.json(region);
    } catch (error: any) {
      console.error("Error fetching region:", error);
      res.status(500).json({ message: "Failed to fetch region" });
    }
  });

  router.post("/api/admin/regions", async (req: Request, res: Response) => {
    try {
      const validated = insertRegionSchema.parse(req.body);
      const region = await storage.createRegion(validated);
      res.status(201).json(region);
    } catch (error: any) {
      console.error("Error creating region:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid region data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create region" });
    }
  });

  router.patch("/api/admin/regions/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const validated = updateRegionSchema.parse(req.body);
      const region = await storage.updateRegion(id, validated);
      res.json(region);
    } catch (error: any) {
      console.error("Error updating region:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid region data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update region" });
    }
  });

  router.delete("/api/admin/regions/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteRegion(id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting region:", error);
      res.status(500).json({ message: "Failed to delete region" });
    }
  });

  // ============================================
  // STUDENT PATHWAY ENDPOINTS
  // ============================================

  router.get("/api/admin/pathways", async (req: Request, res: Response) => {
    try {
      const activeOnly = req.query.active === "true";
      const pathways = await storage.getAllPathways(activeOnly);
      res.json(pathways);
    } catch (error: any) {
      console.error("Error fetching pathways:", error);
      res.status(500).json({ message: "Failed to fetch pathways" });
    }
  });

  router.get("/api/admin/pathways/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const pathway = await storage.getPathwayById(id);
      
      if (!pathway) {
        return res.status(404).json({ message: "Pathway not found" });
      }
      
      res.json(pathway);
    } catch (error: any) {
      console.error("Error fetching pathway:", error);
      res.status(500).json({ message: "Failed to fetch pathway" });
    }
  });

  router.post("/api/admin/pathways", async (req: Request, res: Response) => {
    try {
      const validated = insertStudentPathwaySchema.parse(req.body);
      const pathway = await storage.createPathway(validated);
      res.status(201).json(pathway);
    } catch (error: any) {
      console.error("Error creating pathway:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid pathway data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create pathway" });
    }
  });

  router.patch("/api/admin/pathways/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const pathway = await storage.updatePathway(id, req.body);
      res.json(pathway);
    } catch (error: any) {
      console.error("Error updating pathway:", error);
      res.status(500).json({ message: "Failed to update pathway" });
    }
  });

  router.delete("/api/admin/pathways/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deletePathway(id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting pathway:", error);
      res.status(500).json({ message: "Failed to delete pathway" });
    }
  });

  // ============================================
  // COURSE REGION VARIANT ENDPOINTS
  // ============================================

  router.get("/api/admin/course-variants", async (req: Request, res: Response) => {
    try {
      const { courseId, regionId } = req.query;
      
      if (courseId) {
        const variants = await storage.getVariantsByCourseId(courseId as string);
        return res.json(variants);
      }
      
      if (regionId) {
        const variants = await storage.getVariantsByRegionId(regionId as string);
        return res.json(variants);
      }
      
      res.status(400).json({ message: "courseId or regionId query parameter required" });
    } catch (error: any) {
      console.error("Error fetching course variants:", error);
      res.status(500).json({ message: "Failed to fetch course variants" });
    }
  });

  router.get("/api/admin/course-variants/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const variant = await storage.getVariantById(id);
      
      if (!variant) {
        return res.status(404).json({ message: "Course variant not found" });
      }
      
      res.json(variant);
    } catch (error: any) {
      console.error("Error fetching course variant:", error);
      res.status(500).json({ message: "Failed to fetch course variant" });
    }
  });

  router.post("/api/admin/course-variants", async (req: Request, res: Response) => {
    try {
      const validated = insertCourseRegionVariantSchema.parse(req.body);
      const variant = await storage.createVariant(validated);
      res.status(201).json(variant);
    } catch (error: any) {
      console.error("Error creating course variant:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid variant data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create course variant" });
    }
  });

  router.patch("/api/admin/course-variants/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const validated = updateCourseRegionVariantSchema.parse(req.body);
      const variant = await storage.updateVariant(id, validated);
      res.json(variant);
    } catch (error: any) {
      console.error("Error updating course variant:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid variant data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update course variant" });
    }
  });

  router.delete("/api/admin/course-variants/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteVariant(id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting course variant:", error);
      res.status(500).json({ message: "Failed to delete course variant" });
    }
  });

  // ============================================
  // VISA REQUIREMENT ENDPOINTS
  // ============================================

  router.get("/api/admin/visa-requirements", async (req: Request, res: Response) => {
    try {
      const { regionId } = req.query;
      
      if (regionId) {
        const requirements = await storage.getVisaRequirementsByRegionId(regionId as string);
        return res.json(requirements);
      }
      
      res.status(400).json({ message: "regionId query parameter required" });
    } catch (error: any) {
      console.error("Error fetching visa requirements:", error);
      res.status(500).json({ message: "Failed to fetch visa requirements" });
    }
  });

  router.get("/api/admin/visa-requirements/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const requirement = await storage.getVisaRequirementById(id);
      
      if (!requirement) {
        return res.status(404).json({ message: "Visa requirement not found" });
      }
      
      res.json(requirement);
    } catch (error: any) {
      console.error("Error fetching visa requirement:", error);
      res.status(500).json({ message: "Failed to fetch visa requirement" });
    }
  });

  router.post("/api/admin/visa-requirements", async (req: Request, res: Response) => {
    try {
      const validated = insertVisaRequirementSchema.parse(req.body);
      const requirement = await storage.createVisaRequirement(validated);
      res.status(201).json(requirement);
    } catch (error: any) {
      console.error("Error creating visa requirement:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid visa requirement data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create visa requirement" });
    }
  });

  router.patch("/api/admin/visa-requirements/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const validated = updateVisaRequirementSchema.parse(req.body);
      const requirement = await storage.updateVisaRequirement(id, validated);
      res.json(requirement);
    } catch (error: any) {
      console.error("Error updating visa requirement:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid visa requirement data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update visa requirement" });
    }
  });

  router.delete("/api/admin/visa-requirements/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteVisaRequirement(id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting visa requirement:", error);
      res.status(500).json({ message: "Failed to delete visa requirement" });
    }
  });

  // ============================================
  // LOCALIZED CONTENT ENDPOINTS
  // ============================================

  router.get("/api/admin/localized-content", async (req: Request, res: Response) => {
    try {
      const { entityType, entityId, locale, isReviewed } = req.query;
      
      if (entityType && entityId) {
        const content = await storage.getLocalizedContentsByEntity(
          entityType as string, 
          entityId as string
        );
        return res.json(content);
      }
      
      const filters: any = {};
      if (entityType) filters.entityType = entityType;
      if (locale) filters.locale = locale;
      if (isReviewed !== undefined) filters.isReviewed = isReviewed === "true";
      
      const content = await storage.getAllLocalizedContent(filters);
      res.json(content);
    } catch (error: any) {
      console.error("Error fetching localized content:", error);
      res.status(500).json({ message: "Failed to fetch localized content" });
    }
  });

  router.get("/api/admin/localized-content/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const content = await storage.getLocalizedContentById(id);
      
      if (!content) {
        return res.status(404).json({ message: "Localized content not found" });
      }
      
      res.json(content);
    } catch (error: any) {
      console.error("Error fetching localized content:", error);
      res.status(500).json({ message: "Failed to fetch localized content" });
    }
  });

  router.post("/api/admin/localized-content", async (req: Request, res: Response) => {
    try {
      const validated = insertLocalizedContentSchema.parse(req.body);
      const content = await storage.createLocalizedContent(validated);
      res.status(201).json(content);
    } catch (error: any) {
      console.error("Error creating localized content:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid content data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create localized content" });
    }
  });

  router.patch("/api/admin/localized-content/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const validated = updateLocalizedContentSchema.parse(req.body);
      const content = await storage.updateLocalizedContent(id, validated);
      res.json(content);
    } catch (error: any) {
      console.error("Error updating localized content:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid content data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update localized content" });
    }
  });

  router.delete("/api/admin/localized-content/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteLocalizedContent(id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting localized content:", error);
      res.status(500).json({ message: "Failed to delete localized content" });
    }
  });

  // ============================================
  // PUBLIC REGION ENDPOINTS (for frontend)
  // ============================================

  router.get("/api/public/regions", async (_req: Request, res: Response) => {
    try {
      const regions = await storage.getAllRegions(true);
      const publicRegions = regions.map(r => ({
        code: r.code,
        name: r.name,
        flagEmoji: r.flagEmoji,
        flagUrl: r.flagUrl,
        defaultCurrency: r.defaultCurrency,
        defaultLocale: r.defaultLocale,
        timezone: r.timezone,
      }));
      res.json(publicRegions);
    } catch (error: any) {
      console.error("Error fetching public regions:", error);
      res.status(500).json({ message: "Failed to fetch regions" });
    }
  });

  router.get("/api/public/pathways", async (_req: Request, res: Response) => {
    try {
      const pathways = await storage.getAllPathways(true);
      const publicPathways = pathways.map(p => ({
        code: p.code,
        name: p.name,
        description: p.description,
        requiresVisa: p.requiresVisa,
      }));
      res.json(publicPathways);
    } catch (error: any) {
      console.error("Error fetching public pathways:", error);
      res.status(500).json({ message: "Failed to fetch pathways" });
    }
  });

  router.get("/api/public/current-region", (req: Request, res: Response) => {
    const context = getRegionContext(req);
    res.json({
      region: context.region ? {
        code: context.region.code,
        name: context.region.name,
        flagEmoji: context.region.flagEmoji,
        flagUrl: context.region.flagUrl,
        currency: context.currency,
        locale: context.locale,
      } : null,
      pathway: context.pathway ? {
        code: context.pathway.code,
        name: context.pathway.name,
      } : null,
      detectedFromDomain: context.detectedFromDomain,
    });
  });

  router.get("/api/public/courses/:courseId/resolved", async (req: Request, res: Response) => {
    try {
      const { courseId } = req.params;
      const context = getRegionContext(req);
      
      if (!context.region) {
        return res.status(400).json({ 
          message: "Region context required. Use ?region=AU or domain-based detection." 
        });
      }
      
      const resolved = await storage.resolveCourseForRegion(
        courseId,
        context.region.code,
        context.pathway?.code
      );
      
      if (!resolved) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      res.json(resolved);
    } catch (error: any) {
      console.error("Error resolving course for region:", error);
      res.status(500).json({ message: "Failed to resolve course" });
    }
  });

  router.get("/api/public/courses-by-region", async (req: Request, res: Response) => {
    try {
      const context = getRegionContext(req);
      const { discipline, universityId, level, limit = "20", offset = "0" } = req.query;

      const allCourses = await storage.getAllCourses();
      const allUniversities = await storage.getAllUniversities();

      let filteredCourses = allCourses.filter(course => {
        const university = allUniversities.find(u => u.id === course.universityId);
        const isApprovedAndActive = course.approvalStatus === 'approved' && 
               course.isActive &&
               university?.approvalStatus === 'approved' &&
               university?.isActive;
        
        if (!isApprovedAndActive) return false;
        
        if (universityId && typeof universityId === 'string') {
          if (course.universityId !== universityId) return false;
        }
        
        if (discipline && typeof discipline === 'string') {
          if (course.discipline !== discipline) return false;
        }
        
        if (level && typeof level === 'string') {
          if (course.level !== level) return false;
        }
        
        return true;
      });

      const total = filteredCourses.length;
      const paginatedCourses = filteredCourses.slice(
        parseInt(offset as string),
        parseInt(offset as string) + parseInt(limit as string)
      );

      if (!context.region) {
        return res.json({
          courses: paginatedCourses,
          total,
          region: null,
          currency: "AUD",
        });
      }

      const resolvedCourses = await Promise.all(
        paginatedCourses.map(async (course) => {
          const resolved = await storage.resolveCourseForRegion(
            course.id,
            context.region!.code,
            context.pathway?.code
          );
          
          return resolved || {
            id: course.id,
            title: course.title,
            description: course.description,
            subject: course.subject,
            discipline: course.discipline,
            level: course.level,
            duration: course.duration,
            tuitionFee: course.fees?.toString() || null,
            currency: context.currency,
            applicationFee: course.applicationFees?.toString() || null,
            costOfLiving: course.costOfLiving?.toString() || null,
            scholarshipMin: course.scholarshipPercentageMin ?? null,
            scholarshipMax: course.scholarshipPercentageMax ?? null,
            englishRequirements: course.englishRequirementsStructured || null,
            academicRequirements: course.academicRequirements || null,
            minimumAge: course.minimumAge ?? null,
            regionCode: context.region!.code,
            pathwayCode: context.pathway?.code || null,
            visaRequired: context.pathway?.requiresVisa || false,
            visaInfo: null,
            thumbnailUrl: course.thumbnailUrl,
            universityId: course.universityId,
            university: course.university,
          };
        })
      );

      res.json({
        courses: resolvedCourses,
        total,
        region: {
          code: context.region.code,
          name: context.region.name,
        },
        currency: context.currency,
        locale: context.locale,
      });
    } catch (error: any) {
      console.error("Error fetching region-resolved courses:", error);
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  console.log("Region management routes registered");
}
