import { Queue } from "bullmq";
import { getConnection, isRedisAvailable } from "./scraping-queue";

export interface ThumbnailJobData {
  courseId: string;
  courseTitle: string;
  discipline?: string;
  level?: string;
  universityName?: string;
}

export interface ThumbnailJobProgress {
  status: "pending" | "generating" | "uploading" | "completed" | "failed";
  progress: number;
  message?: string;
}

let thumbnailQueueInstance: Queue<ThumbnailJobData> | null = null;

export function getThumbnailQueue(): Queue<ThumbnailJobData> | null {
  if (!isRedisAvailable()) {
    return null;
  }
  
  if (!thumbnailQueueInstance) {
    const connection = getConnection();
    if (!connection) return null;
    
    thumbnailQueueInstance = new Queue<ThumbnailJobData>("thumbnail-generation", {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });
  }
  
  return thumbnailQueueInstance;
}

export async function addThumbnailJob(data: ThumbnailJobData): Promise<string | null> {
  const queue = getThumbnailQueue();
  
  if (!queue) {
    console.warn("[Thumbnail] Redis not available, cannot queue job");
    return null;
  }
  
  try {
    const job = await queue.add(`thumbnail-${data.courseId}`, data, {
      priority: 10,
    });
    console.log(`[Thumbnail] Queued job ${job.id} for course ${data.courseId}`);
    return job.id || null;
  } catch (error) {
    console.error("[Thumbnail] Failed to queue job:", error);
    return null;
  }
}

export async function addBulkThumbnailJobs(courses: ThumbnailJobData[]): Promise<number> {
  const queue = getThumbnailQueue();
  
  if (!queue) {
    console.warn("[Thumbnail] Redis not available, cannot queue bulk jobs");
    return 0;
  }
  
  try {
    const jobs = courses.map((course) => ({
      name: `thumbnail-${course.courseId}`,
      data: course,
      opts: { priority: 10 },
    }));
    
    await queue.addBulk(jobs);
    console.log(`[Thumbnail] Queued ${courses.length} thumbnail jobs`);
    return courses.length;
  } catch (error) {
    console.error("[Thumbnail] Failed to queue bulk jobs:", error);
    return 0;
  }
}
