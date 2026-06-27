import { createClient } from "@supabase/supabase-js";
import type { Response } from "express";
import { promises as fs } from "fs";
import path from "path";

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
  csv: "text/csv",
  zip: "application/zip",
};

export function getMimeType(filename: string, fallback = "application/octet-stream"): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return MIME_TYPES[ext] || fallback;
}

// ─── Bucket names ────────────────────────────────────────────────────────────
const PUBLIC_BUCKET = "anz-public";
const PRIVATE_BUCKET = "anz-private";

// ─── Supabase client (service-role, server-side only) ────────────────────────
function getSupabase() {
  const url = process.env.SUPABASE_URL;
  // Accept both the canonical name and the _PROD-suffixed variant used in Railway
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY_PROD;
  if (!url || !key) throw new Error("[FileStorage] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ─── Path → bucket + sub-path mapping ────────────────────────────────────────
// Known prefixes:
//   public/*              → PUBLIC_BUCKET,  strip "public/"
//   .private/*            → PRIVATE_BUCKET, strip ".private/"
//   private/*             → PRIVATE_BUCKET, strip "private/"
//   attendance-photos/*   → PRIVATE_BUCKET, kept as-is
//   (anything else)       → PRIVATE_BUCKET, kept as-is
function getBucketAndPath(storagePath: string): { bucket: string; filePath: string } {
  if (storagePath.startsWith("public/")) {
    return { bucket: PUBLIC_BUCKET, filePath: storagePath.slice("public/".length) };
  }
  if (storagePath.startsWith(".private/")) {
    return { bucket: PRIVATE_BUCKET, filePath: storagePath.slice(".private/".length) };
  }
  if (storagePath.startsWith("private/")) {
    return { bucket: PRIVATE_BUCKET, filePath: storagePath.slice("private/".length) };
  }
  // Unprefixed paths (e.g. attendance-photos/) → private bucket
  return { bucket: PRIVATE_BUCKET, filePath: storagePath };
}

// ─── Ensure buckets exist (called once at startup) ───────────────────────────
let bucketsInitialised = false;
export async function ensureBuckets(): Promise<void> {
  if (bucketsInitialised) return;
  try {
    const supabase = getSupabase();
    const { data: existing } = await supabase.storage.listBuckets();
    const names = (existing ?? []).map((b) => b.name);

    if (!names.includes(PUBLIC_BUCKET)) {
      const { error } = await supabase.storage.createBucket(PUBLIC_BUCKET, {
        public: true,
        allowedMimeTypes: ["image/*", "application/pdf", "application/octet-stream"],
        fileSizeLimit: 52428800, // 50 MB
      });
      if (error) console.error("[FileStorage] Failed to create public bucket:", error.message);
      else console.log(`[FileStorage] Created bucket: ${PUBLIC_BUCKET}`);
    }

    if (!names.includes(PRIVATE_BUCKET)) {
      const { error } = await supabase.storage.createBucket(PRIVATE_BUCKET, {
        public: false,
        fileSizeLimit: 104857600, // 100 MB
      });
      if (error) console.error("[FileStorage] Failed to create private bucket:", error.message);
      else console.log(`[FileStorage] Created bucket: ${PRIVATE_BUCKET}`);
    }

    bucketsInitialised = true;
    console.log("[FileStorage] Supabase Storage buckets ready");
  } catch (err: any) {
    console.error("[FileStorage] ensureBuckets error:", err.message);
  }
}

// ─── Core operations ─────────────────────────────────────────────────────────

export async function uploadFile(
  storagePath: string,
  buffer: Buffer,
  mimeType?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { bucket, filePath } = getBucketAndPath(storagePath);
    const supabase = getSupabase();
    const contentType = mimeType || getMimeType(storagePath);

    const { error } = await supabase.storage.from(bucket).upload(filePath, buffer, {
      contentType,
      upsert: true,
    });

    if (error) {
      console.error(`[FileStorage] Upload failed for ${storagePath}:`, error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err: any) {
    console.error(`[FileStorage] Upload error for ${storagePath}:`, err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Download a file from Supabase Storage.
 * All files are served exclusively from Supabase.
 */
export async function downloadFile(storagePath: string): Promise<Buffer | null> {
  try {
    const { bucket, filePath } = getBucketAndPath(storagePath);
    const supabase = getSupabase();
    const { data, error } = await supabase.storage.from(bucket).download(filePath);
    if (!error && data) {
      return Buffer.from(await data.arrayBuffer());
    }
    if (error) console.warn(`[FileStorage] Supabase miss: bucket=${bucket} path=${filePath} err=${error.message}`);
  } catch (err: any) {
    console.warn(`[FileStorage] Supabase download error for ${storagePath}:`, err.message);
  }
  return null;
}

export async function deleteFile(storagePath: string): Promise<void> {
  try {
    const { bucket, filePath } = getBucketAndPath(storagePath);
    const supabase = getSupabase();
    const { error } = await supabase.storage.from(bucket).remove([filePath]);
    if (error) {
      console.error(`[FileStorage] Delete error for ${storagePath}:`, error.message);
    }
  } catch (err: any) {
    console.error(`[FileStorage] Delete error for ${storagePath}:`, err.message);
  }
}

export async function fileExistsInStorage(storagePath: string): Promise<boolean> {
  const buf = await downloadFile(storagePath);
  return buf !== null;
}

export async function serveFile(
  res: Response,
  storagePath: string,
  options?: {
    mimeType?: string;
    cacheControl?: string;
    disposition?: string;
    filename?: string;
  }
): Promise<boolean> {
  const cacheControl = options?.cacheControl ?? "public, max-age=86400";
  const buf = await downloadFile(storagePath);
  if (buf && buf.length > 0) {
    const ext = storagePath.split(".").pop()?.toLowerCase() || "";
    const contentType = options?.mimeType || MIME_TYPES[ext] || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", cacheControl);
    if (options?.disposition) {
      res.setHeader("Content-Disposition", options.disposition);
    }
    res.send(buf);
    return true;
  }
  return false;
}

export async function readDocumentBuffer(filePath: string): Promise<Buffer | null> {
  if (filePath.startsWith(".private/") || filePath.startsWith("private/")) {
    return downloadFile(filePath);
  }
  // Try local filesystem (legacy uploads folder)
  try {
    return await fs.readFile(filePath);
  } catch {
    return downloadFile(filePath);
  }
}

// ─── Migration: local filesystem → Supabase ──────────────────────────────────
export async function runLocalFileMigration(): Promise<Record<string, { total: number; uploaded: number; skipped: number; failed: number }>> {
  const categories: Array<{ name: string; localDir: string; osPrefix: string; recursive?: boolean }> = [
    { name: "students",      localDir: path.join(process.cwd(), "public", "students"),      osPrefix: "public/students" },
    { name: "admins",        localDir: path.join(process.cwd(), "public", "admins"),        osPrefix: "public/admins" },
    { name: "contacts",      localDir: path.join(process.cwd(), "public", "contacts"),      osPrefix: "public/contacts" },
    { name: "testimonials",  localDir: path.join(process.cwd(), "public", "testimonials"),  osPrefix: "public/testimonials" },
    { name: "account-logos", localDir: path.join(process.cwd(), "public", "account-logos"), osPrefix: "public/account-logos" },
    { name: "institutions",  localDir: path.join(process.cwd(), "public", "institutions"),  osPrefix: "public/institution-logos" },
    { name: "documents",     localDir: path.join(process.cwd(), "uploads", "documents"),    osPrefix: ".private/documents", recursive: true },
    { name: "inst-docs",     localDir: path.join(process.cwd(), "private", "institutions"), osPrefix: ".private/institutions", recursive: true },
  ];

  const results: Record<string, { total: number; uploaded: number; skipped: number; failed: number }> = {};

  for (const cat of categories) {
    const stats = { total: 0, uploaded: 0, skipped: 0, failed: 0 };
    results[cat.name] = stats;

    let files: string[] = [];
    try {
      files = await collectFiles(cat.localDir, cat.recursive);
    } catch {
      continue;
    }

    for (const localFilePath of files) {
      stats.total++;
      const relative = path.relative(cat.localDir, localFilePath).replace(/\\/g, "/");
      const osPath = `${cat.osPrefix}/${relative}`;

      const existing = await fileExistsInStorage(osPath);
      if (existing) {
        stats.skipped++;
        continue;
      }

      try {
        const buf = await fs.readFile(localFilePath);
        const mimeType = getMimeType(localFilePath);
        const result = await uploadFile(osPath, buf, mimeType);
        if (result.ok) stats.uploaded++;
        else stats.failed++;
      } catch {
        stats.failed++;
      }
    }
  }

  return results;
}

// ─── Migration state (for background runs) ───────────────────────────────────
export type MigrationStats = {
  total: number;
  copied: number;
  skipped: number;
  failed: number;
  errors: string[];
};

export type MigrationState = {
  status: "idle" | "running" | "completed" | "failed";
  startedAt: number | null;
  finishedAt: number | null;
  stats: MigrationStats;
  currentPrefix: string | null;
  recentLog: string[];
  error?: string;
};

let migrationState: MigrationState = {
  status: "idle",
  startedAt: null,
  finishedAt: null,
  stats: { total: 0, copied: 0, skipped: 0, failed: 0, errors: [] },
  currentPrefix: null,
  recentLog: [],
};

export function getMigrationState(): MigrationState {
  return migrationState;
}

/**
 * Start the Replit → Supabase migration in the background and return immediately.
 * This avoids the HTTP proxy timeout (≈60s) that caused 502 errors when the
 * migration was awaited inline. Progress is exposed via getMigrationState().
 * Concurrent runs are prevented — a second call while running is a no-op.
 */
export function startBackgroundMigration(): { state: MigrationState; startedNew: boolean } {
  if (migrationState.status === "running") {
    return { state: migrationState, startedNew: false };
  }

  const stats: MigrationStats = { total: 0, copied: 0, skipped: 0, failed: 0, errors: [] };
  migrationState = {
    status: "running",
    startedAt: Date.now(),
    finishedAt: null,
    stats,
    currentPrefix: null,
    recentLog: [],
  };

  // Fire-and-forget; do NOT await here so the HTTP handler can respond instantly.
  void (async () => {
    try {
      await runMigrationFromReplitToSupabase((msg) => {
        if (msg.startsWith("Scanning prefix: ")) {
          migrationState.currentPrefix = msg.slice("Scanning prefix: ".length);
        }
        migrationState.recentLog.push(msg);
        if (migrationState.recentLog.length > 50) {
          migrationState.recentLog = migrationState.recentLog.slice(-50);
        }
      }, stats);
      migrationState.status = "completed";
      migrationState.finishedAt = Date.now();
      migrationState.currentPrefix = null;
    } catch (err: any) {
      migrationState.status = "failed";
      migrationState.error = err?.message ?? String(err);
      migrationState.finishedAt = Date.now();
    }
  })();

  return { state: migrationState, startedNew: true };
}

// ─── Migration: Replit Object Storage → Supabase ─────────────────────────────
// Run once from Admin → AI & System Settings → System Maintenance to copy all
// legacy Replit Object Storage files into Supabase. downloadFile() no longer
// has a Replit fallback, so run this before any legacy files are accessed.
export async function runMigrationFromReplitToSupabase(
  onProgress?: (msg: string) => void,
  externalStats?: MigrationStats
): Promise<{ total: number; copied: number; skipped: number; failed: number; errors: string[] }> {
  const log = (msg: string) => {
    console.log(`[Migration] ${msg}`);
    onProgress?.(msg);
  };

  const stats = externalStats ?? { total: 0, copied: 0, skipped: 0, failed: 0, errors: [] as string[] };

  // All known prefixes in Replit Object Storage
  const prefixes = [
    "public/students/",
    "public/admins/",
    "public/contacts/",
    "public/testimonials/",
    "public/account-logos/",
    "public/institution-logos/",
    "public/institution-gallery/",
    "public/thumbnails/",
    "public/note-attachments/",
    ".private/documents/",
    ".private/institutions/",
    ".private/chat-files/",
    ".private/account-portal-forms/",
    "attendance-photos/",
  ];

  let replitClient: any;
  try {
    const { Client } = await import("@replit/object-storage");
    replitClient = new Client();
  } catch (err: any) {
    const msg = `Replit Object Storage not available: ${err.message}`;
    log(msg);
    stats.errors.push(msg);
    return stats;
  }

  const supabase = getSupabase();

  for (const prefix of prefixes) {
    log(`Scanning prefix: ${prefix}`);
    try {
      const listResult = await replitClient.list(prefix);
      if (!listResult.ok) {
        log(`  list failed: ${listResult.error}`);
        continue;
      }

      const objects: Array<{ name: string }> = listResult.value ?? [];
      log(`  found ${objects.length} objects`);

      for (const obj of objects) {
        const storagePath = obj.name;
        stats.total++;

        // Check if already in Supabase
        const { bucket, filePath } = getBucketAndPath(storagePath);
        const { data: existing } = await supabase.storage.from(bucket).download(filePath);
        if (existing) {
          stats.skipped++;
          continue;
        }

        // Download from Replit
        const dlResult = await replitClient.downloadAsBytes(storagePath);
        if (!dlResult.ok || dlResult.value == null) {
          stats.failed++;
          stats.errors.push(`Download failed: ${storagePath}`);
          continue;
        }

        const val = dlResult.value;
        let buf: Buffer;
        if (Buffer.isBuffer(val)) {
          buf = val;
        } else if (Array.isArray(val)) {
          buf = Buffer.concat(val.map((c: unknown) => Buffer.isBuffer(c) ? c : Buffer.from(c as Uint8Array)));
        } else {
          buf = Buffer.from(val as ArrayBufferLike);
        }

        if (buf.length === 0) {
          stats.skipped++;
          continue;
        }

        // Upload to Supabase
        const mimeType = getMimeType(storagePath);
        const { error } = await supabase.storage.from(bucket).upload(filePath, buf, {
          contentType: mimeType,
          upsert: true,
        });

        if (error) {
          stats.failed++;
          stats.errors.push(`Upload failed [${storagePath}]: ${error.message}`);
        } else {
          stats.copied++;
          log(`  copied: ${storagePath}`);
        }
      }
    } catch (err: any) {
      log(`  Error scanning prefix ${prefix}: ${err.message}`);
      stats.errors.push(`Prefix error [${prefix}]: ${err.message}`);
    }
  }

  log(`Migration complete — total:${stats.total} copied:${stats.copied} skipped:${stats.skipped} failed:${stats.failed}`);
  return stats;
}

async function collectFiles(dir: string, recursive = false): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && recursive) {
      results.push(...(await collectFiles(full, true)));
    } else if (entry.isFile()) {
      results.push(full);
    }
  }
  return results;
}
