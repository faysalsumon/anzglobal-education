import { Router } from "express";
import { db } from "./db";
import { scrapingJobs, scrapedCourses, courses, universities, type User, insertCourseSchema } from "../shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { addScrapingJob, getJobStatus, cancelJob, getActiveJobs, getWaitingJobs } from "./scraping-queue";
import { insertScrapingJobSchema, insertScrapedCourseSchema } from "../shared/schema";
import { logApprove, logReject } from "./activity-logger";

const router = Router();

// Import checkAdminAccess from routes.ts
import type { checkAdminAccess as CheckAdminAccessType } from "./routes";

// Get checkAdminAccess dynamically to avoid circular dependency
let checkAdminAccess: typeof CheckAdminAccessType;
async function getCheckAdminAccess() {
  if (!checkAdminAccess) {
    const routes = await import("./routes");
    checkAdminAccess = routes.checkAdminAccess;
  }
  return checkAdminAccess;
}

/**
 * Trigger a new scraping job for an institution
 * POST /api/admin/scraping/trigger
 */
router.post("/trigger", async (req, res) => {
  try {
    const user = req.user as any;
    if (!user || !user.claims) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = user.claims.sub;
    const checkAdminFn = await getCheckAdminAccess();
    const access = await checkAdminFn(userId);

    if (!access) {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Validate request body
    const validation = insertScrapingJobSchema.safeParse({
      institutionUrl: req.body.institutionUrl,
      institutionId: req.body.institutionId,
      institutionName: req.body.institutionName,
      createdBy: userId,
      status: "pending",
    });

    if (!validation.success) {
      return res.status(400).json({ error: "Invalid request data", details: validation.error.errors });
    }

    const { institutionId, institutionUrl, institutionName } = validation.data;
    const { useBrowser } = req.body;

    // Create database job record
    const [job] = await db
      .insert(scrapingJobs)
      .values({
        institutionId: institutionId || null,
        institutionUrl,
        institutionName: institutionName || null,
        status: "pending",
        createdBy: userId,
      })
      .returning();

    // Add to queue for processing (gracefully handle Redis unavailability)
    try {
      await addScrapingJob({
        jobId: job.id,
        institutionId: institutionId || undefined,
        institutionUrl,
        institutionName: institutionName || undefined,
        useBrowser: useBrowser || false,
      });
      console.log(`Scraping job ${job.id} queued successfully`);
    } catch (queueError: any) {
      console.warn(`Could not queue job ${job.id} (Redis unavailable):`, queueError.message);
      console.log("Job persisted to database and will be processed when queue is available");
    }

    res.json({
      message: "Scraping job created successfully",
      job,
    });
  } catch (error: any) {
    console.error("Error creating scraping job:", error);
    res.status(500).json({ error: "Failed to create scraping job" });
  }
});

/**
 * Direct scraping endpoint (bypass queue for testing)
 * POST /api/admin/scraping/test
 * Use this when Redis is unavailable to test scraping functionality
 */
router.post("/test", async (req, res) => {
  try {
    const user = req.user as any;
    if (!user || !user.claims) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = user.claims.sub;
    const checkAdminFn = await getCheckAdminAccess();
    const access = await checkAdminFn(userId);

    if (!access) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { institutionUrl, institutionName, useBrowser } = req.body;

    if (!institutionUrl) {
      return res.status(400).json({ error: "institutionUrl is required" });
    }

    console.log(`[Direct Scraping] Starting scrape for ${institutionUrl}`);

    // Import scraping services
    const { scrapeWebsite } = await import("./web-scraper-service");
    const { extractCourseData } = await import("./ai-extractor-service");

    // Scrape the website
    console.log("[Direct Scraping] Fetching HTML...");
    const scrapeResult = await scrapeWebsite({
      url: institutionUrl,
      useBrowser: useBrowser || false,
      timeout: 30000,
    });

    console.log(`[Direct Scraping] HTML fetched (${scrapeResult.html.length} chars)`);

    // Extract course data using AI
    console.log("[Direct Scraping] Extracting courses with AI...");
    const extractionResult = await extractCourseData(
      scrapeResult.html,
      institutionUrl,
      institutionName
    );

    console.log(`[Direct Scraping] Extraction complete - Confidence: ${extractionResult.confidence}`);
    console.log(`[Direct Scraping] Warnings: ${extractionResult.warnings.join(", ") || "None"}`);

    // Create a job record for tracking (jobId is required for scrapedCourses)
    const [tempJob] = await db
      .insert(scrapingJobs)
      .values({
        institutionUrl,
        institutionName: institutionName || null,
        status: "completed",
        createdBy: userId,
      })
      .returning();

    // Save to scraped_courses table
    const [scrapedCourse] = await db
      .insert(scrapedCourses)
      .values({
        jobId: tempJob.id,
        title: extractionResult.data.title || "Unknown Course",
        subject: extractionResult.data.subject,
        level: extractionResult.data.level,
        duration: extractionResult.data.duration,
        description: extractionResult.data.description,
        fees: extractionResult.data.fees,
        applicationFees: extractionResult.data.applicationFees,
        englishRequirements: extractionResult.data.englishRequirements,
        academicRequirements: extractionResult.data.academicRequirements,
        intakes: extractionResult.data.intakes,
        campusLocations: extractionResult.data.campusLocations,
        deliveryMode: extractionResult.data.deliveryMode,
        sourceUrl: institutionUrl,
        confidence: extractionResult.confidence.toString(),
        warnings: extractionResult.warnings,
        reviewStatus: "pending",
      })
      .returning();

    console.log(`[Direct Scraping] Saved to database with ID: ${scrapedCourse.id}`);

    res.json({
      message: "Direct scraping completed successfully",
      scrapedCourse,
      extractionResult: {
        confidence: extractionResult.confidence,
        warnings: extractionResult.warnings,
        extractedFields: Object.keys(extractionResult.data).filter(
          key => extractionResult.data[key] !== null && extractionResult.data[key] !== undefined
        ),
      },
    });
  } catch (error: any) {
    console.error("[Direct Scraping] Error:", error);
    res.status(500).json({
      error: "Direct scraping failed",
      details: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

/**
 * Get all scraping jobs with filtering
 * GET /api/admin/scraping/jobs
 */
router.get("/jobs", async (req, res) => {
  try {
    const user = req.user as any;
    if (!user || !user.claims) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = user.claims.sub;
    const checkAdminFn = await getCheckAdminAccess();
    const access = await checkAdminFn(userId);

    if (!access) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { status, institutionId } = req.query;

    const conditions = [];
    if (status) {
      conditions.push(eq(scrapingJobs.status, status as any));
    }
    if (institutionId) {
      conditions.push(eq(scrapingJobs.institutionId, institutionId as string));
    }

    const jobs = await db
      .select()
      .from(scrapingJobs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(scrapingJobs.createdAt))
      .limit(100);

    res.json({ jobs });
  } catch (error: any) {
    console.error("Error fetching scraping jobs:", error);
    res.status(500).json({ error: "Failed to fetch scraping jobs" });
  }
});

/**
 * Get specific scraping job details
 * GET /api/admin/scraping/jobs/:id
 */
router.get("/jobs/:id", async (req, res) => {
  try {
    const user = req.user as any;
    if (!user || !user.claims) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = user.claims.sub;
    const checkAdminFn = await getCheckAdminAccess();
    const access = await checkAdminFn(userId);

    if (!access) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { id } = req.params;

    const [job] = await db.select().from(scrapingJobs).where(eq(scrapingJobs.id, id));

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Get queue status
    const queueStatus = await getJobStatus(id);

    res.json({
      job,
      queueStatus,
    });
  } catch (error: any) {
    console.error("Error fetching scraping job:", error);
    res.status(500).json({ error: "Failed to fetch scraping job" });
  }
});

/**
 * Cancel a scraping job
 * DELETE /api/admin/scraping/jobs/:id
 */
router.delete("/jobs/:id", async (req, res) => {
  try {
    const user = req.user as any;
    if (!user || !user.claims) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = user.claims.sub;
    const checkAdminFn = await getCheckAdminAccess();
    const access = await checkAdminFn(userId);

    if (!access) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { id } = req.params;

    // Cancel in queue
    await cancelJob(id);

    // Update database
    await db
      .update(scrapingJobs)
      .set({
        status: "cancelled",
        completedAt: new Date(),
      })
      .where(eq(scrapingJobs.id, id));

    res.json({ message: "Job cancelled successfully" });
  } catch (error: any) {
    console.error("Error cancelling scraping job:", error);
    res.status(500).json({ error: "Failed to cancel scraping job" });
  }
});

/**
 * Get scraped courses for review
 * GET /api/admin/scraping/scraped-courses
 */
router.get("/scraped-courses", async (req, res) => {
  try {
    const user = req.user as any;
    if (!user || !user.claims) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = user.claims.sub;
    const checkAdminFn = await getCheckAdminAccess();
    const access = await checkAdminFn(userId);

    if (!access) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { reviewStatus, jobId, institutionId } = req.query;

    const conditions = [];
    if (reviewStatus) {
      conditions.push(eq(scrapedCourses.reviewStatus, reviewStatus as string));
    }
    if (jobId) {
      conditions.push(eq(scrapedCourses.jobId, jobId as string));
    }
    if (institutionId) {
      conditions.push(eq(scrapedCourses.institutionId, institutionId as string));
    }

    const scrapedCoursesList = await db
      .select()
      .from(scrapedCourses)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(scrapedCourses.confidence), desc(scrapedCourses.extractedAt))
      .limit(100);

    res.json({ scrapedCourses: scrapedCoursesList });
  } catch (error: any) {
    console.error("Error fetching scraped courses:", error);
    res.status(500).json({ error: "Failed to fetch scraped courses" });
  }
});

/**
 * Get single scraped course details
 * GET /api/admin/scraping/scraped-courses/:id
 */
router.get("/scraped-courses/:id", async (req, res) => {
  try {
    const user = req.user as any;
    if (!user || !user.claims) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = user.claims.sub;
    const checkAdminFn = await getCheckAdminAccess();
    const access = await checkAdminFn(userId);

    if (!access) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { id } = req.params;

    const [scrapedCourse] = await db
      .select()
      .from(scrapedCourses)
      .where(eq(scrapedCourses.id, id));

    if (!scrapedCourse) {
      return res.status(404).json({ error: "Scraped course not found" });
    }

    res.json({ scrapedCourse });
  } catch (error: any) {
    console.error("Error fetching scraped course:", error);
    res.status(500).json({ error: "Failed to fetch scraped course" });
  }
});

/**
 * Approve and merge scraped course into courses table
 * PUT /api/admin/scraping/scraped-courses/:id/approve
 */
router.put("/scraped-courses/:id/approve", async (req, res) => {
  try {
    const user = req.user as any;
    if (!user || !user.claims) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = user.claims.sub;
    const checkAdminFn = await getCheckAdminAccess();
    const access = await checkAdminFn(userId);

    if (!access) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { id } = req.params;
    const { reviewNotes, editedData } = req.body;

    // Validate edited data if provided
    if (editedData) {
      const validation = insertCourseSchema.safeParse(editedData);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid edited data", 
          details: validation.error.errors 
        });
      }
    }

    // Get scraped course
    const [scrapedCourse] = await db
      .select()
      .from(scrapedCourses)
      .where(eq(scrapedCourses.id, id));

    if (!scrapedCourse) {
      return res.status(404).json({ error: "Scraped course not found" });
    }

    // Use edited data if provided, otherwise use scraped data
    const courseData = editedData || scrapedCourse;

    // Insert into courses table
    const [newCourse] = await db
      .insert(courses)
      .values({
        universityId: scrapedCourse.institutionId!,
        title: courseData.title!,
        description: courseData.description,
        subject: courseData.subject!,
        discipline: courseData.discipline as any,
        level: courseData.level as any,
        duration: courseData.duration,
        durationMonths: courseData.durationMonths,
        durationWeeks: courseData.durationWeeks,
        fees: courseData.fees,
        currency: courseData.currency,
        location: courseData.location,
        country: courseData.country,
        startDate: courseData.startDate,
        applicationDeadline: courseData.applicationDeadline,
        prerequisites: courseData.prerequisites,
        thumbnailUrl: courseData.thumbnailUrl,
        courseCode: courseData.courseCode,
        prPathway: courseData.prPathway,
        scholarshipPercentageMin: courseData.scholarshipPercentageMin,
        scholarshipPercentageMax: courseData.scholarshipPercentageMax,
        eligibilityRequirements: courseData.eligibilityRequirements,
        englishRequirements: courseData.englishRequirements,
        curriculumUrl: courseData.curriculumUrl,
        costOfLiving: courseData.costOfLiving,
        applicationFees: courseData.applicationFees,
        images: courseData.images,
        intakes: courseData.intakes,
        studyAreas: courseData.studyAreas,
        careerOutcomes: courseData.careerOutcomes,
        careerPath: courseData.careerPath,
        pathways: courseData.pathways,
        minimumAge: courseData.minimumAge,
        academicRequirements: courseData.academicRequirements,
        englishRequirementsStructured: courseData.englishRequirementsStructured as any,
        deliveryMode: courseData.deliveryMode,
        campusLocations: courseData.campusLocations,
        workRights: courseData.workRights,
        internshipAvailable: courseData.internshipAvailable,
        internshipDetails: courseData.internshipDetails,
        approvalStatus: "pending", // Still needs platform admin approval
      })
      .returning();

    // Update scraped course status
    await db
      .update(scrapedCourses)
      .set({
        reviewStatus: "approved",
        reviewedAt: new Date(),
        reviewedBy: userId,
        reviewNotes,
        approvedCourseId: newCourse.id,
      })
      .where(eq(scrapedCourses.id, id));

    // Log activity
    await logApprove({
      req,
      entityType: 'scraped_course',
      entityId: id,
      entityName: scrapedCourse.title || 'Unknown',
      metadata: { approvedCourseId: newCourse.id },
    });

    res.json({
      message: "Course approved and created successfully",
      course: newCourse,
    });
  } catch (error: any) {
    console.error("Error approving scraped course:", error);
    res.status(500).json({ error: "Failed to approve scraped course" });
  }
});

/**
 * Reject scraped course
 * PUT /api/admin/scraping/scraped-courses/:id/reject
 */
router.put("/scraped-courses/:id/reject", async (req, res) => {
  try {
    const user = req.user as any;
    if (!user || !user.claims) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = user.claims.sub;
    const checkAdminFn = await getCheckAdminAccess();
    const access = await checkAdminFn(userId);

    if (!access) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { id } = req.params;
    const { reviewNotes } = req.body;

    // Get scraped course first for logging
    const [scrapedCourse] = await db
      .select()
      .from(scrapedCourses)
      .where(eq(scrapedCourses.id, id));

    if (!scrapedCourse) {
      return res.status(404).json({ error: "Scraped course not found" });
    }

    // Update scraped course status
    await db
      .update(scrapedCourses)
      .set({
        reviewStatus: "rejected",
        reviewedAt: new Date(),
        reviewedBy: userId,
        reviewNotes: reviewNotes || "Rejected by admin",
      })
      .where(eq(scrapedCourses.id, id));

    // Log activity
    await logReject({
      req,
      entityType: 'scraped_course',
      entityId: id,
      entityName: scrapedCourse.title || 'Unknown',
      reason: reviewNotes || 'Rejected by admin',
    });

    res.json({ message: "Course rejected successfully" });
  } catch (error: any) {
    console.error("Error rejecting scraped course:", error);
    res.status(500).json({ error: "Failed to reject scraped course" });
  }
});

/**
 * Get active and waiting jobs from queue
 * GET /api/admin/scraping/queue-status
 */
router.get("/queue-status", async (req, res) => {
  try {
    const user = req.user as any;
    if (!user || !user.claims) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = user.claims.sub;
    const checkAdminFn = await getCheckAdminAccess();
    const access = await checkAdminFn(userId);

    if (!access) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const activeJobs = await getActiveJobs();
    const waitingJobs = await getWaitingJobs();

    res.json({
      active: activeJobs,
      waiting: waitingJobs,
    });
  } catch (error: any) {
    console.error("Error fetching queue status:", error);
    res.status(500).json({ error: "Failed to fetch queue status" });
  }
});

export default router;
