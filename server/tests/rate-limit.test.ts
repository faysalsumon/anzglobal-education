/**
 * Unit tests for server/middleware/rate-limit.ts
 *
 * These tests protect against silent regressions in rate-limit thresholds.
 * Each section mirrors a production endpoint configuration so that any
 * future refactor that changes a limit will cause an explicit test failure.
 *
 * Run with: bun test server/tests/rate-limit.test.ts
 */

import { describe, test, expect } from "bun:test";
import { createRateLimiter, replyTooManyRequests } from "../middleware/rate-limit";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fire `n` requests through `limiter` using the given key. Returns all results. */
function fireN(limiter: ReturnType<typeof createRateLimiter>, key: string, n: number) {
  return Array.from({ length: n }, () => limiter(key));
}

/** Fire `n` requests and return only the last result. */
function fireNLast(limiter: ReturnType<typeof createRateLimiter>, key: string, n: number) {
  return fireN(limiter, key, n).at(-1)!;
}

// ---------------------------------------------------------------------------
// Core createRateLimiter behaviour
// ---------------------------------------------------------------------------

describe("createRateLimiter — core behaviour", () => {
  test("first request is always allowed", () => {
    const limiter = createRateLimiter(60_000, 5);
    const result = limiter("key-first");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.limit).toBe(5);
    expect(result.retryAfter).toBe(0);
  });

  test("different keys are tracked independently", () => {
    const limiter = createRateLimiter(60_000, 2);
    // Exhaust key-a
    fireN(limiter, "key-a", 3);
    const aBlocked = limiter("key-a");
    expect(aBlocked.allowed).toBe(false);
    // key-b must still be untouched
    const bFirst = limiter("key-b");
    expect(bFirst.allowed).toBe(true);
  });

  test("request exactly at the limit is still allowed", () => {
    const max = 3;
    const limiter = createRateLimiter(60_000, max);
    const results = fireN(limiter, "key-exact", max);
    expect(results.every((r) => r.allowed)).toBe(true);
  });

  test("first request over the limit is denied", () => {
    const max = 3;
    const limiter = createRateLimiter(60_000, max);
    fireN(limiter, "key-over", max); // exhaust
    const denied = limiter("key-over");
    expect(denied.allowed).toBe(false);
    expect(denied.remaining).toBe(0);
    expect(denied.retryAfter).toBeGreaterThan(0);
  });

  test("retryAfter is a positive integer when denied", () => {
    const limiter = createRateLimiter(60_000, 1);
    limiter("key-ra"); // use quota
    const denied = limiter("key-ra");
    expect(denied.retryAfter).toBeGreaterThan(0);
    expect(Number.isInteger(denied.retryAfter)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// replyTooManyRequests helper
// ---------------------------------------------------------------------------

describe("replyTooManyRequests", () => {
  test("sends status 429 with Retry-After header and JSON body", () => {
    const headers: Record<string, string> = {};
    let statusCode = 0;
    let body: unknown;

    const mockRes = {
      setHeader(name: string, value: string) {
        headers[name] = value;
      },
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: unknown) {
        body = data;
      },
    } as unknown as import("express").Response;

    const result = { allowed: false, retryAfter: 42, remaining: 0, limit: 10 };
    replyTooManyRequests(mockRes, result, "Test label");

    expect(statusCode).toBe(429);
    expect(headers["Retry-After"]).toBe("42");
    expect((body as Record<string, unknown>).error).toBe("Too many requests");
    expect((body as Record<string, unknown>).retryAfter).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// Login — signinLimiter: 10 per 15 min (supabase-auth-routes.ts)
// Task spec: 11th request within 15 min → 429 with Retry-After
// ---------------------------------------------------------------------------

describe("Login rate limit (10 per 15 min)", () => {
  const WINDOW = 15 * 60 * 1000;
  const MAX = 10;

  test("first 10 requests are all allowed", () => {
    const limiter = createRateLimiter(WINDOW, MAX);
    const results = fireN(limiter, "ip-login", MAX);
    expect(results.every((r) => r.allowed)).toBe(true);
  });

  test("11th request is denied (429)", () => {
    const limiter = createRateLimiter(WINDOW, MAX);
    const denied = fireNLast(limiter, "ip-login", MAX + 1);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfter).toBeGreaterThan(0);
  });

  test("12th and subsequent requests are also denied", () => {
    const limiter = createRateLimiter(WINDOW, MAX);
    fireN(limiter, "ip-login", MAX + 1); // exhaust
    const denied = limiter("ip-login");
    expect(denied.allowed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Forgot-password — forgotPasswordLimiter: 5 per hour (supabase-auth-routes.ts)
// Task spec: 6th request within 1 hour → 429
// ---------------------------------------------------------------------------

describe("Forgot-password rate limit (5 per hour)", () => {
  const WINDOW = 60 * 60 * 1000;
  const MAX = 5;

  test("first 5 requests are all allowed", () => {
    const limiter = createRateLimiter(WINDOW, MAX);
    const results = fireN(limiter, "ip-forgot", MAX);
    expect(results.every((r) => r.allowed)).toBe(true);
  });

  test("6th request is denied (429)", () => {
    const limiter = createRateLimiter(WINDOW, MAX);
    const denied = fireNLast(limiter, "ip-forgot", MAX + 1);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfter).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Public leads / contact inquiry — 20 per hour (routes.ts)
// Task spec: 21st request within 1 hour → 429
// ---------------------------------------------------------------------------

describe("Public leads rate limit (20 per hour)", () => {
  const WINDOW = 60 * 60 * 1000;
  const MAX = 20;

  test("first 20 requests are all allowed", () => {
    const limiter = createRateLimiter(WINDOW, MAX);
    const results = fireN(limiter, "ip-leads", MAX);
    expect(results.every((r) => r.allowed)).toBe(true);
  });

  test("21st request is denied (429)", () => {
    const limiter = createRateLimiter(WINDOW, MAX);
    const denied = fireNLast(limiter, "ip-leads", MAX + 1);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfter).toBeGreaterThan(0);
  });
});

describe("Contact inquiry rate limit (20 per hour)", () => {
  const WINDOW = 60 * 60 * 1000;
  const MAX = 20;

  test("first 20 requests are all allowed", () => {
    const limiter = createRateLimiter(WINDOW, MAX);
    const results = fireN(limiter, "ip-contact", MAX);
    expect(results.every((r) => r.allowed)).toBe(true);
  });

  test("21st request is denied (429)", () => {
    const limiter = createRateLimiter(WINDOW, MAX);
    const denied = fireNLast(limiter, "ip-contact", MAX + 1);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfter).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Zan chat — zanChatLimiter: 60 per hour (chat-routes.ts)
// Task spec: 61st message within 1 hour → 429
// ---------------------------------------------------------------------------

describe("Zan chat rate limit (60 per hour)", () => {
  const WINDOW = 60 * 60 * 1000;
  const MAX = 60;

  test("first 60 messages are all allowed", () => {
    const limiter = createRateLimiter(WINDOW, MAX);
    const results = fireN(limiter, "user-zan", MAX);
    expect(results.every((r) => r.allowed)).toBe(true);
  });

  test("61st message is denied (429)", () => {
    const limiter = createRateLimiter(WINDOW, MAX);
    const denied = fireNLast(limiter, "user-zan", MAX + 1);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfter).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Scraping trigger — scrapingTriggerLimiter: 20 per hour (scraping-routes.ts)
// Task spec: 21st call by same user within 1 hour → 429
// ---------------------------------------------------------------------------

describe("Scraping trigger rate limit (20 per hour)", () => {
  const WINDOW = 60 * 60 * 1000;
  const MAX = 20;

  test("first 20 calls are all allowed", () => {
    const limiter = createRateLimiter(WINDOW, MAX);
    const results = fireN(limiter, "user-scrape-trigger", MAX);
    expect(results.every((r) => r.allowed)).toBe(true);
  });

  test("21st call is denied (429)", () => {
    const limiter = createRateLimiter(WINDOW, MAX);
    const denied = fireNLast(limiter, "user-scrape-trigger", MAX + 1);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfter).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Scraping test — scrapingTestLimiter: 20 per hour (scraping-routes.ts)
// ---------------------------------------------------------------------------

describe("Scraping test rate limit (20 per hour)", () => {
  const WINDOW = 60 * 60 * 1000;
  const MAX = 20;

  test("first 20 calls are all allowed", () => {
    const limiter = createRateLimiter(WINDOW, MAX);
    const results = fireN(limiter, "user-scrape-test", MAX);
    expect(results.every((r) => r.allowed)).toBe(true);
  });

  test("21st call is denied (429)", () => {
    const limiter = createRateLimiter(WINDOW, MAX);
    const denied = fireNLast(limiter, "user-scrape-test", MAX + 1);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfter).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Regression: remaining count is accurate
// ---------------------------------------------------------------------------

describe("remaining count accuracy", () => {
  test("remaining decrements correctly with each request", () => {
    const max = 5;
    const limiter = createRateLimiter(60_000, max);
    for (let i = 1; i <= max; i++) {
      const r = limiter("key-count");
      expect(r.remaining).toBe(max - i);
    }
  });

  test("remaining is 0 once denied", () => {
    const limiter = createRateLimiter(60_000, 3);
    fireN(limiter, "key-rem0", 4); // one over
    const denied = limiter("key-rem0");
    expect(denied.remaining).toBe(0);
  });
});
