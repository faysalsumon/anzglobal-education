import { Queue, Worker, Job } from "bullmq";
import Redis from "ioredis";

/**
 * Redis connection for BullMQ
 * Uses environment variables for configuration
 */
const connection = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: null, // Required for BullMQ
  retryStrategy: () => null, // Don't retry in dev (suppress errors)
  lazyConnect: true, // Don't connect immediately
});

// Suppress Redis connection errors in development
connection.on("error", (err: any) => {
  if (process.env.NODE_ENV === "development" && err.code === "ECONNREFUSED") {
    // Silent - Redis not available in dev, use direct scraping instead
  } else {
    console.error("Redis connection error:", err.message);
  }
});

/**
 * Job data for scraping an institution
 */
export interface ScrapingJobData {
  jobId: string; // Database job ID
  institutionId?: string; // Institution ID (if exists)
  institutionUrl: string;
  institutionName?: string;
  templateId?: string; // Scraping template ID (drives browser settings)
}

/**
 * Job progress update data
 */
export interface ScrapingJobProgress {
  progress: number; // 0-100
  totalPages: number;
  scrapedPages: number;
  coursesFound: number;
  coursesExtracted: number;
  currentPage?: string;
  status: string;
}

/**
 * Queue for scraping jobs
 */
export const scrapingQueue = new Queue<ScrapingJobData>("scraping-jobs", {
  connection,
  defaultJobOptions: {
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 7 * 24 * 3600, // Keep for 7 days
    },
    removeOnFail: {
      count: 50, // Keep last 50 failed jobs for debugging
    },
    attempts: 3, // Retry failed jobs up to 3 times
    backoff: {
      type: "exponential",
      delay: 5000, // Start with 5 second delay, then exponentially increase
    },
  },
});

/**
 * Add a new scraping job to the queue
 */
export async function addScrapingJob(data: ScrapingJobData): Promise<Job<ScrapingJobData>> {
  return await scrapingQueue.add("scrape-institution", data, {
    jobId: data.jobId, // Use database job ID as queue job ID for tracking
  });
}

/**
 * Get job status from queue
 */
export async function getJobStatus(jobId: string): Promise<any> {
  const job = await scrapingQueue.getJob(jobId);
  if (!job) return null;

  const state = await job.getState();
  const progress = job.progress;

  return {
    id: job.id,
    state,
    progress,
    attemptsMade: job.attemptsMade,
    failedReason: job.failedReason,
    finishedOn: job.finishedOn,
    processedOn: job.processedOn,
  };
}

/**
 * Cancel a running job
 */
export async function cancelJob(jobId: string): Promise<boolean> {
  const job = await scrapingQueue.getJob(jobId);
  if (!job) return false;

  try {
    await job.remove();
    return true;
  } catch (error) {
    console.error("Failed to cancel job:", error);
    return false;
  }
}

/**
 * Get all active jobs
 */
export async function getActiveJobs(): Promise<any[]> {
  const jobs = await scrapingQueue.getActive();
  return Promise.all(
    jobs.map(async (job) => ({
      id: job.id,
      data: job.data,
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      processedOn: job.processedOn,
    }))
  );
}

/**
 * Get all waiting jobs
 */
export async function getWaitingJobs(): Promise<any[]> {
  const jobs = await scrapingQueue.getWaiting();
  return jobs.map((job) => ({
    id: job.id,
    data: job.data,
  }));
}

/**
 * Clean up old jobs
 */
export async function cleanOldJobs(): Promise<void> {
  await scrapingQueue.clean(7 * 24 * 3600 * 1000, 100, "completed");
  await scrapingQueue.clean(14 * 24 * 3600 * 1000, 50, "failed");
}
