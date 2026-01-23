import OpenAI from "openai";
import { promises as dns } from 'dns';
import { storage } from "./storage";

// Node.js 18+ has built-in fetch, but TypeScript needs to know about it
declare const fetch: typeof global.fetch;

// OpenRouter configuration for multi-model access
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";

// Initialize OpenAI client for OpenRouter (if OpenRouter key is available)
// Falls back to direct OpenAI if only OPENAI_API_KEY is available
function getAiClient(): OpenAI {
  if (process.env.OPENROUTER_API_KEY) {
    return new OpenAI({
      baseURL: OPENROUTER_API_URL,
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        "HTTP-Referer": process.env.REPLIT_DEPLOYMENT_URL || "https://replit.com",
        "X-Title": "StudyMatch - ANZ Global Education Platform",
      },
    });
  }
  if (process.env.OPENAI_API_KEY) {
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  throw new Error("No AI API key configured");
}

// Default fallback model if settings not configured
const DEFAULT_MODEL = "anthropic/claude-3.5-sonnet";

// Cache AI settings to avoid repeated DB queries
let cachedModelId: string | null = null;
let cachedTemperature: number | null = null;
let cachedMaxTokens: number | null = null;
let settingsCacheTimestamp = 0;
const SETTINGS_CACHE_TTL = 60000; // 1 minute cache

async function getAiSettings(): Promise<{ model: string; temperature: number; maxTokens: number }> {
  const now = Date.now();
  if (cachedModelId && cachedTemperature !== null && cachedMaxTokens !== null && (now - settingsCacheTimestamp) < SETTINGS_CACHE_TTL) {
    return { model: cachedModelId, temperature: cachedTemperature, maxTokens: cachedMaxTokens };
  }
  
  try {
    const allSettings = await storage.getAllAiSettings();
    const defaultSettings = allSettings.find(s => s.settingKey === "default_model");
    cachedModelId = defaultSettings?.modelId || DEFAULT_MODEL;
    cachedTemperature = parseFloat(String(defaultSettings?.temperature ?? "0.7"));
    cachedMaxTokens = parseInt(String(defaultSettings?.maxTokens ?? "2048"));
    settingsCacheTimestamp = now;
    return { model: cachedModelId, temperature: cachedTemperature, maxTokens: cachedMaxTokens };
  } catch (error) {
    console.error("Error fetching AI settings, using defaults:", error);
    return { model: DEFAULT_MODEL, temperature: 0.7, maxTokens: 2048 };
  }
}

function checkAIConfigured() {
  if (!process.env.OPENROUTER_API_KEY && !process.env.OPENAI_API_KEY) {
    const error: any = new Error("AI features are not configured. Please add OPENROUTER_API_KEY or OPENAI_API_KEY.");
    error.code = 'ai_not_configured';
    error.status = 503;
    throw error;
  }
}

// Helper to create AI completion using configured settings from database
async function createAiCompletion(prompt: string, options?: { maxTokens?: number; temperature?: number; json?: boolean }): Promise<string> {
  checkAIConfigured();
  const client = getAiClient();
  const settings = await getAiSettings();
  
  console.log(`[AI] Using model: ${settings.model}, temp: ${settings.temperature}, maxTokens: ${options?.maxTokens || settings.maxTokens}`);
  
  const response = await client.chat.completions.create({
    model: settings.model,
    messages: [{ role: "user", content: prompt }],
    max_tokens: options?.maxTokens || settings.maxTokens,
    temperature: options?.temperature ?? settings.temperature,
    ...(options?.json && { response_format: { type: "json_object" as const } }),
  });
  
  return response.choices[0]?.message?.content || "";
}

export async function generateUniversityDescription(name: string, location: string): Promise<string> {
  const prompt = `Generate a compelling and professional university description for ${name} located in ${location}. 
The description should be 2-3 paragraphs and highlight:
- The university's academic excellence and research contributions
- Campus facilities and student life
- Global perspective and international opportunities
- Commitment to student success

Write in a professional, welcoming tone suitable for prospective students.`;

  return createAiCompletion(prompt, { maxTokens: 500 });
}

export async function generateCourseDescription(
  title: string,
  subject: string,
  level: string
): Promise<string> {
  const prompt = `Generate a detailed course description for "${title}", a ${level} level course in ${subject}.
The description should be 2-3 paragraphs and include:
- Course overview and learning objectives
- Key topics and curriculum highlights
- Skills and knowledge students will gain
- Career opportunities and real-world applications

Write in an engaging, informative tone that attracts prospective students.`;

  console.log("Generating course description with configured AI model");
  const content = await createAiCompletion(prompt, { maxTokens: 500 });
  console.log("Generated content length:", content.length);

  return content;
}

interface StudentProfileData {
  personalInfo?: {
    firstName?: string;
    lastName?: string;
    nationality?: string;
    countryOfResidence?: string;
    preferredStudyDestination?: string;
    intakePreference?: string;
  };
  educationHistory?: Array<{
    level?: string;
    institution?: string;
    fieldOfStudy?: string;
    country?: string;
    gpa?: string;
  }>;
  languageTests?: Array<{
    testType?: string;
    overallScore?: string;
  }>;
  employmentHistory?: Array<{
    jobTitle?: string;
    company?: string;
    industry?: string;
    employmentType?: string;
    country?: string;
    city?: string;
    isCurrentlyWorking?: boolean;
    responsibilities?: string;
    achievements?: string;
  }>;
  bioFormData?: {
    educationLevel?: string;
    fieldOfStudy?: string;
    previousEducation?: string;
  };
}

export async function generateStudentBio(
  profileData: StudentProfileData
): Promise<string> {
  checkAIConfigured();
  
  const contextParts: string[] = [];
  
  if (profileData.personalInfo?.firstName) {
    contextParts.push(`Student name: ${profileData.personalInfo.firstName} ${profileData.personalInfo.lastName || ''}`);
  }
  if (profileData.personalInfo?.nationality) {
    contextParts.push(`From: ${profileData.personalInfo.nationality}`);
  }
  if (profileData.personalInfo?.preferredStudyDestination) {
    contextParts.push(`Wants to study in: ${profileData.personalInfo.preferredStudyDestination}`);
  }
  
  if (profileData.educationHistory && profileData.educationHistory.length > 0) {
    const eduDetails = profileData.educationHistory.map(edu => {
      const parts = [edu.level, edu.fieldOfStudy, edu.institution, edu.country].filter(Boolean);
      if (edu.gpa) parts.push(`GPA: ${edu.gpa}`);
      return parts.join(' - ');
    }).join('; ');
    contextParts.push(`Education background: ${eduDetails}`);
  }
  
  if (profileData.languageTests && profileData.languageTests.length > 0) {
    const langDetails = profileData.languageTests.map(test => 
      `${test.testType?.toUpperCase()}: ${test.overallScore}`
    ).join(', ');
    contextParts.push(`Language proficiency: ${langDetails}`);
  }
  
  if (profileData.employmentHistory && profileData.employmentHistory.length > 0) {
    const empDetails = profileData.employmentHistory.map(emp => {
      const parts = [emp.jobTitle, emp.company, emp.industry].filter(Boolean);
      if (emp.isCurrentlyWorking) parts.push('(current)');
      if (emp.responsibilities) parts.push(`Responsibilities: ${emp.responsibilities}`);
      return parts.join(' - ');
    }).join('; ');
    contextParts.push(`Work experience: ${empDetails}`);
  }
  
  if (profileData.bioFormData?.educationLevel) {
    contextParts.push(`Current level: ${profileData.bioFormData.educationLevel}`);
  }
  if (profileData.bioFormData?.fieldOfStudy) {
    contextParts.push(`Field of study: ${profileData.bioFormData.fieldOfStudy}`);
  }
  
  const context = contextParts.length > 0 ? contextParts.join('\n') : 'an international student';
  
  const prompt = `Generate a compelling personal bio for an international student applying to universities. Use the following profile information to personalize it:

${context}

The bio should be 1-2 paragraphs and include:
- Their academic journey and achievements
- Their professional experience and skills (if applicable)
- Their interests and what drives their educational journey
- Why they're pursuing international education
- Their approach to learning and growth

Write in first person, professional yet personable tone. Make it genuine and specific based on the provided information.`;

  return createAiCompletion(prompt, { maxTokens: 400 });
}

export async function generateCareerGoals(
  profileData: StudentProfileData
): Promise<string> {
  
  const contextParts: string[] = [];
  
  if (profileData.personalInfo?.preferredStudyDestination) {
    contextParts.push(`Planning to study in: ${profileData.personalInfo.preferredStudyDestination}`);
  }
  
  if (profileData.educationHistory && profileData.educationHistory.length > 0) {
    const fields = profileData.educationHistory.map(edu => edu.fieldOfStudy).filter(Boolean);
    if (fields.length > 0) {
      contextParts.push(`Background in: ${fields.join(', ')}`);
    }
    const levels = profileData.educationHistory.map(edu => edu.level).filter(Boolean);
    if (levels.length > 0) {
      contextParts.push(`Education levels: ${levels.join(', ')}`);
    }
  }
  
  if (profileData.employmentHistory && profileData.employmentHistory.length > 0) {
    const empDetails = profileData.employmentHistory.map(emp => {
      const parts = [emp.jobTitle, emp.company, emp.industry].filter(Boolean);
      if (emp.isCurrentlyWorking) parts.push('(current)');
      if (emp.achievements) parts.push(`Achievements: ${emp.achievements}`);
      return parts.join(' - ');
    }).join('; ');
    contextParts.push(`Work experience: ${empDetails}`);
  }
  
  if (profileData.bioFormData?.fieldOfStudy) {
    contextParts.push(`Studying: ${profileData.bioFormData.fieldOfStudy}`);
  }
  if (profileData.bioFormData?.educationLevel) {
    contextParts.push(`Current level: ${profileData.bioFormData.educationLevel}`);
  }
  
  const context = contextParts.length > 0 ? contextParts.join('\n') : 'an international student';
  
  const prompt = `Generate career goals for an international student applying to universities. Use the following profile information:

${context}

The goals should be 1-2 paragraphs and include:
- Short-term career aspirations (immediately after graduation)
- Long-term career goals (5-10 years)
- How their education, professional experience, and international experience will help achieve these goals
- The impact they hope to make in their field or community

Write in first person, ambitious yet realistic tone. Make it specific based on the provided information, especially leveraging any work experience mentioned.`;

  return createAiCompletion(prompt, { maxTokens: 400 });
}

export async function generateInstitutionSmallDescription(
  name: string,
  location: string,
  providerType?: string
): Promise<string> {
  const typeContext = providerType ? ` a ${providerType}` : " an educational institution";
  const prompt = `Generate a compelling short description (maximum 100 words) for ${name},${typeContext} located in ${location}.

The description should:
- Be concise and impactful (under 100 words)
- Highlight what makes the institution unique
- Mention key strengths or specializations
- Appeal to prospective students

Write in a professional, engaging tone.`;

  return createAiCompletion(prompt, { maxTokens: 150 });
}

export async function generateInstitutionFullDescription(
  name: string,
  location: string,
  providerType?: string,
  topDisciplines?: string[]
): Promise<string> {
  const typeContext = providerType ? ` a ${providerType}` : " an educational institution";
  const disciplinesContext = topDisciplines && topDisciplines.length > 0 
    ? ` The institution specializes in ${topDisciplines.join(", ")}.` 
    : "";
  
  const prompt = `Generate a comprehensive, detailed description for ${name},${typeContext} located in ${location}.${disciplinesContext}

The description should be 4-5 paragraphs and include:
- Institution history and mission
- Academic programs and research excellence
- Campus facilities and learning environment
- Student support services and resources
- International opportunities and industry connections
- Commitment to student success and outcomes

Write in a professional, inspiring tone suitable for prospective students and their families.`;

  return createAiCompletion(prompt, { maxTokens: 800 });
}

export async function generateInstitutionDescriptionFromWebsite(url: string): Promise<string> {
  checkAIConfigured();
  
  // Validate URL to prevent SSRF (includes DNS resolution checks)
  const validatedUrl = await validateUrl(url);
  
  // Fetch webpage content with timeout and size limits
  let htmlContent: string;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(validatedUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ANZ-Education-Bot/1.0)',
      },
      signal: controller.signal,
      redirect: 'manual',
    });
    
    clearTimeout(timeoutId);
    
    if (response.status >= 300 && response.status < 400) {
      throw new Error('Redirects are not allowed for security reasons. Please provide the final URL.');
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch website: ${response.statusText}`);
    }
    
    const MAX_SIZE = 2 * 1024 * 1024;
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_SIZE) {
      throw new Error('Website content too large (max 2MB)');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Unable to read response body');
    }

    let receivedLength = 0;
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      receivedLength += value.length;

      if (receivedLength > MAX_SIZE) {
        reader.cancel();
        throw new Error('Website content exceeded size limit (max 2MB)');
      }
    }

    const chunksAll = new Uint8Array(receivedLength);
    let position = 0;
    for (const chunk of chunks) {
      chunksAll.set(chunk, position);
      position += chunk.length;
    }

    htmlContent = new TextDecoder('utf-8').decode(chunksAll);
    
    if (htmlContent.length > 50000) {
      htmlContent = htmlContent.substring(0, 50000);
    }
  } catch (error: any) {
    throw new Error(`Failed to fetch website content: ${error.message}`);
  }

  const prompt = `You are an expert copywriter for educational institutions. Analyze the following webpage content and generate a compelling, professional description for this institution.

IMPORTANT INSTRUCTIONS:
- Write a 4-5 paragraph description (200-300 words total)
- Focus on what makes this institution unique and valuable to prospective students
- Include information about academic programs, facilities, student support, and outcomes if mentioned
- Write in a professional, inspiring tone suitable for prospective students and their families
- Base your description ONLY on information found in the website content
- Do not make up facts or statistics not present in the content
- If limited information is available, focus on what you can confidently infer

Website URL: ${url}

Webpage Content:
${htmlContent}

Generate a professional institution description:`;

  return createAiCompletion(prompt, { maxTokens: 600 });
}

export async function generateInstitutionGalleryImages(
  name: string,
  location: string,
  providerType?: string
): Promise<string[]> {
  checkAIConfigured();
  
  // Image generation requires direct OpenAI access (DALL-E)
  if (!process.env.OPENAI_API_KEY) {
    console.warn("DALL-E image generation requires OPENAI_API_KEY, skipping gallery generation");
    return [];
  }
  
  const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const typeContext = providerType ? ` ${providerType}` : " educational institution";
  
  const prompts = [
    `A modern, welcoming campus entrance of ${name}, a${typeContext} in ${location}. Show impressive architecture with students walking, bright daylight, professional photography style`,
    `Students studying and collaborating in a state-of-the-art library or learning commons at ${name} in ${location}. Modern furniture, natural lighting, engaged students, vibrant atmosphere`,
    `Beautiful campus grounds of ${name} in ${location} showing outdoor study areas, green spaces, and modern buildings. Students socializing, sunny day, professional university photography`
  ];

  const imageUrls: string[] = [];

  for (const prompt of prompts) {
    try {
      const response = await openaiClient.images.generate({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
      });

      if (response.data?.[0]?.url) {
        imageUrls.push(response.data[0].url);
      }
    } catch (error) {
      console.error("Error generating gallery image:", error);
    }
  }

  return imageUrls;
}

interface ExtractedInstitutionData {
  name: string | null;
  description: string | null;
  overview: string | null;
  country: string | null;
  establishedYear: number | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  providerType: string | null;
  topDisciplines: string[] | null;
  topCourses: string[] | null;
  numberOfCampuses: number | null;
  campusAddresses: Array<{
    address: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  }> | null;
  scholarshipPercentageMin: number | null;
  scholarshipPercentageMax: number | null;
}

// Check if an IP address is private/internal
function isPrivateIP(ip: string): boolean {
  // Check for localhost
  if (ip === '127.0.0.1' || ip === '::1' || ip === '0.0.0.0') {
    return true;
  }

  // Check for IPv4 private ranges
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ip.match(ipv4Regex);
  if (match) {
    const [, a, b, c, d] = match.map(Number);
    
    // Validate octets
    if (a > 255 || b > 255 || c > 255 || d > 255) {
      return true; // Invalid IP, treat as private
    }
    
    return (
      a === 10 || // 10.0.0.0/8
      (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
      (a === 192 && b === 168) || // 192.168.0.0/16
      (a === 169 && b === 254) || // 169.254.0.0/16 (link-local)
      a === 127 || // 127.0.0.0/8 (loopback)
      a === 0 // 0.0.0.0/8
    );
  }

  // Check for IPv6 private ranges
  if (ip.includes(':')) {
    const lower = ip.toLowerCase();
    return (
      lower.startsWith('::1') || // loopback
      lower.startsWith('::ffff:127.') || // IPv4-mapped loopback
      lower.startsWith('fc') || // fc00::/7 (unique local)
      lower.startsWith('fd') || // fd00::/8 (unique local)
      lower.startsWith('fe80:') // fe80::/10 (link-local)
    );
  }

  return false;
}

// Allowlist of approved educational domains
// Only allow extraction from known educational institutions to reduce SSRF risk
const ALLOWED_EDUCATION_DOMAINS = [
  // Common educational TLDs
  '.edu',           // US higher education
  '.edu.au',        // Australian education
  '.edu.cn',        // Chinese education
  '.edu.hk',        // Hong Kong education
  '.edu.sg',        // Singapore education
  '.edu.my',        // Malaysian education
  '.edu.nz',        // New Zealand education
  '.edu.ph',        // Philippines education
  '.edu.tw',        // Taiwan education
  '.edu.in',        // Indian education
  '.edu.pk',        // Pakistani education
  '.edu.bd',        // Bangladeshi education
  '.edu.lk',        // Sri Lankan education
  '.edu.np',        // Nepalese education
  '.edu.mm',        // Myanmar education
  '.edu.kh',        // Cambodian education
  '.edu.vn',        // Vietnamese education
  '.edu.th',        // Thai education
  '.edu.id',        // Indonesian education
  '.edu.bn',        // Brunei education
  '.edu.mo',        // Macau education
  // Academic domains (UK, Europe, etc.)
  '.ac.uk',         // UK academic
  '.ac.nz',         // New Zealand academic
  '.ac.za',         // South African academic
  '.ac.jp',         // Japanese academic
  '.ac.kr',         // Korean academic
  '.ac.il',         // Israeli academic
  '.ac.at',         // Austrian academic
  '.ac.be',         // Belgian academic
  '.ac.in',         // Indian academic
  '.ac.th',         // Thai academic
  '.ac.ae',         // UAE academic
  // University-specific patterns (common worldwide)
  'university.',
  'universi',       // Covers university, universitas, universiteit, etc.
  'college.',
  'institute.',
  'school.',
  'academy.',
  'tafe.',          // Australian TAFE
  'polytechnic.',
  '.uni-',          // German/European universities
];

// Validate URL to prevent SSRF attacks
async function validateUrl(urlString: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new Error('Invalid URL format');
  }

  // Only allow http and https protocols
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only HTTP and HTTPS protocols are allowed');
  }

  const hostname = url.hostname.toLowerCase();

  // Check if domain is in allowlist
  const isAllowed = ALLOWED_EDUCATION_DOMAINS.some(pattern => {
    if (pattern.startsWith('.')) {
      // TLD pattern - check if hostname ends with it
      return hostname.endsWith(pattern);
    } else if (pattern.endsWith('.')) {
      // Subdomain pattern - check if hostname contains it
      return hostname.includes(pattern);
    } else {
      // Contains pattern - check if hostname includes it
      return hostname.includes(pattern);
    }
  });

  if (!isAllowed) {
    throw new Error('Domain not in allowlist. Only educational institution websites (.edu, .ac.*, university/college domains) are allowed for security reasons.');
  }

  // Reject localhost variants
  const forbiddenHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'];
  if (forbiddenHosts.includes(hostname)) {
    throw new Error('Access to localhost is not allowed');
  }

  // Check if hostname is already an IP address
  if (hostname.match(/^(\d{1,3}\.){3}\d{1,3}$/) || hostname.includes(':')) {
    if (isPrivateIP(hostname)) {
      throw new Error('Access to private IP addresses is not allowed');
    }
  } else {
    // Resolve DNS to check if domain points to private IPs
    try {
      const addresses = await dns.resolve4(hostname).catch(() => [] as string[]);
      const addresses6 = await dns.resolve6(hostname).catch(() => [] as string[]);
      const allAddresses = [...addresses, ...addresses6];

      if (allAddresses.length === 0) {
        throw new Error('Unable to resolve hostname');
      }

      for (const address of allAddresses) {
        if (isPrivateIP(address)) {
          throw new Error('Domain resolves to a private IP address');
        }
      }
    } catch (error: any) {
      if (error.message.includes('private IP')) {
        throw error;
      }
      // DNS resolution failed - reject for safety
      throw new Error('Unable to resolve hostname or domain is invalid');
    }
  }

  return url;
}

export async function extractInstitutionDataFromWebsite(url: string): Promise<ExtractedInstitutionData> {
  checkAIConfigured();
  
  // Validate URL to prevent SSRF (includes DNS resolution checks)
  const validatedUrl = await validateUrl(url);
  
  // Fetch webpage content with timeout and size limits
  let htmlContent: string;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const response = await fetch(validatedUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ANZ-Education-Bot/1.0)',
      },
      signal: controller.signal,
      redirect: 'manual', // Prevent following redirects to avoid SSRF bypass
    });
    
    clearTimeout(timeoutId);
    
    // Reject redirects to prevent SSRF bypass via redirect chains
    if (response.status >= 300 && response.status < 400) {
      throw new Error('Redirects are not allowed for security reasons. Please provide the final URL.');
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch website: ${response.statusText}`);
    }
    
    // Limit response size to 2MB to prevent DoS
    const MAX_SIZE = 2 * 1024 * 1024;
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_SIZE) {
      throw new Error('Website content too large (max 2MB)');
    }

    // Read with size limit
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Unable to read response body');
    }

    let receivedLength = 0;
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      receivedLength += value.length;

      if (receivedLength > MAX_SIZE) {
        reader.cancel();
        throw new Error('Website content exceeded size limit (max 2MB)');
      }
    }

    const chunksAll = new Uint8Array(receivedLength);
    let position = 0;
    for (const chunk of chunks) {
      chunksAll.set(chunk, position);
      position += chunk.length;
    }

    htmlContent = new TextDecoder('utf-8').decode(chunksAll);
    
    // Limit content size to avoid token limits (first 50000 characters)
    if (htmlContent.length > 50000) {
      htmlContent = htmlContent.substring(0, 50000);
    }
  } catch (error: any) {
    throw new Error(`Failed to fetch website content: ${error.message}`);
  }

  // Use OpenAI to extract structured data
  const prompt = `You are an expert at extracting structured institution/university data from website content.

Analyze the following webpage content and extract as much accurate information as possible about the educational institution.

IMPORTANT INSTRUCTIONS:
- Only extract information that is clearly stated on the website
- Return null for any field that cannot be confidently determined
- For arrays, return null if no information is found
- Be conservative - accuracy is more important than completeness
- Extract EXACT contact information (email, phone) if visible
- For campus addresses, extract complete address information including street, city, state, postcode, country
- For provider type, choose from: "Institution", "TAFE", "University", "College", "School", or null
- For scholarships, extract percentage ranges if mentioned (e.g., "10-50% scholarships" means min=10, max=50)
- For established year, extract the founding/establishment year as a 4-digit integer

Website URL: ${url}

Webpage Content:
${htmlContent}

Extract the following fields and return as JSON:
{
  "name": "Official institution name",
  "description": "Brief description (100-200 words)",
  "overview": "Longer overview if available (1-2 sentences)",
  "country": "Primary country location",
  "establishedYear": 1995,
  "contactEmail": "contact@institution.edu",
  "contactPhone": "+1234567890",
  "website": "https://institution.edu",
  "providerType": "University",
  "topDisciplines": ["Engineering", "Medicine", "Business"],
  "topCourses": ["Computer Science", "MBA", "Nursing"],
  "numberOfCampuses": 3,
  "campusAddresses": [
    {
      "address": "123 Main St",
      "city": "Sydney",
      "state": "NSW",
      "postcode": "2000",
      "country": "Australia"
    }
  ],
  "scholarshipPercentageMin": 10,
  "scholarshipPercentageMax": 50
}`;

  const content = await createAiCompletion(prompt, { maxTokens: 2000, json: true });
  
  try {
    const extractedData = JSON.parse(content || "{}") as ExtractedInstitutionData;
    return extractedData;
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    throw new Error("Failed to parse extracted data from AI");
  }
}

interface InternalExtractedCourseData {
  title: string | null;
  description: string | null;
  subject: string | null;
  level: string | null;
  duration: string | null;
  durationMonths: number | null;
  fees: number | null;
  currency: string | null;
  location: string | null;
  country: string | null;
  startDate: string | null;
  applicationDeadline: string | null;
  prerequisites: string | null;
  courseCode: string | null;
  prPathway: boolean | null;
  scholarshipPercentageMin: number | null;
  scholarshipPercentageMax: number | null;
  eligibilityRequirements: string | null;
  englishRequirements: string | null;
  academicRequirements: string | null;
  intakes: string[] | null;
  studyAreas: string[] | null;
  careerOutcomes: string[] | null;
  careerPath: string | null;
  deliveryMode: string | null;
  campusLocations: string[] | null;
  workRights: boolean | null;
  internshipAvailable: boolean | null;
  internshipDetails: string | null;
  minimumAge: number | null;
}

export async function extractCourseDataFromWebsite(url: string): Promise<ExtractedCourseData> {
  checkAIConfigured();
  
  // SECURITY: Use the same validateUrl function to prevent SSRF attacks
  // This includes domain allowlist, DNS resolution checks, private IP protection
  const validatedUrl = await validateUrl(url);
  
  // Fetch webpage content with redirect following (max 3 hops) and security validation
  let htmlContent: string;
  try {
    const MAX_REDIRECTS = 3;
    const visitedUrls = new Set<string>();
    let currentUrl = validatedUrl.toString();
    let redirectCount = 0;
    let response: Response | null = null;

    // Follow redirects with security re-validation at each hop
    while (redirectCount <= MAX_REDIRECTS) {
      // Prevent redirect loops
      if (visitedUrls.has(currentUrl)) {
        throw new Error('Redirect loop detected');
      }
      visitedUrls.add(currentUrl);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout per request

      response = await fetch(currentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ANZ-Education-Bot/1.0)',
        },
        signal: controller.signal,
        redirect: 'manual', // Handle redirects manually for security
      });
      
      clearTimeout(timeoutId);

      // Handle redirects with security re-validation
      if (response.status >= 300 && response.status < 400) {
        if (redirectCount >= MAX_REDIRECTS) {
          throw new Error('Maximum redirect limit (3) exceeded');
        }

        const location = response.headers.get('location');
        if (!location) {
          throw new Error('Redirect response missing Location header');
        }

        // Resolve relative URLs
        const redirectUrl = new URL(location, currentUrl);
        
        // Prevent protocol downgrade at any hop (https -> http) but allow upgrades (http -> https)
        const currentUrlObj = new URL(currentUrl);
        if (currentUrlObj.protocol === "https:" && redirectUrl.protocol !== "https:") {
          throw new Error(`Protocol downgrade not allowed (HTTPS to ${redirectUrl.protocol})`);
        }

        // Re-validate redirect target through same SSRF checks
        const revalidatedUrl = await validateUrl(redirectUrl.toString());
        currentUrl = revalidatedUrl.toString();
        redirectCount++;
        continue;
      }

      // Non-redirect response - break loop
      break;
    }
    
    if (!response || !response.ok) {
      throw new Error(`Failed to fetch website: ${response?.statusText || 'Unknown error'}`);
    }
    
    // Limit response size to 2MB to prevent DoS
    const MAX_SIZE = 2 * 1024 * 1024;
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_SIZE) {
      throw new Error('Website content too large (max 2MB)');
    }

    // Read with size limit
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Unable to read response body');
    }

    let receivedLength = 0;
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      receivedLength += value.length;

      if (receivedLength > MAX_SIZE) {
        reader.cancel();
        throw new Error('Website content exceeded size limit (max 2MB)');
      }
    }

    const chunksAll = new Uint8Array(receivedLength);
    let position = 0;
    for (const chunk of chunks) {
      chunksAll.set(chunk, position);
      position += chunk.length;
    }

    htmlContent = new TextDecoder('utf-8').decode(chunksAll);
    
    // Limit content size to avoid token limits (first 50000 characters)
    if (htmlContent.length > 50000) {
      htmlContent = htmlContent.substring(0, 50000);
    }
  } catch (error: any) {
    throw new Error(`Failed to fetch website content: ${error.message}`);
  }

  // Use OpenAI to extract structured course data
  const prompt = `You are an expert at extracting structured course/program data from educational website content.

Analyze the following webpage content and extract as much accurate information as possible about the educational course or program.

IMPORTANT INSTRUCTIONS:
- Only extract information that is clearly stated on the website
- Return null for any field that cannot be confidently determined
- For arrays, return null if no information is found
- Be conservative - accuracy is more important than completeness
- For level, use one of: "undergraduate", "postgraduate", "certificate", "diploma", "foundation", "pathway"
- For deliveryMode, use one of: "online", "on-campus", "hybrid", or null
- For duration, extract as human-readable text (e.g., "2 years", "18 months", "12 weeks")
- For durationMonths, convert duration to months as an integer
- For fees, extract annual tuition as a number (without currency symbols)
- For currency, extract the currency code (e.g., "AUD", "USD", "GBP")
- For scholarships, extract percentage ranges if mentioned (e.g., "10-50% scholarships" means min=10, max=50)
- For intakes, extract available intake months (e.g., ["February", "July"])
- For studyAreas, extract key curriculum topics and subjects covered
- For careerOutcomes, extract potential job roles/career paths (e.g., ["Software Engineer", "Data Analyst"])
- For careerPath, extract detailed career progression description if available
- For prPathway, set to true if course explicitly mentions permanent residency/PR pathway
- For workRights, set to true if course mentions work rights or visa eligibility

Website URL: ${url}

Webpage Content:
${htmlContent}

Extract the following fields and return as JSON:
{
  "title": "Course title",
  "description": "Course description (100-300 words)",
  "subject": "Primary subject area (e.g., 'Computer Science', 'Business', 'Engineering')",
  "level": "undergraduate|postgraduate|certificate|diploma|foundation|pathway",
  "duration": "2 years",
  "durationMonths": 24,
  "fees": 25000.00,
  "currency": "AUD",
  "location": "City, State",
  "country": "Australia",
  "startDate": "February 2025",
  "applicationDeadline": "December 2024",
  "prerequisites": "High school diploma or equivalent",
  "courseCode": "CS101",
  "prPathway": false,
  "scholarshipPercentageMin": 10,
  "scholarshipPercentageMax": 50,
  "eligibilityRequirements": "Academic and other entry requirements",
  "englishRequirements": "IELTS 6.5 or equivalent",
  "academicRequirements": "Minimum GPA 3.0",
  "intakes": ["February", "July"],
  "studyAreas": ["Programming", "Database Systems", "Web Development"],
  "careerOutcomes": ["Software Developer", "Web Developer", "Systems Analyst"],
  "careerPath": "Detailed career progression description",
  "deliveryMode": "on-campus|online|hybrid",
  "campusLocations": ["Sydney", "Melbourne"],
  "workRights": false,
  "internshipAvailable": true,
  "internshipDetails": "6-month industry placement",
  "minimumAge": 18
}`;

  const content = await createAiCompletion(prompt, { maxTokens: 2500, json: true });
  
  try {
    const extractedData = JSON.parse(content || "{}") as ExtractedCourseData;
    return extractedData;
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    throw new Error("Failed to parse extracted data from AI");
  }
}

/**
 * Parsed search parameters from natural language query
 */
export interface ParsedSearchParams {
  subject?: string;
  discipline?: string;
  subDiscipline?: string;
  level?: string;
  minFees?: number;
  maxFees?: number;
  location?: string;
  country?: string;
  campusCity?: string;
  originalQuery: string;
}

/**
 * Parsed institution search parameters from natural language query
 */
export interface ParsedInstitutionSearchParams {
  providerType?: string;
  country?: string;
  location?: string;
  searchTerm?: string;
  topDisciplines?: string[];
  originalQuery: string;
}

/**
 * Parse a natural language search query into structured search parameters
 * @param query - Natural language query (e.g., "I want to study engineering in Melbourne under $30k")
 * @returns Parsed search parameters
 */
export async function parseNaturalLanguageQuery(query: string): Promise<ParsedSearchParams> {
  checkAIConfigured();
  
  const prompt = `You are a search query parser for an education platform. Parse the following natural language search query into structured search parameters.

User Query: "${query}"

Extract these parameters if present:
- subject: field of study (e.g., "Computer Science", "Engineering", "Business", "MBA", "IT")
- discipline: main discipline category (e.g., "Computer Science & IT", "Engineering & Technology", "Medicine & Health", "Accounting, Business & Finance")
- subDiscipline: specific area within discipline (e.g., "Software Engineering", "Data Science", "Artificial Intelligence", "Cyber Security")
- level: study level (e.g., "undergraduate", "postgraduate", "certificate", "diploma", "masters", "bachelor")
- minFees: minimum tuition fees in USD (parse from expressions like "under 30k", "between 15-20k", "around 18000")
- maxFees: maximum tuition fees in USD
- location: general location description (e.g., "Melbourne", "Sydney", "Brisbane")
- country: country (e.g., "Australia") - IMPORTANT: If a city is mentioned, also identify the country. For example: "Melbourne" → country: "Australia", "Sydney" → country: "Australia"
- campusCity: specific city where course is offered at a campus location (e.g., "Melbourne", "Sydney", "Brisbane", "Perth"). Extract this when the user asks for courses "in [city]" or "at [city]" or "available in [city]"

Budget parsing examples:
- "under $30k" → maxFees: 30000
- "between $15-20k" → minFees: 15000, maxFees: 20000
- "around $18000" → minFees: 15000, maxFees: 21000 (±15%)
- "15-20 thousand" → minFees: 15000, maxFees: 20000
- "budget 20-25k" → minFees: 20000, maxFees: 25000

Level mapping:
- "MBA", "Masters", "Master's" → "postgraduate"
- "Bachelor", "Bachelor's", "undergraduate" → "undergraduate"

Discipline categories available:
- "Accounting, Business & Finance"
- "Computer Science & IT"
- "Engineering & Technology"
- "Medicine & Health"
- "Arts, Design & Architecture"
- "Education & Training"
- "Law"
- "Journalism & Media"
- "Humanities"
- And more...

Return ONLY a JSON object with the extracted parameters. If a parameter cannot be determined, omit it from the response.`;

  const content = await createAiCompletion(prompt, { maxTokens: 500, json: true });
  
  try {
    const parsed = JSON.parse(content || "{}");
    return {
      ...parsed,
      originalQuery: query,
    } as ParsedSearchParams;
  } catch (error) {
    console.error("Failed to parse natural language query:", error);
    // Return just the original query if parsing fails
    return { originalQuery: query };
  }
}

/**
 * Parse a natural language institution search query into structured search parameters
 * @param query - Natural language query (e.g., "universities in Melbourne offering engineering")
 * @returns Parsed institution search parameters
 */
export async function parseNaturalLanguageInstitutionQuery(query: string): Promise<ParsedInstitutionSearchParams> {
  checkAIConfigured();
  
  const prompt = `You are a search query parser for an education platform. Parse the following natural language search query into structured institution/university search parameters.

User Query: "${query}"

Extract these parameters if present:
- searchTerm: main keyword or institution name (e.g., "Hilton", "engineering", "business school")
- providerType: type of institution (e.g., "Public University", "Private University", "TAFE", "Private Institutions")
- country: country (e.g., "Australia") - IMPORTANT: If a city is mentioned, also identify the country
- location: city/state (e.g., "Melbourne", "Sydney", "Brisbane")
- topDisciplines: array of disciplines/fields offered (e.g., ["Engineering", "Business", "IT"])

Examples:
- "universities in Melbourne" → country: "Australia", location: "Melbourne"
- "TAFE in Sydney offering engineering" → providerType: "TAFE", location: "Sydney", country: "Australia", topDisciplines: ["Engineering"]
- "business schools in Australia" → country: "Australia", topDisciplines: ["Business"]
- "Hilton Academy" → searchTerm: "Hilton Academy"

Return ONLY a JSON object with the extracted parameters. If a parameter cannot be determined, omit it from the response.`;

  const content = await createAiCompletion(prompt, { maxTokens: 500, json: true });
  
  try {
    const parsed = JSON.parse(content || "{}");
    return {
      ...parsed,
      originalQuery: query,
    } as ParsedInstitutionSearchParams;
  } catch (error) {
    console.error("Failed to parse natural language institution query:", error);
    // Return just the original query if parsing fails
    return { originalQuery: query };
  }
}

/**
 * AI-powered entry requirements generation for courses
 * Suggests appropriate academic entry requirements based on course level and institution country
 */
export async function generateEntryRequirements(
  courseLevel: string,
  institutionCountry: string,
  courseName?: string,
  discipline?: string
): Promise<Array<{
  qualificationName: string;
  qualificationCountry: string;
  minGrade: string;
  isSelected: boolean;
}>> {
  checkAIConfigured();

  const prompt = `You are an expert in international education requirements. Generate appropriate academic entry requirements for a ${courseLevel} course${courseName ? ` called "${courseName}"` : ""}${discipline ? ` in ${discipline}` : ""} at an institution in ${institutionCountry}.

Based on ${institutionCountry}'s education standards, suggest 2-4 appropriate entry pathways/qualifications.

For each requirement, provide:
- The qualification name (e.g., "Year 12", "Foundation Year", "Diploma", "A-Levels", "IB Diploma")
- The country this qualification is from (should be ${institutionCountry})
- The minimum grade/score required (e.g., "ATAR 65", "GPA 2.5", "BBC", "Score 28")

Return ONLY a JSON object with this exact structure:
{
  "requirements": [
    {
      "qualificationName": "Year 12",
      "qualificationCountry": "Australia",
      "minGrade": "ATAR 65",
      "isSelected": true
    }
  ]
}

Consider the course level when setting requirements:
- Bachelor/Undergraduate: High school completion or equivalent
- Master/Postgraduate: Bachelor degree or equivalent
- Diploma/Certificate: High school or prior diploma
- Foundation: Lower high school requirements`;

  console.log(`[AI] Generating entry requirements using configured model`);
  const content = await createAiCompletion(prompt, { maxTokens: 500, json: true });
  
  try {
    const parsed = JSON.parse(content || "{}");
    return parsed.requirements || [];
  } catch (error) {
    console.error("Failed to parse AI entry requirements:", error);
    return [];
  }
}

/**
 * AI-powered qualification equivalency generation
 * Maps destination country requirements to equivalent qualifications in source countries
 */
export async function generateQualificationEquivalencies(
  requirements: Array<{
    qualificationName: string;
    qualificationCountry: string;
    minGrade: string;
  }>,
  sourceCountries: string[]
): Promise<Record<string, Array<{
  sourceCountry: string;
  sourceQualification: string;
  equivalentGrade: string;
  isApproved: boolean;
}>>> {
  checkAIConfigured();

  const requirementsList = requirements.map(r => 
    `- ${r.qualificationName} (${r.qualificationCountry}) with minimum ${r.minGrade}`
  ).join("\n");

  const prompt = `You are an expert in international education credential equivalency. Given the following entry requirements from destination country institutions:

${requirementsList}

Generate equivalent qualifications for students from these source countries: ${sourceCountries.join(", ")}.

For EACH source country, provide the equivalent local qualification and minimum grade that would be considered equivalent to each destination requirement.

Use these known equivalencies as guidance:
- Bangladesh HSC uses GPA scale 1.0-5.0 (5.0 is best)
- India 12th Standard uses percentage marks (0-100%)
- Nepal +2/Higher Secondary uses divisions (First: 60%+, Second: 45-60%)
- Bangladesh Bachelor/Honours uses GPA 1.0-4.0 (4.0 is best)

For example:
- Australian ATAR 65 ≈ Bangladesh HSC GPA 3.5/5.0 ≈ India 12th 60% ≈ Nepal +2 First Division
- Australian ATAR 75 ≈ Bangladesh HSC GPA 4.0/5.0 ≈ India 12th 70%
- Australian ATAR 85 ≈ Bangladesh HSC GPA 4.5/5.0 ≈ India 12th 80%

Return ONLY a JSON object where keys are the destination qualification names:
{
  "Year 12": [
    {
      "sourceCountry": "Bangladesh",
      "sourceQualification": "HSC",
      "equivalentGrade": "GPA 3.5/5.0",
      "isApproved": false
    },
    {
      "sourceCountry": "India",
      "sourceQualification": "12th Standard",
      "equivalentGrade": "60%",
      "isApproved": false
    }
  ]
}`;

  console.log(`[AI] Generating qualification equivalencies using configured model`);
  const content = await createAiCompletion(prompt, { maxTokens: 1000, json: true });
  
  try {
    return JSON.parse(content || "{}");
  } catch (error) {
    console.error("Failed to parse AI equivalencies:", error);
    return {};
  }
}

/**
 * AI-powered course data extraction from URL
 * Fetches webpage content and uses AI to extract structured course information
 */
export interface ExtractedCourseData {
  title?: string;
  description?: string;
  courseCode?: string;
  level?: string;
  discipline?: string;
  duration?: string;
  durationMonths?: number;
  durationWeeks?: number;
  fees?: number;
  currency?: string;
  applicationFees?: number;
  intakes?: string[];
  prerequisites?: string;
  eligibilityRequirements?: string;
  englishRequirements?: string;
  careerOutcomes?: string[];
  careerPath?: string;
  studyAreas?: string[];
}

export async function extractCourseDataFromUrl(url: string): Promise<ExtractedCourseData> {
  checkAIConfigured();
  
  // Use existing validateUrl which includes DNS resolution checks and SSRF protection
  const validatedUrl = await validateUrl(url);
  
  console.log(`[AI] Fetching course page: ${validatedUrl.toString()}`);
  
  // Fetch with timeout (30 seconds)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  
  try {
    const response = await fetch(validatedUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StudyMatchBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
      redirect: 'manual', // Prevent following redirects to avoid SSRF bypass
    });
    
    clearTimeout(timeout);
    
    // Reject redirects to prevent SSRF bypass via redirect chains
    if (response.status >= 300 && response.status < 400) {
      throw new Error('Redirects are not allowed for security. Please provide the final URL.');
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }
    
    // Check content type
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      throw new Error('URL does not return HTML content');
    }
    
    // Limit response size (5MB max) - use streaming to avoid memory issues
    const MAX_SIZE = 5 * 1024 * 1024;
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_SIZE) {
      throw new Error('Response too large (max 5MB)');
    }
    
    // Stream response with size limit
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Unable to read response body');
    }
    
    const chunks: Uint8Array[] = [];
    let totalSize = 0;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      totalSize += value.length;
      if (totalSize > MAX_SIZE) {
        reader.cancel();
        throw new Error('Response too large (max 5MB)');
      }
      
      chunks.push(value);
    }
    
    const html = new TextDecoder().decode(Buffer.concat(chunks.map(c => Buffer.from(c))));
  
    // Use Cheerio to extract clean text content
    const cheerio = await import('cheerio');
    const $ = cheerio.load(html);
    
    // Remove scripts, styles, navigation, footer, etc.
    $('script, style, nav, footer, header, aside, .navigation, .footer, .header, .sidebar, .menu, .cookie-banner, .popup, iframe, noscript').remove();
    
    // Extract main content
    const mainContent = $('main, article, .content, .main-content, #content, #main').text() || $('body').text();
    
    // Clean up whitespace
    const cleanedContent = mainContent
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim()
      .substring(0, 15000); // Limit content to avoid token limits
    
    console.log(`[AI] Extracted ${cleanedContent.length} characters of content`);
    
    const prompt = `You are an expert at extracting course information from educational institution webpages.

Analyze the following webpage content from a course page and extract structured information.

WEBPAGE CONTENT:
${cleanedContent}

Extract the following fields if available (return null for fields not found):

1. title - The full course name/title
2. description - A compelling course description (2-3 paragraphs, rewrite for a student-focused platform)
3. courseCode - Course code or CRICOS code if available
4. level - One of: "Certificate II", "Certificate III", "Certificate IV", "Diploma", "Advanced Diploma", "Bachelor Degree", "Masters Degree", "Doctoral Degree"
5. discipline - One of: "Accounting, Business & Finance", "Agriculture & Forestry", "Applied Sciences & Professions", "Arts, Design & Architecture", "Computer Science & IT", "Education & Training", "Engineering & Technology", "Environmental Studies & Earth Sciences", "Hospitality, Leisure & Sports", "Humanities", "Journalism & Media", "Law", "Medicine & Health", "Short Courses", "Trade"
6. duration - Text description like "3 years" or "2 years full-time"
7. durationMonths - Numeric duration in months
8. durationWeeks - Numeric duration in weeks (if specified)
9. fees - Annual tuition fees as a number (without currency symbol)
10. currency - Currency code like "AUD", "USD", "GBP"
11. applicationFees - Application fee as a number (0 if waived)
12. intakes - Array of intake months like ["February", "July"]
13. prerequisites - Academic prerequisites and prior learning requirements
14. eligibilityRequirements - General eligibility requirements
15. englishRequirements - English language test requirements (IELTS, TOEFL, PTE scores)
16. careerOutcomes - Array of potential career roles/job titles
17. careerPath - Description of career progression opportunities
18. studyAreas - Array of main subject areas or majors

Return a JSON object with these fields. For the description, rewrite it to be engaging and student-focused for an education platform, not just a copy from the source.`;

    console.log(`[AI] Extracting course data using configured model`);
    const content = await createAiCompletion(prompt, { maxTokens: 2000, json: true });
    
    try {
      const parsed = JSON.parse(content || "{}");
      console.log(`[AI] Successfully extracted course data with ${Object.keys(parsed).filter(k => parsed[k] != null).length} fields`);
      return parsed;
    } catch (parseError) {
      console.error("Failed to parse AI course extraction:", parseError);
      return {} as ExtractedCourseData;
    }
  } catch (fetchError: any) {
    clearTimeout(timeout);
    if (fetchError.name === 'AbortError') {
      throw new Error('Request timed out (30 second limit)');
    }
    throw fetchError;
  }
}
