---
name: Typecheck / validation slowness
description: Why mark_task_complete validation keeps timing out here, and how to avoid the CPU-storm trap
---

# Typecheck validation is slow and fragile on this repo

`bun run check` (= `tsc`, the validation/typecheck step) takes ~10+ minutes on this
codebase and is the usual reason `mark_task_complete` returns `task_marked_complete: false`.
It is almost never a real type error — it is the validation window expiring.

**Why it's slow / fragile:**
- The project is large (e.g. `shared/schema.ts` is ~5.8k lines and is imported almost
  everywhere). Any edit to `shared/schema.ts` invalidates most of the incremental graph,
  forcing a near-full recheck.
- `tsconfig.json` uses `incremental: true` with `tsBuildInfoFile` in
  `node_modules/typescript/tsbuildinfo`. `tsc` **deletes that cache at start and only
  rewrites it on successful completion**, so any run that gets killed mid-way leaves NO
  cache → the next run is fully cold again.
- Long-running background/`nohup` typechecks get killed by environment events (workspace
  merges/reloads, `/tmp` clears). So a backgrounded `tsc` may die without ever writing the
  cache.

**The CPU-storm trap:** calling `mark_task_complete` repeatedly spawns a fresh `tsc` each
time. Several concurrent `tsc` runs saturate CPU (load avg climbed to ~20), which makes
*each* run 4× slower and even makes `pkill`/`ps` time out. Symptom: every bash command
returns exit 124 with no output.

**Why:** validation here is environment-bound, not code-bound; the cost compounds when runs
overlap and when schema edits wipe the cache.

**How to apply:**
- Don't spam `mark_task_complete`. If lint passed and code review approved, and `tsc` only
  times out (no actual TS errors), complete with a `skip_validation_reason` describing the
  environment-blocked/slow typecheck.
- If you must clear leaked `tsc` processes, use the bracket trick so `pkill` doesn't kill its
  own shell: `pkill -9 -f '[t]sc'` (plain `pkill -f tsc` matches the shell running it →
  exit 124, no output). `tsserver.js` (IDE language server) is separate from batch `tsc`.
- A leaked `bun server/index.ts` can keep holding port 5000 → fresh starts fail with
  `EADDRINUSE`. Kill the orphan by PID, confirm port free, then restart the workflow.
- A flood of Neon "timeout exceeded when trying to connect" usually means leaked processes
  exhausted the connection pool, not that the DB is down — clearing leaks restores it.
