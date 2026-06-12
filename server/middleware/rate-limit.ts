import type { Request } from "express";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
  remaining: number;
  limit: number;
}

/**
 * Returns the real client IP, respecting X-Forwarded-For (set by Replit's proxy).
 * Consistent with the pattern used in bot-protection.ts.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.ip || req.socket.remoteAddress || "unknown";
}

/**
 * Creates a lightweight in-process rate limiter keyed by an arbitrary string.
 * Uses the same Map<key, {count, resetTime}> pattern as bot-protection.ts.
 *
 * @param windowMs  - Rolling window in milliseconds
 * @param max       - Maximum requests allowed per window
 * @returns check(key) — call with an IP, userId, or any string key
 *
 * Usage:
 *   const limiter = createRateLimiter(15 * 60 * 1000, 10); // 10 per 15 min
 *   const result = limiter(clientIp);
 *   if (!result.allowed) return res.status(429)...;
 */
export function createRateLimiter(windowMs: number, max: number) {
  const store = new Map<string, RateLimitRecord>();

  // Purge expired entries once per window to prevent unbounded memory growth
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (now > record.resetTime) store.delete(key);
    }
  }, windowMs);

  return function check(key: string): RateLimitResult {
    const now = Date.now();
    const record = store.get(key);

    if (!record || now > record.resetTime) {
      store.set(key, { count: 1, resetTime: now + windowMs });
      return { allowed: true, retryAfter: 0, remaining: max - 1, limit: max };
    }

    record.count++;
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);

    if (record.count > max) {
      return { allowed: false, retryAfter, remaining: 0, limit: max };
    }

    return { allowed: true, retryAfter: 0, remaining: max - record.count, limit: max };
  };
}

/**
 * Convenience: sends a standardised 429 response matching the shape used in
 * bot-protection.ts: { error, message, retryAfter }.
 */
export function replyTooManyRequests(
  res: import("express").Response,
  result: RateLimitResult,
  label: string
): void {
  res.setHeader("Retry-After", String(result.retryAfter));
  res.status(429).json({
    error: "Too many requests",
    message: `${label}. Please try again in ${result.retryAfter} seconds.`,
    retryAfter: result.retryAfter,
  });
}
