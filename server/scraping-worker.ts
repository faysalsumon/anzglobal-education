import { Worker, Job } from "bullmq";
import { db } from "./db";
import { 
  scrapingJobs, 
  scrapedCourses, 
  scrapedInstitutions,
  discoveredCourseUrls,
  courses, 
  scrapingTemplates 
} from "../shared/schema";
import { eq } from "drizzle-orm";
import {
  scrapeWebsite,
  findCourseListingPage,
  type ScrapeResult,
} from "./web-scraper-service";
import {
  extractCourseData,
  extractCourseLinks,
  extractInstitutionData,
  type ExtractionResult,
} from "./ai-extractor-service";
import type { ScrapingJobData, ScrapingJobProgress } from "./scraping-queue";
import { getConnection } from "./scraping-queue";
import { WebsiteCrawlerService } from "./website-crawler-service";

/**
 * Sanitize numeric fields to convert string "null" to actual null
 */
function sanitizeNumeric(value: any): number | null {
  if (value === null || value === undefined || value === "null" || value === "") {
    return null;
  }
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(parsed) ? null : parsed;
}

function sanitizeInteger(value: any): number | null {
  if (value === null || value === undefined || value === "null" || value === "") {
    return null;
  }
  const parsed = typeof value === 'string' ? parseInt(value, 10) : value;
  return isNaN(parsed) ? null : parsed;
}

function sanitizeBoolean(value: any): boolean | null {
  if (value === null || value === undefined || value === "null" || value === "") {
    return null;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes') return true;
    if (lower === 'false' || lower === '0' || lower === 'no') return false;
  }
  return null;
}

/**
 * Sanitize extraction data to ensure numeric and boolean fields are properly typed
 */
function sanitizeExtractionData(data: any) {
  return {
    ...data,
    fees: sanitizeNumeric(data.fees),
    applicationFees: sanitizeNumeric(data.applicationFees),
    durationMonths: sanitizeInteger(data.durationMonths),
    durationWeeks: sanitizeInteger(data.durationWeeks),
    minimumAge: sanitizeInteger(data.minimumAge),
    scholarshipPercentageMin: sanitizeInteger(data.scholarshipPercentageMin),
    scholarshipPercentageMax: sanitizeInteger(data.scholarshipPercentageMax),
    prPathway: sanitizeBoolean(data.prPathway),
    internshipAvailable: sanitizeBoolean(data.internshipAvailable),
  };
}

/**
 * Process full website crawl (NEW MODE)
 * Discovers all course pages and extracts institution data
 */
async function processFullWebsiteCrawl(
  job: Job<ScrapingJobData>,
  jobId: string,
  institutionId: string | undefined,
  institutionUrl: string,
  institutionName: string | undefined,
  extractInstitution: boolean
): Promise<void> {
  const crawler = new WebsiteCrawlerService();

  try {
    // Step 1: Crawl entire website to discover all course pages
    await job.updateProgress({
      progress: 5,
      status: "Starting full website crawl...",
    } as ScrapingJobProgress);

    console.log(`[Full Crawl] Starting crawl of ${institutionUrl}`);
    const crawlResult = await crawler.crawlInstitutionWebsite(institutionUrl, {
      maxDepth: 3,
      maxPages: 500,
      respectRobotsTxt: true,
      includeSitemap: true,
    });

    console.log(`[Full Crawl] Discovered ${crawlResult.discoveredUrls.length} course URLs`);
    console.log(`[Full Crawl] Scanned ${crawlResult.totalPagesScanned} total pages`);

    // Step 2: Save discovered URLs to database
    await job.updateProgress({
      progress: 15,
      status: `Discovered ${crawlResult.discoveredUrls.length} course pages, saving...`,
    } as ScrapingJobProgress);

    for (const url of crawlResult.discoveredUrls) {
      await db.insert(discoveredCourseUrls).values({
        jobId,
        url,
        discoveryMethod: "website_crawl",
        isLikelyCourse: true,
        confidenceScore: 0.8, // Heuristic confidence
      });
    }

    // Step 3: Extract and save institution data if requested
    if (extractInstitution && crawlResult.institutionData) {
      await job.updateProgress({
        progress: 20,
        status: "Extracting institution data from homepage...",
      } as ScrapingJobProgress);

      console.log(`[Full Crawl] Extracting institution data from ${institutionUrl}`);
      
      try {
        // Scrape the homepage
        const homepage = await scrapeWebsite({ url: institutionUrl });
        
        // Extract institution data using AI
        const institutionExtraction = await extractInstitutionData(homepage.html, institutionUrl);

        // Save to scrapedInstitutions table
        await db.insert(scrapedInstitutions).values({
          jobId,
          sourceUrl: institutionUrl,
          confidence: institutionExtraction.confidence.toString(),
          warnings: institutionExtraction.warnings,
          ...institutionExtraction.data,
          reviewStatus: "pending",
        });

        console.log(`[Full Crawl] Institution data extracted (confidence: ${institutionExtraction.confidence})`);
      } catch (error: any) {
        console.error(`[Full Crawl] Failed to extract institution data:`, error);
        // Continue with course extraction even if institution extraction fails
      }
    }

    // Step 4: Extract data from each discovered course URL
    await job.updateProgress({
      progress: 25,
      status: `Extracting course data from ${crawlResult.discoveredUrls.length} pages...`,
    } as ScrapingJobProgress);

    await db
      .update(scrapingJobs)
      .set({
        totalPages: crawlResult.discoveredUrls.length,
        coursesFound: crawlResult.discoveredUrls.length,
      })
      .where(eq(scrapingJobs.id, jobId));

    let extractedCount = 0;
    const totalUrls = crawlResult.discoveredUrls.length;

    for (let i = 0; i < totalUrls; i++) {
      const courseUrl = crawlResult.discoveredUrls[i];
      const progress = 25 + Math.floor((i / totalUrls) * 70); // 25% to 95%

      await job.updateProgress({
        progress,
        totalPages: totalUrls,
        scrapedPages: i,
        coursesFound: totalUrls,
        coursesExtracted: extractedCount,
        currentPage: courseUrl,
        status: `Extracting course ${i + 1}/${totalUrls}...`,
      } as ScrapingJobProgress);

      try {
        // Scrape the course page
        const coursePage = await scrapeWebsite({ url: courseUrl, timeout: 20000 });

        // Extract course data using AI
        const extraction = await extractCourseData(
          coursePage.html,
          courseUrl,
          institutionName
        );

        // Save to scrapedCourses table
        const sanitized = sanitizeExtractionData(extraction.data);
        
        await db.insert(scrapedCourses).values({
          jobId,
          institutionId,
          sourceUrl: courseUrl,
          confidence: (sanitizeNumeric(extraction.confidence) ?? 0.5).toString(),
          warnings: extraction.warnings,
          ...sanitized,
          reviewStatus: "pending",
        });

        // Update discovered URL status
        await db
          .update(discoveredCourseUrls)
          .set({
            extractionStatus: "extracted",
            extractedAt: new Date(),
          })
          .where(eq(discoveredCourseUrls.url, courseUrl));

        extractedCount++;
        console.log(`[Full Crawl] Extracted ${extractedCount}/${totalUrls}: ${sanitized.title || "Unknown"}`);
      } catch (error: any) {
        console.error(`[Full Crawl] Failed to extract ${courseUrl}:`, error.message);
        
        // Mark URL as failed
        await db
          .update(discoveredCourseUrls)
          .set({
            extractionStatus: "failed",
            extractionError: error.message,
          })
          .where(eq(discoveredCourseUrls.url, courseUrl));
      }
    }

    // Step 5: Mark job as completed
    await job.updateProgress({
      progress: 100,
      status: "Completed!",
      coursesExtracted: extractedCount,
    } as ScrapingJobProgress);

    await db
      .update(scrapingJobs)
      .set({
        status: "completed",
        completedAt: new Date(),
        progress: 100,
        coursesExtracted: extractedCount,
      })
      .where(eq(scrapingJobs.id, jobId));

    console.log(`[Full Crawl] ✓ Completed! Extracted ${extractedCount}/${totalUrls} courses`);
  } catch (error: any) {
    console.error(`[Full Crawl] Fatal error:`, error);
    
    await db
      .update(scrapingJobs)
      .set({
        status: "failed",
        completedAt: new Date(),
        errorMessage: error.message,
        errorDetails: { stack: error.stack },
      })
      .where(eq(scrapingJobs.id, jobId));

    throw error;
  }
}

/**
 * Process a single scraping job (ORIGINAL MODE)
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
    const useFullWebsiteCrawl = jobDetails[0]?.useFullWebsiteCrawl || false;
    const extractInstitutionData = jobDetails[0]?.extractInstitutionData || false;
    
    // If full website crawl is enabled, use the advanced crawler
    if (useFullWebsiteCrawl) {
      console.log(`🌐 Using full website crawling mode for ${institutionUrl}`);
      await processFullWebsiteCrawl(job, jobId, institutionId, institutionUrl, institutionName, extractInstitutionData);
      return;
    }
    
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
                applicationFees: courseData.applicationFees,
                images: courseData.images,
                intakes: courseData.intakes,
                studyAreas: courseData.studyAreas,
                careerOutcomes: courseData.careerOutcomes,
                careerPath: courseData.careerPath,
                pathways: courseData.pathways,
                minimumAge: courseData.minimumAge,
                englishRequirementsStructured: courseData.englishRequirementsStructured as any,
                deliveryMode: courseData.deliveryMode,
                campusLocations: courseData.campusLocations,
                internshipAvailable: courseData.internshipAvailable,
                internshipDetails: courseData.internshipDetails,
                approvalStatus: "approved", // Auto-approved, no manual review needed
              }).returning();
              
              // Save to scraped courses table with reference to created course (sanitize numeric fields)
              await tx.insert(scrapedCourses).values({
                jobId,
                institutionId: institutionId || null,
                sourceUrl: courseUrl,
                extractedAt: new Date(extraction.extractedAt),
                confidence: (sanitizeNumeric(extraction.confidence) ?? 0.5).toString(),
                warnings: extraction.warnings,
                ...sanitizeExtractionData(extraction.data),
                reviewStatus: "approved",
                reviewedAt: new Date(),
                reviewedBy: "auto-approval-system",
                reviewNotes: `Auto-approved: High confidence (${(sanitizeNumeric(extraction.confidence) ?? 0.5).toFixed(2)})`,
                approvedCourseId: newCourse.id,
              });
              
              console.log(`✓ Auto-approved and created course: ${extraction.data.title || "Unknown"} (confidence: ${extraction.confidence.toFixed(2)}, course ID: ${newCourse.id})`);
            });
            
            extractedCount++;
          } catch (error: any) {
            console.error(`Failed to auto-approve course ${extraction.data.title}:`, error.message);
            // Fall back to pending review if auto-approval fails (sanitize numeric fields)
            await db.insert(scrapedCourses).values({
              jobId,
              institutionId: institutionId || null,
              sourceUrl: courseUrl,
              extractedAt: new Date(extraction.extractedAt),
              confidence: (sanitizeNumeric(extraction.confidence) ?? 0.5).toString(),
              warnings: [...extraction.warnings, `Auto-approval failed: ${error.message}`],
              ...sanitizeExtractionData(extraction.data),
              reviewStatus: "pending",
            });
            extractedCount++;
            console.log(`Fell back to pending review for: ${extraction.data.title || "Unknown"}`);
          }
        } else {
          // Manual review required: Save to scraped courses table only (sanitize numeric fields)
          await db.insert(scrapedCourses).values({
            jobId,
            institutionId: institutionId || null,
            sourceUrl: courseUrl,
            extractedAt: new Date(extraction.extractedAt),
            confidence: (sanitizeNumeric(extraction.confidence) ?? 0.5).toString(),
            warnings: extraction.warnings,
            ...sanitizeExtractionData(extraction.data),
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
 * Only call this after Redis availability has been confirmed
 */
export function startScrapingWorker(): Worker | null {
  const connection = getConnection();
  
  if (!connection) {
    console.warn("Cannot start scraping worker: Redis connection not available");
    return null;
  }
  
  const worker = new Worker<ScrapingJobData>(
    "scraping-jobs",
    async (job: Job<ScrapingJobData>) => {
      return await processScrapingJob(job);
    },
    {
      connection,
      concurrency: 1,
      limiter: {
        max: 10,
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
    // Only log non-Redis errors (Redis availability already confirmed at startup)
    if (err.code !== "ECONNREFUSED" && !err.message?.includes("Connection is closed")) {
      console.error("Worker error:", err.message);
    }
  });

  return worker;
}
