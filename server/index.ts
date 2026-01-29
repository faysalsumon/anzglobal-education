import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializePineconeIndex } from "./knowledge-base";
import { regionDetectionMiddleware } from "./middleware/region-detection";
import { csrfErrorHandler } from "./middleware/csrf";
import { supabaseAuthMiddleware } from "./supabase-middleware";
import { botProtectionMiddleware, securityHeadersMiddleware, protectedPathsMiddleware } from "./middleware/bot-protection";

const app = express();

// Trust proxy for accurate client IP detection behind reverse proxy
app.set('trust proxy', 1);

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(cookieParser());

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

app.use(regionDetectionMiddleware);

// Add Supabase auth middleware to process JWT tokens
app.use(supabaseAuthMiddleware);

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
    serveStatic(app);
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
