import { Worker, Job } from "bullmq";
import { db } from "./db";
import { courses } from "../shared/schema";
import { eq } from "drizzle-orm";
import { getConnection, isRedisAvailable } from "./scraping-queue";
import { generateCourseThumbnail } from "./ai";
import type { ThumbnailJobData, ThumbnailJobProgress } from "./thumbnail-queue";

async function processThumbnailJob(job: Job<ThumbnailJobData>): Promise<void> {
  const { courseId, courseTitle, discipline, level, universityName } = job.data;
  
  console.log(`[Thumbnail Worker] Processing job ${job.id} for course: ${courseTitle}`);
  
  try {
    await job.updateProgress({
      status: "generating",
      progress: 10,
      message: "Generating thumbnail with AI...",
    } as ThumbnailJobProgress);
    
    await db
      .update(courses)
      .set({ thumbnailStatus: "generating" })
      .where(eq(courses.id, courseId));
    
    const result = await generateCourseThumbnail(
      courseTitle,
      discipline,
      level,
      universityName
    );
    
    if (!result.success || !result.url) {
      throw new Error(result.error || "Failed to generate thumbnail - no URL returned");
    }
    
    await job.updateProgress({
      status: "completed",
      progress: 100,
      message: "Thumbnail generated successfully",
    } as ThumbnailJobProgress);
    
    await db
      .update(courses)
      .set({
        thumbnailUrl: result.url,
        thumbnailStatus: "completed",
        thumbnailGeneratedAt: new Date(),
      })
      .where(eq(courses.id, courseId));
    
    console.log(`[Thumbnail Worker] Successfully generated thumbnail for course ${courseId}`);
  } catch (error) {
    console.error(`[Thumbnail Worker] Error processing job ${job.id}:`, error);
    
    await db
      .update(courses)
      .set({ thumbnailStatus: "failed" })
      .where(eq(courses.id, courseId));
    
    throw error;
  }
}

export function startThumbnailWorker(): Worker<ThumbnailJobData> | null {
  if (!isRedisAvailable()) {
    console.warn("[Thumbnail Worker] Cannot start: Redis not available");
    return null;
  }
  
  const connection = getConnection();
  if (!connection) {
    console.warn("[Thumbnail Worker] Cannot start: No Redis connection");
    return null;
  }
  
  const worker = new Worker<ThumbnailJobData>(
    "thumbnail-generation",
    async (job: Job<ThumbnailJobData>) => {
      return await processThumbnailJob(job);
    },
    {
      connection: connection as any,
      concurrency: 2,
      limiter: {
        max: 10,
        duration: 60000,
      },
    }
  );
  
  worker.on("completed", (job) => {
    console.log(`[Thumbnail Worker] Completed job ${job.id}`);
  });
  
  worker.on("failed", (job, err) => {
    console.error(`[Thumbnail Worker] Failed job ${job?.id}:`, err.message);
  });
  
  worker.on("error", (err: any) => {
    if (!err.message?.includes("ECONNREFUSED")) {
      console.error("[Thumbnail Worker] Error:", err.message);
    }
  });
  
  console.log("[Thumbnail Worker] Started successfully");
  return worker;
}
