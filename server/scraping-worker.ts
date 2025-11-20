import { Worker, Job } from "bullmq";
import { db } from "./db";
import { scrapingJobs, scrapedCourses, courses, scrapingTemplates } from "../shared/schema";
import { eq } from "drizzle-orm";
import {
  scrapeWebsite,
  findCourseListingPage,
  type ScrapeResult,
} from "./web-scraper-service";
import {
  extractCourseData,
  extractCourseLinks,
  type ExtractionResult,
} from "./ai-extractor-service";
import type { ScrapingJobData, ScrapingJobProgress } from "./scraping-queue";
import Redis from "ioredis";

const connection = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: null,
  retryStrategy: () => null, // Don't retry in dev
  lazyConnect: true,
});

// Suppress Redis connection errors in development
connection.on("error", (err: any) => {
  if (process.env.NODE_ENV === "development" && err.code === "ECONNREFUSED") {
    // Silent - use direct scraping endpoint instead
  } else {
    console.error("Worker Redis error:", err.message);
  }
});

/**
 * Process a single scraping job
 */
async function processScrapingJob(job: Job<ScrapingJobData>): Promise<void> {
  const { jobId, institutionId, institutionUrl, institutionName, templateId } = job.data;

  console.log(`Processing scraping job ${jobId} for ${institutionName || institutionUrl}`);

  try {
    // Update job status to running
    await db
      .update(scrapingJobs)
      .set({
        status: "running",
        startedAt: new Date(),
      })
      .where(eq(scrapingJobs.id, jobId));

    // Fetch template settings if templateId is provided (template drives browser settings)
    let useBrowser = false; // Default to static scraping
    let waitForSelector: string | undefined = undefined;
    
    if (templateId) {
      const templates = await db
        .select()
        .from(scrapingTemplates)
        .where(eq(scrapingTemplates.id, templateId))
        .limit(1);
      
      if (templates.length > 0) {
        const template = templates[0];
        useBrowser = template.useBrowser || false;
        waitForSelector = template.waitForSelector || undefined;
        console.log(`✓ Loaded template: ${template.name} (useBrowser: ${useBrowser}, waitForSelector: ${waitForSelector})`);
      } else {
        console.warn(`⚠ Template ${templateId} not found, using default settings`);
      }
    }

    // Step 1: Check if auto-discovery is enabled for this job
    const jobDetails = await db
      .select()
      .from(scrapingJobs)
      .where(eq(scrapingJobs.id, jobId))
      .limit(1);
    
    const useAutoDiscovery = jobDetails[0]?.useAutoDiscovery || false;
    
    let courseListingUrl = institutionUrl;
    let discoveryMethod = "manual" as string;
    let discoveryConfidence = null as number | null;

    // Step 2: Find course listing page if auto-discovery is enabled
    if (useAutoDiscovery) {
      await job.updateProgress({
        progress: 10,
        status: "Auto-discovering course listing page...",
      } as ScrapingJobProgress);

      const discoveryResult = await findCourseListingPage(institutionUrl, true); // Use AI
      if (discoveryResult) {
        courseListingUrl = discoveryResult.url;
        discoveryMethod = discoveryResult.method;
        discoveryConfidence = discoveryResult.confidence;
        
        // Store discovered URL in database
        await db
          .update(scrapingJobs)
          .set({
            discoveredCourseListingUrl: courseListingUrl,
            discoveryMethod: discoveryMethod,
            discoveryConfidence: discoveryConfidence, // Real column stores number directly
          })
          .where(eq(scrapingJobs.id, jobId));

        console.log(`✓ Auto-discovered course listing page: ${courseListingUrl} (method: ${discoveryMethod}, confidence: ${discoveryConfidence.toFixed(2)})`);
      } else {
        console.log(`⚠ Auto-discovery failed, using homepage URL: ${institutionUrl}`);
      }
    }

    // Step 3: Scrape course listing page
    await job.updateProgress({
      progress: 20,
      status: "Scraping course listing...",
    } as ScrapingJobProgress);

    const listingPage = await scrapeWebsite({
      url: courseListingUrl,
      useBrowser,
      waitForSelector,
    });

    // Step 4: Extract course page URLs using AI
    await job.updateProgress({
      progress: 30,
      status: "Extracting course links...",
    } as ScrapingJobProgress);

    const courseUrls = await extractCourseLinks(listingPage.html, courseListingUrl);
    console.log(`Found ${courseUrls.length} course links`);

    if (courseUrls.length === 0) {
      throw new Error("No course links found on listing page");
    }

    await db
      .update(scrapingJobs)
      .set({
        totalPages: courseUrls.length,
        coursesFound: courseUrls.length,
      })
      .where(eq(scrapingJobs.id, jobId));

    // Step 5: Scrape and extract each course
    let scrapedCount = 0;
    let extractedCount = 0;

    for (let i = 0; i < courseUrls.length; i++) {
      const courseUrl = courseUrls[i];
      const progress = 30 + Math.floor((i / courseUrls.length) * 60); // 30% to 90%

      await job.updateProgress({
        progress,
        totalPages: courseUrls.length,
        scrapedPages: scrapedCount,
        coursesFound: courseUrls.length,
        coursesExtracted: extractedCount,
        currentPage: courseUrl,
        status: `Scraping course ${i + 1}/${courseUrls.length}...`,
      } as ScrapingJobProgress);

      try {
        // Scrape course page
        const coursePage = await scrapeWebsite({
          url: courseUrl,
          useBrowser,
          waitForSelector,
          timeout: 20000,
        });
        scrapedCount++;

        // Extract course data using AI
        const extraction = await extractCourseData(
          coursePage.html,
          courseUrl,
          institutionName
        );

        // Determine review status based on confidence threshold
        const AUTO_APPROVAL_THRESHOLD = 0.85;
        const shouldAutoApprove = extraction.confidence >= AUTO_APPROVAL_THRESHOLD && 
                                  extraction.warnings.length === 0 &&
                                  extraction.data.title &&
                                  extraction.data.subject &&
                                  institutionId; // Must have institution ID to create course
        
        if (shouldAutoApprove) {
          // Auto-approval: Create course in main courses table AND update scraped_courses atomically
          try {
            await db.transaction(async (tx) => {
              // Create course in main courses table
              const courseData = extraction.data;
              const [newCourse] = await tx.insert(courses).values({
                universityId: institutionId!,
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
                approvalStatus: "approved", // Auto-approved, no manual review needed
              }).returning();
              
              // Save to scraped courses table with reference to created course
              await tx.insert(scrapedCourses).values({
                jobId,
                institutionId: institutionId || null,
                sourceUrl: courseUrl,
                extractedAt: new Date(extraction.extractedAt),
                confidence: extraction.confidence.toString(),
                warnings: extraction.warnings,
                ...extraction.data,
                reviewStatus: "approved",
                reviewedAt: new Date(),
                reviewedBy: "auto-approval-system",
                reviewNotes: `Auto-approved: High confidence (${extraction.confidence.toFixed(2)})`,
                approvedCourseId: newCourse.id,
              });
              
              console.log(`✓ Auto-approved and created course: ${extraction.data.title || "Unknown"} (confidence: ${extraction.confidence.toFixed(2)}, course ID: ${newCourse.id})`);
            });
            
            extractedCount++;
          } catch (error: any) {
            console.error(`Failed to auto-approve course ${extraction.data.title}:`, error.message);
            // Fall back to pending review if auto-approval fails
            await db.insert(scrapedCourses).values({
              jobId,
              institutionId: institutionId || null,
              sourceUrl: courseUrl,
              extractedAt: new Date(extraction.extractedAt),
              confidence: extraction.confidence.toString(),
              warnings: [...extraction.warnings, `Auto-approval failed: ${error.message}`],
              ...extraction.data,
              reviewStatus: "pending",
            });
            extractedCount++;
            console.log(`Fell back to pending review for: ${extraction.data.title || "Unknown"}`);
          }
        } else {
          // Manual review required: Save to scraped courses table only
          await db.insert(scrapedCourses).values({
            jobId,
            institutionId: institutionId || null,
            sourceUrl: courseUrl,
            extractedAt: new Date(extraction.extractedAt),
            confidence: extraction.confidence.toString(),
            warnings: extraction.warnings,
            ...extraction.data,
            reviewStatus: "pending",
          });
          
          extractedCount++;
          console.log(`Extracted course for review: ${extraction.data.title || "Unknown"} (confidence: ${extraction.confidence.toFixed(2)})`);
        }
      } catch (error: any) {
        console.error(`Failed to extract course from ${courseUrl}:`, error.message);
        // Continue with next course even if one fails
      }

      // Update database progress
      await db
        .update(scrapingJobs)
        .set({
          progress,
          scrapedPages: scrapedCount,
          coursesExtracted: extractedCount,
        })
        .where(eq(scrapingJobs.id, jobId));
    }

    // Step 5: Complete job
    await job.updateProgress({
      progress: 100,
      totalPages: courseUrls.length,
      scrapedPages: scrapedCount,
      coursesFound: courseUrls.length,
      coursesExtracted: extractedCount,
      status: "Completed",
    } as ScrapingJobProgress);

    await db
      .update(scrapingJobs)
      .set({
        status: "completed",
        progress: 100,
        completedAt: new Date(),
      })
      .where(eq(scrapingJobs.id, jobId));

    console.log(
      `Scraping job ${jobId} completed. Extracted ${extractedCount}/${courseUrls.length} courses.`
    );
  } catch (error: any) {
    console.error(`Scraping job ${jobId} failed:`, error);

    // Update job status to failed
    await db
      .update(scrapingJobs)
      .set({
        status: "failed",
        errorMessage: error.message,
        errorDetails: {
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        },
        completedAt: new Date(),
      })
      .where(eq(scrapingJobs.id, jobId));

    throw error; // Re-throw to trigger BullMQ retry logic
  }
}

/**
 * Create and start the scraping worker
 */
export function startScrapingWorker(): Worker {
  const worker = new Worker<ScrapingJobData>(
    "scraping-jobs",
    async (job: Job<ScrapingJobData>) => {
      return await processScrapingJob(job);
    },
    {
      connection,
      concurrency: 1, // Process one job at a time to avoid overloading
      limiter: {
        max: 10, // Max 10 jobs per minute
        duration: 60000,
      },
    }
  );

  worker.on("completed", (job) => {
    console.log(`Worker completed job ${job.id}`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Worker failed job ${job?.id}:`, err);
  });

  worker.on("error", (err: any) => {
    if (process.env.NODE_ENV === "development" && err.code === "ECONNREFUSED") {
      // Silent - Redis not available
    } else {
      console.error("Worker error:", err.message);
    }
  });

  console.log("Scraping worker started");
  return worker;
}
