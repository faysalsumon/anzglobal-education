import { chromium, Browser, Page } from "playwright";
import * as cheerio from "cheerio";
import robotsParser from "robots-parser";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

interface CrawlResult {
  discoveredUrls: string[];
  institutionData: {
    name: string | null;
    logo: string | null;
    description: string | null;
  } | null;
  sitemapUrls: string[];
  totalPagesScanned: number;
  errors: string[];
}

interface CrawlOptions {
  maxDepth?: number;
  maxPages?: number;
  respectRobotsTxt?: boolean;
  includeSitemap?: boolean;
  userAgent?: string;
}

/**
 * Website Crawler Service for discovering course pages
 * Intelligently crawls institution websites to find all course URLs
 */
export class WebsiteCrawlerService {
  private browser: Browser | null = null;
  private visitedUrls: Set<string> = new Set();
  private discoveredCourseUrls: string[] = [];
  private errors: string[] = [];
  private robotsTxt: any = null;

  private readonly defaultOptions: CrawlOptions = {
    maxDepth: 3,
    maxPages: 500,
    respectRobotsTxt: true,
    includeSitemap: true,
    userAgent: "ANZGlobalEducation-Bot/1.0",
  };

  /**
   * Main entry point: Crawl an institution's website to discover all course pages
   */
  async crawlInstitutionWebsite(
    rootUrl: string,
    options: CrawlOptions = {}
  ): Promise<CrawlResult> {
    const opts = { ...this.defaultOptions, ...options };
    
    try {
      // Initialize browser
      this.browser = await chromium.launch({ headless: true });
      
      // Normalize root URL
      const baseUrl = this.normalizeUrl(rootUrl);
      const domain = new URL(baseUrl).origin;
      
      // Step 1: Check robots.txt
      if (opts.respectRobotsTxt) {
        await this.loadRobotsTxt(domain, opts.userAgent!);
      }
      
      // Step 2: Try to find and parse sitemap.xml
      let sitemapUrls: string[] = [];
      if (opts.includeSitemap) {
        sitemapUrls = await this.parseSitemap(domain);
        console.log(`[Crawler] Found ${sitemapUrls.length} URLs from sitemap`);
      }
      
      // Step 3: Extract institution data from homepage
      const institutionData = await this.extractInstitutionData(baseUrl);
      
      // Step 4: Discover course listing page (AI-powered)
      const courseListingUrl = await this.findCourseListingPage(baseUrl, domain);
      if (courseListingUrl) {
        console.log(`[Crawler] Found course listing page: ${courseListingUrl}`);
      }
      
      // Step 5: Crawl from course listing page or root
      const startUrl = courseListingUrl || baseUrl;
      await this.crawlRecursive(startUrl, domain, 0, opts.maxDepth!, opts.maxPages!);
      
      // Step 6: Filter and classify URLs using AI
      const courseUrls = await this.classifyUrlsAsCoursePages(
        Array.from(this.visitedUrls),
        domain
      );
      
      return {
        discoveredUrls: courseUrls,
        institutionData,
        sitemapUrls,
        totalPagesScanned: this.visitedUrls.size,
        errors: this.errors,
      };
    } catch (error: any) {
      console.error("[Crawler] Fatal error:", error);
      this.errors.push(`Fatal error: ${error.message}`);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Load and parse robots.txt
   */
  private async loadRobotsTxt(domain: string, userAgent: string): Promise<void> {
    try {
      const robotsUrl = `${domain}/robots.txt`;
      const response = await fetch(robotsUrl);
      
      if (response.ok) {
        const robotsTxtContent = await response.text();
        this.robotsTxt = robotsParser(robotsUrl, robotsTxtContent);
        console.log(`[Crawler] Loaded robots.txt from ${domain}`);
      }
    } catch (error: any) {
      console.log(`[Crawler] No robots.txt found at ${domain}`);
      // Not an error - many sites don't have robots.txt
    }
  }

  /**
   * Parse sitemap.xml to find URLs
   */
  private async parseSitemap(domain: string): Promise<string[]> {
    const sitemapUrls: string[] = [];
    
    try {
      const sitemapUrl = `${domain}/sitemap.xml`;
      const response = await fetch(sitemapUrl);
      
      if (!response.ok) {
        return sitemapUrls;
      }
      
      const xml = await response.text();
      const $ = cheerio.load(xml, { xmlMode: true });
      
      // Extract all <loc> tags
      $("loc").each((_, element) => {
        const url = $(element).text().trim();
        if (url) {
          sitemapUrls.push(url);
        }
      });
      
      // Also check for sitemap index files
      $("sitemap loc").each((_, element) => {
        const sitemapUrl = $(element).text().trim();
        // Recursively fetch nested sitemaps (limit depth)
        // For now, just log them
        console.log(`[Crawler] Found nested sitemap: ${sitemapUrl}`);
      });
      
    } catch (error: any) {
      console.log(`[Crawler] Could not parse sitemap: ${error.message}`);
    }
    
    return sitemapUrls;
  }

  /**
   * Extract basic institution data from homepage
   */
  private async extractInstitutionData(url: string): Promise<{
    name: string | null;
    logo: string | null;
    description: string | null;
  } | null> {
    try {
      const page = await this.browser!.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
      
      const html = await page.content();
      const $ = cheerio.load(html);
      
      // Extract institution name (from title or h1)
      const name = $("title").text().trim() || $("h1").first().text().trim();
      
      // Extract logo (common selectors)
      const logo = $("img[class*='logo']").first().attr("src") ||
                   $("img[alt*='logo']").first().attr("src") ||
                   $(".header img").first().attr("src") ||
                   null;
      
      // Extract meta description
      const description = $("meta[name='description']").attr("content") || null;
      
      await page.close();
      
      return {
        name: name || null,
        logo: logo ? this.resolveUrl(logo, url) : null,
        description,
      };
    } catch (error: any) {
      this.errors.push(`Failed to extract institution data: ${error.message}`);
      return null;
    }
  }

  /**
   * Use AI to find the main course listing page
   */
  private async findCourseListingPage(
    rootUrl: string,
    domain: string
  ): Promise<string | null> {
    try {
      const page = await this.browser!.newPage();
      await page.goto(rootUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
      
      // Get all navigation links
      const links = await page.$$eval("a", (anchors) =>
        anchors.map((a) => ({
          href: a.href,
          text: a.textContent?.trim() || "",
        }))
      );
      
      await page.close();
      
      // Filter links that likely lead to courses
      const courseKeywords = [
        "course",
        "courses",
        "program",
        "programmes",
        "programs",
        "study",
        "degrees",
        "undergraduate",
        "postgraduate",
        "qualifications",
      ];
      
      const candidateLinks = links.filter((link) => {
        const text = link.text.toLowerCase();
        const href = link.href.toLowerCase();
        return courseKeywords.some(
          (keyword) => text.includes(keyword) || href.includes(keyword)
        );
      });
      
      // Use AI to rank candidates if we have multiple
      if (candidateLinks.length > 0) {
        // For now, return the first candidate
        // TODO: Use AI to rank and select the best one
        const bestCandidate = candidateLinks[0];
        return bestCandidate.href;
      }
      
      return null;
    } catch (error: any) {
      this.errors.push(`Failed to find course listing page: ${error.message}`);
      return null;
    }
  }

  /**
   * Recursively crawl website to discover pages
   */
  private async crawlRecursive(
    url: string,
    domain: string,
    depth: number,
    maxDepth: number,
    maxPages: number
  ): Promise<void> {
    // Stop conditions
    if (depth > maxDepth || this.visitedUrls.size >= maxPages) {
      return;
    }
    
    // Normalize URL
    const normalizedUrl = this.normalizeUrl(url);
    
    // Skip if already visited
    if (this.visitedUrls.has(normalizedUrl)) {
      return;
    }
    
    // Check if URL is from the same domain
    if (!normalizedUrl.startsWith(domain)) {
      return;
    }
    
    // Check robots.txt
    if (this.robotsTxt && !this.robotsTxt.isAllowed(normalizedUrl)) {
      console.log(`[Crawler] Blocked by robots.txt: ${normalizedUrl}`);
      return;
    }
    
    // Mark as visited
    this.visitedUrls.add(normalizedUrl);
    console.log(`[Crawler] Visiting (${this.visitedUrls.size}): ${normalizedUrl}`);
    
    try {
      const page = await this.browser!.newPage();
      
      // Set a reasonable timeout
      await page.goto(normalizedUrl, { 
        waitUntil: "domcontentloaded", 
        timeout: 15000 
      });
      
      // Extract all links from the page
      const links = await page.$$eval("a", (anchors, baseUrl) => 
        anchors.map((a) => {
          try {
            const href = a.href;
            // Remove hash and query params for deduplication
            const url = new URL(href);
            url.hash = "";
            return url.toString();
          } catch {
            return null;
          }
        }).filter(Boolean),
        normalizedUrl
      );
      
      await page.close();
      
      // Recursively crawl discovered links
      const uniqueLinks = Array.from(new Set(links as string[]));
      
      for (const link of uniqueLinks) {
        if (this.visitedUrls.size >= maxPages) {
          break;
        }
        
        await this.crawlRecursive(link, domain, depth + 1, maxDepth, maxPages);
      }
    } catch (error: any) {
      this.errors.push(`Error crawling ${normalizedUrl}: ${error.message}`);
    }
  }

  /**
   * Use AI to classify which URLs are course pages
   */
  private async classifyUrlsAsCoursePages(
    urls: string[],
    domain: string
  ): Promise<string[]> {
    console.log(`[Crawler] Classifying ${urls.length} URLs...`);
    
    // First pass: Use heuristics to filter obvious course URLs
    const heuristicCourseUrls = urls.filter((url) => {
      const lowerUrl = url.toLowerCase();
      
      // Australian Training Package Codes (common qualification codes)
      // Examples: BSB60720, CHC52021, RII50520, CPC31320, SIT30821, ICT50220
      const ausQualificationCodePattern = /\b([A-Z]{3}\d{5})\b/i;
      const hasAusQualCode = ausQualificationCodePattern.test(url);
      
      // Include if contains course-related keywords
      const includeKeywords = [
        "/course/",
        "/courses/",
        "/program/",
        "/programmes/",
        "/programs/",
        "/study/",
        "/qualification/",
        "/qualifications/",
        "diploma",
        "certificate",
        "advanced-diploma",
        "graduate-diploma",
        "degree",
        "bachelor",
        "master",
      ];
      
      // Exclude admin, login, search, etc.
      const excludeKeywords = [
        "/admin",
        "/login",
        "/search",
        "/contact",
        "/about",
        "/news",
        "/events",
        "/blog",
        "/wp-admin",
        "/wp-content",
        "/wp-includes",
        "/gallery",
        "/author",
        "/category",
        "/tag",
        ".pdf",
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        "/accommodation",
        "/student-services",
        "/forms-and-policies",
        "/promotional-materials",
      ];
      
      const hasIncludeKeyword = includeKeywords.some((kw) => lowerUrl.includes(kw));
      const hasExcludeKeyword = excludeKeywords.some((kw) => lowerUrl.includes(kw));
      
      // Include if:
      // 1. Has Australian qualification code OR
      // 2. Has include keyword AND doesn't have exclude keyword
      return (hasAusQualCode && !hasExcludeKeyword) || (hasIncludeKeyword && !hasExcludeKeyword);
    });
    
    console.log(`[Crawler] Heuristic filtering: ${heuristicCourseUrls.length} likely course pages`);
    
    // For large sets, use AI to classify a sample and apply pattern
    // For now, return heuristic results
    return heuristicCourseUrls;
  }

  /**
   * Normalize URL (remove trailing slash, fragments, etc.)
   */
  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      parsed.hash = "";
      let normalized = parsed.toString();
      
      // Remove trailing slash
      if (normalized.endsWith("/") && normalized !== parsed.origin + "/") {
        normalized = normalized.slice(0, -1);
      }
      
      return normalized;
    } catch {
      return url;
    }
  }

  /**
   * Resolve relative URL to absolute
   */
  private resolveUrl(url: string, baseUrl: string): string {
    try {
      return new URL(url, baseUrl).toString();
    } catch {
      return url;
    }
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    
    // Clear state
    this.visitedUrls.clear();
    this.discoveredCourseUrls = [];
    this.errors = [];
    this.robotsTxt = null;
  }
}
