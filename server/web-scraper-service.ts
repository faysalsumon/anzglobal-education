import { chromium, Browser, Page } from "playwright";
import * as cheerio from "cheerio";
import robotsParser from "robots-parser";
import { RateLimiterMemory } from "rate-limiter-flexible";

/**
 * Rate limiter: max 1 request per second per domain
 * This ensures we don't overload institution servers
 */
const rateLimiter = new RateLimiterMemory({
  points: 1, // 1 request
  duration: 1, // per 1 second
});

/**
 * Scraping options
 */
export interface ScrapeOptions {
  url: string;
  useBrowser?: boolean; // Use Playwright for JavaScript-heavy sites
  timeout?: number; // Timeout in milliseconds
  waitForSelector?: string; // Wait for specific element to load
}

/**
 * Scraping result
 */
export interface ScrapeResult {
  html: string;
  url: string;
  title: string;
  scrapedAt: string;
  method: "static" | "browser";
}

/**
 * Robots.txt cache to avoid repeated fetches
 */
const robotsCache = new Map<string, any>();

/**
 * Check if URL is allowed by robots.txt
 */
async function isAllowedByRobots(url: string): Promise<boolean> {
  try {
    const urlObj = new URL(url);
    const domain = `${urlObj.protocol}//${urlObj.host}`;
    const robotsUrl = `${domain}/robots.txt`;

    // Check cache first
    if (robotsCache.has(domain)) {
      const robots = robotsCache.get(domain);
      return robots.isAllowed(url, "ANZGlobalBot");
    }

    // Fetch robots.txt
    const response = await fetch(robotsUrl);
    const robotsTxt = response.ok ? await response.text() : "";

    // Parse robots.txt
    const robots = robotsParser(robotsUrl, robotsTxt);
    robotsCache.set(domain, robots);

    // Check if our bot is allowed
    return robots.isAllowed(url, "ANZGlobalBot") ?? true;
  } catch (error) {
    console.error("Robots.txt check error:", error);
    // If we can't fetch robots.txt, allow by default but log warning
    console.warn(`Could not fetch robots.txt for ${url}, proceeding with caution`);
    return true;
  }
}

/**
 * Apply rate limiting for domain
 */
async function rateLimit(url: string): Promise<void> {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.host;
    
    // Wait for rate limiter
    await rateLimiter.consume(domain);
  } catch (error) {
    console.error("Rate limit error:", error);
    // Wait 2 seconds if rate limit exceeded
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

/**
 * Scrape website using static HTML parsing (Cheerio)
 * Faster but doesn't execute JavaScript
 */
async function scrapeStatic(url: string, timeout: number = 10000): Promise<ScrapeResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "ANZGlobalBot/1.0 (Educational Data Collection)",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract title
    const title = $("title").text().trim() || $("h1").first().text().trim() || "Untitled";

    return {
      html,
      url,
      title,
      scrapedAt: new Date().toISOString(),
      method: "static",
    };
  } catch (error: any) {
    throw new Error(`Static scrape failed for ${url}: ${error.message}`);
  }
}

/**
 * Scrape website using Playwright browser
 * Slower but executes JavaScript and handles dynamic content
 */
async function scrapeBrowser(
  url: string,
  timeout: number = 30000,
  waitForSelector?: string
): Promise<ScrapeResult> {
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    // Launch browser in headless mode
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    page = await browser.newPage();

    // Set user agent
    await page.setExtraHTTPHeaders({
      "User-Agent": "ANZGlobalBot/1.0 (Educational Data Collection)",
    });

    // Navigate to page
    await page.goto(url, {
      timeout,
      waitUntil: "networkidle",
    });

    // Wait for specific selector if provided
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: 10000 });
    }

    // Get HTML content and title
    const html = await page.content();
    const title = await page.title();

    return {
      html,
      url,
      title,
      scrapedAt: new Date().toISOString(),
      method: "browser",
    };
  } catch (error: any) {
    throw new Error(`Browser scrape failed for ${url}: ${error.message}`);
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
  }
}

/**
 * Main scrape function with robots.txt compliance and rate limiting
 */
export async function scrapeWebsite(options: ScrapeOptions): Promise<ScrapeResult> {
  const { url, useBrowser = false, timeout = 30000, waitForSelector } = options;

  // Validate URL
  try {
    new URL(url);
  } catch (error) {
    throw new Error(`Invalid URL: ${url}`);
  }

  // Check robots.txt
  const allowed = await isAllowedByRobots(url);
  if (!allowed) {
    throw new Error(
      `Scraping not allowed by robots.txt: ${url}\n` +
        `Please ensure the website allows crawling or add this domain to an allowlist.`
    );
  }

  // Apply rate limiting
  await rateLimit(url);

  console.log(`Scraping ${url} using ${useBrowser ? "browser" : "static"} method...`);

  // Choose scraping method
  if (useBrowser) {
    return await scrapeBrowser(url, timeout, waitForSelector);
  } else {
    return await scrapeStatic(url, timeout);
  }
}

/**
 * Batch scrape multiple URLs with rate limiting and error handling
 */
export async function batchScrape(
  urls: string[],
  options: Partial<ScrapeOptions> = {}
): Promise<Array<ScrapeResult | { error: string; url: string }>> {
  const results: Array<ScrapeResult | { error: string; url: string }> = [];

  for (const url of urls) {
    try {
      const result = await scrapeWebsite({ url, ...options });
      results.push(result);
    } catch (error: any) {
      console.error(`Failed to scrape ${url}:`, error.message);
      results.push({
        error: error.message,
        url,
      });
    }

    // Additional delay between requests (be respectful)
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return results;
}

export interface DeepScrapeResult {
  combinedText: string;
  pagesScraped: string[];
  homepageHtml: string;
  scrapedAt: string;
}

const SUBPAGE_PATTERNS = [
  { pattern: /\/(about|about-us|our-story|who-we-are|our-history)(\/|$)/i, label: "about" },
  { pattern: /\/(contact|contact-us|get-in-touch|enquire|enquiry)(\/|$)/i, label: "contact" },
  { pattern: /\/(campuses|campus|locations|our-campuses|our-locations|centres|centers)(\/|$)/i, label: "campuses" },
  { pattern: /\/(team|our-team|staff|leadership|people|faculty)(\/|$)/i, label: "team" },
];

const SUBPAGE_LINK_TEXT = [
  { pattern: /^about(\s+us)?$/i, label: "about" },
  { pattern: /^contact(\s+us)?$/i, label: "contact" },
  { pattern: /^(our\s+)?campuses?$/i, label: "campuses" },
  { pattern: /^(our\s+)?locations?$/i, label: "campuses" },
  { pattern: /^(our\s+)?team$/i, label: "team" },
];

export async function deepScrapeInstitution(baseUrl: string, timeout: number = 15000): Promise<DeepScrapeResult> {
  const homepage = await scrapeWebsite({ url: baseUrl, timeout });
  const $ = cheerio.load(homepage.html);
  const baseUrlObj = new URL(baseUrl);

  const foundSubpages = new Map<string, string>();

  $("a").each((_, el) => {
    const href = $(el).attr("href");
    const text = ($(el).text() || "").trim();
    if (!href) return;

    let absUrl: string;
    try {
      absUrl = new URL(href, baseUrl).toString();
      const urlObj = new URL(absUrl);
      if (urlObj.hostname !== baseUrlObj.hostname) return;
    } catch { return; }

    for (const { pattern, label } of SUBPAGE_PATTERNS) {
      if (pattern.test(absUrl) && !foundSubpages.has(label)) {
        foundSubpages.set(label, absUrl);
        return;
      }
    }
    for (const { pattern, label } of SUBPAGE_LINK_TEXT) {
      if (pattern.test(text) && !foundSubpages.has(label)) {
        foundSubpages.set(label, absUrl);
        return;
      }
    }
  });

  const subpageEntries = Array.from(foundSubpages.entries()).slice(0, 4);
  const pagesScraped = [baseUrl];
  let combined = `[PAGE: /]\n${extractTextContent(homepage.html)}\n\n`;

  for (const [label, subUrl] of subpageEntries) {
    try {
      await rateLimit(subUrl);
      const allowed = await isAllowedByRobots(subUrl);
      if (!allowed) continue;
      const sub = await scrapeStatic(subUrl, timeout);
      const path = new URL(subUrl).pathname;
      combined += `[PAGE: ${path} (${label})]\n${extractTextContent(sub.html)}\n\n`;
      pagesScraped.push(subUrl);
      console.log(`[DeepScrape] Scraped subpage: ${path} (${label})`);
    } catch (err: any) {
      console.warn(`[DeepScrape] Failed subpage ${label} (${subUrl}): ${err.message}`);
    }
  }

  if (combined.length > 40000) {
    combined = combined.substring(0, 40000) + "\n[Content truncated at 40000 chars]";
  }

  return {
    combinedText: combined,
    pagesScraped,
    homepageHtml: homepage.html,
    scrapedAt: new Date().toISOString(),
  };
}

function extractTextContent(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, path, iframe").remove();
  const blocks: string[] = [];
  $("body *").each((_, el) => {
    const tag = (el as any).tagName as string;
    if (["p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "td", "th", "address", "span", "a", "div"].includes(tag)) {
      const text = $(el).clone().children().remove().end().text().trim();
      if (text.length > 2) blocks.push(text);
    }
  });
  const footerEl = $("footer");
  if (footerEl.length) {
    blocks.push("[FOOTER]");
    blocks.push(footerEl.text().replace(/\s+/g, " ").trim());
  }
  return [...new Set(blocks)].join("\n");
}

/**
 * Intelligent course page discovery result
 */
export interface CoursePageDiscoveryResult {
  url: string;
  confidence: number;
  reason: string;
  method: "ai" | "regex" | "manual";
}

/**
 * Find course listing page from institution homepage
 * Uses hybrid approach: AI + regex patterns for better accuracy
 */
export async function findCourseListingPage(
  institutionUrl: string,
  useAI: boolean = true
): Promise<CoursePageDiscoveryResult | null> {
  try {
    console.log(`🔍 Discovering course listing page for: ${institutionUrl}`);
    const result = await scrapeWebsite({ url: institutionUrl });
    
    // Try AI-powered discovery first if enabled
    if (useAI) {
      try {
        // Import AI function dynamically to avoid circular dependencies
        const { findCourseListingPageCandidates } = await import("./ai-extractor-service");
        const candidates = await findCourseListingPageCandidates(result.html, institutionUrl);
        
        if (candidates.length > 0) {
          const best = candidates[0]; // Already sorted by score
          console.log(`✓ AI found candidate: ${best.url} (score: ${best.score.toFixed(2)})`);
          return {
            url: best.url,
            confidence: best.score,
            reason: best.reason,
            method: "ai",
          };
        }
      } catch (aiError: any) {
        console.warn("AI discovery failed, falling back to regex:", aiError.message);
      }
    }

    // Fallback: Use regex patterns
    const $ = cheerio.load(result.html);
    const coursePatterns = [
      { pattern: /courses?/i, weight: 1.0 },
      { pattern: /programs?/i, weight: 0.9 },
      { pattern: /degrees?/i, weight: 0.9 },
      { pattern: /study/i, weight: 0.7 },
      { pattern: /academics?/i, weight: 0.6 },
      { pattern: /what-we-offer/i, weight: 0.5 },
    ];

    // Search for links matching course patterns with scoring
    const links: Array<{ url: string; score: number; text: string }> = [];
    $("a").each((_, element) => {
      const href = $(element).attr("href");
      const text = $(element).text().trim();

      if (!href) return;

      let score = 0;
      let matchedPattern = "";
      
      for (const { pattern, weight } of coursePatterns) {
        if (pattern.test(text)) {
          score = Math.max(score, weight);
          matchedPattern = text;
        } else if (pattern.test(href)) {
          score = Math.max(score, weight * 0.8); // Lower score for URL-only match
          matchedPattern = href;
        }
      }

      if (score > 0) {
        try {
          const absoluteUrl = new URL(href, institutionUrl).toString();
          const urlObj = new URL(absoluteUrl);
          const baseUrlObj = new URL(institutionUrl);
          
          // Only include same-domain URLs
          if (urlObj.hostname === baseUrlObj.hostname) {
            links.push({ url: absoluteUrl, score, text: matchedPattern });
          }
        } catch {
          // Skip invalid URLs
        }
      }
    });

    // Sort by score and return best match
    if (links.length > 0) {
      links.sort((a, b) => b.score - a.score);
      const best = links[0];
      console.log(`✓ Regex found candidate: ${best.url} (score: ${best.score.toFixed(2)})`);
      return {
        url: best.url,
        confidence: best.score,
        reason: `Matched pattern in: ${best.text}`,
        method: "regex",
      };
    }

    console.log("✗ No course listing page found");
    return null;
  } catch (error: any) {
    console.error("Failed to find course listing page:", error);
    return null;
  }
}
