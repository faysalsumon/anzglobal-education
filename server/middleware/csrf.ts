import { doubleCsrf } from "csrf-csrf";
import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { supabaseAdmin } from "../supabase";
import { storage } from "../storage";

const isProd = process.env.NODE_ENV === "production";

const csrfConfig = doubleCsrf({
  getSecret: () => process.env.SESSION_SECRET || "development-csrf-secret",
  getSessionIdentifier: (req: Request) => {
    // For Supabase-authenticated users, use their user ID/email as session identifier
    // This is set by supabaseAuthMiddleware which runs before this
    const supabaseUser = (req as any).supabaseUser;
    if (supabaseUser?.email) {
      return `supabase:${supabaseUser.email}`;
    }
    if (supabaseUser?.id) {
      return `supabase:${supabaseUser.id}`;
    }
    
    // For anonymous users, read the stable cookie-based identifier
    // The cookie is set by csrfTokenEndpoint before token generation
    const anonId = (req as any).cookies?.["csrf-session"];
    if (anonId) {
      return `anon:${anonId}`;
    }
    
    // Fallback: use a temporary identifier based on cookies + IP
    // This should rarely be used as csrfTokenEndpoint sets the cookie first
    const fallbackId = (req as any).cookies?.["csrf"] || req.ip || "anonymous";
    return `fallback:${fallbackId}`;
  },
  cookieName: isProd ? "__Host-csrf" : "csrf",
  cookieOptions: {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    path: "/",
  },
  size: 64,
  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
  getCsrfTokenFromRequest: (req: Request) => {
    return req.headers["x-csrf-token"] as string || 
           req.body?._csrf || 
           req.query?._csrf as string;
  },
});

export const doubleCsrfProtection = csrfConfig.doubleCsrfProtection;
export const invalidCsrfTokenError = csrfConfig.invalidCsrfTokenError;

export function csrfErrorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err === invalidCsrfTokenError) {
    console.warn(`[CSRF] Invalid token for ${req.method} ${req.path} from ${req.ip}`);
    return res.status(403).json({
      error: "Invalid CSRF token",
      message: "Your session may have expired. Please refresh the page and try again.",
    });
  }
  next(err);
}

export async function csrfTokenEndpoint(req: Request, res: Response) {
  // First, check if user is authenticated via Supabase (even if middleware hasn't run yet)
  // This ensures CSRF tokens are generated with the same session identifier used for validation
  if (!(req as any).supabaseUser) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      if (token && supabaseAdmin) {
        try {
          const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
          if (!error && user) {
            const dbUser = await storage.getUserByEmail(user.email!);
            if (dbUser) {
              (req as any).supabaseUser = {
                id: dbUser.id,
                email: dbUser.email,
                userType: dbUser.userType,
                authProvider: "supabase",
              };
            } else {
              (req as any).supabaseUser = {
                id: user.id,
                email: user.email,
                authProvider: "supabase",
              };
            }
          }
        } catch (err) {
          // Silently continue - user will get anonymous session identifier
        }
      }
    }
  }
  
  // For anonymous users, ensure they have a stable session cookie BEFORE generating token
  // This cookie must be set before generateCsrfToken is called so getSessionIdentifier can read it
  const supabaseUser = (req as any).supabaseUser;
  let anonId = (req as any).cookies?.["csrf-session"];
  
  if (!supabaseUser && !anonId) {
    anonId = crypto.randomBytes(16).toString("hex");
    // Set the cookie with consistent attributes (always use Lax for anonymous sessions)
    res.cookie("csrf-session", anonId, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
    // Also set on the request object so getSessionIdentifier can access it immediately
    (req as any).cookies = (req as any).cookies || {};
    (req as any).cookies["csrf-session"] = anonId;
  }
  
  const csrfToken = csrfConfig.generateCsrfToken(req, res);
  res.json({ csrfToken });
}
