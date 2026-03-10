import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";
import sanitizeHtml from "sanitize-html";
import { simpleParser } from "mailparser";
import { db } from "./db";
import { emailCache, emailBodyCache } from "../shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

// ─── Account resolution ────────────────────────────────────────────────────

export interface MailAccount {
  email: string;
  password: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  label: string;
  regionCode: string;
}

export function getAccountForRegion(regionCode?: string | null): MailAccount | null {
  const region = (regionCode || "AU").toUpperCase();

  if (region === "BD") {
    const email = process.env.ZOHO_EMAIL_BD;
    const password = process.env.ZOHO_APP_PASS_BD;
    if (!email || !password) return null;
    return {
      email,
      password,
      imapHost: "imap.zoho.com",
      imapPort: 993,
      smtpHost: "smtp.zoho.com",
      smtpPort: 465,
      label: "ANZ Bangladesh",
      regionCode: "BD",
    };
  }

  const email = process.env.ZOHO_EMAIL_AU;
  const password = process.env.ZOHO_APP_PASS_AU;
  if (!email || !password) return null;
  return {
    email,
    password,
    imapHost: "imap.zoho.com",
    imapPort: 993,
    smtpHost: "smtp.zoho.com",
    smtpPort: 465,
    label: "ANZ Australia",
    regionCode: "AU",
  };
}

// ─── IMAP client factory ───────────────────────────────────────────────────

function createImapClient(account: MailAccount): ImapFlow {
  return new ImapFlow({
    host: account.imapHost,
    port: account.imapPort,
    secure: true,
    auth: { user: account.email, pass: account.password },
    logger: false,
    tls: { rejectUnauthorized: true },
  });
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

  // Sort: Inbox first, then Sent, Drafts, Spam, Trash, others
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

      // Fetch the latest N messages by sequence range
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
    const meta = cached[0].attachmentsMeta ? JSON.parse(cached[0].attachmentsMeta!) : [];
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

      // Upsert body cache
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

      // Update cache entry - mark read, add snippet
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
    secure: true,
    auth: { user: opts.account.email, pass: opts.account.password },
  });

  await transport.sendMail({
    from: `"${opts.account.label}" <${opts.account.email}>`,
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
      // Try moving to Trash mailbox
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

  // Remove from cache
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
    const regions = ["AU", "BD"];
    for (const region of regions) {
      const account = getAccountForRegion(region);
      if (!account) continue;
      try {
        await syncFolder(account, "INBOX", 50);
      } catch {}
    }
  };

  // Run every 2 minutes
  syncInterval = setInterval(doSync, 2 * 60 * 1000);
}

export function stopBackgroundSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}
