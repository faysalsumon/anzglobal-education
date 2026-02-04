import OpenAI from "openai";
import { promises as dns } from 'dns';
import { chromium } from "playwright";
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

/**
 * Course description generation input
 */
export interface CourseDescriptionInput {
  title: string;
  discipline?: string;
  level?: string;
  institutionName?: string;
  duration?: string;
  careerOutcomes?: string[];
  fees?: number;
  currency?: string;
  deliveryMode?: string;
  intakes?: string[];
  prerequisites?: string;
  existingDescription?: string; // From web scraping - used as base info
}

/**
 * Generate a marketing-quality course description for SEO and student engagement
 * Uses course data (potentially from web scraping) to create compelling copy
 */
export async function generateCourseDescription(input: CourseDescriptionInput): Promise<string> {
  checkAIConfigured();
  
  // Build context from available course data
  const contextParts: string[] = [];
  
  contextParts.push(`Course Title: ${input.title}`);
  
  if (input.discipline) {
    contextParts.push(`Discipline/Field: ${input.discipline}`);
  }
  
  if (input.level) {
    contextParts.push(`Qualification Level: ${input.level}`);
  }
  
  if (input.institutionName) {
    contextParts.push(`Institution: ${input.institutionName}`);
  }
  
  if (input.duration) {
    contextParts.push(`Duration: ${input.duration}`);
  }
  
  if (input.deliveryMode) {
    contextParts.push(`Delivery Mode: ${input.deliveryMode}`);
  }
  
  if (input.fees && input.currency) {
    contextParts.push(`Tuition Fee: ${input.currency} ${input.fees.toLocaleString()}`);
  }
  
  if (input.intakes && input.intakes.length > 0) {
    contextParts.push(`Available Intakes: ${input.intakes.join(", ")}`);
  }
  
  if (input.careerOutcomes && input.careerOutcomes.length > 0) {
    contextParts.push(`Career Outcomes: ${input.careerOutcomes.join(", ")}`);
  }
  
  if (input.prerequisites) {
    contextParts.push(`Prerequisites: ${input.prerequisites}`);
  }
  
  if (input.existingDescription) {
    contextParts.push(`\nExisting Description (from source website):\n${input.existingDescription}`);
  }

  const prompt = `You are an expert education marketing copywriter creating compelling course descriptions for international students considering studying abroad.

COURSE INFORMATION:
${contextParts.join("\n")}

WRITING REQUIREMENTS:
1. Write a marketing-quality description of 250-400 words
2. Use a professional yet engaging tone that speaks directly to prospective students
3. Structure with:
   - An attention-grabbing opening that highlights the value proposition
   - Key benefits and skills students will gain
   - Career pathways and job opportunities after graduation
   - Why this course/institution stands out
   - A motivating closing that encourages action

4. Include relevant SEO keywords naturally:
   - Course discipline keywords (e.g., "business management", "IT skills", "healthcare training")
   - Career-related terms (e.g., "career opportunities", "graduate employment", "industry experience")
   - International student terms (e.g., "study in Australia", "international qualifications", "global recognition")

5. Highlight benefits for international students:
   - Practical skills and hands-on experience
   - Industry connections and work placement opportunities
   - Pathway to further study or employment
   - Support services (if relevant)

6. IMPORTANT RULES:
   - Base content on the provided information - do NOT invent specific statistics or facts
   - If limited information is available, focus on general benefits of this type of qualification
   - Write in present tense and active voice
   - Use "you" to address the prospective student directly
   - Include a call to action at the end

Generate the course description now:`;

  return createAiCompletion(prompt, { maxTokens: 800 });
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

export interface ThumbnailResult {
  success: boolean;
  url?: string;
  error?: string;
}

// Helper function to upload base64 image to object storage and get a public URL
async function uploadBase64ToObjectStorage(base64DataUrl: string, fileName: string): Promise<string | null> {
  try {
    // Check if object storage is configured
    if (!process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID) {
      console.warn("[Thumbnail AI] Object storage not configured, returning base64 URL");
      return null;
    }
    
    const { Client } = await import("@replit/object-storage");
    const storageClient = new Client();
    
    // Extract the base64 content and mime type - trim whitespace and handle multi-line
    const cleanedDataUrl = base64DataUrl.trim().replace(/\s+/g, '');
    const matches = cleanedDataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!matches) {
      console.warn("[Thumbnail AI] Invalid base64 data URL format");
      return null;
    }
    
    const [, imageType, base64Data] = matches;
    const buffer = Buffer.from(base64Data, 'base64');
    
    if (buffer.length < 100) {
      console.error(`[Thumbnail AI] Buffer too small (${buffer.length} bytes), likely invalid base64 data`);
      return null;
    }
    
    // Optimize image: resize to max 800px width and convert to WebP for smaller file size
    const sharp = (await import('sharp')).default;
    const fs = await import('fs/promises');
    const path = await import('path');
    const os = await import('os');
    
    const originalSize = buffer.length;
    console.log(`[Thumbnail AI] Original image size: ${(originalSize / 1024).toFixed(1)} KB`);
    
    // Resize and convert to WebP with 80% quality for optimal balance of size and quality
    const optimizedBuffer = await sharp(buffer)
      .resize(800, null, { 
        withoutEnlargement: true,  // Don't upscale small images
        fit: 'inside'
      })
      .webp({ quality: 80 })
      .toBuffer();
    
    const optimizedSize = optimizedBuffer.length;
    const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(1);
    console.log(`[Thumbnail AI] Image optimized: ${(originalSize / 1024).toFixed(0)}KB → ${(optimizedSize / 1024).toFixed(0)}KB (${savings}% smaller)`);
    
    // Use .webp extension for optimized images
    const fullFileName = `${fileName}.webp`;
    const objectPath = `public/thumbnails/${fullFileName}`;
    
    // Write to temp file first, then upload (uploadFromBytes has issues)
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, fullFileName);
    
    await fs.writeFile(tempFilePath, optimizedBuffer);
    
    const result = await storageClient.uploadFromFilename(objectPath, tempFilePath);
    
    // Clean up temp file
    await fs.unlink(tempFilePath).catch(() => {});
    
    // Verify upload was successful
    const verifyResult = await storageClient.downloadAsBytes(objectPath);
    
    if (result.ok && verifyResult.value && verifyResult.value.length > 100) {
      const publicUrl = `/api/public-storage/public/thumbnails/${fullFileName}`;
      console.log(`[Thumbnail AI] Thumbnail saved: ${publicUrl} (${(optimizedSize / 1024).toFixed(0)}KB)`);
      return publicUrl;
    } else {
      console.warn("[Thumbnail AI] Failed to upload to object storage");
      return null;
    }
  } catch (error: any) {
    console.error("[Thumbnail AI] Error uploading to object storage:", error?.message);
    return null;
  }
}

// Discipline-specific visual contexts for unique, authentic thumbnails
const DISCIPLINE_VISUALS: Record<string, {
  settings: string[];
  activities: string[];
  props: string[];
  atmosphere: string[];
}> = {
  // TRADES & CONSTRUCTION
  "carpentry": {
    settings: ["workshop with sawdust and wood planks", "construction site with timber framing", "woodworking studio with workbenches"],
    activities: ["measuring and cutting timber with precision tools", "building wooden furniture frames", "operating power saws safely"],
    props: ["power drills, saws, measuring tapes, safety goggles", "wooden beams, lumber, construction blueprints", "tool belts, hard hats, work gloves"],
    atmosphere: ["industrial workshop lighting", "morning sunlight through dusty workshop windows", "busy construction site ambiance"]
  },
  "plumbing": {
    settings: ["plumbing workshop with pipe systems", "bathroom renovation site", "industrial pipe fitting area"],
    activities: ["connecting copper pipes with precision", "installing modern fixtures", "troubleshooting water systems"],
    props: ["pipe wrenches, soldering equipment, copper tubing", "valve systems, faucets, plumbing blueprints", "safety equipment, work lights"],
    atmosphere: ["clean workshop environment", "residential renovation setting", "hands-on learning atmosphere"]
  },
  "electrical": {
    settings: ["electrical training lab with wiring panels", "industrial control room", "residential electrical installation"],
    activities: ["wiring electrical panels", "testing circuits with multimeters", "installing lighting systems"],
    props: ["wire strippers, multimeters, circuit breakers", "electrical panels, conduit, safety switches", "insulated tools, voltage testers"],
    atmosphere: ["well-lit technical lab", "industrial facility setting", "safety-focused environment"]
  },
  "automotive": {
    settings: ["modern auto repair garage", "automotive workshop with lifted cars", "engine diagnostic bay"],
    activities: ["diagnosing engine problems", "working under vehicle hoods", "using computerized diagnostic tools"],
    props: ["diagnostic scanners, wrenches, car parts", "engine blocks, tires, hydraulic lifts", "mechanic's toolbox, oil equipment"],
    atmosphere: ["busy garage with natural light", "professional auto shop", "hands-on mechanical environment"]
  },
  "construction": {
    settings: ["active construction site with scaffolding", "building foundation site", "commercial construction project"],
    activities: ["operating heavy equipment", "reading blueprints on site", "coordinating building work"],
    props: ["hard hats, high-visibility vests, blueprints", "concrete forms, steel beams, cranes", "surveying equipment, safety barriers"],
    atmosphere: ["outdoor construction environment", "morning light on building site", "professional construction setting"]
  },
  "welding": {
    settings: ["welding workshop with sparks flying", "metal fabrication facility", "industrial welding bay"],
    activities: ["arc welding metal joints", "inspecting weld quality", "preparing metal surfaces"],
    props: ["welding masks, torches, metal sheets", "grinders, clamps, welding rods", "protective gear, ventilation systems"],
    atmosphere: ["dramatic welding sparks", "industrial manufacturing setting", "skilled craftsmanship environment"]
  },

  // HEALTHCARE & NURSING
  "nursing": {
    settings: ["modern hospital ward", "clinical simulation lab", "patient care unit"],
    activities: ["checking patient vital signs", "administering medications carefully", "practicing on medical mannequins"],
    props: ["stethoscopes, blood pressure monitors, medical charts", "IV equipment, hospital beds, monitors", "nursing uniforms, medical gloves"],
    atmosphere: ["bright hospital lighting", "caring clinical environment", "professional healthcare setting"]
  },
  "healthcare": {
    settings: ["medical examination room", "healthcare facility", "clinical practice area"],
    activities: ["performing health assessments", "using medical equipment", "consulting with patients"],
    props: ["medical instruments, examination tables", "health monitoring devices, medical records", "professional medical attire"],
    atmosphere: ["clean clinical setting", "patient-focused environment", "modern healthcare facility"]
  },
  "aged care": {
    settings: ["aged care facility lounge", "residential care home", "elderly care center"],
    activities: ["assisting elderly residents with activities", "providing compassionate care", "engaging seniors in activities"],
    props: ["mobility aids, comfortable seating", "activity materials, care equipment", "warm home-like furnishings"],
    atmosphere: ["warm and homely environment", "compassionate care setting", "peaceful residential atmosphere"]
  },
  "dental": {
    settings: ["modern dental clinic", "dental treatment room", "oral health practice"],
    activities: ["performing dental examinations", "using dental instruments", "explaining procedures to patients"],
    props: ["dental chairs, x-ray equipment", "dental tools, oral hygiene supplies", "treatment computers, lighting"],
    atmosphere: ["bright clean dental office", "professional clinic setting", "patient comfort focused"]
  },
  "pharmacy": {
    settings: ["pharmacy dispensary", "hospital pharmacy", "pharmaceutical lab"],
    activities: ["preparing prescriptions accurately", "checking medication interactions", "consulting with customers"],
    props: ["prescription bottles, medications", "pharmacy computers, weighing scales", "lab coats, safety equipment"],
    atmosphere: ["organized pharmacy environment", "precise scientific setting", "healthcare retail space"]
  },

  // INFORMATION TECHNOLOGY
  "information technology": {
    settings: ["modern tech office with multiple monitors", "server room with racks", "software development workspace"],
    activities: ["coding on large screens", "troubleshooting network issues", "collaborating on software projects"],
    props: ["laptops, dual monitors, keyboards", "server equipment, networking cables", "whiteboards with diagrams"],
    atmosphere: ["modern tech startup vibe", "focused coding environment", "innovative workspace"]
  },
  "computer science": {
    settings: ["computer lab with rows of workstations", "AI research facility", "software engineering office"],
    activities: ["programming complex algorithms", "analyzing data visualizations", "debugging code collaboratively"],
    props: ["high-end computers, coding screens", "AI robots, research equipment", "technical books, coffee cups"],
    atmosphere: ["academic computing environment", "cutting-edge research facility", "collaborative tech space"]
  },
  "cybersecurity": {
    settings: ["security operations center", "network monitoring room", "ethical hacking lab"],
    activities: ["monitoring security dashboards", "analyzing threat data", "testing system vulnerabilities"],
    props: ["multiple security monitors, dark screens", "network diagrams, security tools", "hoodies, dim lighting"],
    atmosphere: ["high-tech security environment", "focused monitoring setting", "cyber defense atmosphere"]
  },
  "data science": {
    settings: ["data analytics workspace", "machine learning lab", "business intelligence center"],
    activities: ["visualizing large datasets", "building predictive models", "presenting data insights"],
    props: ["data dashboards, charts on screens", "statistical software, notebooks", "presentation screens"],
    atmosphere: ["data-driven office space", "analytical work environment", "insight-focused setting"]
  },

  // BUSINESS & MANAGEMENT
  "business": {
    settings: ["modern corporate boardroom", "startup office space", "business conference room"],
    activities: ["presenting to stakeholders", "analyzing business reports", "strategic planning sessions"],
    props: ["presentation screens, laptops", "business reports, charts, coffee", "professional attire, notepads"],
    atmosphere: ["professional business environment", "dynamic startup atmosphere", "executive meeting setting"]
  },
  "accounting": {
    settings: ["accounting firm office", "finance department", "audit workspace"],
    activities: ["analyzing financial spreadsheets", "reviewing tax documents", "preparing financial reports"],
    props: ["calculators, financial documents", "accounting software on screens", "organized desk setup"],
    atmosphere: ["organized professional office", "detail-oriented workspace", "financial precision environment"]
  },
  "marketing": {
    settings: ["creative marketing agency", "digital marketing workspace", "brand strategy room"],
    activities: ["brainstorming campaign ideas", "analyzing social media metrics", "designing marketing materials"],
    props: ["creative mood boards, brand mockups", "social media dashboards", "marketing presentations"],
    atmosphere: ["creative agency environment", "dynamic brainstorming setting", "colorful creative space"]
  },
  "hospitality": {
    settings: ["luxury hotel lobby", "restaurant kitchen", "event management venue"],
    activities: ["greeting guests professionally", "preparing gourmet dishes", "coordinating events"],
    props: ["hotel uniforms, reception desk", "chef attire, cooking equipment", "event decorations, table settings"],
    atmosphere: ["welcoming hospitality setting", "bustling kitchen energy", "elegant venue atmosphere"]
  },
  "tourism": {
    settings: ["travel agency office", "airport terminal", "tourist information center"],
    activities: ["planning travel itineraries", "assisting travelers", "promoting destinations"],
    props: ["travel brochures, maps, globes", "booking systems, luggage", "destination displays"],
    atmosphere: ["exciting travel environment", "international airport setting", "wanderlust-inspiring space"]
  },

  // CREATIVE ARTS & DESIGN
  "design": {
    settings: ["creative design studio", "graphic design workspace", "industrial design lab"],
    activities: ["sketching design concepts", "working on digital design software", "creating prototypes"],
    props: ["drawing tablets, design software", "color swatches, mood boards", "3D models, design samples"],
    atmosphere: ["artistic creative space", "modern design studio", "innovative design environment"]
  },
  "media": {
    settings: ["video production studio", "podcast recording booth", "media editing suite"],
    activities: ["filming with professional cameras", "editing video on large screens", "recording audio content"],
    props: ["cameras, lighting rigs, microphones", "editing software, sound boards", "green screens, monitors"],
    atmosphere: ["professional studio lighting", "creative media environment", "production-ready setting"]
  },
  "music": {
    settings: ["recording studio with instruments", "music practice room", "concert hall backstage"],
    activities: ["playing instruments collaboratively", "mixing audio tracks", "rehearsing performances"],
    props: ["guitars, pianos, drums, microphones", "mixing consoles, headphones", "sheet music, instruments"],
    atmosphere: ["acoustic studio environment", "creative music space", "performance-ready setting"]
  },
  "photography": {
    settings: ["photography studio with lighting", "outdoor photo shoot location", "photo editing workspace"],
    activities: ["setting up professional shots", "editing photos on calibrated monitors", "directing photo subjects"],
    props: ["DSLR cameras, studio lights, backdrops", "tripods, reflectors, lenses", "editing tablets, color calibrators"],
    atmosphere: ["professional studio lighting", "creative outdoor setting", "artistic workspace"]
  },
  "fashion": {
    settings: ["fashion design atelier", "textile workshop", "fashion runway backstage"],
    activities: ["draping fabric on mannequins", "sewing garments carefully", "fitting models for shows"],
    props: ["sewing machines, fabric rolls, mannequins", "fashion sketches, measuring tapes", "garment racks, accessories"],
    atmosphere: ["creative fashion studio", "bustling atelier environment", "glamorous backstage setting"]
  },

  // ENGINEERING & SCIENCES
  "engineering": {
    settings: ["engineering lab with equipment", "CAD design workspace", "prototype workshop"],
    activities: ["testing mechanical prototypes", "designing on CAD software", "building engineering models"],
    props: ["engineering drawings, 3D printers", "mechanical components, testing equipment", "precision tools, safety gear"],
    atmosphere: ["innovative engineering lab", "technical workspace", "hands-on building environment"]
  },
  "science": {
    settings: ["chemistry laboratory", "research facility", "biology lab with microscopes"],
    activities: ["conducting experiments carefully", "analyzing samples under microscopes", "recording research data"],
    props: ["lab coats, safety goggles, beakers", "microscopes, test tubes, pipettes", "scientific equipment, lab notebooks"],
    atmosphere: ["bright laboratory lighting", "precise scientific environment", "research-focused setting"]
  },
  "agriculture": {
    settings: ["modern farm with crops", "agricultural research facility", "greenhouse with plants"],
    activities: ["analyzing soil samples", "operating farm equipment", "studying plant growth"],
    props: ["farming equipment, soil testing kits", "greenhouse plants, irrigation systems", "agricultural technology"],
    atmosphere: ["outdoor farm environment", "sustainable agriculture setting", "green growing spaces"]
  },
  "environmental": {
    settings: ["environmental research station", "outdoor field study site", "sustainability lab"],
    activities: ["collecting water samples", "monitoring ecosystems", "analyzing environmental data"],
    props: ["field equipment, water testing kits", "GPS devices, specimen containers", "environmental monitoring tools"],
    atmosphere: ["natural outdoor setting", "conservation-focused environment", "eco-research atmosphere"]
  },

  // EDUCATION & SOCIAL SERVICES
  "education": {
    settings: ["vibrant classroom with students", "teacher training center", "early childhood education space"],
    activities: ["leading interactive lessons", "preparing teaching materials", "engaging children in activities"],
    props: ["whiteboards, educational materials", "children's books, learning toys", "teaching resources, lesson plans"],
    atmosphere: ["bright educational environment", "nurturing classroom setting", "inspiring learning space"]
  },
  "social work": {
    settings: ["community center", "counseling office", "family support facility"],
    activities: ["meeting with community members", "providing support counseling", "organizing community programs"],
    props: ["comfortable seating, private spaces", "resource materials, community boards", "welcoming reception areas"],
    atmosphere: ["warm supportive environment", "safe counseling space", "community-focused setting"]
  },
  "psychology": {
    settings: ["psychology practice office", "research observation room", "counseling suite"],
    activities: ["conducting therapy sessions", "performing psychological assessments", "analyzing behavioral data"],
    props: ["comfortable therapy chairs, notes", "assessment materials, research data", "calming office decor"],
    atmosphere: ["calming therapeutic space", "professional practice setting", "confidential counseling environment"]
  },

  // LANGUAGES & ENGLISH
  "english": {
    settings: ["language learning classroom", "conversation practice lounge", "IELTS test preparation center"],
    activities: ["practicing English conversation", "studying grammar and vocabulary", "taking language assessments"],
    props: ["English textbooks, dictionaries", "language learning apps, headphones", "writing materials, flashcards"],
    atmosphere: ["multicultural classroom setting", "interactive language environment", "focused study atmosphere"]
  },
  "languages": {
    settings: ["multilingual learning center", "cultural exchange classroom", "language lab with booths"],
    activities: ["practicing foreign languages", "cultural immersion activities", "translation exercises"],
    props: ["multilingual books, translation tools", "cultural artifacts, world maps", "language software, recordings"],
    atmosphere: ["diverse cultural environment", "international learning setting", "language-focused space"]
  },

  // DEFAULT FALLBACK
  "default": {
    settings: ["modern university campus", "collaborative learning space", "academic library"],
    activities: ["studying together in groups", "working on projects collaboratively", "engaging in academic discussions"],
    props: ["laptops, textbooks, notebooks", "study materials, coffee cups", "university branded items"],
    atmosphere: ["inspiring academic environment", "collaborative learning setting", "intellectual campus atmosphere"]
  }
};

// Check if word exists as whole word (not substring) using word boundaries
function hasWholeWord(text: string, word: string): boolean {
  const regex = new RegExp(`\\b${word}\\b`, 'i');
  return regex.test(text);
}

// Get discipline visual context with improved matching
function getDisciplineVisuals(discipline?: string, courseTitle?: string): typeof DISCIPLINE_VISUALS["default"] {
  if (!discipline && !courseTitle) return DISCIPLINE_VISUALS["default"];
  
  const searchText = `${discipline || ""} ${courseTitle || ""}`.toLowerCase();
  
  // Priority order for matching - use substring match unless pattern starts with ^ (whole word)
  const matchPatterns: [string[], string][] = [
    // Trades
    [["carpentry", "woodwork", "timber", "joinery", "cabinet"], "carpentry"],
    [["plumb", "pipe", "sanitation"], "plumbing"],
    [["electr", "wiring", "circuit"], "electrical"],
    [["automotive", "mechanic", "vehicle", "car repair", "motor"], "automotive"],
    [["construction", "building", "civil", "bricklaying"], "construction"],
    [["weld", "fabricat", "metal work"], "welding"],
    // Healthcare
    [["nurs", "midwif", "patient care"], "nursing"],
    [["aged care", "elderly", "disability", "community service"], "aged care"],
    [["dental", "oral health", "dentist"], "dental"],
    [["pharmac", "dispens", "medication"], "pharmacy"],
    [["health", "medical", "clinical", "pathology"], "healthcare"],
    // IT - Use ^word for whole-word matching on short terms like "IT"
    [["cyber", "network security", "ethical hack"], "cybersecurity"],
    [["data science", "machine learning", "analytics", "big data"], "data science"],
    [["computer science", "software engineer", "programming", "algorithm", "developer"], "computer science"],
    [["information tech", "^it", "^ict", "network admin", "system admin", "cloud computing", "tech support"], "information technology"],
    // Business
    [["account", "bookkeep", "tax", "audit", "finance"], "accounting"],
    [["market", "digital market", "brand", "advertis"], "marketing"],
    [["hospit", "hotel", "resort", "food service"], "hospitality"],
    [["tour", "travel", "aviation", "event"], "tourism"],
    [["business", "^mba", "management", "commerce", "entrepreneur"], "business"],
    // Creative
    [["design", "graphic", "ux", "ui", "visual"], "design"],
    [["media", "film", "video", "broadcast", "journalism"], "media"],
    [["music", "audio", "sound"], "music"],
    [["photo", "camera", "imaging"], "photography"],
    [["fashion", "textile", "apparel", "garment"], "fashion"],
    // Engineering & Science
    [["engineer", "mechanical", "aerospace", "civil eng"], "engineering"],
    [["science", "chemistry", "biology", "physics", "lab"], "science"],
    [["agricult", "farm", "horticulture", "viticulture"], "agriculture"],
    [["environment", "sustainab", "ecology", "conservation"], "environmental"],
    // Education & Social
    [["education", "teaching", "early childhood", "tesol"], "education"],
    [["social work", "community", "welfare", "youth work"], "social work"],
    [["psych", "counsel", "therapy", "mental health"], "psychology"],
    // Languages
    [["english", "ielts", "pte", "esl", "elicos"], "english"],
    [["language", "translation", "interpreter", "naati"], "languages"],
  ];
  
  for (const [patterns, key] of matchPatterns) {
    const matched = patterns.some(p => {
      if (p.startsWith('^')) {
        // Whole word match for patterns like ^it, ^mba
        return hasWholeWord(searchText, p.slice(1));
      }
      return searchText.includes(p);
    });
    if (matched) {
      return DISCIPLINE_VISUALS[key] || DISCIPLINE_VISUALS["default"];
    }
  }
  
  return DISCIPLINE_VISUALS["default"];
}

// Random selection helper
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function generateCourseThumbnail(
  courseTitle: string,
  discipline?: string,
  level?: string,
  universityName?: string
): Promise<ThumbnailResult> {
  if (!process.env.OPENROUTER_API_KEY) {
    const msg = "Image generation requires OPENROUTER_API_KEY";
    console.warn(msg);
    return { success: false, error: msg };
  }
  
  // Get discipline-specific visual context
  const visuals = getDisciplineVisuals(discipline, courseTitle);
  
  // Randomly select specific elements for variety
  const setting = randomChoice(visuals.settings);
  const activity = randomChoice(visuals.activities);
  const props = randomChoice(visuals.props);
  const atmosphere = randomChoice(visuals.atmosphere);
  
  // Level-specific context
  const levelDescriptor = level?.toLowerCase().includes("master") 
    ? "mature graduate students"
    : level?.toLowerCase().includes("certificate") 
      ? "young adult vocational students"
      : "university students";
  
  // Create environment-first prompt with students as natural participants
  const prompt = `A realistic professional photograph in a ${setting}. 
${atmosphere}, showing diverse international ${levelDescriptor} ${activity}.
The scene includes ${props}. Students appear engaged, skilled, and professional.
Authentic educational photography capturing real hands-on learning. 
Course context: "${courseTitle}"${universityName ? ` at ${universityName}` : ""}.
High quality stock photo style. No text, no watermarks, no logos, no artificial elements.`;

  try {
    console.log(`[Thumbnail AI] Generating thumbnail via OpenRouter Nano Banana Pro for: ${courseTitle}`);
    
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.REPLIT_DOMAINS?.split(",")[0] || "https://anzglobal.edu",
        "X-Title": "ANZ Global Education"
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        modalities: ["image", "text"],
        image_config: {
          aspect_ratio: "16:9"
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `OpenRouter API error: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      console.error(`[Thumbnail AI] OpenRouter error:`, errorMessage);
      return { success: false, error: errorMessage };
    }
    
    const data = await response.json();
    
    // Log the full response structure for debugging
    console.log(`[Thumbnail AI] OpenRouter response keys:`, Object.keys(data));
    console.log(`[Thumbnail AI] Message structure:`, data.choices?.[0]?.message ? Object.keys(data.choices[0].message) : 'no message');
    
    // Extract base64 image from response - Nano Banana Pro returns images in message
    const message = data.choices?.[0]?.message;
    let imageUrl: string | null = null;
    
    // Check for inline image in content parts (array format)
    if (message?.content && Array.isArray(message.content)) {
      console.log(`[Thumbnail AI] Content is array with ${message.content.length} parts`);
      for (const part of message.content) {
        console.log(`[Thumbnail AI] Part type:`, part.type, 'keys:', Object.keys(part));
        if (part.type === "image_url" && part.image_url?.url) {
          imageUrl = part.image_url.url;
          console.log(`[Thumbnail AI] Found image_url, length: ${imageUrl.length}`);
          break;
        }
        // Also check for inline_data format (Gemini style)
        if (part.inline_data?.data && part.inline_data?.mime_type) {
          imageUrl = `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
          console.log(`[Thumbnail AI] Found inline_data, constructed data URL length: ${imageUrl.length}`);
          break;
        }
        // Check for data field directly on part (some models)
        if (part.type === "image" && part.data) {
          const mimeType = part.mime_type || 'image/png';
          imageUrl = `data:${mimeType};base64,${part.data}`;
          console.log(`[Thumbnail AI] Found image part with data, constructed data URL length: ${imageUrl.length}`);
          break;
        }
      }
    }
    
    // Check for images array in message
    if (!imageUrl && message?.images?.[0]?.image_url?.url) {
      imageUrl = message.images[0].image_url.url;
      console.log(`[Thumbnail AI] Found in images array, length: ${imageUrl.length}`);
    }
    
    // Check if image data is embedded in content string
    if (!imageUrl && typeof message?.content === "string") {
      console.log(`[Thumbnail AI] Content is string, length: ${message.content.length}`);
      if (message.content.includes("data:image")) {
        // Use more permissive regex that captures the full base64
        const match = message.content.match(/data:image\/[a-zA-Z0-9+]+;base64,[A-Za-z0-9+/=]+/);
        if (match) {
          imageUrl = match[0];
          console.log(`[Thumbnail AI] Extracted from string content, length: ${imageUrl.length}`);
        }
      }
    }
    
    if (!imageUrl) {
      console.warn(`[Thumbnail AI] No image in response for: ${courseTitle}`);
      console.warn(`[Thumbnail AI] Response preview:`, JSON.stringify(data).substring(0, 1000));
      return { success: false, error: "No image returned from Nano Banana Pro model" };
    }
    
    console.log(`[Thumbnail AI] Found image URL, total length: ${imageUrl.length}, starts with: ${imageUrl.substring(0, 50)}`);
    
    
    // If it's a base64 data URL, upload to object storage for a proper URL
    if (imageUrl.startsWith('data:image')) {
      const timestamp = Date.now();
      const safeTitle = courseTitle.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
      const fileName = `course_${safeTitle}_${timestamp}`;
      
      const uploadedUrl = await uploadBase64ToObjectStorage(imageUrl, fileName);
      if (uploadedUrl) {
        console.log(`[Thumbnail AI] Successfully generated and uploaded thumbnail for: ${courseTitle}`);
        return { success: true, url: uploadedUrl };
      } else {
        // Fall back to returning the base64 URL if upload fails
        console.log(`[Thumbnail AI] Upload failed, returning base64 URL for: ${courseTitle}`);
        return { success: true, url: imageUrl };
      }
    }
    
    // If it's already a proper URL, return it directly
    console.log(`[Thumbnail AI] Successfully generated thumbnail for: ${courseTitle}`);
    return { success: true, url: imageUrl };
  } catch (error: any) {
    const errorMessage = error?.message || "Unknown error generating thumbnail";
    console.error(`[Thumbnail AI] Error generating thumbnail for ${courseTitle}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
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
  
  // Fetch webpage content using hybrid approach
  let htmlContent: string;
  let fetchMethod: 'http' | 'browser' = 'http';
  
  // Enhanced browser-like headers for better compatibility
  const browserHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
  };
  
  // Helper function to fetch with HTTP (with safe redirect handling)
  async function fetchWithHttp(): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    // Manual redirect handling for SSRF protection
    let currentUrl = validatedUrl.toString();
    let redirectCount = 0;
    const MAX_REDIRECTS = 3;
    
    while (redirectCount < MAX_REDIRECTS) {
      const response = await fetch(currentUrl, {
        headers: browserHeaders,
        signal: controller.signal,
        redirect: 'manual', // Manual redirect for SSRF protection
      });
      
      // Handle redirects safely
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          throw new Error('Redirect without location header');
        }
        
        // Validate the redirect URL for SSRF
        const redirectUrl = new URL(location, currentUrl);
        const validatedRedirect = await validateUrl(redirectUrl.toString());
        currentUrl = validatedRedirect.toString();
        redirectCount++;
        continue;
      }
      
      clearTimeout(timeoutId);
      
      // Check for blocked responses
      if (response.status === 403 || response.status === 429) {
        throw new Error(`BLOCKED:${response.status}:${response.statusText}`);
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

      return new TextDecoder('utf-8').decode(chunksAll);
    }
    
    // If we exhausted redirects
    throw new Error('Too many redirects');
  }
  
  // Helper function to fetch with Playwright browser (with SSRF protection)
  async function fetchWithBrowser(): Promise<string> {
    console.log('[AI Extraction] Falling back to browser-based extraction for:', url);
    let browser = null;
    let page = null;
    
    // List of blocked IP patterns for SSRF protection (after DNS resolution)
    const blockedIpPatterns = [
      /^127\./,           // Localhost
      /^10\./,            // Private Class A
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private Class B
      /^192\.168\./,      // Private Class C
      /^169\.254\./,      // Link-local
      /^0\./,             // Invalid
      /^::1$/,            // IPv6 localhost
      /^fc00:/i,          // IPv6 private
      /^fe80:/i,          // IPv6 link-local
    ];
    
    const blockedHostPatterns = [
      /localhost/i,       // Localhost hostname
      /\.local$/i,        // Local domains
      /\.internal$/i,     // Internal domains
    ];
    
    function isPrivateIp(ip: string): boolean {
      return blockedIpPatterns.some(pattern => pattern.test(ip));
    }
    
    function isBlockedHostname(hostname: string): boolean {
      return blockedHostPatterns.some(pattern => pattern.test(hostname));
    }
    
    // Validate URL with DNS resolution (async, but we'll check hostname first)
    async function isAllowedRequest(urlToCheck: string): Promise<boolean> {
      try {
        const parsed = new URL(urlToCheck);
        const hostname = parsed.hostname;
        
        // Quick check: blocked hostnames
        if (isBlockedHostname(hostname)) {
          return false;
        }
        
        // Check if hostname is already an IP address
        if (isPrivateIp(hostname)) {
          return false;
        }
        
        // Resolve DNS to check for private IPs (DNS rebinding protection)
        try {
          const addresses = await dns.lookup(hostname, { all: true });
          for (const addr of addresses) {
            if (isPrivateIp(addr.address)) {
              console.log(`[AI Extraction] DNS resolved to private IP: ${hostname} -> ${addr.address}`);
              return false;
            }
          }
        } catch (dnsError) {
          // DNS resolution failed - allow if it's a valid-looking hostname
          // The browser will fail to load anyway if DNS truly fails
          console.log(`[AI Extraction] DNS lookup failed for ${hostname}, allowing request`);
        }
        
        return true;
      } catch {
        return false; // Block invalid URLs
      }
    }
    
    // Extract the allowed origin from validated URL for same-origin enforcement
    const allowedOrigin = new URL(validatedUrl.toString()).origin;
    
    // Map to store pinned IPs for DNS rebinding protection
    const pinnedIps = new Map<string, string[]>();
    
    // Validate URL with DNS resolution and IP pinning
    async function isAllowedRequestWithPinning(urlToCheck: string): Promise<boolean> {
      try {
        const parsed = new URL(urlToCheck);
        const hostname = parsed.hostname;
        const requestOrigin = parsed.origin;
        
        // Strict same-origin enforcement - only allow requests to the validated domain
        if (requestOrigin !== allowedOrigin) {
          console.log(`[AI Extraction] Blocked cross-origin request: ${requestOrigin} (allowed: ${allowedOrigin})`);
          return false;
        }
        
        // Quick check: blocked hostnames
        if (isBlockedHostname(hostname)) {
          return false;
        }
        
        // Check if hostname is already an IP address
        if (isPrivateIp(hostname)) {
          return false;
        }
        
        // Resolve DNS and pin IPs to prevent DNS rebinding
        try {
          const addresses = await dns.lookup(hostname, { all: true });
          const resolvedIps = addresses.map(a => a.address);
          
          // Check for private IPs in resolution
          for (const ip of resolvedIps) {
            if (isPrivateIp(ip)) {
              console.log(`[AI Extraction] DNS resolved to private IP: ${hostname} -> ${ip}`);
              return false;
            }
          }
          
          // Pin the IPs for this hostname (first lookup wins)
          if (!pinnedIps.has(hostname)) {
            pinnedIps.set(hostname, resolvedIps);
            console.log(`[AI Extraction] Pinned IPs for ${hostname}: ${resolvedIps.join(', ')}`);
          } else {
            // Verify IPs haven't changed (DNS rebinding check)
            const pinned = pinnedIps.get(hostname)!;
            const hasMatch = resolvedIps.some(ip => pinned.includes(ip));
            if (!hasMatch) {
              console.log(`[AI Extraction] DNS rebinding detected for ${hostname}: pinned=${pinned.join(',')} resolved=${resolvedIps.join(',')}`);
              return false;
            }
          }
        } catch (dnsError) {
          // If this is the first time and DNS fails, block it
          if (!pinnedIps.has(hostname)) {
            console.log(`[AI Extraction] DNS lookup failed for ${hostname}, blocking request`);
            return false;
          }
        }
        
        return true;
      } catch {
        return false; // Block invalid URLs
      }
    }
    
    try {
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
      
      page = await browser.newPage();
      
      // Add request interception for SSRF protection with same-origin + IP pinning
      await page.route('**/*', async (route) => {
        const requestUrl = route.request().url();
        
        // Only allow HTTP/HTTPS protocols
        if (!requestUrl.startsWith('http://') && !requestUrl.startsWith('https://')) {
          console.log('[AI Extraction] Blocked non-HTTP request:', requestUrl);
          await route.abort('blockedbyclient');
          return;
        }
        
        // Validate with same-origin check + DNS resolution + IP pinning
        const allowed = await isAllowedRequestWithPinning(requestUrl);
        
        if (!allowed) {
          await route.abort('blockedbyclient');
          return;
        }
        
        await route.continue();
      });
      
      // Set realistic viewport and user agent
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
      });
      
      // Navigate with extended timeout for slow sites
      await page.goto(validatedUrl.toString(), {
        timeout: 30000,
        waitUntil: 'domcontentloaded',
      });
      
      // Wait a moment for dynamic content
      await page.waitForTimeout(2000);
      
      const content = await page.content();
      return content;
    } finally {
      if (page) await page.close();
      if (browser) await browser.close();
    }
  }
  
  try {
    // Try HTTP first (faster)
    htmlContent = await fetchWithHttp();
    console.log('[AI Extraction] Successfully fetched with HTTP');
  } catch (httpError: any) {
    // Check if blocked - retry with browser
    if (httpError.message?.includes('BLOCKED') || 
        httpError.message?.includes('Forbidden') ||
        httpError.message?.includes('403') ||
        httpError.message?.includes('429') ||
        httpError.message?.includes('Access Denied')) {
      console.log('[AI Extraction] HTTP blocked, trying browser fallback:', httpError.message);
      try {
        htmlContent = await fetchWithBrowser();
        fetchMethod = 'browser';
        console.log('[AI Extraction] Successfully fetched with browser');
      } catch (browserError: any) {
        throw new Error(`Website blocked both HTTP and browser access. The site may have strong anti-bot protection. Error: ${browserError.message}`);
      }
    } else {
      throw new Error(`Failed to fetch website content: ${httpError.message}`);
    }
  }
    
  // Limit content size to avoid token limits (first 50000 characters)
  if (htmlContent.length > 50000) {
    htmlContent = htmlContent.substring(0, 50000);
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
export interface ExtractedEnglishRequirement {
  testType: string;
  minOverallScore?: string;
  minListeningScore?: string;
  minReadingScore?: string;
  minWritingScore?: string;
  minSpeakingScore?: string;
  notes?: string;
}

export interface ExtractedCourseData {
  title?: string;
  description?: string;
  courseCode?: string;
  qualificationFramework?: string;
  level?: string;
  discipline?: string;
  specialization?: string;
  duration?: string;
  durationMonths?: number;
  durationWeeks?: number;
  fees?: number;
  currency?: string;
  applicationFees?: number;
  intakes?: string[];
  startDate?: string;
  applicationDeadline?: string;
  prerequisites?: string;
  eligibilityRequirements?: string;
  englishRequirements?: string;
  structuredEnglishRequirements?: ExtractedEnglishRequirement[];
  careerOutcomes?: string[];
  careerPath?: string;
  studyAreas?: string[];
  studyModes?: string[];
  deliveryMode?: string;
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
4. qualificationFramework - The qualification framework. Must be one of: "AQF" (Australian), "NZQF" (New Zealand), "EQF" (European), "RQF" (UK), "NQF_BD" (Bangladesh), "NSQF" (India), "MQA" (Malaysia), "Other". Infer from URL domain or institution name (.edu.au = AQF, .ac.nz = NZQF, .ac.uk = RQF, etc.)
5. level - The qualification level. For AQF use: "Certificate I", "Certificate II", "Certificate III", "Certificate IV", "Diploma", "Advanced Diploma", "Associate Degree", "Bachelor Degree", "Bachelor Honours", "Graduate Certificate", "Graduate Diploma", "Masters Degree", "Doctoral Degree". For other frameworks, use the appropriate level name.
6. discipline - One of: "Accounting, Business & Finance", "Agriculture & Forestry", "Applied Sciences & Professions", "Arts, Design & Architecture", "Computer Science & IT", "Education & Training", "Engineering & Technology", "Environmental Studies & Earth Sciences", "Hospitality, Leisure & Sports", "Humanities", "Journalism & Media", "Law", "Medicine & Health", "Short Courses", "Trade"
7. specialization - The specific specialization or major within the discipline (e.g., "Cyber Security" for Computer Science, "Nursing" for Medicine & Health)
8. duration - Text description like "3 years" or "2 years full-time"
9. durationMonths - Numeric duration in months
10. durationWeeks - Numeric duration in weeks (if specified)
11. fees - Annual tuition fees as a number (without currency symbol). For international students if available.
12. currency - Currency code like "AUD", "USD", "GBP", "EUR", "NZD"
13. applicationFees - Application fee as a number (0 if waived)
14. intakes - Array of intake months like ["February", "July"] or semester names like ["Semester 1", "Semester 2"]
15. startDate - Next available start date in format "Month Day, Year" (e.g., "February 24, 2025")
16. applicationDeadline - Application deadline date in format "Month Day, Year" if available
17. prerequisites - Academic prerequisites and prior learning requirements
18. eligibilityRequirements - General eligibility requirements
19. englishRequirements - Plain text summary of English language test requirements
20. structuredEnglishRequirements - Array of structured English requirements, each with:
    - testType: "IELTS Academic", "PTE Academic", "TOEFL iBT", "Cambridge", "OET", or "Duolingo"
    - minOverallScore: Overall score required (e.g., "6.5", "65", "79")
    - minListeningScore: Minimum listening band/score if specified
    - minReadingScore: Minimum reading band/score if specified
    - minWritingScore: Minimum writing band/score if specified
    - minSpeakingScore: Minimum speaking band/score if specified
    - notes: Any additional notes about this requirement
21. careerOutcomes - Array of potential career roles/job titles
22. careerPath - Description of career progression opportunities
23. studyAreas - Array of main subject areas or majors covered in the course
24. studyModes - Array of available study modes like ["Full-time", "Part-time", "Online", "On-campus", "Evening", "Weekend"]
25. deliveryMode - Primary delivery mode: "On Campus", "Online", "Blended", or "Flexible"

Return a JSON object with these fields. For the description, rewrite it to be engaging and student-focused for an education platform, not just a copy from the source.`;

    console.log(`[AI] Extracting course data using configured model`);
    const content = await createAiCompletion(prompt, { maxTokens: 3000, json: true });
    
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

export interface ExtractedPassportData {
  passportNumber: string | null;
  passportCountry: string | null;
  passportIssuedDate: string | null;
  passportExpiryDate: string | null;
  issuingAuthority: string | null;
  fullName: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  gender: string | null;
  confidence: number;
  errors?: string[];
}

export async function extractPassportFromImage(imageBase64: string, mimeType: string): Promise<ExtractedPassportData> {
  checkAIConfigured();
  
  const client = getAiClient();
  
  const prompt = `Analyze this passport image and extract the following information. Return a JSON object with these fields:

1. passportNumber - The passport number/document number
2. passportCountry - The full country name of the issuing country (e.g., "Australia", "Bangladesh", "India")
3. passportIssuedDate - Issue date in YYYY-MM-DD format
4. passportExpiryDate - Expiry date in YYYY-MM-DD format
5. issuingAuthority - The authority that issued the passport (e.g., "Department of Immigration", "Passport Office", "Ministry of Foreign Affairs")
6. fullName - Full name as shown on passport (given names + surname)
7. dateOfBirth - Date of birth in YYYY-MM-DD format
8. nationality - Nationality as shown on passport
9. gender - "male" or "female"
10. confidence - A number between 0 and 1 indicating how confident you are in the extraction (1 = very confident, 0 = unable to read)
11. errors - Array of any issues encountered (e.g., "Could not read passport number", "Image quality too low")

Important notes:
- For dates, convert to YYYY-MM-DD format (e.g., "1990-05-15")
- For country names, use the full English country name
- If a field cannot be read clearly, set it to null and add an error message
- Only extract data you can clearly see - do not guess or hallucinate

Return ONLY a valid JSON object with these fields.`;

  try {
    console.log(`[AI] Extracting passport data from image using GPT-4o vision`);
    
    const response = await client.chat.completions.create({
      model: "openai/gpt-4o", // Use GPT-4o for vision capabilities
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.1, // Low temperature for more accurate extraction
    });

    const content = response.choices[0]?.message?.content || "{}";
    
    // Try to extract JSON from the response
    let jsonContent = content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }
    
    const parsed = JSON.parse(jsonContent);
    console.log(`[AI] Successfully extracted passport data with confidence: ${parsed.confidence}`);
    
    return {
      passportNumber: parsed.passportNumber || null,
      passportCountry: parsed.passportCountry || null,
      passportIssuedDate: parsed.passportIssuedDate || null,
      passportExpiryDate: parsed.passportExpiryDate || null,
      issuingAuthority: parsed.issuingAuthority || null,
      fullName: parsed.fullName || null,
      dateOfBirth: parsed.dateOfBirth || null,
      nationality: parsed.nationality || null,
      gender: parsed.gender || null,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
      errors: Array.isArray(parsed.errors) ? parsed.errors : [],
    };
  } catch (error: any) {
    console.error("[AI] Passport extraction failed:", error);
    return {
      passportNumber: null,
      passportCountry: null,
      passportIssuedDate: null,
      passportExpiryDate: null,
      issuingAuthority: null,
      fullName: null,
      dateOfBirth: null,
      nationality: null,
      gender: null,
      confidence: 0,
      errors: [error.message || "Failed to extract passport data"],
    };
  }
}
