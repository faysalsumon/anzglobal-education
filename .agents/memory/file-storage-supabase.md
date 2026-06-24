---
name: File storage — Supabase migration
description: Object storage migrated from Replit Object Storage to Supabase Storage; path routing, bucket names, fallback behaviour, and how to trigger migration.
---

# File storage — Supabase Storage

## Rule
`server/file-storage.ts` is the **only** file that talks to object storage. All other files import `uploadFile`, `downloadFile`, `deleteFile`, `serveFile`, `readDocumentBuffer` from it. Never add a raw `@replit/object-storage` import anywhere else.

**Why:** crm-routes.ts previously had a raw Replit client import that was missed for months — centralising everything makes future storage swaps a one-file change.

## Bucket names
| Bucket | Supabase name | Public? |
|---|---|---|
| Public assets (logos, avatars, thumbnails, gallery, note attachments) | `anz-public` | Yes |
| Private assets (student docs, institution docs, chat files, forms, attendance photos) | `anz-private` | No |

## Path → bucket mapping (in getBucketAndPath)
- `public/*` → `anz-public`, strip `public/`
- `.private/*` → `anz-private`, strip `.private/`
- `private/*` → `anz-private`, strip `private/`
- `attendance-photos/*` → `anz-private`, kept as-is (no prefix)
- anything else → `anz-private`, kept as-is

## Replit fallback (temporary)
`downloadFile()` tries Supabase first; if not found, falls back to Replit Object Storage. This ensures zero data loss during migration. Remove the fallback block once `runMigrationFromReplitToSupabase()` has been confirmed successful.

## Migration endpoints (CTO only)
- `POST /api/admin/migrate-replit-to-supabase` — starts the Replit → Supabase copy **in the background**, returns `202` immediately (idempotent, skips already-migrated files).
- `GET /api/admin/migrate-replit-to-supabase/status` — poll for `{status, stats, currentPrefix, recentLog}`.
- `POST /api/admin/migrate-local-files` — copies local filesystem uploads → Supabase.

**Why background:** the copy moves hundreds of files and takes far longer than the hosting proxy's ~60s request timeout. Awaiting it inline returned a **502 (HTML error page → "Unexpected token '<'" when the client did `res.json()`)** even though the server kept copying. Long-running admin jobs here must be fire-and-forget (no Redis/queue available) + a status-poll endpoint, never awaited in the request. A concurrent-run guard (in-memory `status === "running"`) prevents duplicate clicks from stacking redundant runs.

## Startup
`ensureBuckets()` is called after seeds complete in `server/index.ts`. Creates `anz-public` and `anz-private` if they don't exist.

## How to apply
Any new storage feature: use the 5 exported functions from `file-storage.ts`, choose a path with the appropriate prefix (`public/` or `.private/`), and it routes to the right bucket automatically.
