import type { Request, Response, NextFunction } from "express";
import { randomBytes } from "crypto";

const AI_BOT_USER_AGENTS = [
  'GPTBot',
  'ChatGPT-User',
  'Claude-Web',
  'ClaudeBot',
  'anthropic-ai',
  'Google-Extended',
  'CCBot',
  'PerplexityBot',
  'cohere-ai',
  'Meta-ExternalAgent',
  'Bytespider',
  'Diffbot',
  'Omgilibot',
  'Amazonbot',
  'YouBot',
  'ia_archiver',
  'archive.org_bot',
  'Scrapy',
  'python-requests',
  'axios/',
  'node-fetch',
  'curl/',
  'wget/',
  'HTTrack',
  'WebCopier',
  'SiteSnagger',
  'TeleportPro',
  'WebZIP',
  'Offline Explorer',
];

const SUSPICIOUS_PATTERNS = [
  /^Mozilla\/5\.0 \(compatible;.*Bot/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  /headless/i,
];

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 100;
const RATE_LIMIT_MAX_API_REQUESTS = 60;

function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function isAIBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  
  for (const bot of AI_BOT_USER_AGENTS) {
    if (ua.includes(bot.toLowerCase())) {
      return true;
    }
  }
  
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(userAgent)) {
      return true;
    }
  }
  
  return false;
}

function isRateLimited(ip: string, isApiRequest: boolean): boolean {
  const now = Date.now();
  const key = `${ip}:${isApiRequest ? 'api' : 'page'}`;
  const limit = isApiRequest ? RATE_LIMIT_MAX_API_REQUESTS : RATE_LIMIT_MAX_REQUESTS;
  
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }
  
  record.count++;
  
  if (record.count > limit) {
    return true;
  }
  
  return false;
}

setInterval(() => {
  const now = Date.now();
  const entries = Array.from(rateLimitStore.entries());
  for (const [key, record] of entries) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000);

const SEARCH_ENGINE_BOTS = [
  'Googlebot',
  'Google-InspectionTool',
  'Storebot-Google',
  'GoogleOther',
  'Google-Read-Aloud',
  'Google-CloudVertexBot',
  'bingbot',
  'msnbot',
  'DuckDuckBot',
  'Baiduspider',
  'YandexBot',
  'Applebot',
  // Facebook / Meta — link preview and social sharing crawlers
  'facebookexternalhit',
  'meta-webindexer',
  'Meta-ExternalFetcher',
  // LinkedIn, Twitter/X, Slack, WhatsApp link previews
  'LinkedInBot',
  'Twitterbot',
  'Slackbot',
  'WhatsApp',
  // Telegram link previews
  'TelegramBot',
];

function isSearchEngineBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return SEARCH_ENGINE_BOTS.some(bot => ua.includes(bot.toLowerCase()));
}

const EXCLUDED_PATHS = [
  '/assets/',
  '/favicon',
  '/@vite',
  '/@fs/',
  '/node_modules/',
  '/src/',
  '.js',
  '.css',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '/sitemap.xml',
  '/sitemap_index.xml',
  '/robots.txt',
  '/api/partner/', // Partner API is for external bots - has its own authentication
  '/api/health', // Health check endpoint for monitoring
  '/api/public/meta-pixel', // Meta Pixel config endpoint - must be accessible for Facebook validation
];

function isExcludedPath(path: string): boolean {
  return EXCLUDED_PATHS.some(excluded => path.includes(excluded));
}

export function botProtectionMiddleware(req: Request, res: Response, next: NextFunction) {
  // Allow Partner API requests with X-API-Key header (bypass bot protection for authenticated partners)
  // Scoped strictly to /api/partner/ routes - the Partner API auth middleware validates the key
  const apiKey = req.headers['x-api-key'];
  if (req.path.startsWith('/api/partner/') && apiKey && typeof apiKey === 'string') {
    return next();
  }
  
  if (isExcludedPath(req.path)) {
    return next();
  }

  if (process.env.NODE_ENV === 'development') {
    const clientIP = req.ip || getClientIP(req);
    if (clientIP === '127.0.0.1' || clientIP === '::1' || clientIP === '::ffff:127.0.0.1') {
      return next();
    }
  }
  
  const userAgent = req.headers['user-agent'] || '';
  const clientIP = req.ip || getClientIP(req);
  const isApiRequest = req.path.startsWith('/api/');

  // Always allow legitimate search engine and social crawlers through
  if (isSearchEngineBot(userAgent)) {
    console.log(`[Bot Protection] Allowed search engine bot: ${userAgent.substring(0, 100)} from ${clientIP}`);
    return next();
  }
  
  if (isAIBot(userAgent)) {
    logSecurityEvent('BOT_BLOCKED', req, { ua: userAgent.substring(0, 60) });
    
    if (isApiRequest) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Automated access to this API is not permitted'
      });
    }
    
    return res.status(403).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Access Denied</title></head>
        <body>
          <h1>Access Denied</h1>
          <p>Automated scraping and AI training on this platform is not permitted.</p>
          <p>If you believe this is an error, please contact support.</p>
        </body>
      </html>
    `);
  }
  
  if (isRateLimited(clientIP, isApiRequest)) {
    logSecurityEvent('RATE_LIMITED', req);
    
    res.setHeader('Retry-After', '60');
    
    if (isApiRequest) {
      return res.status(429).json({
        error: 'Too many requests',
        message: 'Please slow down your requests',
        retryAfter: 60
      });
    }
    
    return res.status(429).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Too Many Requests</title></head>
        <body>
          <h1>Too Many Requests</h1>
          <p>You have made too many requests. Please wait a moment and try again.</p>
        </body>
      </html>
    `);
  }
  
  next();
}

/**
 * Domains that are always allowed as redirect targets (in addition to same-origin).
 * Add production domains here so password-reset and OAuth flows keep working
 * across the multi-region setup.
 */
const REDIRECT_ALLOWLIST_HOSTS = new Set([
  'anzglobal.com.au',
  'www.anzglobal.com.au',
  'anzglobal.com.bd',
  'www.anzglobal.com.bd',
]);

/**
 * Returns true when `url` is safe to redirect to:
 *   - A relative path starting with exactly one "/" (never "//", which is protocol-relative)
 *   - An absolute http/https URL whose host matches the current request host (same-origin).
 *     This naturally covers Replit dev-preview domains without opening the namespace to
 *     attacker-controlled *.replit.dev / *.replit.app registrations.
 *   - An absolute http/https URL whose host is on the explicit REDIRECT_ALLOWLIST_HOSTS
 *   - An absolute http/https URL whose host matches the SITE_URL env var
 *
 * Everything else — including protocol-relative "//evil.com", javascript: URIs,
 * data: URIs, unknown external hosts, and attacker-controlled Replit subdomains —
 * returns false.
 */
export function isSafeRedirect(url: string, req?: Request): boolean {
  if (!url || typeof url !== 'string') return false;

  // Relative path: must start with "/" but NOT "//" (protocol-relative smuggling)
  if (url.startsWith('/') && !url.startsWith('//')) {
    return true;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  // Only http and https are acceptable protocols
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();

  // Explicit production allowlist
  if (REDIRECT_ALLOWLIST_HOSTS.has(hostname)) {
    return true;
  }

  // Same-origin check against the current Express request host
  if (req) {
    const reqHost = (req.hostname || (req.headers.host?.split(':')[0] ?? '')).toLowerCase();
    if (reqHost && hostname === reqHost) {
      return true;
    }
  }

  // SITE_URL environment variable (may point to any custom domain)
  if (process.env.SITE_URL) {
    try {
      const siteHost = new URL(process.env.SITE_URL).hostname.toLowerCase();
      if (siteHost && hostname === siteHost) return true;
    } catch {
      // ignore malformed SITE_URL
    }
  }

  return false;
}

/**
 * Returns `url` if it passes `isSafeRedirect`, otherwise returns `fallback`.
 * Use this as a drop-in replacement anywhere you call `res.redirect(userSuppliedUrl)`.
 */
export function safeRedirectUrl(url: string, fallback = '/', req?: Request): string {
  return isSafeRedirect(url, req) ? url : fallback;
}

/**
 * Structured security event logger.
 * All security-relevant events (rate limits, auth failures, blocked bots) are
 * written with a [Security] prefix so they can be grepped from server logs.
 */
export function logSecurityEvent(
  event: string,
  req: Request,
  extra?: Record<string, string | number | boolean>
): void {
  const ip = (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.ip ||
    'unknown'
  );
  const details = extra
    ? ' ' + Object.entries(extra).map(([k, v]) => `${k}=${v}`).join(' ')
    : '';
  console.warn(
    `[Security] ${event} ip=${ip} method=${req.method} path=${req.path}${details}`
  );
}

/**
 * Generates a cryptographically random nonce for use in Content-Security-Policy
 * headers and injects it into res.locals.nonce so downstream middleware and
 * HTML transforms can stamp matching nonce="" attributes on inline scripts.
 *
 * Must be registered BEFORE securityHeadersMiddleware in the Express chain.
 */
export function nonceMiddleware(_req: Request, res: Response, next: NextFunction) {
  res.locals.nonce = randomBytes(16).toString('base64');
  next();
}

const CSP_REPORT_URI = '/api/csp-report';
const CSP_REPORT_GROUP = 'csp-violations';

/**
 * Inline event handler audit — last verified: 2026-06-18
 *
 * We explicitly do NOT include 'unsafe-hashes' or sha256 hashes for inline
 * event handlers (onclick="…", onload="…", etc.) because a full codebase
 * audit confirmed zero such attributes exist in:
 *   - client/index.html (the SPA entry point)
 *   - Every server-rendered HTML page (403 / 429 error pages, email templates)
 *   - All server route files that call res.send() with an HTML body
 *
 * The nonce-based allowlist covers legitimate inline <script> blocks (GTM,
 * GA4, gtag bootstrap). All other script execution must come from allowed
 * origins listed below.
 *
 * If a future change requires an inline event handler that genuinely cannot
 * be avoided, compute its sha256 hash, add 'unsafe-hashes' to script-src,
 * and append the hash here rather than widening to 'unsafe-inline'.
 */
function buildCspDirectives(nonce: string): string {
  return [
    "default-src 'self'",
    // Nonce allows our known inline GTM / GA4 / gtag blocks; no 'unsafe-inline'.
    // 'unsafe-hashes' is intentionally absent — see audit comment above.
    // clarity.ms: GTM loads the main tag from www.clarity.ms; actual bundle from scripts.clarity.ms
    `script-src 'self' 'nonce-${nonce}' https://www.googletagmanager.com https://www.google-analytics.com https://maps.googleapis.com https://maps.gstatic.com https://connect.facebook.net https://www.clarity.ms https://scripts.clarity.ms`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    // blob: needed for canvas exports; https: allows institution/student image CDNs
    "img-src 'self' data: blob: https:",
    // wss: for Supabase Realtime; ws://localhost for dev HMR
    // clarity.ms for Microsoft Clarity telemetry
    // https://www.facebook.com: Meta Pixel fires conversion events to /tr on this origin
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://analytics.google.com https://maps.googleapis.com https://api.openai.com https://*.clarity.ms https://www.facebook.com ws://localhost:* wss://localhost:*",
    // GTM noscript iframe
    "frame-src 'self' https://www.googletagmanager.com",
    // Belt-and-suspenders alongside X-Frame-Options: SAMEORIGIN
    "frame-ancestors 'self'",
    // react-pdf (pdfjs) loads its worker from bundled origin; blob: covers inline worker fallback
    "worker-src blob: 'self'",
    // No plugin content needed — react-pdf renders via canvas
    "object-src 'none'",
    // Prevents base-tag hijacking
    "base-uri 'self'",
    // Restricts form submissions to same origin
    "form-action 'self'",
    // Violation reporting — newer Reporting API (Chrome 70+)
    `report-to ${CSP_REPORT_GROUP}`,
    // Violation reporting — legacy fallback for Safari and Firefox
    `report-uri ${CSP_REPORT_URI}`,
  ].join('; ');
}

export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Robots-Tag', 'noai, noimageai');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(self)');

  // Reporting API requires an absolute URL — derive it from the trusted base URL
  // env var when available (production), or fall back to the request origin so
  // it also works correctly in the local dev environment.
  const baseUrl =
    process.env.PUBLIC_BASE_URL ||
    `${req.protocol}://${req.get('host')}`;
  const reportEndpointUrl = `${baseUrl}${CSP_REPORT_URI}`;

  // Reporting API group definition consumed by the `report-to` CSP directive.
  // The spec requires endpoints[].url to be an absolute URL.
  res.setHeader(
    'Report-To',
    JSON.stringify({
      group: CSP_REPORT_GROUP,
      max_age: 86400,
      endpoints: [{ url: reportEndpointUrl }],
    })
  );

  const nonce = (res.locals.nonce as string | undefined) ?? randomBytes(16).toString('base64');
  res.setHeader('Content-Security-Policy', buildCspDirectives(nonce));

  // HSTS: only meaningful over HTTPS — skip in local development
  if (process.env.NODE_ENV !== 'development') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}

export function noAICrawlMiddleware(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noai, noimageai');
  next();
}

const PROTECTED_PATHS = [
  '/admin',
  '/student',
  '/institution',
  '/university',
  '/dashboard',
];

export function protectedPathsMiddleware(req: Request, res: Response, next: NextFunction) {
  const path = req.path.toLowerCase();
  const isProtectedPath = PROTECTED_PATHS.some(protectedPath => path.startsWith(protectedPath));
  
  if (isProtectedPath) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noai, noimageai');
  }
  
  next();
}
