import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import fs from "fs";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { injectPageMeta } from "./meta-injector";
import { initializePineconeIndex } from "./knowledge-base";
import { regionDetectionMiddleware, geoRedirectMiddleware } from "./middleware/region-detection";
import { csrfErrorHandler } from "./middleware/csrf";
import { supabaseAuthMiddleware } from "./supabase-middleware";
import { botProtectionMiddleware, securityHeadersMiddleware, protectedPathsMiddleware } from "./middleware/bot-protection";
import { runMigrations } from "./migrate";
import { seedDefaultRoles } from "./seed-roles";
import { seedDefaultProfiles } from "./seed-profiles";

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

// Bot protection and security headers (must be early in middleware chain)
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
  await runMigrations();

  // Seed default roles (idempotent — skips existing rows)
  await seedDefaultRoles();

  // Seed default profiles (idempotent — skips existing rows)
  await seedDefaultProfiles();

  // Seed default AI job settings after migrations
  const { seedAiJobDefaults } = await import("./ai");
  await seedAiJobDefaults();

  const server = await registerRoutes(app);

  // Initialize Pinecone index in background (non-blocking)
  initializePineconeIndex().catch((error) => {
    console.error('[Pinecone] Failed to initialize index:', error);
    console.error('[Pinecone] Chat agent will not function until index is ready');
  });

  app.use(csrfErrorHandler);

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
    app.use(express.static(distPath, {
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
        const injected = await injectPageMeta(req.originalUrl, html, hostname);
        res.set("Content-Type", "text/html").send(injected);
      } catch {
        res.sendFile(path.resolve(distPath, "index.html"));
      }
    });
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
