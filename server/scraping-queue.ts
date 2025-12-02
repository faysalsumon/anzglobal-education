import { Queue, Job } from "bullmq";
import Redis from "ioredis";

/**
 * Track Redis availability
 */
let redisAvailable = false;
let scrapingQueueInstance: Queue<ScrapingJobData> | null = null;
let connectionInstance: Redis | null = null;

/**
 * Job data for scraping an institution
 */
export interface ScrapingJobData {
  jobId: string;
  institutionId?: string;
  institutionUrl: string;
  institutionName?: string;
  templateId?: string;
}

/**
 * Job progress update data
 */
export interface ScrapingJobProgress {
  progress: number;
  totalPages: number;
  scrapedPages: number;
  coursesFound: number;
  coursesExtracted: number;
  currentPage?: string;
  status: string;
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return redisAvailable;
}

/**
 * Get the Redis connection (creates if needed, only when Redis is available)
 */
export function getConnection(): Redis | null {
  return connectionInstance;
}

/**
 * Check Redis availability by attempting to connect
 * Only creates connection if Redis is actually available
 */
export async function checkRedisAvailability(): Promise<boolean> {
  if (redisAvailable && connectionInstance) {
    return true;
  }

  return new Promise((resolve) => {
    const testConnection = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      maxRetriesPerRequest: null,
      retryStrategy: () => null,
      lazyConnect: true,
      connectTimeout: 1500,
      enableOfflineQueue: false,
    });

    // Suppress all errors during check
    testConnection.on("error", () => {});

    const timeout = setTimeout(() => {
      testConnection.disconnect();
      redisAvailable = false;
      resolve(false);
    }, 2000);

    testConnection.connect()
      .then(() => testConnection.ping())
      .then(() => {
        clearTimeout(timeout);
        // Redis is available - keep this connection
        connectionInstance = testConnection;
        redisAvailable = true;
        
        // Now create the queue
        scrapingQueueInstance = new Queue<ScrapingJobData>("scraping-jobs", {
          connection: connectionInstance,
          defaultJobOptions: {
            removeOnComplete: { count: 100, age: 7 * 24 * 3600 },
            removeOnFail: { count: 50 },
            attempts: 3,
            backoff: { type: "exponential", delay: 5000 },
          },
        });
        
        resolve(true);
      })
      .catch(() => {
        clearTimeout(timeout);
        testConnection.disconnect();
        redisAvailable = false;
        resolve(false);
      });
  });
}

/**
 * Get the scraping queue (only available if Redis is connected)
 */
export function getScrapingQueue(): Queue<ScrapingJobData> | null {
  return scrapingQueueInstance;
}

/**
 * Add a new scraping job to the queue
 */
export async function addScrapingJob(data: ScrapingJobData): Promise<Job<ScrapingJobData> | null> {
  if (!scrapingQueueInstance) {
    console.warn("Cannot add scraping job: Redis not available");
    return null;
  }
  return await scrapingQueueInstance.add("scrape-institution", data, {
    jobId: data.jobId,
  });
}

/**
 * Get job status from queue
 */
export async function getJobStatus(jobId: string): Promise<any> {
  if (!scrapingQueueInstance) return null;
  
  const job = await scrapingQueueInstance.getJob(jobId);
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
  if (!scrapingQueueInstance) return false;
  
  const job = await scrapingQueueInstance.getJob(jobId);
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
  if (!scrapingQueueInstance) return [];
  
  const jobs = await scrapingQueueInstance.getActive();
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
  if (!scrapingQueueInstance) return [];
  
  const jobs = await scrapingQueueInstance.getWaiting();
  return jobs.map((job) => ({
    id: job.id,
    data: job.data,
  }));
}

/**
 * Clean up old jobs
 */
export async function cleanOldJobs(): Promise<void> {
  if (!scrapingQueueInstance) return;
  
  await scrapingQueueInstance.clean(7 * 24 * 3600 * 1000, 100, "completed");
  await scrapingQueueInstance.clean(14 * 24 * 3600 * 1000, 50, "failed");
}

// Legacy export for backwards compatibility (will be null if Redis not available)
export const scrapingQueue = {
  get instance() {
    return scrapingQueueInstance;
  }
};
