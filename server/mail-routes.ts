import type { Express, Request, Response } from "express";
import { isAuthenticated, getAuthenticatedUserId } from "./supabase-middleware";
import {
  getAccountsForUser,
  getAccountById,
  getAccountForRegion,
  getAllAccountsWithAccess,
  listFolders,
  syncFolder,
  getEmailBody,
  sendEmail,
  markRead,
  moveToTrash,
  searchEmails,
  type MailAccount,
} from "./mail-service";
import { db } from "./db";
import { emailCache, emailAccounts, emailAccountSecrets, emailAccountAccess, users } from "../shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";

// ─── Helpers ───────────────────────────────────────────────────────────────

async function getAuthUser(req: any) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) return null;

  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return user[0] || null;
}

function isSuperAdmin(user: any): boolean {
  return (
    user?.userType === "platform_admin" ||
    user?.role === "cto" ||
    user?.role === "platform_admin"
  );
}

/**
 * Resolves the mail account for the current request.
 * Priority: accountId query param → first account for user → env-var fallback.
 */
async function resolveAccount(req: any, res: Response): Promise<{ account: MailAccount; userId: string } | null> {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }

  const accountId = req.query.accountId as string | undefined;

  if (accountId) {
    // Handle env-var synthetic accounts (env-au, env-bd)
    if (accountId.startsWith("env-")) {
      const regionCode = accountId.replace("env-", "").toUpperCase();
      const envAccount = getAccountForRegion(regionCode);
      if (!envAccount) {
        res.status(503).json({ error: "No mail account configured for this region" });
        return null;
      }
      return { account: envAccount, userId };
    }

    const account = await getAccountById(accountId, userId);
    if (!account) {
      res.status(403).json({ error: "Account not found or access denied" });
      return null;
    }
    return { account, userId };
  }

  // Get user's accounts, pick first
  const accounts = await getAccountsForUser(userId);
  if (accounts.length > 0) {
    return { account: accounts[0], userId };
  }

  // Last resort: env-var fallback by region header
  const region = (req.headers["x-anz-region"] as string || "AU").toUpperCase();
  const account = getAccountForRegion(region);
  if (!account) {
    res.status(503).json({
      error: "No mail accounts configured",
      hint: "A platform admin needs to add mail accounts, or set ZOHO_EMAIL_AU/ZOHO_APP_PASS_AU environment variables",
    });
    return null;
  }

  return { account, userId };
}

// ─── Track last sync timestamps ────────────────────────────────────────────

const lastSyncTime: Record<string, number> = {};
const SYNC_STALE_MS = 2 * 60 * 1000;

async function syncIfStale(account: MailAccount, folder: string) {
  const key = `${account.email}:${folder}`;
  const now = Date.now();
  if (!lastSyncTime[key] || now - lastSyncTime[key] > SYNC_STALE_MS) {
    lastSyncTime[key] = now;
    syncFolder(account, folder, 50).catch(() => {});
  }
}

// ─── Register all mail routes ──────────────────────────────────────────────

export function registerMailRoutes(app: Express): void {

  // ── User: get my accessible accounts ──────────────────────────────────────

  app.get("/api/mail/my-accounts", isAuthenticated, async (req: any, res) => {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const dbAccounts = await getAccountsForUser(userId);

    // Also include env-var accounts if any
    const envAccounts: MailAccount[] = [];
    if (dbAccounts.length === 0) {
      const au = getAccountForRegion("AU");
      if (au) envAccounts.push(au);
      const bd = getAccountForRegion("BD");
      if (bd) envAccounts.push(bd);
    }

    const allAccounts = [...dbAccounts, ...envAccounts];
    res.json({
      accounts: allAccounts.map((a) => ({
        id: a.id,
        email: a.email,
        label: a.label,
        displayName: a.displayName,
        accountType: a.accountType,
        regionCode: a.regionCode,
        canSend: a.canSend,
      })),
    });
  });

  // ── GET /api/mail/folders ──────────────────────────────────────────────────

  app.get("/api/mail/folders", isAuthenticated, async (req: any, res) => {
    const ctx = await resolveAccount(req, res);
    if (!ctx) return;

    try {
      const folders = await listFolders(ctx.account);
      res.json({
        folders,
        account: ctx.account.email,
        accountId: ctx.account.id,
        label: ctx.account.displayName || ctx.account.label,
        canSend: ctx.account.canSend,
      });
    } catch (err: any) {
      console.error("[mail] listFolders error:", err.message);
      res.status(502).json({ error: "Failed to connect to mail server", detail: err.message });
    }
  });

  // ── GET /api/mail/messages ─────────────────────────────────────────────────

  app.get("/api/mail/messages", isAuthenticated, async (req: any, res) => {
    const ctx = await resolveAccount(req, res);
    if (!ctx) return;

    const folder = (req.query.folder as string) || "INBOX";
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    const offset = (page - 1) * limit;

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

  // ── GET /api/mail/messages/:uid ────────────────────────────────────────────

  app.get("/api/mail/messages/:uid", isAuthenticated, async (req: any, res) => {
    const ctx = await resolveAccount(req, res);
    if (!ctx) return;

    const uid = req.params.uid;
    const folder = (req.query.folder as string) || "INBOX";

    try {
      const email = await getEmailBody(ctx.account, folder, uid);
      if (!email) return res.status(404).json({ error: "Email not found" });

      markRead(ctx.account, folder, uid, true).catch(() => {});
      res.json(email);
    } catch (err: any) {
      console.error("[mail] getEmailBody error:", err.message);
      res.status(502).json({ error: "Failed to fetch email body", detail: err.message });
    }
  });

  // ── POST /api/mail/send ────────────────────────────────────────────────────

  const sendSchema = z.object({
    to: z.string().min(1),
    cc: z.string().optional(),
    bcc: z.string().optional(),
    subject: z.string().min(1),
    html: z.string().min(1),
  });

  app.post("/api/mail/send", isAuthenticated, async (req: any, res) => {
    const ctx = await resolveAccount(req, res);
    if (!ctx) return;

    if (!ctx.account.canSend) {
      return res.status(403).json({ error: "You do not have send permission for this account" });
    }

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

  // ── POST /api/mail/reply ───────────────────────────────────────────────────

  const replySchema = z.object({
    to: z.string().min(1),
    cc: z.string().optional(),
    subject: z.string().min(1),
    html: z.string().min(1),
    inReplyTo: z.string().optional(),
    references: z.string().optional(),
  });

  app.post("/api/mail/reply", isAuthenticated, async (req: any, res) => {
    const ctx = await resolveAccount(req, res);
    if (!ctx) return;

    if (!ctx.account.canSend) {
      return res.status(403).json({ error: "You do not have send permission for this account" });
    }

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

  // ── POST /api/mail/forward ─────────────────────────────────────────────────

  app.post("/api/mail/forward", isAuthenticated, async (req: any, res) => {
    const ctx = await resolveAccount(req, res);
    if (!ctx) return;

    if (!ctx.account.canSend) {
      return res.status(403).json({ error: "You do not have send permission for this account" });
    }

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

  // ── PATCH /api/mail/messages/:uid/read ────────────────────────────────────

  app.patch("/api/mail/messages/:uid/read", isAuthenticated, async (req: any, res) => {
    const ctx = await resolveAccount(req, res);
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

  // ── DELETE /api/mail/messages/:uid ────────────────────────────────────────

  app.delete("/api/mail/messages/:uid", isAuthenticated, async (req: any, res) => {
    const ctx = await resolveAccount(req, res);
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

  // ── GET /api/mail/search ───────────────────────────────────────────────────

  app.get("/api/mail/search", isAuthenticated, async (req: any, res) => {
    const ctx = await resolveAccount(req, res);
    if (!ctx) return;

    const q = (req.query.q as string) || "";
    const folder = (req.query.folder as string) || "INBOX";

    if (!q.trim()) return res.json({ results: [] });

    try {
      const results = await searchEmails(ctx.account, folder, q.trim());
      res.json({ results });
    } catch (err: any) {
      res.status(502).json({ error: "Search failed", detail: err.message });
    }
  });

  // ── POST /api/mail/sync ────────────────────────────────────────────────────

  app.post("/api/mail/sync", isAuthenticated, async (req: any, res) => {
    const ctx = await resolveAccount(req, res);
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

  // ── GET /api/mail/config ───────────────────────────────────────────────────

  app.get("/api/mail/config", isAuthenticated, async (req: any, res) => {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const dbAccounts = await getAccountsForUser(userId);
    const envAu = getAccountForRegion("AU");
    const envBd = getAccountForRegion("BD");
    const hasEnv = !!(envAu || envBd);

    const configured = dbAccounts.length > 0 || hasEnv;
    const firstAccount = dbAccounts[0] || envAu || envBd;

    res.json({
      configured,
      accountCount: configured ? (dbAccounts.length > 0 ? dbAccounts.length : (hasEnv ? [envAu, envBd].filter(Boolean).length : 0)) : 0,
      email: firstAccount?.email || null,
      label: firstAccount?.displayName || firstAccount?.label || null,
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ── Admin: Mail Account Management (CTO / platform_admin only) ────────────
  // ══════════════════════════════════════════════════════════════════════════

  // ── GET /api/mail/accounts ────────────────────────────────────────────────

  app.get("/api/mail/accounts", isAuthenticated, async (req: any, res) => {
    const user = await getAuthUser(req);
    if (!user || !isSuperAdmin(user)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    try {
      const accounts = await getAllAccountsWithAccess();
      res.json({ accounts });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to list accounts", detail: err.message });
    }
  });

  // ── POST /api/mail/accounts ────────────────────────────────────────────────

  const createAccountSchema = z.object({
    label: z.string().min(1).max(100),
    displayName: z.string().max(100).optional(),
    email: z.string().email(),
    accountType: z.enum(["personal", "group"]).default("group"),
    appPassword: z.string().min(1),
    imapHost: z.string().default("imappro.zoho.com"),
    imapPort: z.number().default(993),
    smtpHost: z.string().default("smtppro.zoho.com"),
    smtpPort: z.number().default(465),
    regionCode: z.string().max(10).optional(),
  });

  app.post("/api/mail/accounts", isAuthenticated, async (req: any, res) => {
    const user = await getAuthUser(req);
    if (!user || !isSuperAdmin(user)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    const parsed = createAccountSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
    }

    const { appPassword, ...accountData } = parsed.data;

    try {
      const [account] = await db
        .insert(emailAccounts)
        .values({
          label: accountData.label,
          displayName: accountData.displayName,
          email: accountData.email,
          accountType: accountData.accountType,
          imapHost: accountData.imapHost,
          imapPort: accountData.imapPort,
          smtpHost: accountData.smtpHost,
          smtpPort: accountData.smtpPort,
          regionCode: accountData.regionCode,
          isActive: true,
        })
        .returning();

      await db.insert(emailAccountSecrets).values({
        accountId: account.id,
        appPassword,
      });

      res.status(201).json({ account });
    } catch (err: any) {
      if (err.message?.includes("unique")) {
        return res.status(409).json({ error: "An account with this email address already exists" });
      }
      res.status(500).json({ error: "Failed to create account", detail: err.message });
    }
  });

  // ── PATCH /api/mail/accounts/:id ──────────────────────────────────────────

  const updateAccountSchema = z.object({
    label: z.string().min(1).max(100).optional(),
    displayName: z.string().max(100).optional().nullable(),
    accountType: z.enum(["personal", "group"]).optional(),
    appPassword: z.string().min(1).optional(),
    imapHost: z.string().optional(),
    imapPort: z.number().optional(),
    smtpHost: z.string().optional(),
    smtpPort: z.number().optional(),
    regionCode: z.string().max(10).optional().nullable(),
    isActive: z.boolean().optional(),
  });

  app.patch("/api/mail/accounts/:id", isAuthenticated, async (req: any, res) => {
    const user = await getAuthUser(req);
    if (!user || !isSuperAdmin(user)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    const parsed = updateAccountSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
    }

    const { appPassword, ...accountUpdates } = parsed.data;
    const accountId = req.params.id;

    try {
      if (Object.keys(accountUpdates).length > 0) {
        await db
          .update(emailAccounts)
          .set(accountUpdates)
          .where(eq(emailAccounts.id, accountId));
      }

      if (appPassword) {
        await db
          .insert(emailAccountSecrets)
          .values({ accountId, appPassword })
          .onConflictDoUpdate({
            target: [emailAccountSecrets.accountId],
            set: { appPassword, updatedAt: new Date() },
          });
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to update account", detail: err.message });
    }
  });

  // ── DELETE /api/mail/accounts/:id ─────────────────────────────────────────

  app.delete("/api/mail/accounts/:id", isAuthenticated, async (req: any, res) => {
    const user = await getAuthUser(req);
    if (!user || !isSuperAdmin(user)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    const accountId = req.params.id;

    try {
      await db.delete(emailAccounts).where(eq(emailAccounts.id, accountId));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to delete account", detail: err.message });
    }
  });

  // ── GET /api/mail/accounts/:id/access ─────────────────────────────────────

  app.get("/api/mail/accounts/:id/access", isAuthenticated, async (req: any, res) => {
    const user = await getAuthUser(req);
    if (!user || !isSuperAdmin(user)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    const accountId = req.params.id;

    try {
      const accessRows = await db
        .select({
          access: emailAccountAccess,
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            role: users.role,
          },
        })
        .from(emailAccountAccess)
        .leftJoin(users, eq(emailAccountAccess.adminUserId, users.id))
        .where(eq(emailAccountAccess.accountId, accountId));

      res.json({ access: accessRows });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to load access list", detail: err.message });
    }
  });

  // ── POST /api/mail/accounts/:id/access ────────────────────────────────────

  const grantAccessSchema = z.object({
    adminUserId: z.string().min(1),
    canSend: z.boolean().default(true),
  });

  app.post("/api/mail/accounts/:id/access", isAuthenticated, async (req: any, res) => {
    const user = await getAuthUser(req);
    if (!user || !isSuperAdmin(user)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    const parsed = grantAccessSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
    }

    const accountId = req.params.id;

    try {
      await db
        .insert(emailAccountAccess)
        .values({
          accountId,
          adminUserId: parsed.data.adminUserId,
          canSend: parsed.data.canSend,
        })
        .onConflictDoUpdate({
          target: [emailAccountAccess.accountId, emailAccountAccess.adminUserId],
          set: { canSend: parsed.data.canSend },
        });

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to grant access", detail: err.message });
    }
  });

  // ── DELETE /api/mail/accounts/:id/access/:userId ──────────────────────────

  app.delete("/api/mail/accounts/:id/access/:userId", isAuthenticated, async (req: any, res) => {
    const user = await getAuthUser(req);
    if (!user || !isSuperAdmin(user)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    const accountId = req.params.id;
    const targetUserId = req.params.userId;

    try {
      await db
        .delete(emailAccountAccess)
        .where(
          and(
            eq(emailAccountAccess.accountId, accountId),
            eq(emailAccountAccess.adminUserId, targetUserId)
          )
        );

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to revoke access", detail: err.message });
    }
  });

  // ── GET /api/mail/admin-users — for the access assignment picker ───────────

  app.get("/api/mail/admin-users", isAuthenticated, async (req: any, res) => {
    const user = await getAuthUser(req);
    if (!user || !isSuperAdmin(user)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    try {
      const adminUsers = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          role: users.role,
          userType: users.userType,
        })
        .from(users)
        .where(
          sql`${users.userType} IN ('admin', 'platform_admin') AND ${users.isActive} = true`
        )
        .orderBy(users.firstName);

      res.json({ users: adminUsers });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to list admin users", detail: err.message });
    }
  });
}
