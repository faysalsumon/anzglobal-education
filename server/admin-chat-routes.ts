import type { Express, Request, Response } from "express";
import { db } from "./db";
import {
  chatConversations,
  chatMessages,
  adminTeamMembers,
  users,
  branches,
  crmContacts,
  tasks,
  applications,
  universities,
  courses,
} from "@shared/schema";
import { eq, and, lt, gte, lte, ne, sql, count, inArray, ilike, desc } from "drizzle-orm";
import OpenAI from "openai";
import { scrapeWebsite } from "./web-scraper-service";
import { extractInstitutionData, extractCourseData } from "./ai-extractor-service";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function getUserId(req: any): string | null {
  return req.supabaseUser?.id || req.user?.id || null;
}

async function requireAdmin(req: any, res: any, next: any) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Authentication required" });

    const member = await db
      .select()
      .from(adminTeamMembers)
      .where(and(eq(adminTeamMembers.userId, userId), eq(adminTeamMembers.isActive, true)))
      .limit(1)
      .then((r) => r[0]);

    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1).then((r) => r[0]);

    const ADMIN_ROLE_IDS = [
      'role_super_admin', 'role_ceo', 'role_cfo',
      'role_branch_manager', 'role_marketing_executive',
      'role_senior_consultant', 'role_junior_consultant',
    ];

    const isAdmin =
      !!member ||
      user?.userType === "admin" ||
      user?.userType === "platform_admin" ||
      user?.userType === "super_admin" ||
      (!!user?.roleId && ADMIN_ROLE_IDS.includes(user.roleId));

    if (!isAdmin) return res.status(403).json({ message: "Admin access required" });

    (req as any)._zanUser = user;
    next();
  } catch (err) {
    console.error("[AdminChat] requireAdmin error:", err);
    res.status(500).json({ message: "Authentication check failed" });
  }
}

async function verifyConversationOwnership(req: any, res: any, next: any) {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const conv = await db
      .select()
      .from(chatConversations)
      .where(and(eq(chatConversations.id, id), eq(chatConversations.userId, userId!)))
      .limit(1)
      .then((r) => r[0]);
    if (!conv) return res.status(403).json({ error: "Access denied" });
    next();
  } catch (err) {
    res.status(500).json({ error: "Failed to verify access" });
  }
}

async function hasDataEntryPermission(user: any, userId: string): Promise<boolean> {
  if (!user) return false;
  if (user.userType === "platform_admin") return true;
  if (user.userType === "super_admin") return true;
  if (user.roleId === "role_super_admin") return true;
  if (user.roleId === "role_marketing_executive" || user.roleId === "marketing_executive") return true;
  if (user.userType === "cto") return true;
  if ((user as any).role === "cto") return true;

  const member = await db
    .select({ role: adminTeamMembers.role })
    .from(adminTeamMembers)
    .where(and(eq(adminTeamMembers.userId, userId), eq(adminTeamMembers.isActive, true)))
    .limit(1)
    .then((r) => r[0]);
  if (member?.role === "cto" || member?.role === "marketing_executive") return true;

  return false;
}

function isPrivateUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    const hostname = url.hostname.toLowerCase();
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0") return true;
    if (hostname === "::1" || hostname === "[::1]") return true;
    if (hostname.endsWith(".local") || hostname.endsWith(".internal")) return true;
    if (hostname.startsWith("10.") || hostname.startsWith("192.168.")) return true;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return true;
    if (hostname === "metadata.google.internal" || hostname === "169.254.169.254") return true;
    return false;
  } catch {
    return true;
  }
}

const VALID_COURSE_LEVELS = [
  'VCE (11-12)', 'Certificate I', 'Certificate II', 'Certificate III', 'Certificate IV',
  'Diploma', 'Advanced Diploma', 'Associate Degree', 'Graduate Certificate', 'Graduate Diploma',
  'Bachelor Degree', 'Bachelor Honours', 'Masters Degree', 'Doctoral Degree', 'Higher Doctoral Degree',
  'ELICOS - General English', 'ELICOS - EAP', 'ELICOS - Exam Prep',
  'Professional Year - Accounting', 'Professional Year - IT', 'Professional Year - Engineering',
  'Foundation', 'Pathway Program', 'Short Course',
  'RQF Entry Level', 'RQF Level 1', 'RQF Level 2', 'RQF Level 3', 'RQF Level 4', 'RQF Level 5', 'RQF Level 6', 'RQF Level 7', 'RQF Level 8',
  'NZQF Level 1', 'NZQF Level 2', 'NZQF Level 3', 'NZQF Level 4', 'NZQF Level 5', 'NZQF Level 6', 'NZQF Level 7', 'NZQF Level 8', 'NZQF Level 9', 'NZQF Level 10',
  'MQF Level 1', 'MQF Level 2', 'MQF Level 3', 'MQF Foundation', 'MQF Level 4', 'MQF Level 5', 'MQF Level 6', 'MQF Level 7', 'MQF Level 8',
  'US Associate Degree', 'US Bachelor Degree', 'US Master Degree', 'US Doctoral Degree', 'US Professional Doctorate',
  'Canadian Certificate', 'Canadian Diploma', 'Canadian Advanced Diploma', 'Canadian Associate Degree', 'Canadian Bachelor Degree', 'Canadian Master Degree', 'Canadian Doctoral Degree', 'Canadian CEGEP',
  'EQF Level 1', 'EQF Level 2', 'EQF Level 3', 'EQF Level 4', 'EQF Level 5', 'EQF Level 6', 'EQF Level 7', 'EQF Level 8',
  'Other',
];

const VALID_DISCIPLINES = [
  'Accounting, Business & Finance', 'Agriculture & Forestry', 'Applied Sciences & Professions',
  'Arts, Design & Architecture', 'Computer Science & IT', 'Education & Training',
  'Engineering & Technology', 'Environmental Studies & Earth Sciences', 'Hospitality, Leisure & Sports',
  'Humanities', 'Journalism & Media', 'Law', 'Medicine & Health', 'Short Courses', 'Trade',
];

const VALID_QUALIFICATION_FRAMEWORKS = ['AQF', 'Non-AQF', 'RQF', 'EQF', 'NZQF', 'MQF', 'US', 'Canadian', 'Other'];

const VALID_PROVIDER_TYPES = ['University', 'Institution', 'Tafe', 'School'];

const DATA_ENTRY_INTENT_KEYWORDS = [
  "upload", "add institution", "add university", "create institution", "create university",
  "find and upload", "find and add", "add course", "create course", "upload course",
  "add a course", "add bachelor", "add master", "add diploma", "add certificate",
  "data entry", "add tafe", "add school", "register institution", "register university",
];

function detectsDataEntryIntent(message: string): boolean {
  const lower = message.toLowerCase();
  return DATA_ENTRY_INTENT_KEYWORDS.some((kw) => lower.includes(kw));
}

const DATA_ENTRY_SYSTEM_PROMPT = `
DATA ENTRY CAPABILITY:
You have data entry tools available. When the user asks you to find, add, upload, or create an institution or course, use the tools below.

WORKFLOW FOR INSTITUTIONS:
1. First call check_institution_exists to see if it's already in the platform
2. If it exists, inform the user and provide the existing record details
3. If not found, call search_web to find the institution's official website and key information
4. Once you have the URL, call scrape_and_extract_institution with the official website URL
5. If scraping fails, use search_web results and your own knowledge to populate as many fields as possible
6. Call prepare_institution_draft with all assembled data — this presents a confirmation card to the user
7. The user will click "Save as Draft" in the UI to save the record — you CANNOT save directly

WORKFLOW FOR COURSES:
1. First call find_institution_by_name to locate the parent institution
2. If the institution doesn't exist, automatically start the institution workflow first: search_web, scrape, and prepare_institution_draft for the institution. Once the institution is saved, proceed with the course.
3. If found, optionally call search_web to find the course page, then scrape_and_extract_course if a URL is available
4. Alternatively, populate fields from the user's message, search results, and your knowledge
5. Call prepare_course_draft with all assembled data — this presents a confirmation card to the user
6. The user will click "Save as Draft" in the UI to save the record — you CANNOT save directly

INSTITUTION REQUIRED FIELDS:
- name: Full official institution name
- providerType: Exactly one of: University, Institution, Tafe, School
- country: Country name (e.g., "Australia")

INSTITUTION IMPORTANT OPTIONAL FIELDS (always try to fill):
- website, logo, description, smallDescription (max 100 words), fullDescription
- contactEmail, contactPhone, establishedYear, numberOfCampuses
- campusAddresses (array of {name, address, city, state, postcode, country})
- scholarshipPercentageMin/Max, tuitionFeesMin/Max, tuitionCurrency
- deliveryModes (array: "on-campus", "online", "hybrid", "blended")
- intakePeriods (array of month names)
- topDisciplines, accreditationStatus, rankingBand
- facilities (array: "Library", "Sports Center", etc.)
- internationalStudentSupport (boolean), tags (array)
- rtoNumber, cricosProviderCode, institutionGallery (up to 3 image URLs)
- availableMarkets: default ["AU", "BD"]

COURSE REQUIRED FIELDS:
- title: Full course name
- universityId: Must link to existing institution (use find_institution_by_name first)
- subject: Brief subject area label
- level: Must be exactly one of the course level enum values
- discipline: Must be exactly one of: Accounting, Business & Finance | Agriculture & Forestry | Applied Sciences & Professions | Arts, Design & Architecture | Computer Science & IT | Education & Training | Engineering & Technology | Environmental Studies & Earth Sciences | Hospitality, Leisure & Sports | Humanities | Journalism & Media | Law | Medicine & Health | Short Courses | Trade

COURSE LEVEL ENUM (use EXACT values — these are database-enforced, any deviation will fail):
AQF framework: "VCE (11-12)", "Certificate I", "Certificate II", "Certificate III", "Certificate IV", "Diploma", "Advanced Diploma", "Associate Degree", "Graduate Certificate", "Graduate Diploma", "Bachelor Degree", "Bachelor Honours", "Masters Degree", "Doctoral Degree", "Higher Doctoral Degree"
Non-AQF framework: "ELICOS - General English", "ELICOS - EAP", "ELICOS - Exam Prep", "Professional Year - Accounting", "Professional Year - IT", "Professional Year - Engineering", "Foundation", "Pathway Program", "Short Course"
RQF framework: "RQF Entry Level", "RQF Level 1", "RQF Level 2", "RQF Level 3", "RQF Level 4", "RQF Level 5", "RQF Level 6", "RQF Level 7", "RQF Level 8"
NZQF framework: "NZQF Level 1", "NZQF Level 2", "NZQF Level 3", "NZQF Level 4", "NZQF Level 5", "NZQF Level 6", "NZQF Level 7", "NZQF Level 8", "NZQF Level 9", "NZQF Level 10"
MQF framework: "MQF Level 1", "MQF Level 2", "MQF Level 3", "MQF Foundation", "MQF Level 4", "MQF Level 5", "MQF Level 6", "MQF Level 7", "MQF Level 8"
US framework: "US Associate Degree", "US Bachelor Degree", "US Master Degree", "US Doctoral Degree", "US Professional Doctorate"
Canadian framework: "Canadian Certificate", "Canadian Diploma", "Canadian Advanced Diploma", "Canadian Associate Degree", "Canadian Bachelor Degree", "Canadian Master Degree", "Canadian Doctoral Degree", "Canadian CEGEP"
EQF framework: "EQF Level 1", "EQF Level 2", "EQF Level 3", "EQF Level 4", "EQF Level 5", "EQF Level 6", "EQF Level 7", "EQF Level 8"
"Other"

QUALIFICATION FRAMEWORK (must match level):
"AQF" — for AQF levels (Australian courses)
"Non-AQF" — for ELICOS, Professional Year, Foundation, Pathway, Short Course
"RQF" — for RQF levels (UK courses)
"EQF" — for EQF levels (European courses)
"NZQF" — for NZQF levels (New Zealand courses)
"MQF" — for MQF levels (Malaysian courses)
"US" — for US degree levels
"Canadian" — for Canadian qualification levels
"Other" — for anything else

COURSE IMPORTANT OPTIONAL FIELDS (always try to fill):
- description, duration, durationMonths, durationWeeks
- fees (decimal), currency (default "AUD")
- location, country, startDate, applicationDeadline
- deliveryMode ("online" | "on-campus" | "hybrid")
- prPathway (boolean), intakes (array of month names)
- careerOutcomes (array), prerequisites, eligibilityRequirements
- englishRequirements, campusLocations (array)
- internshipAvailable (boolean), sourceUrl
- availableMarkets: default ["AU", "BD"]

RULES:
- All records are saved as publishStatus: 'draft', approvalStatus: 'pending'
- Never publish directly — admin reviews and publishes manually
- Always check for duplicates before creating
- When presenting data for confirmation, clearly list ALL populated fields
- Flag any missing required fields in amber/warning
- You CANNOT save records directly. You can only PREPARE drafts for user confirmation.
- Use prepare_institution_draft or prepare_course_draft to structure the data. The user will then confirm via a button in the UI.

PRESENTATION FORMAT:
When you have data ready to present for confirmation, call the appropriate prepare tool with the structured data. Then format your response clearly with sections for each field group. Use this structure:
- Start with "Here's what I found for [name]:"
- List all fields with their values
- Note any fields that couldn't be filled
- End with "Click 'Save as Draft' below to save this record."
`;

const TOOL_DEFINITIONS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_web",
      description: "Search the web for information about an institution, course, or education provider. Use this to find official websites, key details, and verify information before scraping.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query (e.g., 'Swinburne University of Technology official website Australia')" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_institution_exists",
      description: "Check if an institution already exists in the platform by searching the name. Returns matching institutions if found.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Institution name to search for (partial match supported)" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "scrape_and_extract_institution",
      description: "Scrape an institution's website and extract structured data using AI. Provide the official institution website URL.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The official website URL of the institution (e.g., https://www.swinburne.edu.au)" },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "prepare_institution_draft",
      description: "Prepare structured institution data for the user to review and confirm. Does NOT save anything — the user must click 'Save as Draft' to persist. Call this when you have assembled all available institution data.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          providerType: { type: "string", enum: ["University", "Institution", "Tafe", "School"] },
          country: { type: "string" },
          website: { type: "string" },
          logo: { type: "string" },
          description: { type: "string" },
          smallDescription: { type: "string" },
          fullDescription: { type: "string" },
          contactEmail: { type: "string" },
          contactPhone: { type: "string" },
          establishedYear: { type: "number" },
          numberOfCampuses: { type: "number" },
          campusAddresses: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                address: { type: "string" },
                city: { type: "string" },
                state: { type: "string" },
                postcode: { type: "string" },
                country: { type: "string" },
              },
            },
          },
          scholarshipPercentageMin: { type: "number" },
          scholarshipPercentageMax: { type: "number" },
          tuitionFeesMin: { type: "number" },
          tuitionFeesMax: { type: "number" },
          tuitionCurrency: { type: "string" },
          deliveryModes: { type: "array", items: { type: "string" } },
          intakePeriods: { type: "array", items: { type: "string" } },
          topDisciplines: { type: "array", items: { type: "string" } },
          accreditationStatus: { type: "string" },
          rankingBand: { type: "string" },
          facilities: { type: "array", items: { type: "string" } },
          internationalStudentSupport: { type: "boolean" },
          tags: { type: "array", items: { type: "string" } },
          rtoNumber: { type: "string" },
          cricosProviderCode: { type: "string" },
          institutionGallery: { type: "array", items: { type: "string" } },
        },
        required: ["name", "providerType", "country"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_institution_by_name",
      description: "Find an existing institution by name to get its ID for linking courses. Returns the institution ID, name, and country.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Institution name to search for" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "scrape_and_extract_course",
      description: "Scrape a course page URL and extract structured course data using AI.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "Direct URL to the course page" },
          institutionName: { type: "string", description: "Name of the institution offering the course" },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "prepare_course_draft",
      description: "Prepare structured course data for the user to review and confirm. Does NOT save anything — the user must click 'Save as Draft' to persist. Call this when you have assembled all available course data.",
      parameters: {
        type: "object",
        properties: {
          universityId: { type: "string", description: "ID of the parent institution" },
          title: { type: "string" },
          subject: { type: "string" },
          level: { type: "string", description: "Must be an exact value from the COURSE LEVEL ENUM" },
          qualificationFramework: { type: "string", description: "Must match the level: AQF, Non-AQF, RQF, EQF, NZQF, MQF, US, Canadian, or Other" },
          discipline: { type: "string", description: "Must be an exact value from the discipline list" },
          description: { type: "string" },
          duration: { type: "string" },
          durationMonths: { type: "number" },
          durationWeeks: { type: "number" },
          fees: { type: "number" },
          currency: { type: "string" },
          location: { type: "string" },
          country: { type: "string" },
          startDate: { type: "string" },
          applicationDeadline: { type: "string" },
          deliveryMode: { type: "string" },
          prPathway: { type: "boolean" },
          intakes: { type: "array", items: { type: "string" } },
          careerOutcomes: { type: "array", items: { type: "string" } },
          prerequisites: { type: "string" },
          eligibilityRequirements: { type: "string" },
          englishRequirements: { type: "string" },
          campusLocations: { type: "array", items: { type: "string" } },
          internshipAvailable: { type: "boolean" },
          sourceUrl: { type: "string" },
          courseCode: { type: "string" },
        },
        required: ["universityId", "title", "subject", "level", "discipline"],
      },
    },
  },
];

async function executeToolCall(
  toolName: string,
  args: any,
  userId: string
): Promise<string> {
  try {
    switch (toolName) {
      case "check_institution_exists": {
        const matches = await db
          .select({ id: universities.id, name: universities.name, country: universities.country, website: universities.website })
          .from(universities)
          .where(ilike(universities.name, `%${args.name}%`))
          .limit(5);
        if (matches.length === 0) {
          return JSON.stringify({ found: false, message: `No institution matching "${args.name}" found in the platform.` });
        }
        return JSON.stringify({ found: true, count: matches.length, institutions: matches });
      }

      case "search_web": {
        try {
          const response = await openai.responses.create({
            model: "gpt-4o-mini",
            tools: [{ type: "web_search_preview" }],
            input: args.query,
          });
          let textContent = "";
          for (const item of response.output) {
            if (item.type === "message") {
              for (const c of item.content) {
                if (c.type === "output_text") textContent += c.text;
              }
            }
          }
          return JSON.stringify({ success: true, results: textContent || "No results found." });
        } catch (err: any) {
          return JSON.stringify({ success: false, error: err.message || "Web search failed" });
        }
      }

      case "scrape_and_extract_institution": {
        try {
          const url = new URL(args.url);
          if (!["http:", "https:"].includes(url.protocol)) {
            return JSON.stringify({ success: false, error: "Only http/https URLs are allowed" });
          }
          if (isPrivateUrl(args.url)) {
            return JSON.stringify({ success: false, error: "Cannot scrape private/internal URLs" });
          }
          const scraped = await scrapeWebsite({ url: args.url, timeout: 20000 });
          const extracted = await extractInstitutionData(scraped.html, args.url);
          return JSON.stringify({
            success: true,
            data: extracted.data,
            confidence: extracted.confidence,
            warnings: extracted.warnings,
            sourceUrl: args.url,
          });
        } catch (err: any) {
          return JSON.stringify({
            success: false,
            error: err.message || "Failed to scrape/extract institution data",
            suggestion: "Try providing data manually or use a different URL",
          });
        }
      }

      case "save_institution_draft": {
        const slug = args.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

        const existingSlug = await db
          .select({ id: universities.id })
          .from(universities)
          .where(eq(universities.slug, slug))
          .limit(1)
          .then((r) => r[0]);

        const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug;

        const insertData: any = {
          name: args.name,
          slug: finalSlug,
          providerType: args.providerType,
          country: args.country,
          publishStatus: "draft",
          approvalStatus: "pending",
          createdByUserId: userId,
          availableMarkets: ["AU", "BD"],
        };

        if (args.website) insertData.website = args.website;
        if (args.logo) insertData.logo = args.logo;
        if (args.description) insertData.description = args.description;
        if (args.smallDescription) insertData.smallDescription = args.smallDescription;
        if (args.fullDescription) insertData.fullDescription = args.fullDescription;
        if (args.contactEmail) insertData.contactEmail = args.contactEmail;
        if (args.contactPhone) insertData.contactPhone = args.contactPhone;
        if (args.establishedYear) insertData.establishedYear = args.establishedYear;
        if (args.numberOfCampuses) insertData.numberOfCampuses = args.numberOfCampuses;
        if (args.campusAddresses) insertData.campusAddresses = args.campusAddresses;
        if (args.scholarshipPercentageMin != null) insertData.scholarshipPercentageMin = args.scholarshipPercentageMin;
        if (args.scholarshipPercentageMax != null) insertData.scholarshipPercentageMax = args.scholarshipPercentageMax;
        if (args.tuitionFeesMin != null) insertData.tuitionFeesMin = String(args.tuitionFeesMin);
        if (args.tuitionFeesMax != null) insertData.tuitionFeesMax = String(args.tuitionFeesMax);
        if (args.tuitionCurrency) insertData.tuitionCurrency = args.tuitionCurrency;
        if (args.deliveryModes) insertData.deliveryModes = args.deliveryModes;
        if (args.intakePeriods) insertData.intakePeriods = args.intakePeriods;
        if (args.topDisciplines) insertData.topDisciplines = args.topDisciplines;
        if (args.accreditationStatus) insertData.accreditationStatus = args.accreditationStatus;
        if (args.rankingBand) insertData.rankingBand = args.rankingBand;
        if (args.facilities) insertData.facilities = args.facilities;
        if (args.internationalStudentSupport != null) insertData.internationalStudentSupport = args.internationalStudentSupport;
        if (args.tags) insertData.tags = args.tags;
        if (args.rtoNumber) insertData.rtoNumber = args.rtoNumber;
        if (args.cricosProviderCode) insertData.cricosProviderCode = args.cricosProviderCode;
        if (args.institutionGallery) insertData.institutionGallery = args.institutionGallery;

        const [created] = await db.insert(universities).values(insertData).returning();
        return JSON.stringify({
          success: true,
          id: created.id,
          name: created.name,
          slug: created.slug,
          message: `Institution "${created.name}" saved as draft (ID: ${created.id}). An admin must review and publish it.`,
        });
      }

      case "find_institution_by_name": {
        const matches = await db
          .select({ id: universities.id, name: universities.name, country: universities.country })
          .from(universities)
          .where(ilike(universities.name, `%${args.name}%`))
          .limit(5);
        if (matches.length === 0) {
          return JSON.stringify({ found: false, message: `No institution matching "${args.name}" found. You need to add the institution first.` });
        }
        return JSON.stringify({ found: true, institutions: matches });
      }

      case "scrape_and_extract_course": {
        try {
          const url = new URL(args.url);
          if (!["http:", "https:"].includes(url.protocol)) {
            return JSON.stringify({ success: false, error: "Only http/https URLs are allowed" });
          }
          if (isPrivateUrl(args.url)) {
            return JSON.stringify({ success: false, error: "Cannot scrape private/internal URLs" });
          }
          const scraped = await scrapeWebsite({ url: args.url, timeout: 20000 });
          const extracted = await extractCourseData(scraped.html, args.url, args.institutionName);
          return JSON.stringify({
            success: true,
            data: extracted.data,
            confidence: extracted.confidence,
            warnings: extracted.warnings,
            sourceUrl: args.url,
          });
        } catch (err: any) {
          return JSON.stringify({
            success: false,
            error: err.message || "Failed to scrape/extract course data",
            suggestion: "Try providing course data manually or use a different URL",
          });
        }
      }

      case "prepare_institution_draft": {
        return JSON.stringify({
          success: true,
          type: "institution",
          data: args,
          message: "Institution data prepared for review. The user can now click 'Save as Draft' to persist this record.",
        });
      }

      case "prepare_course_draft": {
        if (args.universityId) {
          const inst = await db
            .select({ id: universities.id })
            .from(universities)
            .where(eq(universities.id, args.universityId))
            .limit(1)
            .then((r) => r[0]);
          if (!inst) {
            return JSON.stringify({
              success: false,
              error: `Institution with ID "${args.universityId}" not found. Use find_institution_by_name to get the correct ID.`,
            });
          }
        }
        return JSON.stringify({
          success: true,
          type: "course",
          data: args,
          message: "Course data prepared for review. The user can now click 'Save as Draft' to persist this record.",
        });
      }

      case "save_course_draft": {
        const instExists = await db
          .select({ id: universities.id })
          .from(universities)
          .where(eq(universities.id, args.universityId))
          .limit(1)
          .then((r) => r[0]);
        if (!instExists) {
          return JSON.stringify({ success: false, error: `Institution "${args.universityId}" not found` });
        }

        const slug = args.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

        const existingSlug = await db
          .select({ id: courses.id })
          .from(courses)
          .where(eq(courses.slug, slug))
          .limit(1)
          .then((r) => r[0]);

        const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug;

        const insertData: any = {
          universityId: args.universityId,
          title: args.title,
          slug: finalSlug,
          subject: args.subject,
          level: args.level,
          discipline: args.discipline,
          publishStatus: "draft",
          approvalStatus: "pending",
          createdByUserId: userId,
          availableMarkets: ["AU", "BD"],
          currency: args.currency || "AUD",
        };

        if (args.description) insertData.description = args.description;
        if (args.duration) insertData.duration = args.duration;
        if (args.durationMonths) insertData.durationMonths = args.durationMonths;
        if (args.durationWeeks) insertData.durationWeeks = args.durationWeeks;
        if (args.fees != null) insertData.fees = String(args.fees);
        if (args.location) insertData.location = args.location;
        if (args.country) insertData.country = args.country;
        if (args.startDate) insertData.startDate = args.startDate;
        if (args.applicationDeadline) insertData.applicationDeadline = args.applicationDeadline;
        if (args.deliveryMode) insertData.deliveryMode = args.deliveryMode;
        if (args.prPathway != null) insertData.prPathway = args.prPathway;
        if (args.intakes) insertData.intakes = args.intakes;
        if (args.careerOutcomes) insertData.careerOutcomes = args.careerOutcomes;
        if (args.prerequisites) insertData.prerequisites = args.prerequisites;
        if (args.eligibilityRequirements) insertData.eligibilityRequirements = args.eligibilityRequirements;
        if (args.englishRequirements) insertData.englishRequirements = args.englishRequirements;
        if (args.campusLocations) insertData.campusLocations = args.campusLocations;
        if (args.internshipAvailable != null) insertData.internshipAvailable = args.internshipAvailable;
        if (args.sourceUrl) insertData.sourceUrl = args.sourceUrl;
        if (args.courseCode) insertData.courseCode = args.courseCode;
        if (args.qualificationFramework) insertData.qualificationFramework = args.qualificationFramework;

        const [created] = await db.insert(courses).values(insertData).returning();
        return JSON.stringify({
          success: true,
          id: created.id,
          title: created.title,
          slug: created.slug,
          universityId: created.universityId,
          message: `Course "${created.title}" saved as draft (ID: ${created.id}). An admin must review and publish it.`,
        });
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (err: any) {
    console.error(`[ZAN] Tool ${toolName} error:`, err);
    return JSON.stringify({ error: `Tool execution failed: ${err.message}` });
  }
}

export interface AdminContext {
  firstName: string;
  lastName: string;
  role: string;
  branchName: string | null;
  contacts: {
    total: number;
    byStage: Record<string, number>;
  };
  tasks: {
    overdue: number;
    overdueItems: string[];
    dueToday: number;
    dueTodayItems: string[];
    upcomingWeek: number;
  };
  teammates: Array<{ name: string; role: string; contactCount: number }>;
  pendingApplications: number;
}

export async function getAdminContext(userId: string): Promise<AdminContext> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 86400000 - 1);
  const endOfWeek = new Date(startOfToday.getTime() + 7 * 86400000);

  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .then((r) => r[0]);

  const member = await db
    .select()
    .from(adminTeamMembers)
    .where(eq(adminTeamMembers.userId, userId))
    .limit(1)
    .then((r) => r[0]);

  const role = member?.role ?? user?.userType ?? "admin";
  const branchId = (user as any)?.branchId ?? null;

  let branchName: string | null = null;
  if (branchId) {
    const branch = await db
      .select({ name: branches.name })
      .from(branches)
      .where(eq(branches.id, branchId))
      .limit(1)
      .then((r) => r[0]);
    branchName = branch?.name ?? null;
  }

  const assignedContacts = await db
    .select({ leadStage: crmContacts.leadStage })
    .from(crmContacts)
    .where(eq(crmContacts.assignedTo, userId));

  const byStage: Record<string, number> = {};
  for (const c of assignedContacts) {
    const stage = c.leadStage ?? "unknown";
    byStage[stage] = (byStage[stage] ?? 0) + 1;
  }

  const overdueTasks = await db
    .select({ title: tasks.title })
    .from(tasks)
    .where(
      and(
        eq(tasks.assignedToId, userId),
        lt(tasks.dueDate, startOfToday),
        ne(tasks.status, "completed")
      )
    )
    .limit(5);

  const dueTodayTasks = await db
    .select({ title: tasks.title })
    .from(tasks)
    .where(
      and(
        eq(tasks.assignedToId, userId),
        gte(tasks.dueDate, startOfToday),
        lte(tasks.dueDate, endOfToday),
        ne(tasks.status, "completed")
      )
    )
    .limit(5);

  const upcomingCount = await db
    .select({ count: count() })
    .from(tasks)
    .where(
      and(
        eq(tasks.assignedToId, userId),
        gte(tasks.dueDate, endOfToday),
        lte(tasks.dueDate, endOfWeek),
        ne(tasks.status, "completed")
      )
    )
    .then((r) => r[0]?.count ?? 0);

  let teammates: AdminContext["teammates"] = [];
  if (branchId) {
    const samebranchUsers = await db
      .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(and(eq((users as any).branchId, branchId), ne(users.id, userId)));

    const branchUserIds = samebranchUsers.map((u) => u.id);

    const branchMembers = branchUserIds.length
      ? await db
          .select({ userId: adminTeamMembers.userId, role: adminTeamMembers.role })
          .from(adminTeamMembers)
          .where(
            and(
              inArray(adminTeamMembers.userId, branchUserIds),
              eq(adminTeamMembers.isActive, true)
            )
          )
      : [];

    const memberRoleMap = Object.fromEntries(branchMembers.map((m) => [m.userId, m.role]));

    for (const u of samebranchUsers) {
      const contactCount = await db
        .select({ count: count() })
        .from(crmContacts)
        .where(eq(crmContacts.assignedTo, u.id))
        .then((r) => Number(r[0]?.count ?? 0));

      teammates.push({
        name: `${u.firstName} ${u.lastName}`,
        role: memberRoleMap[u.id] ?? "admin",
        contactCount,
      });
    }
  }

  const pendingApplications = await db
    .select({ count: count() })
    .from(applications)
    .where(inArray(applications.status, ["pending", "reviewing"]))
    .then((r) => Number(r[0]?.count ?? 0));

  return {
    firstName: user?.firstName ?? "there",
    lastName: user?.lastName ?? "",
    role,
    branchName,
    contacts: { total: assignedContacts.length, byStage },
    tasks: {
      overdue: overdueTasks.length,
      overdueItems: overdueTasks.map((t) => t.title),
      dueToday: dueTodayTasks.length,
      dueTodayItems: dueTodayTasks.map((t) => t.title),
      upcomingWeek: Number(upcomingCount),
    },
    teammates,
    pendingApplications,
  };
}

function buildSystemPrompt(ctx: AdminContext): string {
  const stageList = Object.entries(ctx.contacts.byStage)
    .map(([s, n]) => `${n} ${s}`)
    .join(", ");

  const overdueList = ctx.tasks.overdueItems.length
    ? ctx.tasks.overdueItems.map((t) => `"${t}"`).join(", ")
    : "none";

  const todayList = ctx.tasks.dueTodayItems.length
    ? ctx.tasks.dueTodayItems.map((t) => `"${t}"`).join(", ")
    : "none";

  const teammateLines = ctx.teammates.length
    ? ctx.teammates.map((t) => `  - ${t.name} (${t.role}): ${t.contactCount} assigned contacts`).join("\n")
    : "  - No other team members in your branch";

  const roleGuide: Record<string, string> = {
    branch_manager: "You manage the branch, can reassign contacts, override decisions, and view all branch activity.",
    support_staff: "You handle student inquiries, follow-ups, and document collection.",
    operations_staff: "You manage applications, visa processing, and institution liaisons.",
    super_admin: "You have full platform access — policy and platform decisions.",
    platform_admin: "You have full platform access — policy and platform decisions.",
  };

  return `You are Zan, an AI operations assistant for the ANZ Global Education admin team. You are concise, direct, and action-oriented.

CURRENT USER:
- Name: ${ctx.firstName} ${ctx.lastName}
- Role: ${ctx.role}${ctx.branchName ? `\n- Branch: ${ctx.branchName}` : ""}

ROLE CONTEXT:
${roleGuide[ctx.role] ?? "You help manage the CRM, contacts, and operational tasks."}

THEIR CURRENT WORKLOAD:
- Assigned contacts: ${ctx.contacts.total} total${stageList ? ` (${stageList})` : ""}
- Overdue tasks: ${ctx.tasks.overdue} — ${overdueList}
- Due today: ${ctx.tasks.dueToday} — ${todayList}
- Upcoming this week: ${ctx.tasks.upcomingWeek} tasks

BRANCH TEAM:
${teammateLines}

PLATFORM:
- Applications awaiting action: ${ctx.pendingApplications}

COWORK GUIDANCE:
- You can suggest handing off contacts to specific colleagues by name and explain why based on their role.
- When ${ctx.firstName} asks about a task type that better fits a colleague's role, suggest them by name.
- You can flag when someone's load is unbalanced and suggest redistribution.
- Help ${ctx.firstName} prioritise by urgency: overdue tasks > due today > upcoming.

BEHAVIOUR:
- Keep responses short and actionable (2–3 paragraphs max, use bullet points for lists).
- Always suggest a clear next action.
- Only discuss topics relevant to CRM operations, contacts, applications, tasks, team coordination, and data entry (institutions/courses).`;
}

export function registerAdminChatRoutes(app: Express) {
  app.get("/api/admin-chat/conversations/current", requireAdmin, async (req: any, res: Response) => {
    try {
      const userId = getUserId(req)!;
      const existing = await db
        .select()
        .from(chatConversations)
        .where(eq(chatConversations.userId, userId))
        .orderBy(desc(chatConversations.createdAt))
        .limit(1);
      if (existing.length > 0) {
        const msgs = await db
          .select()
          .from(chatMessages)
          .where(eq(chatMessages.conversationId, existing[0].id))
          .orderBy(chatMessages.createdAt);
        return res.json({ id: existing[0].id, messages: msgs });
      }
      const [conv] = await db
        .insert(chatConversations)
        .values({ userId })
        .returning();
      return res.json({ id: conv.id, messages: [] });
    } catch (err) {
      console.error("[AdminChat] get-or-create conversation error:", err);
      res.status(500).json({ message: "Failed to get conversation" });
    }
  });

  app.post("/api/admin-chat/conversations", requireAdmin, async (req: any, res: Response) => {
    try {
      const userId = getUserId(req)!;
      const [conv] = await db
        .insert(chatConversations)
        .values({ userId })
        .returning();
      res.json({ id: conv.id });
    } catch (err) {
      console.error("[AdminChat] create conversation error:", err);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.get(
    "/api/admin-chat/conversations/:id/messages",
    requireAdmin,
    verifyConversationOwnership,
    async (req: Request, res: Response) => {
      try {
        const msgs = await db
          .select()
          .from(chatMessages)
          .where(eq(chatMessages.conversationId, req.params.id))
          .orderBy(chatMessages.createdAt);
        res.json(msgs);
      } catch (err) {
        console.error("[AdminChat] get messages error:", err);
        res.status(500).json({ message: "Failed to fetch messages" });
      }
    }
  );

  app.post(
    "/api/admin-chat/conversations/:id/messages",
    requireAdmin,
    verifyConversationOwnership,
    async (req: any, res: Response) => {
      try {
        const userId = getUserId(req)!;
        const user = (req as any)._zanUser;
        const { content } = req.body;
        if (!content?.trim()) return res.status(400).json({ message: "Message content required" });

        const ctx = await getAdminContext(userId);
        let systemPrompt = buildSystemPrompt(ctx);

        const isDataEntry = detectsDataEntryIntent(content);
        const canDoDataEntry = await hasDataEntryPermission(user, userId);

        await db.insert(chatMessages).values({
          conversationId: req.params.id,
          role: "user",
          content,
          sources: null,
        });

        if (isDataEntry && !canDoDataEntry) {
          const deniedMsg = "You don't have permission for data entry — contact your CTO or Marketing Executive to add institutions and courses.";
          const [saved] = await db
            .insert(chatMessages)
            .values({
              conversationId: req.params.id,
              role: "assistant",
              content: deniedMsg,
              sources: null,
            })
            .returning();
          return res.json(saved);
        }

        const history = await db
          .select()
          .from(chatMessages)
          .where(eq(chatMessages.conversationId, req.params.id))
          .orderBy(chatMessages.createdAt)
          .limit(20);

        const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
          { role: "system", content: systemPrompt + (isDataEntry ? DATA_ENTRY_SYSTEM_PROMPT : "") },
          ...history.slice(0, -1).map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          { role: "user", content },
        ];

        if (isDataEntry) {
          let assistantContent = "";
          let dataEntryPreview: any = null;
          const MAX_TOOL_ITERATIONS = 8;
          let iterations = 0;
          let usedExtractionTool = false;
          let lastExtractedData: any = null;
          let lastExtractedType: string = "";

          while (iterations < MAX_TOOL_ITERATIONS) {
            iterations++;
            const completion = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: openaiMessages,
              tools: TOOL_DEFINITIONS,
              tool_choice: "auto",
              max_tokens: 2000,
              temperature: 0.3,
            });

            const msg = completion.choices[0]?.message;
            if (!msg) break;

            if (msg.tool_calls && msg.tool_calls.length > 0) {
              openaiMessages.push(msg);
              for (const toolCall of msg.tool_calls) {
                const fnName = toolCall.function.name;
                let fnArgs: any = {};
                try {
                  fnArgs = JSON.parse(toolCall.function.arguments);
                } catch {
                  fnArgs = {};
                }
                console.log(`[ZAN] Executing tool: ${fnName}`, JSON.stringify(fnArgs).substring(0, 200));
                const result = await executeToolCall(fnName, fnArgs, userId);

                if (fnName === "scrape_and_extract_institution" || fnName === "scrape_and_extract_course") {
                  usedExtractionTool = true;
                  lastExtractedType = fnName.includes("institution") ? "institution" : "course";
                  try {
                    const parsed = JSON.parse(result);
                    if (parsed.success) lastExtractedData = parsed.data;
                  } catch {}
                }

                if (fnName === "prepare_institution_draft" || fnName === "prepare_course_draft") {
                  const prepType = fnName.includes("institution") ? "institution" : "course";
                  try {
                    const parsed = JSON.parse(result);
                    if (parsed.success) {
                      lastExtractedData = parsed.data;
                      lastExtractedType = prepType;
                      usedExtractionTool = true;
                    }
                  } catch {}
                }

                openaiMessages.push({
                  role: "tool" as const,
                  tool_call_id: toolCall.id,
                  content: result,
                });
              }
            } else {
              assistantContent = msg.content ?? "I couldn't process that data entry request. Could you try again?";
              break;
            }
          }

          if (!assistantContent) {
            assistantContent = "I've completed the data entry operations. Check above for the results.";
          }

          if (usedExtractionTool && lastExtractedData) {
            dataEntryPreview = {
              type: lastExtractedType,
              action: "confirm",
              data: lastExtractedData,
            };
          }

          const [saved] = await db
            .insert(chatMessages)
            .values({
              conversationId: req.params.id,
              role: "assistant",
              content: assistantContent,
              sources: dataEntryPreview ? JSON.stringify(dataEntryPreview) : null,
            })
            .returning();

          return res.json({
            ...saved,
            data_entry_preview: dataEntryPreview,
          });
        }

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: openaiMessages,
          max_tokens: 500,
          temperature: 0.4,
        });

        const assistantContent = completion.choices[0]?.message?.content ?? "I'm not sure how to help with that. Could you rephrase?";

        const [saved] = await db
          .insert(chatMessages)
          .values({
            conversationId: req.params.id,
            role: "assistant",
            content: assistantContent,
            sources: null,
          })
          .returning();

        res.json(saved);
      } catch (err) {
        console.error("[AdminChat] send message error:", err);
        res.status(500).json({ message: "Failed to send message" });
      }
    }
  );

  app.post("/api/admin-chat/save-draft", requireAdmin, async (req: any, res: Response) => {
    try {
      const userId = getUserId(req)!;
      const user = (req as any)._zanUser;

      if (!(await hasDataEntryPermission(user, userId))) {
        return res.status(403).json({ message: "You don't have permission for data entry" });
      }

      const { type, data } = req.body;
      if (!type || !data) {
        return res.status(400).json({ message: "Missing type or data" });
      }

      if (type === "institution") {
        if (!data.name || !data.providerType || !data.country) {
          return res.status(400).json({ message: "Missing required institution fields: name, providerType, country" });
        }
        if (!VALID_PROVIDER_TYPES.includes(data.providerType)) {
          return res.status(400).json({ message: `Invalid providerType "${data.providerType}". Must be one of: ${VALID_PROVIDER_TYPES.join(", ")}` });
        }
        const duplicate = await db
          .select({ id: universities.id, name: universities.name })
          .from(universities)
          .where(ilike(universities.name, data.name.trim()))
          .limit(1)
          .then((r) => r[0]);
        if (duplicate) {
          return res.status(409).json({
            success: false,
            message: `Institution "${duplicate.name}" already exists (ID: ${duplicate.id}). Duplicate creation blocked.`,
          });
        }
        const result = await executeToolCall("save_institution_draft", data, userId);
        const parsed = JSON.parse(result);
        return res.json(parsed);
      }

      if (type === "course") {
        if (!data.universityId || !data.title || !data.subject || !data.level || !data.discipline) {
          return res.status(400).json({ message: "Missing required course fields: universityId, title, subject, level, discipline" });
        }
        if (!VALID_COURSE_LEVELS.includes(data.level)) {
          return res.status(400).json({ message: `Invalid course level "${data.level}". Must be an exact enum value.` });
        }
        if (!VALID_DISCIPLINES.includes(data.discipline)) {
          return res.status(400).json({ message: `Invalid discipline "${data.discipline}". Must be an exact enum value.` });
        }
        if (data.qualificationFramework && !VALID_QUALIFICATION_FRAMEWORKS.includes(data.qualificationFramework)) {
          return res.status(400).json({ message: `Invalid qualificationFramework "${data.qualificationFramework}". Must be one of: ${VALID_QUALIFICATION_FRAMEWORKS.join(", ")}` });
        }
        const duplicate = await db
          .select({ id: courses.id, title: courses.title })
          .from(courses)
          .where(and(
            eq(courses.universityId, data.universityId),
            ilike(courses.title, data.title.trim())
          ))
          .limit(1)
          .then((r) => r[0]);
        if (duplicate) {
          return res.status(409).json({
            success: false,
            message: `Course "${duplicate.title}" already exists at this institution (ID: ${duplicate.id}). Duplicate creation blocked.`,
          });
        }
        const result = await executeToolCall("save_course_draft", data, userId);
        const parsed = JSON.parse(result);
        return res.json(parsed);
      }

      return res.status(400).json({ message: "Invalid type. Must be 'institution' or 'course'" });
    } catch (err) {
      console.error("[AdminChat] save-draft error:", err);
      res.status(500).json({ message: "Failed to save draft" });
    }
  });

  app.post("/api/admin-chat/context", requireAdmin, async (req: any, res: Response) => {
    try {
      const userId = getUserId(req)!;
      const ctx = await getAdminContext(userId);
      res.json(ctx);
    } catch (err) {
      console.error("[AdminChat] context error:", err);
      res.status(500).json({ message: "Failed to fetch context" });
    }
  });

  console.log("[AdminChat] Admin chat routes registered (with data entry tools)");
}
