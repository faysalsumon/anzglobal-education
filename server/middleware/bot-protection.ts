import type { Request, Response, NextFunction } from "express";

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
  'FacebookBot',
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
  'facebookexternalhit',
  'LinkedInBot',
  'Twitterbot',
  'Slackbot',
  'WhatsApp',
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
    console.log(`[Bot Protection] Blocked AI bot: ${userAgent.substring(0, 100)} from ${clientIP}`);
    
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
    console.log(`[Bot Protection] Rate limited: ${clientIP} on ${req.path}`);
    
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

export function securityHeadersMiddleware(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Robots-Tag', 'noai, noimageai');
  
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(self)');
  
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
