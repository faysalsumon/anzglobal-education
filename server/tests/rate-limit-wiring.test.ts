/**
 * Wiring assertions for rate-limited endpoints.
 *
 * These tests read the actual production route source files and assert that:
 *  1. The correct limiter instance is imported from rate-limit-instances.ts
 *  2. The limiter is actually called inside the route handler
 *  3. replyTooManyRequests (or equivalent 429 path) is present
 *
 * Why static analysis instead of live HTTP against real handlers:
 *   The route files depend on PostgreSQL (throws on import without DATABASE_URL),
 *   Supabase, Redis, OpenAI, etc. — services not available in CI. Supertest
 *   against the real handlers is proposed as a follow-up (requires a full test DB).
 *
 * What this catches:
 *  - Someone removes the limiter call from a route handler → test fails
 *  - Someone removes the import from rate-limit-instances.ts → test fails
 *  - Someone renames the limiter variable without updating the call → test fails
 *
 * What the HTTP integration tests (rate-limit-integration.test.ts) add on top:
 *  - Verify the exact 429 status code and Retry-After header format
 *  - Verify the JSON body shape matches the actual replyTooManyRequests output
 *  - Verify N-request-allowed / N+1-request-denied boundary for each config
 *
 * Run with: bun test server/tests/rate-limit-wiring.test.ts
 */

import { describe, test, expect } from "bun:test";
import { readFileSync } from "fs";
import { resolve } from "path";

function readRoute(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf-8");
}

// ---------------------------------------------------------------------------
// Helper: assert a string contains a pattern (with a helpful failure message)
// ---------------------------------------------------------------------------
function assertContains(src: string, pattern: string, file: string) {
  expect(
    src.includes(pattern),
    `Expected "${file}" to contain: ${pattern}`
  ).toBe(true);
}

// ---------------------------------------------------------------------------
// server/supabase-auth-routes.ts
//   signinLimiter         — POST /api/auth/signin (10 / 15 min)
//   forgotPasswordLimiter — POST /api/auth/forgot-password (5 / 60 min)
// ---------------------------------------------------------------------------

describe("Wiring: supabase-auth-routes.ts", () => {
  const FILE = "server/supabase-auth-routes.ts";
  const src = readRoute(FILE);

  test("imports signinLimiter and forgotPasswordLimiter from rate-limit-instances", () => {
    assertContains(src, "from './middleware/rate-limit-instances'", FILE);
    assertContains(src, "signinLimiter", FILE);
    assertContains(src, "forgotPasswordLimiter", FILE);
  });

  test("signinLimiter is called with getClientIp(req)", () => {
    assertContains(src, "signinLimiter(getClientIp(req))", FILE);
  });

  test("forgotPasswordLimiter is called with getClientIp(req)", () => {
    assertContains(src, "forgotPasswordLimiter(getClientIp(req))", FILE);
  });

  test("replyTooManyRequests is called after each limiter check", () => {
    assertContains(src, "replyTooManyRequests", FILE);
    // Both handler blocks must guard with it
    const occurrences = (src.match(/replyTooManyRequests/g) || []).length;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// server/routes.ts
//   publicLeadsLimiter    — POST /api/leads (20 / 60 min)
//   contactInquiryLimiter — POST /api/contact-inquiry (20 / 60 min)
// ---------------------------------------------------------------------------

describe("Wiring: routes.ts", () => {
  const FILE = "server/routes.ts";
  const src = readRoute(FILE);

  test("imports publicLeadsLimiter and contactInquiryLimiter from rate-limit-instances", () => {
    assertContains(src, "from \"./middleware/rate-limit-instances\"", FILE);
    assertContains(src, "publicLeadsLimiter", FILE);
    assertContains(src, "contactInquiryLimiter", FILE);
  });

  test("publicLeadsLimiter is called inside a handler", () => {
    assertContains(src, "publicLeadsLimiter(getClientIp(req))", FILE);
  });

  test("contactInquiryLimiter is called inside a handler", () => {
    assertContains(src, "contactInquiryLimiter(getClientIp(req))", FILE);
  });

  test("replyTooManyRequests is called after each limiter check in routes.ts", () => {
    // Leads + contact inquiry = at least 2 guarded paths
    const occurrences = (src.match(/replyTooManyRequests\(res,\s*rl/g) || []).length;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// server/chat-routes.ts
//   zanChatLimiter — Zan public chat (60 / 60 min, keyed by userId or sessionId)
// ---------------------------------------------------------------------------

describe("Wiring: chat-routes.ts", () => {
  const FILE = "server/chat-routes.ts";
  const src = readRoute(FILE);

  test("imports zanChatLimiter from rate-limit-instances", () => {
    assertContains(src, "from \"./middleware/rate-limit-instances\"", FILE);
    assertContains(src, "zanChatLimiter", FILE);
  });

  test("zanChatLimiter is called in the message handler", () => {
    assertContains(src, "zanChatLimiter(", FILE);
    // Should be called in two places (public chat + admin chat endpoints)
    const occurrences = (src.match(/zanChatLimiter\(/g) || []).length;
    expect(occurrences).toBeGreaterThanOrEqual(1);
  });

  test("replyTooManyRequests is called after zanChatLimiter check", () => {
    assertContains(src, "replyTooManyRequests", FILE);
  });
});

// ---------------------------------------------------------------------------
// server/scraping-routes.ts
//   scrapingTriggerLimiter — POST /api/admin/scraping/trigger (20 / 60 min)
//   scrapingTestLimiter    — POST /api/admin/scraping/test    (20 / 60 min)
// ---------------------------------------------------------------------------

describe("Wiring: scraping-routes.ts", () => {
  const FILE = "server/scraping-routes.ts";
  const src = readRoute(FILE);

  test("imports scrapingTriggerLimiter and scrapingTestLimiter from rate-limit-instances", () => {
    assertContains(src, "from \"./middleware/rate-limit-instances\"", FILE);
    assertContains(src, "scrapingTriggerLimiter", FILE);
    assertContains(src, "scrapingTestLimiter", FILE);
  });

  test("scrapingTriggerLimiter is called inside the trigger handler", () => {
    assertContains(src, "scrapingTriggerLimiter(", FILE);
  });

  test("scrapingTestLimiter is called inside the test handler", () => {
    assertContains(src, "scrapingTestLimiter(", FILE);
  });

  test("replyTooManyRequests is called after each scraping limiter check", () => {
    assertContains(src, "replyTooManyRequests", FILE);
    const occurrences = (src.match(/replyTooManyRequests\(res,\s*rl/g) || []).length;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// server/middleware/rate-limit-instances.ts
//   Verify that all seven limiter instances exist with the correct config.
//   This is the single source of truth — changes here break the HTTP tests too.
// ---------------------------------------------------------------------------

describe("Wiring: rate-limit-instances.ts config integrity", () => {
  const FILE = "server/middleware/rate-limit-instances.ts";
  const src = readRoute(FILE);

  test("signinLimiter: 10 per 15 min", () => {
    assertContains(src, "signinLimiter = createRateLimiter(15 * 60 * 1000, 10)", FILE);
  });

  test("forgotPasswordLimiter: 5 per hour", () => {
    assertContains(src, "forgotPasswordLimiter = createRateLimiter(60 * 60 * 1000, 5)", FILE);
  });

  test("publicLeadsLimiter: 20 per hour", () => {
    assertContains(src, "publicLeadsLimiter = createRateLimiter(60 * 60 * 1000, 20)", FILE);
  });

  test("contactInquiryLimiter: 20 per hour", () => {
    assertContains(src, "contactInquiryLimiter = createRateLimiter(60 * 60 * 1000, 20)", FILE);
  });

  test("zanChatLimiter: 60 per hour", () => {
    assertContains(src, "zanChatLimiter = createRateLimiter(60 * 60 * 1000, 60)", FILE);
  });

  test("scrapingTriggerLimiter: 20 per hour", () => {
    assertContains(src, "scrapingTriggerLimiter = createRateLimiter(60 * 60 * 1000, 20)", FILE);
  });

  test("scrapingTestLimiter: 20 per hour", () => {
    assertContains(src, "scrapingTestLimiter = createRateLimiter(60 * 60 * 1000, 20)", FILE);
  });
});
