import { courses, universities } from "../shared/schema";
import { getTableColumns } from "drizzle-orm";

/**
 * Field metadata for AI extraction
 */
export interface FieldMetadata {
  name: string;
  type: string;
  required: boolean;
  isArray: boolean;
  description?: string;
  enumValues?: string[];
}

/**
 * Schema metadata for a table
 */
export interface SchemaMetadata {
  tableName: string;
  fields: FieldMetadata[];
}

/**
 * Extract metadata from a Drizzle table for AI prompts
 * This function introspects the schema structure at runtime
 */
function extractTableMetadata(table: any, tableName: string): SchemaMetadata {
  const columns = getTableColumns(table);
  const fields: FieldMetadata[] = [];

  for (const [columnName, column] of Object.entries(columns)) {
    // Skip auto-generated fields that shouldn't be extracted
    if (
      columnName === "id" ||
      columnName === "createdAt" ||
      columnName === "updatedAt" ||
      columnName === "approvalStatus" ||
      columnName === "approvedAt" ||
      columnName === "approvedBy" ||
      columnName === "rejectionReason" ||
      columnName === "submittedForApprovalAt" ||
      columnName === "isActive"
    ) {
      continue;
    }

    const col = column as any;
    
    // Determine if field is required (NOT NULL)
    const required = col.notNull === true;
    
    // Determine if field is an array
    const isArray = col.dataType === "array";
    
    // Get base data type
    let type = col.dataType || "text";
    
    // Get enum values if applicable
    let enumValues: string[] | undefined;
    if (col.enumValues) {
      enumValues = col.enumValues;
      type = "enum";
    }

    fields.push({
      name: columnName,
      type,
      required,
      isArray,
      enumValues,
      description: getFieldDescription(tableName, columnName),
    });
  }

  return {
    tableName,
    fields,
  };
}

/**
 * Get human-readable description for common fields
 */
function getFieldDescription(tableName: string, fieldName: string): string {
  const descriptions: Record<string, Record<string, string>> = {
    courses: {
      universityId: "ID of the institution offering this course",
      title: "Full course title/name",
      description: "Detailed course description",
      subject: "Primary subject area",
      discipline: "Main discipline category (Accounting/Business/Finance, Engineering, etc.)",
      subDisciplineId: "Specific sub-discipline within the main discipline",
      level: "Qualification level (Bachelor Degree, Masters, Certificate, etc.)",
      duration: "Course duration as text (e.g., '2 years', '6 months')",
      durationMonths: "Duration in months (numeric)",
      durationWeeks: "Duration in weeks (numeric)",
      fees: "Tuition fees amount",
      currency: "Currency code (AUD, USD, etc.)",
      location: "General location description",
      country: "Country where course is offered",
      startDate: "When the course starts",
      applicationDeadline: "Application closing date",
      prerequisites: "Required prerequisites or prior qualifications",
      thumbnailUrl: "Course image URL",
      courseCode: "Official course code/identifier",
      prPathway: "Whether this course leads to permanent residency",
      scholarshipPercentageMin: "Minimum scholarship percentage available",
      scholarshipPercentageMax: "Maximum scholarship percentage available",
      eligibilityRequirements: "Detailed eligibility criteria",
      englishRequirements: "English language requirements as text",
      curriculumUrl: "URL to detailed curriculum/syllabus",
      costOfLiving: "Estimated living costs",
      applicationFees: "Application fee amount",
      images: "Array of course image URLs",
      intakes: "Available intake periods (January, February, July, etc.)",
      studyAreas: "Topics and subjects covered in the curriculum",
      careerOutcomes: "Potential career paths after completion",
      careerPath: "Detailed career progression description",
      pathways: "Progression routes to further studies",
      minimumAge: "Minimum age requirement",
      academicRequirements: "Academic entry requirements",
      englishRequirementsStructured: "Structured English test scores (IELTS, TOEFL, PTE, Duolingo)",
      deliveryMode: "How the course is delivered (online, on-campus, hybrid)",
      campusLocations: "Campus locations where course is offered",
      workRights: "Whether course provides work visa eligibility",
      internshipAvailable: "Whether internships are included",
      internshipDetails: "Details about internship opportunities",
    },
    universities: {
      userId: "User ID of institution admin",
      name: "Institution name",
      description: "Full institution description",
      logo: "Logo image URL",
      website: "Official website URL",
      country: "Country location",
      establishedYear: "Year the institution was established",
      contactEmail: "Contact email address",
      contactPhone: "Contact phone number",
      numberOfCampuses: "Number of campuses",
      providerType: "Type of provider (University, Institution, Tafe, School)",
      scholarshipPercentageMin: "Minimum scholarship offered",
      scholarshipPercentageMax: "Maximum scholarship offered",
      topDisciplines: "Main academic disciplines offered",
      smallDescription: "Brief description (max 100 words)",
      fullDescription: "Comprehensive description",
      institutionGallery: "Array of institution image URLs",
      topCourses: "Featured/popular courses",
      campusAddresses: "Campus addresses as JSON",
      tuitionFeesMin: "Minimum tuition across all programs",
      tuitionFeesMax: "Maximum tuition across all programs",
      tuitionCurrency: "Currency for tuition fees",
      deliveryModes: "Available delivery modes (on-campus, online, hybrid)",
      intakePeriods: "Available intake periods",
      accreditationStatus: "Accreditation status",
      rankingBand: "Ranking category (Top 100, Top 500, etc.)",
      facilities: "Available facilities (Library, Sports, etc.)",
      internationalStudentSupport: "Whether international student support is available",
      tags: "Searchable tags for discovery",
    },
  };

  return descriptions[tableName]?.[fieldName] || `${fieldName} value`;
}

/**
 * Get course schema metadata for AI extraction
 */
export function getCourseSchemaMetadata(): SchemaMetadata {
  return extractTableMetadata(courses, "courses");
}

/**
 * Get institution schema metadata for AI extraction
 */
export function getInstitutionSchemaMetadata(): SchemaMetadata {
  return extractTableMetadata(universities, "universities");
}

/**
 * Generate AI extraction prompt fields from schema metadata
 * This creates a structured format that GPT-4 can follow
 */
export function generateExtractionFields(metadata: SchemaMetadata): string {
  return metadata.fields
    .map((field) => {
      const requiredTag = field.required ? "[REQUIRED]" : "[OPTIONAL]";
      const arrayTag = field.isArray ? " (array)" : "";
      const enumTag = field.enumValues
        ? ` (one of: ${field.enumValues.join(", ")})`
        : "";

      return `- ${field.name}${arrayTag}: ${requiredTag} ${field.description}${enumTag}`;
    })
    .join("\n");
}

/**
 * Generate JSON schema for structured AI outputs
 * This ensures AI returns data in the exact format we need
 */
export function generateJSONSchema(metadata: SchemaMetadata): any {
  const properties: any = {};
  const required: string[] = [];

  for (const field of metadata.fields) {
    let fieldSchema: any = {};

    if (field.enumValues) {
      fieldSchema = {
        type: "string",
        enum: field.enumValues,
        description: field.description,
      };
    } else if (field.isArray) {
      fieldSchema = {
        type: "array",
        items: { type: "string" },
        description: field.description,
      };
    } else {
      // Map Drizzle types to JSON Schema types
      const typeMap: Record<string, string> = {
        text: "string",
        varchar: "string",
        integer: "number",
        decimal: "number",
        boolean: "boolean",
        date: "string",
        timestamp: "string",
        jsonb: "object",
      };

      fieldSchema = {
        type: typeMap[field.type] || "string",
        description: field.description,
      };
    }

    properties[field.name] = fieldSchema;

    if (field.required) {
      required.push(field.name);
    }
  }

  return {
    type: "object",
    properties,
    required,
    additionalProperties: false,
  };
}
