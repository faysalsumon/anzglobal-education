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

async function getClient() {
  const { Client } = await import("@replit/object-storage");
  return new Client();
}

export async function uploadFile(
  storagePath: string,
  buffer: Buffer,
  mimeType?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = await getClient();
    const opts = mimeType ? ({ contentType: mimeType } as any) : undefined;
    const result = await client.uploadFromBytes(storagePath, buffer, opts);
    if (!result.ok) {
      console.error(`[FileStorage] Upload failed for ${storagePath}:`, result.error);
      return { ok: false, error: String(result.error) };
    }
    return { ok: true };
  } catch (err: any) {
    console.error(`[FileStorage] Upload error for ${storagePath}:`, err.message);
    return { ok: false, error: err.message };
  }
}

function normalizeToBuffer(value: unknown): Buffer {
  if (Buffer.isBuffer(value)) return value as Buffer;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  if (Array.isArray(value)) {
    const chunks = value.map((c: unknown) =>
      Buffer.isBuffer(c) ? (c as Buffer) : Buffer.from(c as Uint8Array)
    );
    return Buffer.concat(chunks);
  }
  return Buffer.from(value as ArrayBufferLike);
}

export async function downloadFile(storagePath: string): Promise<Buffer | null> {
  try {
    const client = await getClient();
    const result = await client.downloadAsBytes(storagePath);
    if (!result.ok || result.value == null) return null;
    const buf = normalizeToBuffer(result.value);
    return buf.length > 0 ? buf : null;
  } catch (err: any) {
    console.error(`[FileStorage] Download error for ${storagePath}:`, err.message);
    return null;
  }
}

export async function deleteFile(storagePath: string): Promise<void> {
  try {
    const client = await getClient();
    await client.delete(storagePath);
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
    localFallbackPath?: string;
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

  if (options?.localFallbackPath) {
    try {
      await fs.access(options.localFallbackPath);
      const localBuf = await fs.readFile(options.localFallbackPath);
      if (localBuf.length > 0) {
        const ext = options.localFallbackPath.split(".").pop()?.toLowerCase() || "";
        const contentType = options?.mimeType || MIME_TYPES[ext] || "application/octet-stream";
        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", cacheControl);
        if (options?.disposition) {
          res.setHeader("Content-Disposition", options.disposition);
        }
        res.send(localBuf);
        return true;
      }
    } catch {
      // local file not found either
    }
  }

  return false;
}

export async function readDocumentBuffer(filePath: string): Promise<Buffer | null> {
  if (filePath.startsWith(".private/") || filePath.startsWith("private/")) {
    return downloadFile(filePath);
  }
  try {
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

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
        if (result.ok) {
          stats.uploaded++;
        } else {
          stats.failed++;
        }
      } catch {
        stats.failed++;
      }
    }
  }

  return results;
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
