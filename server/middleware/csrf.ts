import { doubleCsrf } from "csrf-csrf";
import type { Request, Response, NextFunction } from "express";

const isProd = process.env.NODE_ENV === "production";

const csrfConfig = doubleCsrf({
  getSecret: () => process.env.SESSION_SECRET || "development-csrf-secret",
  getSessionIdentifier: (req: Request) => {
    const sessionId = (req as any).sessionID || 
                      (req as any).session?.id || 
                      req.ip || 
                      "anonymous";
    return sessionId;
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

export function csrfTokenEndpoint(req: Request, res: Response) {
  const token = csrfConfig.generateCsrfToken(req, res);
  res.json({ csrfToken: token });
}
