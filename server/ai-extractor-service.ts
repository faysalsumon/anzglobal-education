import OpenAI from "openai";
import {
  getCourseSchemaMetadata,
  getInstitutionSchemaMetadata,
  generateExtractionFields,
  generateJSONSchema,
  type SchemaMetadata,
} from "./schema-introspection";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/**
 * Extraction result with source attribution
 */
export interface ExtractionResult<T> {
  data: T;
  confidence: number; // 0-1 score of extraction confidence
  sourceUrl: string;
  extractedAt: string;
  warnings: string[]; // Any issues encountered during extraction
}

/**
 * Extract course data from HTML content using AI
 * Automatically adapts to current schema fields
 */
export async function extractCourseData(
  htmlContent: string,
  sourceUrl: string,
  institutionName?: string
): Promise<ExtractionResult<any>> {
  const metadata = getCourseSchemaMetadata();
  const extractionFields = generateExtractionFields(metadata);
  const jsonSchema = generateJSONSchema(metadata);

  const systemPrompt = `You are a precise data extraction assistant specializing in educational course information.

TASK: Extract structured course data from the provided HTML content.

SCHEMA FIELDS (these fields dynamically adapt to the current database schema):
${extractionFields}

EXTRACTION RULES:
1. Extract ONLY factual information present in the HTML
2. NEVER invent, guess, or hallucinate data
3. If a field value is not found, omit it (for optional fields) or use null (for required fields)
4. For arrays, extract all relevant items found
5. For enums, use EXACTLY one of the provided values
6. Preserve original formatting for text fields

FIELD-SPECIFIC EXTRACTION GUIDANCE:

TITLE & SUBJECT:
- Extract the full official course name (e.g., "Bachelor of Computer Science")
- Subject should be the main field of study (e.g., "Computer Science", "Engineering", "Business")

FEES & COSTS:
- Extract numeric values only (remove $, AUD, USD, commas)
- Look for "tuition fees", "course fees", "annual fees"
- fees: Total tuition amount
- applicationFees: Application/enrollment fees
- costOfLiving: Estimated living expenses if mentioned

DURATION:
- duration: Text format (e.g., "3 years full-time", "2 years")
- durationMonths: Convert to months (e.g., "3 years" = 36)
- durationWeeks: Convert to weeks if shorter courses (e.g., "10 weeks" = 10)

DATES:
- startDate: Look for intake dates, semester starts (e.g., "February 2024", "Semester 1")
- applicationDeadline: Look for "apply by", "deadline", "closing date"
- Format as ISO date or clear text (avoid ambiguous formats)

LEVEL:
- Must match ONE of these exactly: Certificate I, Certificate II, Certificate III, Certificate IV, Diploma, Advanced Diploma, Associate Degree, Bachelor Degree, Graduate Certificate, Graduate Diploma, Masters Degree, Doctoral Degree, Foundation, Vocational
- Look for "level", "qualification type", "award type"

DISCIPLINE:
- Categories include: Business, IT, Engineering, Health, Arts, etc.
- Match to the discipline enum if possible

REQUIREMENTS:
- prerequisites: Prior education/courses needed (e.g., "High school completion")
- eligibilityRequirements: Entry requirements summary
- academicRequirements: Academic scores/GPA requirements
- englishRequirements: English language tests (text format)
- englishRequirementsStructured: Parse IELTS/TOEFL scores if available (JSON format)
- minimumAge: Age requirements if mentioned

LOCATION & DELIVERY:
- location: Campus name/city
- country: Australia, Bangladesh, etc.
- campusLocations: Array of all campus options
- deliveryMode: Online, On-campus, Hybrid, Blended

CAREER & PATHWAYS:
- careerOutcomes: Array of potential job titles
- careerPath: Text description of career progression
- pathways: Further study options
- workRights: Post-study work visa information

OTHER IMPORTANT FIELDS:
- courseCode: Official course code (e.g., "BACH-CS-01")
- prPathway: PR/Immigration pathway information (Australia context)
- scholarshipPercentageMin/Max: Scholarship availability (e.g., "10%-50%")
- intakes: Available start dates array (e.g., ["February", "July"])
- internshipAvailable: true/false for work placements
- internshipDetails: Details about internships/placements

VALIDATION:
- Course title and subject are REQUIRED - if not found, add warning
- Level must match one of the enum values exactly
- UniversityId will be provided separately (don't extract it)
- Numeric fields should be numbers, not strings with currency symbols

CONFIDENCE SCORING:
Score 0.0 to 1.0 based on:
- 0.9-1.0: Most fields found with clear, unambiguous values
- 0.7-0.9: Core fields found, some optional fields missing
- 0.5-0.7: Only basic fields found (title, subject, level)
- 0.3-0.5: Title and subject found but unclear/ambiguous
- 0.0-0.3: Missing required fields or highly ambiguous data

Add warnings for:
- Missing required fields
- Ambiguous values that need human review
- Unusual or unexpected data formats
- Fields that had to be inferred vs. explicitly stated

OUTPUT FORMAT: Return a JSON object matching the schema exactly.`;

  const userPrompt = `Extract course information from this HTML:

Source URL: ${sourceUrl}
${institutionName ? `Institution: ${institutionName}` : ""}

HTML Content:
${htmlContent.substring(0, 15000)} ${htmlContent.length > 15000 ? "\n\n[Content truncated for length]" : ""}

Return the extracted course data as JSON.`;

  // For strict JSON schema, ALL properties must be required
  // Convert optional fields to allow null values instead
  const strictProperties: any = {};
  const allPropertyNames: string[] = [];
  
  for (const [key, value] of Object.entries(jsonSchema.properties)) {
    const prop: any = value && typeof value === 'object' ? { ...value } : {};
    // If field is optional, allow null
    if (!jsonSchema.required.includes(key)) {
      // Build the non-null schema preserving all properties (items, enum, etc.)
      const nonNullSchema: any = {};
      for (const [propKey, propValue] of Object.entries(prop)) {
        nonNullSchema[propKey] = propValue;
      }
      
      prop.anyOf = [
        nonNullSchema,
        { type: "null" },
      ];
      
      // Remove properties that are now in anyOf
      delete prop.type;
      delete prop.items;
      delete prop.enum;
      delete prop.description; // description stays at top level
      
      // Keep description at top level
      if (nonNullSchema.description) {
        prop.description = nonNullSchema.description;
        delete nonNullSchema.description;
      }
    }
    strictProperties[key] = prop;
    allPropertyNames.push(key);
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "course_extraction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              ...strictProperties,
              confidence: {
                type: "number",
                description: "Confidence score 0-1",
              },
              warnings: {
                type: "array",
                items: { type: "string" },
                description: "Any extraction warnings or issues",
              },
            },
            required: ["confidence", "warnings", ...allPropertyNames],
            additionalProperties: false,
          },
        },
      },
      temperature: 0.1, // Low temperature for deterministic extraction
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    const { confidence, warnings, ...courseData } = result;

    return {
      data: courseData,
      confidence: confidence || 0.5,
      sourceUrl,
      extractedAt: new Date().toISOString(),
      warnings: warnings || [],
    };
  } catch (error: any) {
    console.error("AI extraction error:", error);
    throw new Error(`Failed to extract course data: ${error.message}`);
  }
}

/**
 * Extract institution data from HTML content using AI
 * Automatically adapts to current schema fields
 */
export async function extractInstitutionData(
  htmlContent: string,
  sourceUrl: string
): Promise<ExtractionResult<any>> {
  const metadata = getInstitutionSchemaMetadata();
  const extractionFields = generateExtractionFields(metadata);
  const jsonSchema = generateJSONSchema(metadata);

  const systemPrompt = `You are a precise data extraction assistant specializing in educational institution information.

TASK: Extract structured institution data from the provided HTML content.

SCHEMA FIELDS (these fields dynamically adapt to the current database schema):
${extractionFields}

EXTRACTION RULES:
1. Extract ONLY factual information present in the HTML
2. NEVER invent, guess, or hallucinate data
3. If a field value is not found, omit it (for optional fields) or use null (for required fields)
4. For arrays, extract all relevant items found
5. For enums, use EXACTLY one of the provided values
6. Extract institution name, description, and contact details accurately
7. For images/gallery, extract URLs only
8. For campus addresses, structure as JSON with address, city, state, postcode
9. Extract facility names (Library, Sports Center, etc.)
10. Determine provider type based on institution description (University, Institution, Tafe, School)

VALIDATION:
- Institution name is REQUIRED
- Website URL should be complete and valid
- Numeric fields (fees, year) should be numbers only
- Arrays should contain relevant distinct items

CONFIDENCE SCORING:
- Return a confidence score (0.0-1.0) based on:
  * Clarity of the HTML structure
  * Completeness of extracted data
  * Ambiguity in field values

OUTPUT FORMAT: Return a JSON object matching the schema exactly.`;

  const userPrompt = `Extract institution information from this HTML:

Source URL: ${sourceUrl}

HTML Content:
${htmlContent.substring(0, 15000)} ${htmlContent.length > 15000 ? "\n\n[Content truncated for length]" : ""}

Return the extracted institution data as JSON.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "institution_extraction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              ...jsonSchema.properties,
              confidence: {
                type: "number",
                description: "Confidence score 0-1",
              },
              warnings: {
                type: "array",
                items: { type: "string" },
                description: "Any extraction warnings or issues",
              },
            },
            required: ["confidence", "warnings", ...jsonSchema.required],
            additionalProperties: false,
          },
        },
      },
      temperature: 0.1, // Low temperature for deterministic extraction
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    const { confidence, warnings, ...institutionData } = result;

    return {
      data: institutionData,
      confidence: confidence || 0.5,
      sourceUrl,
      extractedAt: new Date().toISOString(),
      warnings: warnings || [],
    };
  } catch (error: any) {
    console.error("AI extraction error:", error);
    throw new Error(`Failed to extract institution data: ${error.message}`);
  }
}

/**
 * Extract multiple courses from an institution's course listing page
 * Identifies individual course links for further crawling
 */
export async function extractCourseLinks(
  htmlContent: string,
  baseUrl: string
): Promise<string[]> {
  const systemPrompt = `You are a web scraping assistant that identifies course listing pages.

TASK: Extract all course page URLs from an institution's course listing.

RULES:
1. Look for links that point to individual course pages
2. Common patterns: /courses/[course-name], /programs/[id], /course-details
3. Ignore: navigation links, footer links, social media, external links
4. Return only COMPLETE URLs (including protocol and domain)
5. Deduplicate URLs
6. Maximum 50 URLs

OUTPUT: Return a JSON array of course URLs.`;

  const userPrompt = `Extract course page URLs from this HTML:

Base URL: ${baseUrl}

HTML Content:
${htmlContent.substring(0, 10000)}

Return a JSON array of course URLs.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "course_links",
          strict: true,
          schema: {
            type: "object",
            properties: {
              urls: {
                type: "array",
                items: { type: "string" },
                description: "Array of course page URLs",
              },
            },
            required: ["urls"],
            additionalProperties: false,
          },
        },
      },
      temperature: 0.1,
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    return result.urls || [];
  } catch (error: any) {
    console.error("Link extraction error:", error);
    return [];
  }
}
