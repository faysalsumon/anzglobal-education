import { Worker, Job } from "bullmq";
import { db } from "./db";
import { scrapingJobs, scrapedCourses } from "../shared/schema";
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
  const { jobId, institutionId, institutionUrl, institutionName, useBrowser } = job.data;

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

    // Step 1: Find course listing page
    await job.updateProgress({
      progress: 10,
      status: "Finding course listing page...",
    } as ScrapingJobProgress);

    let courseListingUrl = institutionUrl;
    const foundListingPage = await findCourseListingPage(institutionUrl);
    if (foundListingPage) {
      courseListingUrl = foundListingPage;
      console.log(`Found course listing page: ${courseListingUrl}`);
    }

    // Step 2: Scrape course listing page
    await job.updateProgress({
      progress: 20,
      status: "Scraping course listing...",
    } as ScrapingJobProgress);

    const listingPage = await scrapeWebsite({
      url: courseListingUrl,
      useBrowser: useBrowser || false,
    });

    // Step 3: Extract course page URLs using AI
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

    // Step 4: Scrape and extract each course
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
          useBrowser: useBrowser || false,
          timeout: 20000,
        });
        scrapedCount++;

        // Extract course data using AI
        const extraction = await extractCourseData(
          coursePage.html,
          courseUrl,
          institutionName
        );

        // Save to scraped courses table
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
        console.log(`Extracted course: ${extraction.data.title || "Unknown"}`);
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
