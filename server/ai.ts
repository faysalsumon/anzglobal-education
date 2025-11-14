import OpenAI from "openai";

// Node.js 18+ has built-in fetch, but TypeScript needs to know about it
declare const fetch: typeof global.fetch;

// Using standard OpenAI API with user's API key
// Will be configured in later stages of platform development
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null;

// Use GPT-4o for high-quality AI generations
const MODEL = "gpt-4o";

function checkAIConfigured() {
  if (!openai || !process.env.OPENAI_API_KEY) {
    const error: any = new Error("AI features are not yet configured. OpenAI API key will be added in a later stage of platform development.");
    error.code = 'ai_not_configured';
    error.status = 503;
    throw error;
  }
}

export async function generateUniversityDescription(name: string, location: string): Promise<string> {
  checkAIConfigured();
  
  const prompt = `Generate a compelling and professional university description for ${name} located in ${location}. 
The description should be 2-3 paragraphs and highlight:
- The university's academic excellence and research contributions
- Campus facilities and student life
- Global perspective and international opportunities
- Commitment to student success

Write in a professional, welcoming tone suitable for prospective students.`;

  const response = await openai!.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 500,
  });

  return response.choices[0]?.message?.content || "";
}

export async function generateCourseDescription(
  title: string,
  subject: string,
  level: string
): Promise<string> {
  checkAIConfigured();
  
  const prompt = `Generate a detailed course description for "${title}", a ${level} level course in ${subject}.
The description should be 2-3 paragraphs and include:
- Course overview and learning objectives
- Key topics and curriculum highlights
- Skills and knowledge students will gain
- Career opportunities and real-world applications

Write in an engaging, informative tone that attracts prospective students.`;

  console.log("Generating course description with prompt:", prompt);

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 500,
  });

  console.log("OpenAI response:", JSON.stringify(response, null, 2));
  const content = response.choices[0]?.message?.content || "";
  console.log("Extracted content:", content);

  return content;
}

export async function generateStudentBio(
  educationLevel?: string,
  fieldOfStudy?: string
): Promise<string> {
  checkAIConfigured();
  
  const context = [educationLevel, fieldOfStudy].filter(Boolean).join(", ");
  const prompt = `Generate a compelling personal bio for a student${context ? ` studying ${context}` : ""}. 
The bio should be 1-2 paragraphs and include:
- Their academic interests and passions
- What drives their educational journey
- Their approach to learning and growth

Write in first person, professional yet personable tone.`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 300,
  });

  return response.choices[0]?.message?.content || "";
}

export async function generateCareerGoals(
  educationLevel?: string,
  fieldOfStudy?: string
): Promise<string> {
  checkAIConfigured();
  
  const context = [educationLevel, fieldOfStudy].filter(Boolean).join(", ");
  const prompt = `Generate career goals for a student${context ? ` studying ${context}` : ""}. 
The goals should be 1-2 paragraphs and include:
- Short-term and long-term career aspirations
- How their education aligns with these goals
- The impact they hope to make in their field

Write in first person, ambitious yet realistic tone.`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 300,
  });

  return response.choices[0]?.message?.content || "";
}

export async function generateInstitutionSmallDescription(
  name: string,
  location: string,
  providerType?: string
): Promise<string> {
  checkAIConfigured();
  
  const typeContext = providerType ? ` a ${providerType}` : " an educational institution";
  const prompt = `Generate a compelling short description (maximum 100 words) for ${name},${typeContext} located in ${location}.

The description should:
- Be concise and impactful (under 100 words)
- Highlight what makes the institution unique
- Mention key strengths or specializations
- Appeal to prospective students

Write in a professional, engaging tone.`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 150,
  });

  return response.choices[0]?.message?.content || "";
}

export async function generateInstitutionFullDescription(
  name: string,
  location: string,
  providerType?: string,
  topDisciplines?: string[]
): Promise<string> {
  checkAIConfigured();
  
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

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 800,
  });

  return response.choices[0]?.message?.content || "";
}

export async function generateInstitutionGalleryImages(
  name: string,
  location: string,
  providerType?: string
): Promise<string[]> {
  checkAIConfigured();
  
  const typeContext = providerType ? ` ${providerType}` : " educational institution";
  
  const prompts = [
    `A modern, welcoming campus entrance of ${name}, a${typeContext} in ${location}. Show impressive architecture with students walking, bright daylight, professional photography style`,
    `Students studying and collaborating in a state-of-the-art library or learning commons at ${name} in ${location}. Modern furniture, natural lighting, engaged students, vibrant atmosphere`,
    `Beautiful campus grounds of ${name} in ${location} showing outdoor study areas, green spaces, and modern buildings. Students socializing, sunny day, professional university photography`
  ];

  const imageUrls: string[] = [];

  for (const prompt of prompts) {
    try {
      const response = await openai!.images.generate({
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

export async function extractInstitutionDataFromWebsite(url: string): Promise<ExtractedInstitutionData> {
  checkAIConfigured();
  
  // Fetch webpage content
  let htmlContent: string;
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ANZ-Education-Bot/1.0)',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch website: ${response.statusText}`);
    }
    
    htmlContent = await response.text();
    
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

  const response = await openai!.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_completion_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content || "{}";
  
  try {
    const extractedData = JSON.parse(content) as ExtractedInstitutionData;
    return extractedData;
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    throw new Error("Failed to parse extracted data from AI");
  }
}
