/**
 * HTTP-level integration tests for rate-limited endpoints.
 *
 * These tests import the SAME limiter instances used by production route
 * handlers (from server/middleware/rate-limit-instances.ts). A minimal
 * Express app is built for each endpoint, replicating the exact middleware
 * pattern from the real route, so:
 *
 *  1. Any change to a limiter's window or max in rate-limit-instances.ts
 *     immediately changes the test outcome (no config drift).
 *  2. Tests run at HTTP level via supertest — status codes, Retry-After
 *     headers, and JSON bodies are all verified.
 *  3. No external services (DB, Supabase, Redis) are required.
 *
 * Endpoints covered:
 *   - Login            signinLimiter         (10 / 15 min)
 *   - Forgot-password  forgotPasswordLimiter  (5  / 60 min)
 *   - Public leads     publicLeadsLimiter     (20 / 60 min)
 *   - Contact inquiry  contactInquiryLimiter  (20 / 60 min)
 *   - Zan chat         zanChatLimiter         (60 / 60 min)
 *   - Scrape trigger   scrapingTriggerLimiter (20 / 60 min)
 *   - Scrape test      scrapingTestLimiter    (20 / 60 min)
 *
 * Run with: bun test server/tests/rate-limit-integration.test.ts
 */

import { describe, test, expect } from "bun:test";
import express from "express";
import request from "supertest";
import {
  signinLimiter,
  forgotPasswordLimiter,
  publicLeadsLimiter,
  contactInquiryLimiter,
  zanChatLimiter,
  scrapingTriggerLimiter,
  scrapingTestLimiter,
} from "../middleware/rate-limit-instances";
import { getClientIp, replyTooManyRequests } from "../middleware/rate-limit";
import type { RateLimitResult } from "../middleware/rate-limit";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type LimiterFn = (key: string) => RateLimitResult;

/**
 * Build a minimal Express app that replicates the production rate-limit
 * pattern used in every route handler:
 *
 *   const rl = limiter(keySource(req));
 *   if (!rl.allowed) return replyTooManyRequests(res, rl, label);
 *   res.status(200).json({ ok: true });
 *
 * @param limiter   - Imported production limiter instance
 * @param keySource - How the real route derives its key (IP or user ID)
 * @param label     - Human-readable name for the 429 message (matches prod)
 */
function buildTestApp(
  limiter: LimiterFn,
  keySource: (req: express.Request) => string,
  label: string
) {
  const app = express();
  app.post("/test", (req, res) => {
    const rl = limiter(keySource(req));
    if (!rl.allowed) return replyTooManyRequests(res, rl, label);
    res.status(200).json({ ok: true });
  });
  return app;
}

/** Fire `n` POST /test requests against a supertest agent. Returns all responses. */
async function fireHTTP(app: express.Express, n: number, ip = "1.2.3.4") {
  const agent = request(app);
  const results: { status: number; headers: Record<string, string> }[] = [];
  for (let i = 0; i < n; i++) {
    const res = await agent.post("/test").set("X-Forwarded-For", ip);
    results.push({ status: res.status, headers: res.headers as Record<string, string> });
  }
  return results;
}

// ---------------------------------------------------------------------------
// Login — signinLimiter: 10 per 15 min
// Route: supabase-auth-routes.ts — uses getClientIp(req)
// Task spec: 11th request within 15 min → 429 with Retry-After
// ---------------------------------------------------------------------------

describe("HTTP: Login rate limit (10 per 15 min)", () => {
  const app = buildTestApp(signinLimiter, getClientIp, "Too many login attempts");

  test("first 10 requests return 200", async () => {
    const ip = "10.0.0.1";
    const results = await fireHTTP(app, 10, ip);
    expect(results.every((r) => r.status === 200)).toBe(true);
  });

  test("11th request returns 429", async () => {
    const ip = "10.0.0.2";
    const results = await fireHTTP(app, 11, ip);
    const last = results[10];
    expect(last.status).toBe(429);
  });

  test("429 response includes Retry-After header", async () => {
    const ip = "10.0.0.3";
    const results = await fireHTTP(app, 11, ip);
    const last = results[10];
    expect(last.headers["retry-after"]).toBeDefined();
    expect(Number(last.headers["retry-after"])).toBeGreaterThan(0);
  });

  test("different IPs are tracked independently", async () => {
    const a = await fireHTTP(app, 10, "10.1.0.1"); // exhaust
    expect(a.every((r) => r.status === 200)).toBe(true);
    const b = await fireHTTP(app, 1, "10.1.0.2"); // fresh IP
    expect(b[0].status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Forgot-password — forgotPasswordLimiter: 5 per hour
// Route: supabase-auth-routes.ts — uses getClientIp(req)
// Task spec: 6th request within 1 hour → 429
// ---------------------------------------------------------------------------

describe("HTTP: Forgot-password rate limit (5 per hour)", () => {
  const app = buildTestApp(forgotPasswordLimiter, getClientIp, "Too many password reset requests");

  test("first 5 requests return 200", async () => {
    const ip = "20.0.0.1";
    const results = await fireHTTP(app, 5, ip);
    expect(results.every((r) => r.status === 200)).toBe(true);
  });

  test("6th request returns 429", async () => {
    const ip = "20.0.0.2";
    const results = await fireHTTP(app, 6, ip);
    expect(results[5].status).toBe(429);
  });

  test("429 response includes Retry-After header", async () => {
    const ip = "20.0.0.3";
    const results = await fireHTTP(app, 6, ip);
    expect(Number(results[5].headers["retry-after"])).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Public leads — publicLeadsLimiter: 20 per hour
// Route: routes.ts POST /api/leads — uses getClientIp(req)
// Task spec: 21st request within 1 hour → 429
// ---------------------------------------------------------------------------

describe("HTTP: Public leads rate limit (20 per hour)", () => {
  const app = buildTestApp(publicLeadsLimiter, getClientIp, "Too many form submissions");

  test("first 20 requests return 200", async () => {
    const ip = "30.0.0.1";
    const results = await fireHTTP(app, 20, ip);
    expect(results.every((r) => r.status === 200)).toBe(true);
  });

  test("21st request returns 429", async () => {
    const ip = "30.0.0.2";
    const results = await fireHTTP(app, 21, ip);
    expect(results[20].status).toBe(429);
  });

  test("429 response includes Retry-After header", async () => {
    const ip = "30.0.0.3";
    const results = await fireHTTP(app, 21, ip);
    expect(Number(results[20].headers["retry-after"])).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Contact inquiry — contactInquiryLimiter: 20 per hour
// Route: routes.ts — uses getClientIp(req)
// Task spec: 21st request within 1 hour → 429
// ---------------------------------------------------------------------------

describe("HTTP: Contact inquiry rate limit (20 per hour)", () => {
  const app = buildTestApp(contactInquiryLimiter, getClientIp, "Too many contact submissions");

  test("first 20 requests return 200", async () => {
    const ip = "40.0.0.1";
    const results = await fireHTTP(app, 20, ip);
    expect(results.every((r) => r.status === 200)).toBe(true);
  });

  test("21st request returns 429", async () => {
    const ip = "40.0.0.2";
    const results = await fireHTTP(app, 21, ip);
    expect(results[20].status).toBe(429);
  });

  test("429 response includes Retry-After header", async () => {
    const ip = "40.0.0.3";
    const results = await fireHTTP(app, 21, ip);
    expect(Number(results[20].headers["retry-after"])).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Zan chat — zanChatLimiter: 60 per hour
// Route: chat-routes.ts — uses userId ?? sessionId as key
// Task spec: 61st message within 1 hour → 429
// ---------------------------------------------------------------------------

describe("HTTP: Zan chat rate limit (60 per hour)", () => {
  // Zan routes key on userId or sessionId, not IP. We replicate that here.
  const app = buildTestApp(
    zanChatLimiter,
    (req) => (req.headers["x-user-id"] as string) ?? getClientIp(req),
    "Chat message limit reached"
  );

  test("first 60 messages return 200", async () => {
    const results: { status: number; headers: Record<string, string> }[] = [];
    const agent = request(app);
    for (let i = 0; i < 60; i++) {
      const res = await agent.post("/test").set("x-user-id", "user-zan-1");
      results.push({ status: res.status, headers: res.headers as Record<string, string> });
    }
    expect(results.every((r) => r.status === 200)).toBe(true);
  });

  test("61st message returns 429", async () => {
    const agent = request(app);
    let last = { status: 0, headers: {} as Record<string, string> };
    for (let i = 0; i < 61; i++) {
      const res = await agent.post("/test").set("x-user-id", "user-zan-2");
      last = { status: res.status, headers: res.headers as Record<string, string> };
    }
    expect(last.status).toBe(429);
  });

  test("429 response includes Retry-After header", async () => {
    const agent = request(app);
    let last = { status: 0, headers: {} as Record<string, string> };
    for (let i = 0; i < 61; i++) {
      const res = await agent.post("/test").set("x-user-id", "user-zan-3");
      last = { status: res.status, headers: res.headers as Record<string, string> };
    }
    expect(Number(last.headers["retry-after"])).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Scraping trigger — scrapingTriggerLimiter: 20 per hour
// Route: scraping-routes.ts — uses req.user.id (user ID string)
// Task spec: 21st call by same user within 1 hour → 429
// ---------------------------------------------------------------------------

describe("HTTP: Scraping trigger rate limit (20 per hour)", () => {
  const app = buildTestApp(
    scrapingTriggerLimiter,
    (req) => (req.headers["x-user-id"] as string) ?? getClientIp(req),
    "Scraping job limit reached"
  );

  test("first 20 calls return 200", async () => {
    const agent = request(app);
    const results: { status: number }[] = [];
    for (let i = 0; i < 20; i++) {
      const res = await agent.post("/test").set("x-user-id", "admin-1");
      results.push({ status: res.status });
    }
    expect(results.every((r) => r.status === 200)).toBe(true);
  });

  test("21st call returns 429", async () => {
    const agent = request(app);
    let last = { status: 0, headers: {} as Record<string, string> };
    for (let i = 0; i < 21; i++) {
      const res = await agent.post("/test").set("x-user-id", "admin-2");
      last = { status: res.status, headers: res.headers as Record<string, string> };
    }
    expect(last.status).toBe(429);
  });

  test("429 response includes Retry-After header", async () => {
    const agent = request(app);
    let last = { status: 0, headers: {} as Record<string, string> };
    for (let i = 0; i < 21; i++) {
      const res = await agent.post("/test").set("x-user-id", "admin-3");
      last = { status: res.status, headers: res.headers as Record<string, string> };
    }
    expect(Number(last.headers["retry-after"])).toBeGreaterThan(0);
  });

  test("different users are tracked independently", async () => {
    const agent = request(app);
    for (let i = 0; i < 21; i++) {
      await agent.post("/test").set("x-user-id", "admin-4");
    }
    const freshUser = await agent.post("/test").set("x-user-id", "admin-5");
    expect(freshUser.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Scraping test — scrapingTestLimiter: 20 per hour
// Route: scraping-routes.ts — uses req.user.id
// Task spec: 21st call by same user within 1 hour → 429
// ---------------------------------------------------------------------------

describe("HTTP: Scraping test rate limit (20 per hour)", () => {
  const app = buildTestApp(
    scrapingTestLimiter,
    (req) => (req.headers["x-user-id"] as string) ?? getClientIp(req),
    "Scraping test limit reached"
  );

  test("first 20 calls return 200", async () => {
    const agent = request(app);
    const results: { status: number }[] = [];
    for (let i = 0; i < 20; i++) {
      const res = await agent.post("/test").set("x-user-id", "tester-1");
      results.push({ status: res.status });
    }
    expect(results.every((r) => r.status === 200)).toBe(true);
  });

  test("21st call returns 429", async () => {
    const agent = request(app);
    let last = { status: 0, headers: {} as Record<string, string> };
    for (let i = 0; i < 21; i++) {
      const res = await agent.post("/test").set("x-user-id", "tester-2");
      last = { status: res.status, headers: res.headers as Record<string, string> };
    }
    expect(last.status).toBe(429);
  });

  test("429 response includes Retry-After header", async () => {
    const agent = request(app);
    let last = { status: 0, headers: {} as Record<string, string> };
    for (let i = 0; i < 21; i++) {
      const res = await agent.post("/test").set("x-user-id", "tester-3");
      last = { status: res.status, headers: res.headers as Record<string, string> };
    }
    expect(Number(last.headers["retry-after"])).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 429 response body shape — common across all endpoints
// ---------------------------------------------------------------------------

describe("HTTP: 429 response body shape", () => {
  const app = buildTestApp(signinLimiter, getClientIp, "Too many login attempts");

  test("429 body contains error, message, retryAfter", async () => {
    const ip = "99.0.0.1";
    const agent = request(app);
    for (let i = 0; i < 10; i++) {
      await agent.post("/test").set("X-Forwarded-For", ip);
    }
    const res = await agent.post("/test").set("X-Forwarded-For", ip);
    expect(res.status).toBe(429);
    expect(res.body.error).toBe("Too many requests");
    expect(typeof res.body.message).toBe("string");
    expect(typeof res.body.retryAfter).toBe("number");
    expect(res.body.retryAfter).toBeGreaterThan(0);
  });
});
