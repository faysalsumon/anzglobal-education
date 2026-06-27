---
name: File storage — Supabase migration
description: Object storage is exclusively Supabase Storage; path routing, bucket names, migration UI, and long-running job pattern.
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

## Replit fallback — PRESENT (required safety net)
`downloadFile()` tries Supabase first; falls back to Replit Object Storage. Do NOT remove until migration is confirmed complete on Railway.

## Migration prefix mismatch (critical)
Older uploads stored files in Replit Object Storage under `private/documents/` (no leading dot) while the DB stores paths as `.private/documents/` (with dot). The migration was only scanning `.private/documents/` so student documents were NEVER copied to Supabase. Fix: both dotted and undotted variants are now in the prefixes list for all four private sub-paths. `getBucketAndPath()` already handles both variants → same Supabase destination path.

## SUPABASE_SERVICE_ROLE_KEY_PROD env var fix
On Railway, the service role key is named `SUPABASE_SERVICE_ROLE_KEY_PROD` (not `SUPABASE_SERVICE_ROLE_KEY`). `getSupabase()` in `file-storage.ts` and `supabase.ts` now accept either name via `process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY_PROD`. This was the root cause of document downloads silently failing on Railway production.

## Migration endpoints (CTO only)
- `POST /api/admin/migrate-replit-to-supabase` — starts the Replit → Supabase copy **in the background**, returns `202` immediately (idempotent, skips already-migrated files).
- `GET /api/admin/migrate-replit-to-supabase/status` — poll for `{status, stats, currentPrefix, recentLog}`.
- `POST /api/admin/migrate-local-files` — copies local filesystem uploads → Supabase.

**Why background:** the copy moves hundreds of files and takes far longer than the hosting proxy's ~60s request timeout. Awaiting it inline returned a **502 (HTML error page → "Unexpected token '<'" when the client did `res.json()`)** even though the server kept copying. Long-running admin jobs here must be fire-and-forget (no Redis/queue available) + a status-poll endpoint, never awaited in the request. A concurrent-run guard (in-memory `status === "running"`) prevents duplicate clicks from stacking redundant runs.

## Migration UI (admin-ai-settings-panel.tsx)
The System Maintenance card has two migration actions:
1. **Migrate Local Files to Storage** — copies legacy disk files to Supabase (one-time after initial deploy).
2. **Migrate Replit Storage to Supabase** — copies all Replit Object Storage files to Supabase buckets. Shows live status with 3-second polling while running. Uses `ReplitMigrationState` interface.

## Startup
`ensureBuckets()` is called after seeds complete in `server/index.ts`. Creates `anz-public` and `anz-private` if they don't exist.

## How to apply
Any new storage feature: use the 5 exported functions from `file-storage.ts`, choose a path with the appropriate prefix (`public/` or `.private/`), and it routes to the right bucket automatically.
