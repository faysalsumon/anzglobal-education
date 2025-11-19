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

/**
 * Find course listing page from institution homepage
 * Uses AI to identify likely course pages
 */
export async function findCourseListingPage(institutionUrl: string): Promise<string | null> {
  try {
    const result = await scrapeWebsite({ url: institutionUrl });
    const $ = cheerio.load(result.html);

    // Common patterns for course listing pages
    const coursePatterns = [
      /courses?/i,
      /programs?/i,
      /degrees?/i,
      /study/i,
      /academics?/i,
      /what-we-offer/i,
    ];

    // Search for links matching course patterns
    const links: string[] = [];
    $("a").each((_, element) => {
      const href = $(element).attr("href");
      const text = $(element).text().trim();

      if (href && coursePatterns.some((pattern) => pattern.test(text) || pattern.test(href))) {
        // Convert relative URLs to absolute
        const absoluteUrl = new URL(href, institutionUrl).toString();
        links.push(absoluteUrl);
      }
    });

    // Return first matching link
    return links[0] || null;
  } catch (error: any) {
    console.error("Failed to find course listing page:", error);
    return null;
  }
}
