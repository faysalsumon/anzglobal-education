import Papa from 'papaparse';
import { InsertUniversity, InsertCourse } from '@shared/schema';

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  value: any;
}

export interface ParsedCSVRow {
  rowIndex: number;
  isValid: boolean;
  data: any; // The actual CSV row data (normalized)
  errors: ValidationError[]; // Validation errors for this specific row
}

export interface ParsedCSVResult {
  rows: ParsedCSVRow[]; // Structured rows with validity flags
  data: any[]; // Raw parsed data (for backwards compatibility)
  errors: ValidationError[]; // All validation errors
  totalCount: number;
  validCount: number;
  errorCount: number;
  parseErrors: string[]; // PapaParse errors
  hasCriticalErrors: boolean; // True if parse failed or has critical issues
}

// Parse CSV file with error handling
export function parseCSV(fileContent: string): ParsedCSVResult {
  const parseResult = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  const parseErrors: string[] = [];
  
  // Capture PapaParse errors
  if (parseResult.errors && parseResult.errors.length > 0) {
    parseErrors.push(...parseResult.errors.map(e => 
      `Row ${e.row !== undefined ? e.row + 1 : 'unknown'}: ${e.message}`
    ));
  }

  // Check for empty headers
  if (parseResult.meta?.fields) {
    const emptyHeaders = parseResult.meta.fields.filter(h => !h || h.trim() === '');
    if (emptyHeaders.length > 0) {
      parseErrors.push(`Found ${emptyHeaders.length} empty column header(s)`);
    }
  }

  // Critical errors should block the batch
  const hasCriticalErrors = parseErrors.length > 0;

  // For now, return basic structure - validation will be done by type-specific functions
  return {
    rows: [], // Will be populated by validateAndStructureData()
    data: parseResult.data,
    errors: [],
    totalCount: parseResult.data.length,
    validCount: 0,
    errorCount: 0,
    parseErrors,
    hasCriticalErrors,
  };
}

// Normalize university row values
export function normalizeUniversityRow(row: any): any {
  const normalized = { ...row };
  
  // Trim all string fields
  Object.keys(normalized).forEach(key => {
    if (typeof normalized[key] === 'string') {
      normalized[key] = normalized[key].trim();
    }
  });
  
  return normalized;
}

// Validate university row
export function validateUniversityRow(
  row: any, 
  rowIndex: number, 
  existingNames?: Set<string>, // Existing university names in DB
  batchNames?: Set<string> // Names already seen in this batch
): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Normalize before validation
  const normalized = normalizeUniversityRow(row);

  // Required fields
  if (!normalized.name || normalized.name === '') {
    errors.push({
      row: rowIndex,
      field: 'name',
      message: 'University name is required',
      value: row.name,
    });
  } else {
    // Check for duplicates in database
    if (existingNames && existingNames.has(normalized.name.toLowerCase())) {
      errors.push({
        row: rowIndex,
        field: 'name',
        message: `University "${normalized.name}" already exists in database`,
        value: normalized.name,
      });
    }
    
    // Check for duplicates within this batch
    if (batchNames && batchNames.has(normalized.name.toLowerCase())) {
      errors.push({
        row: rowIndex,
        field: 'name',
        message: `Duplicate university name "${normalized.name}" found in this CSV`,
        value: normalized.name,
      });
    } else if (batchNames) {
      // Add to batch set for subsequent rows
      batchNames.add(normalized.name.toLowerCase());
    }
  }

  // Optional field validations
  if (row.establishedYear && isNaN(parseInt(row.establishedYear))) {
    errors.push({
      row: rowIndex,
      field: 'establishedYear',
      message: 'Established year must be a number',
      value: row.establishedYear,
    });
  }

  // Validate scholarship range - use explicit checks to handle 0% values
  if (row.scholarshipPercentageMin !== undefined && row.scholarshipPercentageMin !== "") {
    const min = parseInt(row.scholarshipPercentageMin);
    if (isNaN(min) || min < 0 || min > 100) {
      errors.push({
        row: rowIndex,
        field: 'scholarshipPercentageMin',
        message: 'Scholarship minimum percentage must be between 0 and 100',
        value: row.scholarshipPercentageMin,
      });
    }
  }
  if (row.scholarshipPercentageMax !== undefined && row.scholarshipPercentageMax !== "") {
    const max = parseInt(row.scholarshipPercentageMax);
    if (isNaN(max) || max < 0 || max > 100) {
      errors.push({
        row: rowIndex,
        field: 'scholarshipPercentageMax',
        message: 'Scholarship maximum percentage must be between 0 and 100',
        value: row.scholarshipPercentageMax,
      });
    }
  }
  // Validate min <= max if both are provided
  if ((row.scholarshipPercentageMin !== undefined && row.scholarshipPercentageMin !== "") &&
      (row.scholarshipPercentageMax !== undefined && row.scholarshipPercentageMax !== "")) {
    const min = parseInt(row.scholarshipPercentageMin);
    const max = parseInt(row.scholarshipPercentageMax);
    if (!isNaN(min) && !isNaN(max) && min > max) {
      errors.push({
        row: rowIndex,
        field: 'scholarshipPercentageMin',
        message: `Scholarship minimum (${min}) cannot be greater than maximum (${max})`,
        value: row.scholarshipPercentageMin,
      });
    }
  }

  if (row.website && !isValidUrl(row.website)) {
    errors.push({
      row: rowIndex,
      field: 'website',
      message: 'Website must be a valid URL',
      value: row.website,
    });
  }

  return errors;
}

// Normalize course row values
export function normalizeCourseRow(row: any): any {
  const normalized = { ...row };
  
  // Normalize level to lowercase
  if (normalized.level) {
    normalized.level = normalized.level.trim().toLowerCase();
  }
  
  // Normalize delivery mode
  if (normalized.deliveryMode) {
    normalized.deliveryMode = normalized.deliveryMode.trim().toLowerCase();
  }
  
  // Normalize currency to uppercase
  if (normalized.currency) {
    normalized.currency = normalized.currency.trim().toUpperCase();
  }
  
  // Trim all string fields
  Object.keys(normalized).forEach(key => {
    if (typeof normalized[key] === 'string') {
      normalized[key] = normalized[key].trim();
    }
  });
  
  return normalized;
}

// Validate course row
export function validateCourseRow(
  row: any, 
  rowIndex: number, 
  universitiesMap: Map<string, string>,
  existingCourseKeys?: Set<string>, // Existing "title:universityId" keys in DB
  batchCourseKeys?: Set<string>, // Keys already seen in this batch
  validUniversityIds?: Set<string> // Valid university IDs for verifying universityId field
): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Normalize before validation
  const normalized = normalizeCourseRow(row);

  // Required fields
  if (!normalized.title || normalized.title === '') {
    errors.push({
      row: rowIndex,
      field: 'title',
      message: 'Course title is required',
      value: normalized.title,
    });
  }

  if (!normalized.subject || normalized.subject === '') {
    errors.push({
      row: rowIndex,
      field: 'subject',
      message: 'Subject is required',
      value: normalized.subject,
    });
  }

  if (!normalized.level || normalized.level === '') {
    errors.push({
      row: rowIndex,
      field: 'level',
      message: 'Level is required (undergraduate, postgraduate, certificate, diploma)',
      value: normalized.level,
    });
  } else if (!['undergraduate', 'postgraduate', 'certificate', 'diploma'].includes(normalized.level)) {
    errors.push({
      row: rowIndex,
      field: 'level',
      message: 'Level must be one of: undergraduate, postgraduate, certificate, diploma',
      value: normalized.level,
    });
  }

  // University linking and duplicate detection
  if (!row.universityName && !row.universityId) {
    errors.push({
      row: rowIndex,
      field: 'universityName',
      message: 'Either universityName or universityId is required',
      value: null,
    });
  } else {
    // Determine universityId from either universityName or universityId
    let universityId: string | undefined;
    
    if (row.universityName) {
      if (!universitiesMap.has(row.universityName.trim().toLowerCase())) {
        errors.push({
          row: rowIndex,
          field: 'universityName',
          message: `University "${row.universityName}" not found. Make sure it exists in the system.`,
          value: row.universityName,
        });
      } else {
        universityId = universitiesMap.get(row.universityName.trim().toLowerCase());
      }
    } else if (row.universityId) {
      // Validate that the universityId exists
      const providedId = row.universityId.trim();
      if (validUniversityIds && !validUniversityIds.has(providedId)) {
        errors.push({
          row: rowIndex,
          field: 'universityId',
          message: `University ID "${providedId}" not found. Make sure it exists in the system.`,
          value: providedId,
        });
      } else {
        universityId = providedId;
      }
    }
    
    // Check for duplicates if we have both title and universityId
    if (universityId && normalized.title) {
      const courseKey = `${normalized.title.toLowerCase()}:${universityId}`;
      
      // Check for duplicates in database
      if (existingCourseKeys && existingCourseKeys.has(courseKey)) {
        errors.push({
          row: rowIndex,
          field: 'title',
          message: `Course "${normalized.title}" already exists for this university in database`,
          value: normalized.title,
        });
      }
      
      // Check for duplicates within this batch
      if (batchCourseKeys && batchCourseKeys.has(courseKey)) {
        errors.push({
          row: rowIndex,
          field: 'title',
          message: `Duplicate course "${normalized.title}" for this university found in this CSV`,
          value: normalized.title,
        });
      } else if (batchCourseKeys) {
        batchCourseKeys.add(courseKey);
      }
    }
  }

  // Numeric validations
  if (row.fees && isNaN(parseFloat(row.fees))) {
    errors.push({
      row: rowIndex,
      field: 'fees',
      message: 'Fees must be a number',
      value: row.fees,
    });
  }

  if (row.durationMonths && isNaN(parseInt(row.durationMonths))) {
    errors.push({
      row: rowIndex,
      field: 'durationMonths',
      message: 'Duration months must be a number',
      value: row.durationMonths,
    });
  }

  // Validate scholarship range - use explicit checks to handle 0% values
  if (row.scholarshipPercentageMin !== undefined && row.scholarshipPercentageMin !== "") {
    const min = parseInt(row.scholarshipPercentageMin);
    if (isNaN(min) || min < 0 || min > 100) {
      errors.push({
        row: rowIndex,
        field: 'scholarshipPercentageMin',
        message: 'Scholarship minimum percentage must be between 0 and 100',
        value: row.scholarshipPercentageMin,
      });
    }
  }
  if (row.scholarshipPercentageMax !== undefined && row.scholarshipPercentageMax !== "") {
    const max = parseInt(row.scholarshipPercentageMax);
    if (isNaN(max) || max < 0 || max > 100) {
      errors.push({
        row: rowIndex,
        field: 'scholarshipPercentageMax',
        message: 'Scholarship maximum percentage must be between 0 and 100',
        value: row.scholarshipPercentageMax,
      });
    }
  }
  // Validate min <= max if both are provided
  if ((row.scholarshipPercentageMin !== undefined && row.scholarshipPercentageMin !== "") &&
      (row.scholarshipPercentageMax !== undefined && row.scholarshipPercentageMax !== "")) {
    const min = parseInt(row.scholarshipPercentageMin);
    const max = parseInt(row.scholarshipPercentageMax);
    if (!isNaN(min) && !isNaN(max) && min > max) {
      errors.push({
        row: rowIndex,
        field: 'scholarshipPercentageMin',
        message: `Scholarship minimum (${min}) cannot be greater than maximum (${max})`,
        value: row.scholarshipPercentageMin,
      });
    }
  }

  return errors;
}

// Transform CSV row to University insert data
export function transformUniversityRow(row: any, userId: string): Partial<InsertUniversity> {
  const university: any = {
    userId,
    name: row.name?.trim(),
    description: row.description?.trim() || null,
    country: row.country?.trim() || null,
    website: row.website?.trim() || null,
    contactEmail: row.contactEmail?.trim() || null,
    contactPhone: row.contactPhone?.trim() || null,
    providerType: row.providerType?.trim() || null,
    approvalStatus: 'pending', // All imported universities start as pending
  };

  // Parse numeric fields
  if (row.establishedYear) {
    university.establishedYear = parseInt(row.establishedYear);
  }
  if (row.numberOfCampuses) {
    university.numberOfCampuses = parseInt(row.numberOfCampuses);
  }
  // Use explicit checks to handle 0% values
  if (row.scholarshipPercentageMin !== undefined && row.scholarshipPercentageMin !== "") {
    university.scholarshipPercentageMin = parseInt(row.scholarshipPercentageMin);
  }
  if (row.scholarshipPercentageMax !== undefined && row.scholarshipPercentageMax !== "") {
    university.scholarshipPercentageMax = parseInt(row.scholarshipPercentageMax);
  }

  // Parse array fields (comma-separated)
  if (row.topDisciplines) {
    university.topDisciplines = row.topDisciplines.split(',').map((d: string) => d.trim()).filter(Boolean);
  }

  // Parse campus addresses (JSON string)
  if (row.campusAddresses) {
    try {
      university.campusAddresses = JSON.parse(row.campusAddresses);
    } catch (e) {
      // If parsing fails, ignore campus addresses rather than failing the whole import
      console.error(`Failed to parse campusAddresses for university ${row.name}:`, e);
    }
  }

  return university;
}

// Transform CSV row to Course insert data
export function transformCourseRow(row: any, universityId: string): Partial<InsertCourse> {
  const course: any = {
    universityId,
    title: row.title?.trim(),
    subject: row.subject?.trim(),
    level: row.level?.trim().toLowerCase(),
    description: row.description?.trim() || null,
    duration: row.duration?.trim() || null,
    country: row.country?.trim() || null,
    courseCode: row.courseCode?.trim() || null,
    prerequisites: row.prerequisites?.trim() || null,
    eligibilityRequirements: row.eligibilityRequirements?.trim() || null,
    englishRequirements: row.englishRequirements?.trim() || null,
    deliveryMode: row.deliveryMode?.trim() || null,
    currency: row.currency?.trim() || 'AUD',
    isActive: true,
  };

  // Parse numeric fields
  if (row.fees) {
    course.fees = parseFloat(row.fees);
  }
  if (row.durationMonths) {
    course.durationMonths = parseInt(row.durationMonths);
  }
  if (row.durationWeeks) {
    course.durationWeeks = parseInt(row.durationWeeks);
  }
  // Use explicit checks to handle 0% values
  if (row.scholarshipPercentageMin !== undefined && row.scholarshipPercentageMin !== "") {
    course.scholarshipPercentageMin = parseInt(row.scholarshipPercentageMin);
  }
  if (row.scholarshipPercentageMax !== undefined && row.scholarshipPercentageMax !== "") {
    course.scholarshipPercentageMax = parseInt(row.scholarshipPercentageMax);
  }
  if (row.applicationFees) {
    course.applicationFees = parseFloat(row.applicationFees);
  }
  if (row.costOfLiving) {
    course.costOfLiving = parseFloat(row.costOfLiving);
  }

  // Parse boolean fields
  if (row.prPathway !== undefined) {
    course.prPathway = row.prPathway === 'true' || row.prPathway === '1' || row.prPathway === true;
  }
  // Parse array fields (comma-separated)
  if (row.intakes) {
    course.intakes = row.intakes.split(',').map((i: string) => i.trim()).filter(Boolean);
  }
  if (row.studyAreas) {
    course.studyAreas = row.studyAreas.split(',').map((s: string) => s.trim()).filter(Boolean);
  }
  if (row.careerOutcomes) {
    course.careerOutcomes = row.careerOutcomes.split(',').map((c: string) => c.trim()).filter(Boolean);
  }
  if (row.campusLocations) {
    course.campusLocations = row.campusLocations.split(',').map((l: string) => l.trim()).filter(Boolean);
  }

  return course;
}

// Helper: Check if URL is valid
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Generate sample CSV templates
export function generateUniversitiesSampleCSV(): string {
  const sampleData = [
    {
      name: 'University of Sydney',
      description: 'A leading research university in Australia, known for academic excellence',
      country: 'Australia',
      website: 'https://sydney.edu.au',
      contactEmail: 'admissions@sydney.edu.au',
      contactPhone: '+61-2-9351-2222',
      establishedYear: '1850',
      numberOfCampuses: '2',
      providerType: 'University',
      scholarshipPercentageMin: '20',
      scholarshipPercentageMax: '30',
      topDisciplines: 'Medicine,Engineering,Business,Law',
      campusAddresses: '[{"address":"University Ave","city":"Sydney","state":"NSW","postcode":"2006","country":"Australia"},{"address":"Cumberland Campus","city":"Lidcombe","state":"NSW","postcode":"2141","country":"Australia"}]',
    },
    {
      name: 'Melbourne TAFE College',
      description: 'Vocational education provider specializing in practical skills and career training',
      country: 'Australia',
      website: 'https://melbourne-tafe.edu.au',
      contactEmail: 'info@melbourne-tafe.edu.au',
      contactPhone: '+61-3-9600-3888',
      establishedYear: '1996',
      numberOfCampuses: '1',
      providerType: 'TAFE',
      scholarshipPercentageMin: '10',
      scholarshipPercentageMax: '20',
      topDisciplines: 'Information Technology,Networking,Business',
      campusAddresses: '[{"address":"123 Collins St","city":"Melbourne","state":"VIC","postcode":"3000","country":"Australia"}]',
    },
    {
      name: 'Sydney Business School',
      description: 'Private business school focused on executive education and MBA programs',
      country: 'Australia',
      website: 'https://sydneybiz.edu.au',
      contactEmail: 'admissions@sydneybiz.edu.au',
      contactPhone: '+61-2-8765-4321',
      establishedYear: '2005',
      numberOfCampuses: '1',
      providerType: 'School',
      scholarshipPercentageMin: '5',
      scholarshipPercentageMax: '15',
      topDisciplines: 'Business,Finance,Management',
      campusAddresses: '[{"address":"456 Market St","city":"Sydney","state":"NSW","postcode":"2000","country":"Australia"}]',
    },
  ];

  return Papa.unparse(sampleData);
}

export function generateCoursesSampleCSV(): string {
  const sampleData = [
    {
      universityName: 'University of Sydney',
      title: 'Master of Business Administration',
      subject: 'Business',
      level: 'postgraduate',
      description: 'Advanced business administration degree focusing on leadership and strategy',
      duration: '2 years',
      durationMonths: '24',
      fees: '45000',
      currency: 'AUD',
      country: 'Australia',
      courseCode: 'MBA-2024',
      deliveryMode: 'on-campus',
      intakes: 'February,July',
      studyAreas: 'Finance,Marketing,Operations,Strategy',
      careerOutcomes: 'Business Manager,Consultant,Executive',
      prerequisites: 'Bachelor degree with 3 years work experience',
      englishRequirements: 'IELTS 7.0 overall',
      scholarshipPercentageMin: '15',
      scholarshipPercentageMax: '25',
      prPathway: 'false',
    },
    {
      universityName: 'Melbourne Institute of Technology',
      title: 'Diploma of Information Technology',
      subject: 'Information Technology',
      level: 'diploma',
      description: 'Practical IT diploma covering programming, networking, and database management',
      duration: '1 year',
      durationMonths: '12',
      fees: '18000',
      currency: 'AUD',
      country: 'Australia',
      courseCode: 'DIT-2024',
      deliveryMode: 'hybrid',
      intakes: 'January,April,July,October',
      studyAreas: 'Programming,Networking,Database,Web Development',
      careerOutcomes: 'Software Developer,IT Support,Network Administrator',
      prerequisites: 'Year 12 completion',
      englishRequirements: 'IELTS 5.5 overall',
      scholarshipPercentageMin: '5',
      scholarshipPercentageMax: '15',
      prPathway: 'true',
    },
  ];

  return Papa.unparse(sampleData);
}
