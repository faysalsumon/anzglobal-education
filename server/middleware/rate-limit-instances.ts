/**
 * Named rate-limiter instances shared between route handlers and tests.
 *
 * Keeping configs here — rather than inline in each route — means:
 *  - There is exactly ONE definition for each limit; tests import the same
 *    instance, so a config change is always caught.
 *  - Tests can build minimal Express apps that use these real instances
 *    without having to spin up the full server.
 *
 * Config summary (matches requirements from security spec):
 *
 *   signinLimiter            10 req  / 15 min  (per IP)
 *   forgotPasswordLimiter     5 req  / 60 min  (per IP)
 *   verifyTotpLimiter        10 req  / 15 min  (per IP)
 *   resendVerificationLimiter 5 req  / 60 min  (per IP)
 *   checkEmailLimiter        20 req  / 60 sec  (per IP)
 *   publicLeadsLimiter       20 req  / 60 min  (per IP)
 *   contactInquiryLimiter    20 req  / 60 min  (per IP)
 *   zanChatLimiter           60 req  / 60 min  (per user/session ID)
 *   scrapingTriggerLimiter   20 req  / 60 min  (per user ID)
 *   scrapingTestLimiter      20 req  / 60 min  (per user ID)
 */

import { createRateLimiter } from "./rate-limit";

export const signinLimiter = createRateLimiter(15 * 60 * 1000, 10);
export const forgotPasswordLimiter = createRateLimiter(60 * 60 * 1000, 5);
export const verifyTotpLimiter = createRateLimiter(15 * 60 * 1000, 10);
export const resendVerificationLimiter = createRateLimiter(60 * 60 * 1000, 5);
export const checkEmailLimiter = createRateLimiter(60 * 1000, 20);
export const publicLeadsLimiter = createRateLimiter(60 * 60 * 1000, 20);
export const contactInquiryLimiter = createRateLimiter(60 * 60 * 1000, 20);
export const zanChatLimiter = createRateLimiter(60 * 60 * 1000, 60);
export const scrapingTriggerLimiter = createRateLimiter(60 * 60 * 1000, 20);
export const scrapingTestLimiter = createRateLimiter(60 * 60 * 1000, 20);
