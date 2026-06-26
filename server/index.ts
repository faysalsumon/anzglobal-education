import * as Sentry from "@sentry/node";
import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import fs from "fs";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log, injectNonce } from "./vite";
import { injectPageMeta } from "./meta-injector";
import { initializePineconeIndex } from "./knowledge-base";
import { regionDetectionMiddleware, geoRedirectMiddleware } from "./middleware/region-detection";
import { csrfErrorHandler } from "./middleware/csrf";
import { supabaseAuthMiddleware } from "./supabase-middleware";
import { dbContextMiddleware } from "./middleware/db-context";
import { botProtectionMiddleware, securityHeadersMiddleware, protectedPathsMiddleware, nonceMiddleware } from "./middleware/bot-protection";
import { runMigrations } from "./migrate";
import { seedDefaultRoles } from "./seed-roles";
import { seedDefaultProfiles } from "./seed-profiles";

if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required in production");
}

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: 0.1,
    ignoreErrors: [
      // Neon DB cold-start timeouts — transient infrastructure noise
      "timeout exceeded when trying to connect",
      "NeonDbError",
      // Expected auth failures
      "Invalid token",
      "jwt expired",
    ],
  });
}

// Intercept process.exit(1) before Vite's error logger can use it to crash the dev server.
// Vite's custom logger in server/vite.ts calls process.exit(1) on ANY Vite error, which
// kills the whole Node process silently. We log the error instead and keep running.
const _originalExit = process.exit.bind(process);
(process as any).exit = (code?: number) => {
  if (code === 1) {
    console.error('[Server] process.exit(1) intercepted — logging instead of crashing (likely a Vite compilation error)');
    console.error(new Error('[Server] Exit stack trace:').stack);
    return;
  }
  _originalExit(code as never);
};

// Catch unhandled promise rejections (e.g. from async Pinecone rebuild) without crashing
process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled promise rejection:', reason);
});

// Catch any uncaught synchronous exceptions without crashing the server
process.on('uncaughtException', (err) => {
  // Suppress known bun/ws HMR WebSocket compatibility error — harmless, does not affect app
  if (err instanceof TypeError && err.message?.includes('undefined is not an object') && err.stack?.includes('abortHandshake')) {
    return;
  }
  console.error('[Server] Uncaught exception:', err);
});

// Bun compatibility: Error.captureStackTrace requires its first argument to be an actual Error
// instance, but multer's MulterError constructor calls it before the prototype chain is wired.
// Wrap it to swallow that case gracefully so multer error handling works correctly.
if (typeof Error.captureStackTrace === 'function') {
  const _originalCaptureStackTrace = Error.captureStackTrace;
  (Error as any).captureStackTrace = function (target: object, constructor?: (...args: unknown[]) => unknown) {
    try {
      _originalCaptureStackTrace(target, constructor);
    } catch {
      // Bun: skip silently; multer MulterError still constructs with code/message intact
    }
  };
}

// Log OS-level signals so we know what is killing the process
process.on('SIGTERM', () => {
  console.error('[Server] Received SIGTERM — process will exit');
  _originalExit(0);
});
process.on('SIGINT', () => {
  console.error('[Server] Received SIGINT — process will exit');
  _originalExit(0);
});
process.on('SIGHUP', () => {
  console.error('[Server] Received SIGHUP');
});

const app = express();

// Trust proxy for accurate client IP detection behind reverse proxy
app.set('trust proxy', 1);

// Lightweight healthcheck — no DB, no auth, responds immediately.
// Railway uses this to determine if the container is alive.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(cookieParser());

// Strip brotli from Accept-Encoding — bun 1.x does not implement zlib.createBrotliCompress
app.use((req, _res, next) => {
  if (req.headers["accept-encoding"]) {
    req.headers["accept-encoding"] = String(req.headers["accept-encoding"])
      .split(",")
      .map((e) => e.trim())
      .filter((e) => !e.startsWith("br"))
      .join(", ");
  }
  next();
});
// Gzip compression for all responses (reduces payload size significantly)
app.use(compression());

// Bot protection and security headers (must be early in middleware chain).
// nonceMiddleware must run first so res.locals.nonce is set before
// securityHeadersMiddleware builds the CSP header that includes it.
app.use(nonceMiddleware);
app.use(securityHeadersMiddleware);
app.use(protectedPathsMiddleware);
app.use(botProtectionMiddleware);

app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use(geoRedirectMiddleware);
app.use(regionDetectionMiddleware);

// Add Supabase auth middleware to process JWT tokens
app.use(supabaseAuthMiddleware);

// Per-request RLS context: acquires an app_user connection and injects
// app.current_user_id / app.current_user_type so PostgreSQL RLS policies
// can evaluate them. Only active when APP_DB_URL is set in production.
// Attaches res.locals.rlsDb for routes that want tenant-isolated queries.
app.use(dbContextMiddleware);

// Prevent Cloudflare and other CDNs from caching API responses.
// Without this, Cloudflare serves stale JSON (old course names, missing courses, etc.)
// because it treats API responses like static assets and caches them aggressively.
// Static file routes (/institutions/, /thumbnails/, etc.) are unaffected.
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

const SENSITIVE_FIELDS = [
  "password", "token", "secret", "apiKey", "api_key", "accessToken", "access_token",
  "refreshToken", "refresh_token", "authorization", "cookie", "session",
  "email", "phone", "address", "ssn", "creditCard", "credit_card",
  "documentUrl", "document_url", "profileImageUrl", "profile_image_url"
];

function sanitizeLogData(data: any, depth = 0): any {
  if (depth > 3 || data === null || data === undefined) return "[truncated]";
  if (typeof data !== "object") return typeof data === "string" && data.length > 50 ? "[string]" : data;
  if (Array.isArray(data)) return `[array:${data.length}]`;
  
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
      sanitized[key] = "[redacted]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = "[object]";
    } else if (typeof value === "string" && value.length > 100) {
      sanitized[key] = "[long_string]";
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      if (capturedJsonResponse && res.statusCode >= 400) {
        const sanitized = sanitizeLogData(capturedJsonResponse);
        logLine += ` :: ${JSON.stringify(sanitized)}`;
      }

      if (logLine.length > 120) {
        logLine = logLine.slice(0, 119) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Sentry error handler must come right after routes, before any other error handlers
  if (process.env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
  }

  app.use(csrfErrorHandler);

  // Multer upload-limit errors → proper HTTP status codes instead of generic 500
  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const multerMessages: Record<string, { status: number; message: string }> = {
      LIMIT_FILE_SIZE:       { status: 413, message: "File is too large. Maximum size is 10 MB." },
      LIMIT_FILE_COUNT:      { status: 400, message: "Too many files uploaded at once." },
      LIMIT_UNEXPECTED_FILE: { status: 400, message: "Unexpected file field in the upload." },
      LIMIT_FIELD_COUNT:     { status: 400, message: "Too many form fields." },
      LIMIT_PART_COUNT:      { status: 400, message: "Too many parts in the upload." },
    };
    if (err && err.code && multerMessages[err.code]) {
      const { status, message } = multerMessages[err.code];
      return res.status(status).json({ message });
    }
    next(err);
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    // In production: serve static files first, then inject page-specific meta
    // into index.html before sending it to crawlers/browsers
    const distPath = path.resolve(import.meta.dirname, "public");
    // index: false — prevents express.static from serving index.html directly,
    // which would bypass the nonce injection in the catch-all below.
    app.use(express.static(distPath, {
      index: false,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else if (filePath.includes('/assets/')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=86400');
        }
      }
    }));
    app.use("*", async (req: Request, res: Response) => {
      try {
        const indexPath = path.resolve(distPath, "index.html");
        const html = await fs.promises.readFile(indexPath, "utf-8");
        const hostname = req.hostname || req.headers.host || "anzglobal.com.au";
        let injected = await injectPageMeta(req.originalUrl, html, hostname);

        // Inject the per-request nonce into every <script tag so the browser
        // will execute them under the matching 'nonce-{value}' CSP directive.
        const nonce = res.locals.nonce as string | undefined;
        if (nonce) {
          injected = injectNonce(injected, nonce);
        }

        res.set("Content-Type", "text/html").send(injected);
      } catch {
        // Fallback: still inject nonce even when meta-injection fails, so CSP
        // nonce in the response header always matches the nonce in the HTML.
        try {
          const indexPath = path.resolve(distPath, "index.html");
          const raw = await fs.promises.readFile(indexPath, "utf-8");
          const nonce = res.locals.nonce as string | undefined;
          const page = nonce ? injectNonce(raw, nonce) : raw;
          res.set("Content-Type", "text/html").send(page);
        } catch {
          res.status(500).send("Internal Server Error");
        }
      }
    });
  }

  // Bind the port before running migrations so that Replit's production
  // health-check window is satisfied immediately. Migrations, seeding, and
  // Pinecone init all run in the background after the server is listening.
  // Any failure is logged but does NOT crash the already-running server.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });

  // Run DB migrations and seed data after the port is open.
  // In production the Neon database may need several seconds to wake from
  // idle — running these async ensures the health-check is never blocked.
  (async () => {
    try {
      await runMigrations();
      await seedDefaultRoles();
      await seedDefaultProfiles();
      const { seedAiJobDefaults } = await import("./ai");
      await seedAiJobDefaults();
      log('Startup tasks complete (migrations + seeds)');
    } catch (err) {
      console.error('[Server] Startup task failed (migrations/seeds):', err);
    }

    // Ensure Supabase Storage buckets exist (non-blocking)
    try {
      const { ensureBuckets } = await import("./file-storage");
      await ensureBuckets();
    } catch (err) {
      console.error('[Server] Supabase Storage bucket init failed:', err);
    }

    // Initialize Pinecone index in background (non-blocking)
    initializePineconeIndex().catch((error) => {
      console.error('[Pinecone] Failed to initialize index:', error);
      console.error('[Pinecone] Chat agent will not function until index is ready');
    });
  })();
})();
