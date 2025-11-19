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
7. Convert durations to both text and numeric formats when possible
8. For fees, extract numeric values only (remove currency symbols)
9. Extract English requirements in both text and structured format if available
10. Include source attribution - note which section of HTML each field came from

VALIDATION:
- Course title and subject are REQUIRED
- Level must be one of the enum values
- UniversityId will be provided separately (don't extract it)
- All dates should be in ISO format or clear text (e.g., "January 2024")

CONFIDENCE SCORING:
- Return a confidence score (0.0-1.0) based on:
  * Clarity of the HTML structure
  * Completeness of extracted data
  * Ambiguity in field values

OUTPUT FORMAT: Return a JSON object matching the schema exactly.`;

  const userPrompt = `Extract course information from this HTML:

Source URL: ${sourceUrl}
${institutionName ? `Institution: ${institutionName}` : ""}

HTML Content:
${htmlContent.substring(0, 15000)} ${htmlContent.length > 15000 ? "\n\n[Content truncated for length]" : ""}

Return the extracted course data as JSON.`;

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
