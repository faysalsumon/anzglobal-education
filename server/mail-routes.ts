import type { Express, Request, Response } from "express";
import { isAuthenticated, getAuthenticatedUserId } from "./supabase-middleware";
import {
  getAccountForRegion,
  listFolders,
  syncFolder,
  getEmailBody,
  sendEmail,
  markRead,
  moveToTrash,
  searchEmails,
} from "./mail-service";
import { db } from "./db";
import { emailCache } from "../shared/schema";
import { eq, and, desc, asc, sql, ilike, or } from "drizzle-orm";
import { storage } from "./storage";
import { z } from "zod";

// ─── Helpers ───────────────────────────────────────────────────────────────

function getRegionFromRequest(req: Request): string {
  const header = req.headers["x-anz-region"] as string;
  return (header || "AU").toUpperCase();
}

async function getAccountOrFail(req: Request, res: Response) {
  const userId = await getAuthenticatedUserId(req as any);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }

  const region = getRegionFromRequest(req);
  const account = getAccountForRegion(region);

  if (!account) {
    res.status(503).json({
      error: "Mail account not configured",
      hint: `Set ZOHO_EMAIL_${region} and ZOHO_APP_PASS_${region} environment variables`,
    });
    return null;
  }

  return { account, region };
}

// ─── Track last sync timestamps ────────────────────────────────────────────

const lastSyncTime: Record<string, number> = {};
const SYNC_STALE_MS = 2 * 60 * 1000; // 2 minutes

async function syncIfStale(account: ReturnType<typeof getAccountForRegion>, folder: string) {
  if (!account) return;
  const key = `${account.email}:${folder}`;
  const now = Date.now();
  if (!lastSyncTime[key] || now - lastSyncTime[key] > SYNC_STALE_MS) {
    lastSyncTime[key] = now;
    syncFolder(account, folder, 50).catch(() => {}); // Background, don't await
  }
}

// ─── Register all mail routes ──────────────────────────────────────────────

export function registerMailRoutes(app: Express): void {

  // GET /api/mail/folders
  app.get("/api/mail/folders", isAuthenticated, async (req: any, res) => {
    const ctx = await getAccountOrFail(req, res);
    if (!ctx) return;

    try {
      const folders = await listFolders(ctx.account);
      res.json({ folders, account: ctx.account.email, label: ctx.account.label });
    } catch (err: any) {
      console.error("[mail] listFolders error:", err.message);
      res.status(502).json({ error: "Failed to connect to mail server", detail: err.message });
    }
  });

  // GET /api/mail/messages?folder=INBOX&page=1&limit=50
  app.get("/api/mail/messages", isAuthenticated, async (req: any, res) => {
    const ctx = await getAccountOrFail(req, res);
    if (!ctx) return;

    const folder = (req.query.folder as string) || "INBOX";
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    const offset = (page - 1) * limit;

    // Trigger background sync if stale
    syncIfStale(ctx.account, folder);

    try {
      const messages = await db
        .select()
        .from(emailCache)
        .where(
          and(
            eq(emailCache.account, ctx.account.email),
            eq(emailCache.folder, folder)
          )
        )
        .orderBy(desc(emailCache.sentAt))
        .limit(limit)
        .offset(offset);

      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(emailCache)
        .where(
          and(
            eq(emailCache.account, ctx.account.email),
            eq(emailCache.folder, folder)
          )
        );

      const total = Number(totalResult[0]?.count || 0);

      res.json({ messages, total, page, limit, folder });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to load messages", detail: err.message });
    }
  });

  // GET /api/mail/messages/:uid?folder=INBOX
  app.get("/api/mail/messages/:uid", isAuthenticated, async (req: any, res) => {
    const ctx = await getAccountOrFail(req, res);
    if (!ctx) return;

    const uid = req.params.uid;
    const folder = (req.query.folder as string) || "INBOX";

    try {
      const email = await getEmailBody(ctx.account, folder, uid);
      if (!email) {
        return res.status(404).json({ error: "Email not found" });
      }

      // Mark as read in background
      markRead(ctx.account, folder, uid, true).catch(() => {});

      res.json(email);
    } catch (err: any) {
      console.error("[mail] getEmailBody error:", err.message);
      res.status(502).json({ error: "Failed to fetch email body", detail: err.message });
    }
  });

  // POST /api/mail/send
  const sendSchema = z.object({
    to: z.string().min(1),
    cc: z.string().optional(),
    bcc: z.string().optional(),
    subject: z.string().min(1),
    html: z.string().min(1),
  });

  app.post("/api/mail/send", isAuthenticated, async (req: any, res) => {
    const ctx = await getAccountOrFail(req, res);
    if (!ctx) return;

    const parsed = sendSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
    }

    try {
      await sendEmail({ account: ctx.account, ...parsed.data });
      res.json({ success: true });
    } catch (err: any) {
      console.error("[mail] sendEmail error:", err.message);
      res.status(502).json({ error: "Failed to send email", detail: err.message });
    }
  });

  // POST /api/mail/reply
  const replySchema = z.object({
    to: z.string().min(1),
    cc: z.string().optional(),
    subject: z.string().min(1),
    html: z.string().min(1),
    inReplyTo: z.string().optional(),
    references: z.string().optional(),
  });

  app.post("/api/mail/reply", isAuthenticated, async (req: any, res) => {
    const ctx = await getAccountOrFail(req, res);
    if (!ctx) return;

    const parsed = replySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
    }

    try {
      await sendEmail({ account: ctx.account, ...parsed.data });
      res.json({ success: true });
    } catch (err: any) {
      res.status(502).json({ error: "Failed to send reply", detail: err.message });
    }
  });

  // POST /api/mail/forward
  app.post("/api/mail/forward", isAuthenticated, async (req: any, res) => {
    const ctx = await getAccountOrFail(req, res);
    if (!ctx) return;

    const parsed = sendSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
    }

    try {
      await sendEmail({ account: ctx.account, ...parsed.data });
      res.json({ success: true });
    } catch (err: any) {
      res.status(502).json({ error: "Failed to forward email", detail: err.message });
    }
  });

  // PATCH /api/mail/messages/:uid/read
  app.patch("/api/mail/messages/:uid/read", isAuthenticated, async (req: any, res) => {
    const ctx = await getAccountOrFail(req, res);
    if (!ctx) return;

    const uid = req.params.uid;
    const folder = (req.query.folder as string) || "INBOX";
    const { isRead } = req.body;

    try {
      await markRead(ctx.account, folder, uid, isRead !== false);
      res.json({ success: true });
    } catch (err: any) {
      res.status(502).json({ error: "Failed to update read status", detail: err.message });
    }
  });

  // DELETE /api/mail/messages/:uid?folder=INBOX
  app.delete("/api/mail/messages/:uid", isAuthenticated, async (req: any, res) => {
    const ctx = await getAccountOrFail(req, res);
    if (!ctx) return;

    const uid = req.params.uid;
    const folder = (req.query.folder as string) || "INBOX";

    try {
      await moveToTrash(ctx.account, folder, uid);
      res.json({ success: true });
    } catch (err: any) {
      res.status(502).json({ error: "Failed to delete email", detail: err.message });
    }
  });

  // GET /api/mail/search?q=...&folder=INBOX
  app.get("/api/mail/search", isAuthenticated, async (req: any, res) => {
    const ctx = await getAccountOrFail(req, res);
    if (!ctx) return;

    const q = (req.query.q as string) || "";
    const folder = (req.query.folder as string) || "INBOX";

    if (!q.trim()) {
      return res.json({ results: [] });
    }

    try {
      const results = await searchEmails(ctx.account, folder, q.trim());
      res.json({ results });
    } catch (err: any) {
      res.status(502).json({ error: "Search failed", detail: err.message });
    }
  });

  // POST /api/mail/sync — manually trigger sync
  app.post("/api/mail/sync", isAuthenticated, async (req: any, res) => {
    const ctx = await getAccountOrFail(req, res);
    if (!ctx) return;

    const folder = (req.body.folder as string) || "INBOX";

    try {
      const count = await syncFolder(ctx.account, folder, 50);
      lastSyncTime[`${ctx.account.email}:${folder}`] = Date.now();
      res.json({ success: true, synced: count });
    } catch (err: any) {
      console.error("[mail] sync error:", err.message);
      res.status(502).json({ error: "Sync failed", detail: err.message });
    }
  });

  // GET /api/mail/config — check if mail is configured
  app.get("/api/mail/config", isAuthenticated, async (req: any, res) => {
    const region = getRegionFromRequest(req);
    const account = getAccountForRegion(region);
    res.json({
      configured: !!account,
      region,
      email: account?.email || null,
      label: account?.label || null,
    });
  });
}
