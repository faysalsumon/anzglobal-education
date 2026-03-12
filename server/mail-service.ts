import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";
import sanitizeHtml from "sanitize-html";
import { simpleParser } from "mailparser";
import { db } from "./db";
import { emailCache, emailBodyCache, emailAccounts, emailAccountSecrets, emailAccountAccess } from "../shared/schema";
import { eq, and, desc, inArray, sql } from "drizzle-orm";

// ─── Account types ─────────────────────────────────────────────────────────

export interface MailAccount {
  id: string;
  email: string;
  password: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  label: string;
  displayName?: string;
  accountType: string;
  regionCode?: string | null;
  canSend: boolean;
}

// ─── Account resolution ────────────────────────────────────────────────────

/**
 * Get all mail accounts a given user has access to.
 * Returns DB-configured accounts first; falls back to env-var accounts if none configured.
 */
export async function getAccountsForUser(userId: string): Promise<MailAccount[]> {
  const rows = await db
    .select({
      account: emailAccounts,
      secret: emailAccountSecrets,
      access: emailAccountAccess,
    })
    .from(emailAccountAccess)
    .innerJoin(emailAccounts, eq(emailAccountAccess.accountId, emailAccounts.id))
    .innerJoin(emailAccountSecrets, eq(emailAccountSecrets.accountId, emailAccounts.id))
    .where(
      and(
        eq(emailAccountAccess.adminUserId, userId),
        eq(emailAccounts.isActive, true)
      )
    );

  if (rows.length > 0) {
    return rows.map((r) => ({
      id: r.account.id,
      email: r.account.email,
      password: r.secret.appPassword,
      imapHost: r.account.imapHost,
      imapPort: r.account.imapPort,
      smtpHost: r.account.smtpHost,
      smtpPort: r.account.smtpPort,
      label: r.account.label,
      displayName: r.account.displayName || undefined,
      accountType: r.account.accountType,
      regionCode: r.account.regionCode,
      canSend: r.access.canSend,
    }));
  }

  // Fallback: env-var accounts
  return getEnvVarAccounts();
}

/**
 * Get a single specific account by ID, verifying the user has access.
 */
export async function getAccountById(accountId: string, userId: string): Promise<MailAccount | null> {
  // Check if it's a DB account
  const rows = await db
    .select({
      account: emailAccounts,
      secret: emailAccountSecrets,
      access: emailAccountAccess,
    })
    .from(emailAccountAccess)
    .innerJoin(emailAccounts, eq(emailAccountAccess.accountId, emailAccounts.id))
    .innerJoin(emailAccountSecrets, eq(emailAccountSecrets.accountId, emailAccounts.id))
    .where(
      and(
        eq(emailAccountAccess.adminUserId, userId),
        eq(emailAccounts.id, accountId),
        eq(emailAccounts.isActive, true)
      )
    )
    .limit(1);

  if (rows.length > 0) {
    const r = rows[0];
    return {
      id: r.account.id,
      email: r.account.email,
      password: r.secret.appPassword,
      imapHost: r.account.imapHost,
      imapPort: r.account.imapPort,
      smtpHost: r.account.smtpHost,
      smtpPort: r.account.smtpPort,
      label: r.account.label,
      displayName: r.account.displayName || undefined,
      accountType: r.account.accountType,
      regionCode: r.account.regionCode,
      canSend: r.access.canSend,
    };
  }

  return null;
}

/**
 * Legacy: env-var based account resolution by region code.
 * Kept as fallback when no DB accounts are configured.
 */
export function getAccountForRegion(regionCode?: string | null): MailAccount | null {
  const region = (regionCode || "AU").toUpperCase();

  if (region === "BD") {
    const email = process.env.ZOHO_EMAIL_BD;
    const password = process.env.ZOHO_APP_PASS_BD;
    if (!email || !password) return null;
    return {
      id: "env-bd",
      email,
      password,
      imapHost: "imap.zoho.com",
      imapPort: 993,
      smtpHost: "smtp.zoho.com",
      smtpPort: 465,
      label: "ANZ Bangladesh",
      accountType: "group",
      regionCode: "BD",
      canSend: true,
    };
  }

  const email = process.env.ZOHO_EMAIL_AU;
  const password = process.env.ZOHO_APP_PASS_AU;
  if (!email || !password) return null;
  return {
    id: "env-au",
    email,
    password,
    imapHost: "imap.zoho.com",
    imapPort: 993,
    smtpHost: "smtp.zoho.com",
    smtpPort: 465,
    label: "ANZ Australia",
    accountType: "group",
    regionCode: "AU",
    canSend: true,
  };
}

function getEnvVarAccounts(): MailAccount[] {
  const accounts: MailAccount[] = [];
  const au = getAccountForRegion("AU");
  if (au) accounts.push(au);
  const bd = getAccountForRegion("BD");
  if (bd) accounts.push(bd);
  return accounts;
}

// ─── Admin: list all accounts (for management panel) ──────────────────────

export async function getAllAccountsWithAccess(): Promise<{
  account: typeof emailAccounts.$inferSelect;
  hasSecret: boolean;
  accessCount: number;
}[]> {
  const accounts = await db
    .select()
    .from(emailAccounts)
    .orderBy(emailAccounts.createdAt);

  const results = await Promise.all(
    accounts.map(async (acc) => {
      const secret = await db
        .select({ id: emailAccountSecrets.id })
        .from(emailAccountSecrets)
        .where(eq(emailAccountSecrets.accountId, acc.id))
        .limit(1);

      const access = await db
        .select({ id: emailAccountAccess.id })
        .from(emailAccountAccess)
        .where(eq(emailAccountAccess.accountId, acc.id));

      return {
        account: acc,
        hasSecret: secret.length > 0,
        accessCount: access.length,
      };
    })
  );

  return results;
}

// ─── IMAP client factory ───────────────────────────────────────────────────

function createImapClient(account: MailAccount): ImapFlow {
  const client = new ImapFlow({
    host: account.imapHost,
    port: account.imapPort,
    secure: true,
    auth: { user: account.email, pass: account.password },
    logger: false,
    tls: { rejectUnauthorized: false },
  });
  client.on("error", (err: any) => {
    console.warn(`[mail] IMAP client error for ${account.email}:`, err?.message || err);
  });
  return client;
}

// ─── Folder listing ────────────────────────────────────────────────────────

export interface MailFolder {
  name: string;
  path: string;
  specialUse?: string;
  unreadCount: number;
  totalCount: number;
}

export async function listFolders(account: MailAccount): Promise<MailFolder[]> {
  const client = createImapClient(account);
  const folders: MailFolder[] = [];

  try {
    await client.connect();
    const list = await client.list();

    for (const mailbox of list) {
      if (mailbox.flags.has("\\Noselect")) continue;

      let unread = 0;
      let total = 0;
      try {
        const status = await client.status(mailbox.path, { messages: true, unseen: true });
        total = status.messages || 0;
        unread = status.unseen || 0;
      } catch {}

      folders.push({
        name: mailbox.name,
        path: mailbox.path,
        specialUse: mailbox.specialUse,
        unreadCount: unread,
        totalCount: total,
      });
    }
  } finally {
    await client.logout().catch(() => {});
  }

  const ORDER: Record<string, number> = {
    INBOX: 0,
    "\\Sent": 1,
    "\\Drafts": 2,
    "\\Junk": 3,
    "\\Trash": 4,
  };

  return folders.sort((a, b) => {
    const aO = ORDER[a.specialUse || ""] ?? ORDER[a.path.toUpperCase()] ?? 99;
    const bO = ORDER[b.specialUse || ""] ?? ORDER[b.path.toUpperCase()] ?? 99;
    return aO - bO;
  });
}

// ─── Sync folder to cache ──────────────────────────────────────────────────

export async function syncFolder(
  account: MailAccount,
  folder: string = "INBOX",
  limit: number = 50
): Promise<number> {
  const client = createImapClient(account);
  let synced = 0;

  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);

    try {
      const mailbox = client.mailbox as any;
      const total = mailbox?.exists || 0;
      if (total === 0) return 0;

      const start = Math.max(1, total - limit + 1);
      const range = `${start}:*`;

      for await (const msg of client.fetch(range, {
        uid: true,
        flags: true,
        envelope: true,
        bodyStructure: true,
        internalDate: true,
      })) {
        const uid = String(msg.uid);
        const envelope = msg.envelope as any;
        const flags = msg.flags as Set<string>;

        const fromAddr = envelope?.from?.[0];
        const toList = (envelope?.to || [])
          .map((a: any) => a.address)
          .filter(Boolean)
          .join(", ");

        const hasAttach = checkHasAttachments(msg.bodyStructure as any);

        await db
          .insert(emailCache)
          .values({
            uid,
            account: account.email,
            folder,
            fromAddress: fromAddr?.address || null,
            fromName: fromAddr?.name || fromAddr?.address || null,
            toAddresses: toList || null,
            subject: envelope?.subject || "(no subject)",
            snippet: null,
            sentAt: msg.internalDate ? new Date(msg.internalDate) : null,
            isRead: flags.has("\\Seen"),
            isStarred: flags.has("\\Flagged"),
            hasAttachments: hasAttach,
            threadId: envelope?.messageId || null,
            fetchedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [emailCache.uid, emailCache.account, emailCache.folder],
            set: {
              isRead: flags.has("\\Seen"),
              isStarred: flags.has("\\Flagged"),
              fetchedAt: new Date(),
            },
          });

        synced++;
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }

  return synced;
}

function checkHasAttachments(structure: any): boolean {
  if (!structure) return false;
  if (structure.disposition?.value?.toLowerCase() === "attachment") return true;
  if (Array.isArray(structure.childNodes)) {
    return structure.childNodes.some((c: any) => checkHasAttachments(c));
  }
  return false;
}

// ─── Fetch full email body ─────────────────────────────────────────────────

export interface FullEmail {
  uid: string;
  subject: string;
  fromAddress: string;
  fromName: string;
  toAddresses: string;
  ccAddresses: string;
  sentAt: Date | null;
  htmlBody: string;
  textBody: string;
  isRead: boolean;
  attachments: AttachmentMeta[];
}

export interface AttachmentMeta {
  partId: string;
  filename: string;
  mimeType: string;
  size: number;
}

export async function getEmailBody(
  account: MailAccount,
  folder: string,
  uid: string
): Promise<FullEmail | null> {
  // Check body cache first
  const cached = await db
    .select()
    .from(emailBodyCache)
    .where(
      and(
        eq(emailBodyCache.uid, uid),
        eq(emailBodyCache.account, account.email),
        eq(emailBodyCache.folder, folder)
      )
    )
    .limit(1);

  if (cached.length > 0) {
    const c = cached[0];
    const meta = c.attachmentsMeta ? JSON.parse(c.attachmentsMeta) : [];
    const headerEntry = await db
      .select()
      .from(emailCache)
      .where(
        and(
          eq(emailCache.uid, uid),
          eq(emailCache.account, account.email),
          eq(emailCache.folder, folder)
        )
      )
      .limit(1);

    const h = headerEntry[0];
    return {
      uid,
      subject: h?.subject || "(no subject)",
      fromAddress: h?.fromAddress || "",
      fromName: h?.fromName || "",
      toAddresses: h?.toAddresses || "",
      ccAddresses: "",
      sentAt: h?.sentAt || null,
      htmlBody: c.htmlBody || "",
      textBody: c.textBody || "",
      isRead: h?.isRead ?? true,
      attachments: meta,
    };
  }

  // Fetch from IMAP
  const client = createImapClient(account);
  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);

    let result: FullEmail | null = null;

    try {
      const msgs = await client.fetchAll(`${uid}`, { uid: true, source: true, flags: true, envelope: true }, { uid: true });

      if (msgs.length === 0) return null;

      const msg = msgs[0];
      const source = msg.source;
      if (!source) return null;

      const parsed = await simpleParser(source);

      const rawHtml = parsed.html || "";
      const sanitized = rawHtml
        ? sanitizeHtml(rawHtml, {
            allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "table", "tbody", "tr", "td", "th", "thead", "tfoot", "caption", "figure", "figcaption", "style"]),
            allowedAttributes: {
              ...sanitizeHtml.defaults.allowedAttributes,
              "*": ["class", "style", "id", "width", "height", "align", "valign", "bgcolor", "border", "cellpadding", "cellspacing", "colspan", "rowspan"],
              "img": ["src", "alt", "width", "height", "style"],
              "a": ["href", "name", "target", "rel"],
            },
            allowedSchemes: ["http", "https", "mailto", "cid"],
            allowedSchemesByTag: { img: ["http", "https", "data", "cid"] },
          })
        : "";

      const textBody = parsed.text || "";
      const envelope = msg.envelope as any;
      const flags = msg.flags as Set<string>;

      const attachments: AttachmentMeta[] = (parsed.attachments || []).map((att, i) => ({
        partId: att.contentId || `part${i}`,
        filename: att.filename || `attachment_${i}`,
        mimeType: att.contentType || "application/octet-stream",
        size: att.size || 0,
      }));

      const fromAddr = parsed.from?.value?.[0];
      const toList = (parsed.to as any)?.value?.map((a: any) => a.address).filter(Boolean).join(", ") || "";
      const ccList = (parsed.cc as any)?.value?.map((a: any) => a.address).filter(Boolean).join(", ") || "";

      await db
        .insert(emailBodyCache)
        .values({
          uid,
          account: account.email,
          folder,
          htmlBody: sanitized,
          textBody: textBody.substring(0, 100000),
          rawHeaders: JSON.stringify(parsed.headers?.get?.("message-id") || ""),
          attachmentsMeta: JSON.stringify(attachments),
          fetchedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [emailBodyCache.uid, emailBodyCache.account, emailBodyCache.folder],
          set: { htmlBody: sanitized, textBody: textBody.substring(0, 100000), fetchedAt: new Date() },
        });

      const snippet = textBody.replace(/\s+/g, " ").substring(0, 250);
      await db
        .update(emailCache)
        .set({ isRead: flags.has("\\Seen") || true, snippet })
        .where(
          and(
            eq(emailCache.uid, uid),
            eq(emailCache.account, account.email),
            eq(emailCache.folder, folder)
          )
        );

      result = {
        uid,
        subject: parsed.subject || envelope?.subject || "(no subject)",
        fromAddress: fromAddr?.address || envelope?.from?.[0]?.address || "",
        fromName: fromAddr?.name || fromAddr?.address || "",
        toAddresses: toList,
        ccAddresses: ccList,
        sentAt: parsed.date || (msg.internalDate ? new Date(msg.internalDate) : null),
        htmlBody: sanitized,
        textBody,
        isRead: flags.has("\\Seen"),
        attachments,
      };
    } finally {
      lock.release();
    }

    return result;
  } finally {
    await client.logout().catch(() => {});
  }
}

// ─── Send email ────────────────────────────────────────────────────────────

export interface SendEmailOptions {
  account: MailAccount;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html: string;
  inReplyTo?: string;
  references?: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const transport = nodemailer.createTransport({
    host: opts.account.smtpHost,
    port: opts.account.smtpPort,
    secure: opts.account.smtpPort === 465,
    auth: { user: opts.account.email, pass: opts.account.password },
    tls: { rejectUnauthorized: false },
  });

  const displayFrom = opts.account.displayName || opts.account.label;

  await transport.sendMail({
    from: `"${displayFrom}" <${opts.account.email}>`,
    to: opts.to,
    cc: opts.cc,
    bcc: opts.bcc,
    subject: opts.subject,
    html: opts.html,
    inReplyTo: opts.inReplyTo,
    references: opts.references,
  });
}

// ─── Mark read/unread ──────────────────────────────────────────────────────

export async function markRead(
  account: MailAccount,
  folder: string,
  uid: string,
  isRead: boolean
): Promise<void> {
  const client = createImapClient(account);
  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);
    try {
      if (isRead) {
        await client.messageFlagsAdd(`${uid}`, ["\\Seen"], { uid: true });
      } else {
        await client.messageFlagsRemove(`${uid}`, ["\\Seen"], { uid: true });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }

  await db
    .update(emailCache)
    .set({ isRead })
    .where(
      and(
        eq(emailCache.uid, uid),
        eq(emailCache.account, account.email),
        eq(emailCache.folder, folder)
      )
    );
}

// ─── Move to trash ─────────────────────────────────────────────────────────

export async function moveToTrash(
  account: MailAccount,
  folder: string,
  uid: string
): Promise<void> {
  const client = createImapClient(account);
  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);
    try {
      const folders = await client.list();
      const trashFolder = folders.find(
        (f) => f.specialUse === "\\Trash" || f.name.toLowerCase().includes("trash")
      );

      if (trashFolder && trashFolder.path !== folder) {
        await client.messageMove(`${uid}`, trashFolder.path, { uid: true });
      } else {
        await client.messageDelete(`${uid}`, { uid: true });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }

  await db
    .delete(emailCache)
    .where(
      and(
        eq(emailCache.uid, uid),
        eq(emailCache.account, account.email),
        eq(emailCache.folder, folder)
      )
    );
}

// ─── Search emails ─────────────────────────────────────────────────────────

export interface SearchResult {
  uid: string;
  subject: string;
  fromName: string;
  fromAddress: string;
  snippet: string;
  sentAt: Date | null;
  isRead: boolean;
}

export async function searchEmails(
  account: MailAccount,
  folder: string,
  query: string
): Promise<SearchResult[]> {
  const client = createImapClient(account);
  const results: SearchResult[] = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);

    try {
      const uids = await client.search(
        { or: [{ subject: query }, { from: query }, { body: query }] },
        { uid: true }
      );

      if (uids.length === 0) return [];

      const limitedUids = uids.slice(-30);
      const range = limitedUids.join(",");

      for await (const msg of client.fetch(range, { uid: true, envelope: true, flags: true }, { uid: true })) {
        const envelope = msg.envelope as any;
        const flags = msg.flags as Set<string>;
        const fromAddr = envelope?.from?.[0];

        results.push({
          uid: String(msg.uid),
          subject: envelope?.subject || "(no subject)",
          fromName: fromAddr?.name || fromAddr?.address || "",
          fromAddress: fromAddr?.address || "",
          snippet: "",
          sentAt: msg.internalDate ? new Date(msg.internalDate) : null,
          isRead: flags.has("\\Seen"),
        });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }

  return results.reverse();
}

// ─── Background sync scheduler ─────────────────────────────────────────────

let syncInterval: NodeJS.Timeout | null = null;

export function startBackgroundSync(): void {
  if (syncInterval) return;

  const doSync = async () => {
    // Sync all active DB accounts
    try {
      const dbAccounts = await db
        .select({
          account: emailAccounts,
          secret: emailAccountSecrets,
        })
        .from(emailAccounts)
        .innerJoin(emailAccountSecrets, eq(emailAccountSecrets.accountId, emailAccounts.id))
        .where(eq(emailAccounts.isActive, true));

      for (const row of dbAccounts) {
        const acc: MailAccount = {
          id: row.account.id,
          email: row.account.email,
          password: row.secret.appPassword,
          imapHost: row.account.imapHost,
          imapPort: row.account.imapPort,
          smtpHost: row.account.smtpHost,
          smtpPort: row.account.smtpPort,
          label: row.account.label,
          accountType: row.account.accountType,
          regionCode: row.account.regionCode,
          canSend: true,
        };
        await syncFolder(acc, "INBOX", 50).catch(() => {});
      }
    } catch {}

    // Also sync env-var accounts as fallback
    for (const region of ["AU", "BD"]) {
      const account = getAccountForRegion(region);
      if (!account) continue;
      await syncFolder(account, "INBOX", 50).catch(() => {});
    }
  };

  syncInterval = setInterval(doSync, 2 * 60 * 1000);
}

export function stopBackgroundSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}
