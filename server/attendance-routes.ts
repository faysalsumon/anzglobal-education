import type { Express } from "express";
import multer from "multer";
import { db } from "./db";
import { isAuthenticated } from "./supabase-middleware";
import { checkAdminAccess } from "./routes";
import {
  attendanceRecords,
  users,
  branches,
  type AttendanceRecord,
} from "@shared/schema";
import { eq, and, isNull, isNotNull, gte, lte, desc, count, sum, sql } from "drizzle-orm";

function getClientIp(req: any): string | null {
  const forwarded = req.headers["x-forwarded-for"] as string | undefined;
  const ip = forwarded?.split(",")[0]?.trim() || req.ip || null;
  return ip || null;
}

async function geolocateIp(ip: string | null): Promise<string | null> {
  if (!ip) return null;
  // Skip private/loopback IPs — no meaningful geo result
  if (ip === "::1" || ip.startsWith("127.") || ip.startsWith("10.") ||
      ip.startsWith("192.168.") || ip.startsWith("::ffff:127.") || ip.startsWith("172.")) {
    return "Local Network";
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch(`http://ip-api.com/json/${ip}?fields=status,city,regionName,country`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) return null;
    const data = await resp.json() as { status: string; city?: string; regionName?: string; country?: string };
    if (data.status !== "success") return null;
    const parts = [data.city, data.regionName, data.country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  } catch {
    return null;
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

async function uploadPhotoToStorage(
  buffer: Buffer,
  userId: string,
  suffix: string
): Promise<string> {
  const filename = `${Date.now()}-${suffix}.jpg`;
  const objectPath = `attendance-photos/${userId}/${filename}`;
  const { Client } = await import("@replit/object-storage");
  const client = new Client();
  const uploadResult = await client.uploadFromBytes(objectPath, buffer, {
    contentType: "image/jpeg",
  });
  if (!uploadResult.ok) {
    console.error("[Attendance] Photo upload failed:", uploadResult.error);
    throw new Error("Failed to upload attendance photo to storage");
  }
  console.log("[Attendance] Photo uploaded:", objectPath);
  return objectPath;
}

async function deletePhotoFromStorage(objectPath: string): Promise<void> {
  try {
    const { Client } = await import("@replit/object-storage");
    const client = new Client();
    await client.delete(objectPath);
  } catch {
    // Ignore deletion errors — file may already be gone
  }
}

function formatWorkDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function registerAttendanceRoutes(app: Express) {
  // GET /api/attendance/status — current user's open record
  app.get("/api/attendance/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const adminAccess = await checkAdminAccess(userId);
      if (!adminAccess) return res.status(403).json({ message: "Admin access required" });

      const [record] = await db
        .select()
        .from(attendanceRecords)
        .where(and(eq(attendanceRecords.userId, userId), isNull(attendanceRecords.clockOutAt)))
        .orderBy(desc(attendanceRecords.clockInAt))
        .limit(1);

      res.json({ record: record ?? null, clockedIn: !!record });
    } catch (err) {
      console.error("[Attendance] GET /status error:", err);
      res.status(500).json({ message: "Failed to get attendance status" });
    }
  });

  // POST /api/attendance/clock-in
  app.post(
    "/api/attendance/clock-in",
    isAuthenticated,
    upload.single("photo"),
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const adminAccess = await checkAdminAccess(userId);
        if (!adminAccess) return res.status(403).json({ message: "Admin access required" });

        if (!req.file) return res.status(400).json({ message: "Photo is required" });

        // Check for open record
        const [existing] = await db
          .select()
          .from(attendanceRecords)
          .where(and(eq(attendanceRecords.userId, userId), isNull(attendanceRecords.clockOutAt)))
          .limit(1);

        if (existing) {
          return res.status(409).json({ message: "Already clocked in. Please clock out first." });
        }

        // Get user's branchId for snapshot
        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        const branchId = user?.branchId ?? null;

        // Capture IP
        const ipAddress = getClientIp(req);

        // Upload photo
        const photoPath = await uploadPhotoToStorage(req.file.buffer, userId, "in");

        const now = new Date();
        const [record] = await db
          .insert(attendanceRecords)
          .values({
            userId,
            branchId,
            clockInAt: now,
            clockInPhotoPath: photoPath,
            workDate: formatWorkDate(now),
            ipAddress,
          })
          .returning();

        res.json({ record });

        // Fire geo lookup after responding — best-effort, non-blocking
        if (ipAddress && record?.id) {
          geolocateIp(ipAddress).then((location) => {
            if (location) {
              db.update(attendanceRecords)
                .set({ location })
                .where(eq(attendanceRecords.id, record.id))
                .catch((err) => console.error("[Attendance] Geo update error:", err));
            }
          }).catch(() => null);
        }
      } catch (err) {
        console.error("[Attendance] POST /clock-in error:", err);
        res.status(500).json({ message: "Failed to clock in" });
      }
    }
  );

  // POST /api/attendance/clock-out
  app.post(
    "/api/attendance/clock-out",
    isAuthenticated,
    upload.single("photo"),
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const adminAccess = await checkAdminAccess(userId);
        if (!adminAccess) return res.status(403).json({ message: "Admin access required" });

        if (!req.file) return res.status(400).json({ message: "Photo is required" });

        const [openRecord] = await db
          .select()
          .from(attendanceRecords)
          .where(and(eq(attendanceRecords.userId, userId), isNull(attendanceRecords.clockOutAt)))
          .orderBy(desc(attendanceRecords.clockInAt))
          .limit(1);

        if (!openRecord) {
          return res.status(404).json({ message: "No active clock-in found" });
        }

        const photoPath = await uploadPhotoToStorage(req.file.buffer, userId, "out");
        const now = new Date();
        const totalMinutes = Math.round((now.getTime() - openRecord.clockInAt.getTime()) / 60000);

        const [updated] = await db
          .update(attendanceRecords)
          .set({ clockOutAt: now, clockOutPhotoPath: photoPath, totalMinutes })
          .where(eq(attendanceRecords.id, openRecord.id))
          .returning();

        res.json({ record: updated });
      } catch (err) {
        console.error("[Attendance] POST /clock-out error:", err);
        res.status(500).json({ message: "Failed to clock out" });
      }
    }
  );

  // GET /api/public-storage/attendance-photos/:userId/:filename — proxy serve photos
  app.get("/api/public-storage/attendance-photos/:userId/:filename", async (req, res) => {
    try {
      const { userId, filename } = req.params;
      const objectPath = `attendance-photos/${userId}/${filename}`;
      const { Client } = await import("@replit/object-storage");
      const client = new Client();
      const result = await client.downloadAsBytes(objectPath);
      if (!result.ok) {
        console.warn("[Attendance] Photo not found in storage:", objectPath);
        return res.status(404).json({ message: "Photo not found" });
      }
      // Google Cloud Storage SDK returns [Buffer] (array), not a raw Buffer
      const imgBuffer = Array.isArray(result.value) ? result.value[0] : result.value;
      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.end(imgBuffer);
    } catch (err) {
      console.error("[Attendance] Photo proxy error:", err);
      res.status(404).json({ message: "Photo not found" });
    }
  });

  // GET /api/admin/attendance — list records with RBAC scoping
  app.get("/api/admin/attendance", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const adminAccess = await checkAdminAccess(userId);
      if (!adminAccess) return res.status(403).json({ message: "Admin access required" });

      const { branchId, userId: filterUserId, dateFrom, dateTo, page = "1", limit = "20" } = req.query;
      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = Math.min(parseInt(limit as string, 10) || 20, 100);
      const offset = (pageNum - 1) * limitNum;

      // Determine RBAC scope
      const isFullAdmin = adminAccess.userType === "platform_admin" || adminAccess.role === "cto";
      const [requestingUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const scopedBranchId = isFullAdmin ? (branchId as string | undefined) : (requestingUser?.branchId ?? undefined);
      const scopedUserId = isFullAdmin || scopedBranchId ? (filterUserId as string | undefined) : userId;

      const conditions: any[] = [];
      if (scopedUserId) conditions.push(eq(attendanceRecords.userId, scopedUserId));
      if (scopedBranchId) conditions.push(eq(attendanceRecords.branchId, scopedBranchId));
      if (dateFrom) conditions.push(gte(attendanceRecords.workDate, dateFrom as string));
      if (dateTo) conditions.push(lte(attendanceRecords.workDate, dateTo as string));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [records, [{ total }]] = await Promise.all([
        db
          .select({
            id: attendanceRecords.id,
            userId: attendanceRecords.userId,
            branchId: attendanceRecords.branchId,
            clockInAt: attendanceRecords.clockInAt,
            clockInPhotoPath: attendanceRecords.clockInPhotoPath,
            clockOutAt: attendanceRecords.clockOutAt,
            clockOutPhotoPath: attendanceRecords.clockOutPhotoPath,
            totalMinutes: attendanceRecords.totalMinutes,
            workDate: attendanceRecords.workDate,
            notes: attendanceRecords.notes,
            ipAddress: attendanceRecords.ipAddress,
            location: attendanceRecords.location,
            createdAt: attendanceRecords.createdAt,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            profileImageUrl: users.profileImageUrl,
            userBranchId: users.branchId,
            branchName: branches.name,
          })
          .from(attendanceRecords)
          .innerJoin(users, eq(attendanceRecords.userId, users.id))
          .leftJoin(branches, eq(attendanceRecords.branchId, branches.id))
          .where(whereClause)
          .orderBy(desc(attendanceRecords.clockInAt))
          .limit(limitNum)
          .offset(offset),
        db
          .select({ total: count() })
          .from(attendanceRecords)
          .where(whereClause),
      ]);

      res.json({
        records,
        total: total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      });
    } catch (err) {
      console.error("[Attendance] GET /admin/attendance error:", err);
      res.status(500).json({ message: "Failed to fetch attendance records" });
    }
  });

  // GET /api/admin/attendance/stats
  app.get("/api/admin/attendance/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const adminAccess = await checkAdminAccess(userId);
      if (!adminAccess) return res.status(403).json({ message: "Admin access required" });

      const { branchId, userId: filterUserId, dateFrom, dateTo } = req.query;
      const isFullAdmin = adminAccess.userType === "platform_admin" || adminAccess.role === "cto";
      const [requestingUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const scopedBranchId = isFullAdmin ? (branchId as string | undefined) : (requestingUser?.branchId ?? undefined);
      const scopedUserId = isFullAdmin || scopedBranchId ? (filterUserId as string | undefined) : userId;

      const conditions: any[] = [];
      if (scopedUserId) conditions.push(eq(attendanceRecords.userId, scopedUserId));
      if (scopedBranchId) conditions.push(eq(attendanceRecords.branchId, scopedBranchId));
      if (dateFrom) conditions.push(gte(attendanceRecords.workDate, dateFrom as string));
      if (dateTo) conditions.push(lte(attendanceRecords.workDate, dateTo as string));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const today = formatWorkDate(new Date());
      const activeTodayConditions = [...conditions, eq(attendanceRecords.workDate, today), isNull(attendanceRecords.clockOutAt)];

      const [[stats], [{ activeTodayCount }]] = await Promise.all([
        db
          .select({
            totalShifts: count(),
            totalMinutes: sum(attendanceRecords.totalMinutes),
          })
          .from(attendanceRecords)
          .where(whereClause),
        db
          .select({ activeTodayCount: count() })
          .from(attendanceRecords)
          .where(and(...activeTodayConditions)),
      ]);

      const totalShifts = stats.totalShifts || 0;
      const totalMinutes = Number(stats.totalMinutes || 0);

      // Get distinct work dates for avg calculation
      const [{ distinctDays }] = await db
        .select({ distinctDays: sql<number>`count(distinct ${attendanceRecords.workDate})` })
        .from(attendanceRecords)
        .where(whereClause);

      const avgMinutesPerDay = distinctDays > 0 ? Math.round(totalMinutes / Number(distinctDays)) : 0;

      res.json({ totalShifts, totalMinutes, avgMinutesPerDay, activeTodayCount });
    } catch (err) {
      console.error("[Attendance] GET /admin/attendance/stats error:", err);
      res.status(500).json({ message: "Failed to fetch attendance stats" });
    }
  });

  // POST /api/admin/attendance/cleanup — delete records + photos older than 90 days (CTO only)
  app.post("/api/admin/attendance/cleanup", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const adminAccess = await checkAdminAccess(userId, ["cto"]);
      if (!adminAccess) return res.status(403).json({ message: "CTO access required for cleanup" });

      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const oldRecords = await db
        .select({ id: attendanceRecords.id, clockInPhotoPath: attendanceRecords.clockInPhotoPath, clockOutPhotoPath: attendanceRecords.clockOutPhotoPath })
        .from(attendanceRecords)
        .where(lte(attendanceRecords.clockInAt, ninetyDaysAgo));

      let deletedPhotos = 0;
      for (const record of oldRecords) {
        await deletePhotoFromStorage(record.clockInPhotoPath);
        deletedPhotos++;
        if (record.clockOutPhotoPath) {
          await deletePhotoFromStorage(record.clockOutPhotoPath);
          deletedPhotos++;
        }
      }

      if (oldRecords.length > 0) {
        await db
          .delete(attendanceRecords)
          .where(lte(attendanceRecords.clockInAt, ninetyDaysAgo));
      }

      res.json({ deletedRecords: oldRecords.length, deletedPhotos });
    } catch (err) {
      console.error("[Attendance] POST /cleanup error:", err);
      res.status(500).json({ message: "Failed to run cleanup" });
    }
  });
}
