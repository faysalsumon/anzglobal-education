import { db } from "./db";
import { scrapingTemplates } from "../shared/schema";

/**
 * Seed default scraping templates for common university website platforms
 */
async function seedScrapingTemplates() {
  console.log("Seeding scraping templates...");

  const defaultTemplates = [
    {
      name: "WordPress University (Standard)",
      description: "Standard WordPress university theme with common course page structures",
      platformType: "wordpress",
      selectors: {
        courseListContainer: ".course-list, .program-list, article.course, article.program",
        courseTitle: "h2.entry-title, h1.course-title, .course-name",
        courseDescription: ".entry-content, .course-description",
        courseMeta: ".course-meta, .program-meta",
      },
      useBrowser: false,
      waitForSelector: null,
      isActive: true,
    },
    {
      name: "JavaScript-Heavy SPA",
      description: "Modern single-page applications that load content dynamically",
      platformType: "spa",
      selectors: {
        courseListContainer: "[class*='course'], [class*='program']",
        courseTitle: "h1, h2, h3",
        courseDescription: "p, div[class*='description']",
      },
      useBrowser: true, // Requires Playwright for JavaScript execution
      waitForSelector: "[class*='course']",
      isActive: true,
    },
    {
      name: "Custom CMS (Generic)",
      description: "Generic template for custom university CMS platforms",
      platformType: "custom",
      selectors: {
        courseListContainer: ".courses, .programs, .study-options",
        courseTitle: "h2, h3, .title",
        courseDescription: ".description, .overview",
      },
      useBrowser: false,
      waitForSelector: null,
      isActive: true,
    },
    {
      name: "Wix University",
      description: "Wix-based university websites with standard layouts",
      platformType: "wix",
      selectors: {
        courseListContainer: "[data-testid*='course'], [data-testid*='program']",
        courseTitle: "h2[class*='heading'], h3[class*='title']",
        courseDescription: "p, div[class*='richText']",
      },
      useBrowser: true, // Wix requires browser rendering
      waitForSelector: "[data-testid]",
      isActive: true,
    },
    {
      name: "Squarespace University",
      description: "Squarespace-based university websites",
      platformType: "squarespace",
      selectors: {
        courseListContainer: ".sqs-block-content, .collection-item",
        courseTitle: "h1.entry-title, h2.collection-title",
        courseDescription: ".sqs-block-html, .entry-excerpt",
      },
      useBrowser: true,
      waitForSelector: ".sqs-block-content",
      isActive: true,
    },
    {
      name: "Drupal University",
      description: "Drupal-based university websites with Views",
      platformType: "drupal",
      selectors: {
        courseListContainer: ".view-content, .node-course, .node-program",
        courseTitle: "h2.node-title, .field-name-title",
        courseDescription: ".field-name-body, .node-content",
      },
      useBrowser: false,
      waitForSelector: null,
      isActive: true,
    },
    {
      name: "No Template (AI Only)",
      description: "Don't use any template - rely solely on AI extraction",
      platformType: "none",
      selectors: {},
      useBrowser: false,
      waitForSelector: null,
      isActive: true,
    },
  ];

  try {
    for (const template of defaultTemplates) {
      await db
        .insert(scrapingTemplates)
        .values(template)
        .onConflictDoNothing(); // Skip if already exists
    }
    console.log(`✓ Seeded ${defaultTemplates.length} scraping templates`);
  } catch (error: any) {
    console.error("Failed to seed scraping templates:", error.message);
  }
}

// Run the seed function
seedScrapingTemplates()
  .then(() => {
    console.log("Seeding complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });
