---
name: Production startup order
description: server.listen() must precede DB migrations; Neon idle-wakeup can exceed Replit's health-check window if listen() is last in a sequential IIFE
---

## Rule
In `server/index.ts`, call `server.listen()` (bind the port) **before** `runMigrations()` and any other async startup work. Run migrations + seeds in a fire-and-forget async block that starts after the listen callback fires.

## Why
Replit's Cloud Run promote step has a ~60-second health-check window. The Neon database auto-pauses when idle and can take 30–60 seconds to wake. When migrations ran first (before `server.listen()`), the port never opened within the window → "port never opened, expected port 5000" → deploy failure.

## How to apply
```typescript
// CORRECT — port binds first, migrations run async
const server = await registerRoutes(app);
// ... attach static serving / Vite middleware ...
server.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
  log(`serving on port ${port}`);
});
(async () => {
  try {
    await runMigrations();
    await seedDefaultRoles();
    await seedDefaultProfiles();
    const { seedAiJobDefaults } = await import("./ai");
    await seedAiJobDefaults();
    log('Startup tasks complete (migrations + seeds)');
  } catch (err) {
    console.error('[Server] Startup task failed:', err);
  }
  initializePineconeIndex().catch(console.error);
})();
```

Failures in the background block are logged but do not crash the already-running server. In dev, migrations are already applied so the background tasks complete in under a second with no observable difference.
