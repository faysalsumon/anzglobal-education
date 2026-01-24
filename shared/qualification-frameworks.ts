// Qualification Framework Configuration
// Maps frameworks to their qualification levels and country associations

export type QualificationFramework = 'AQF' | 'Non-AQF' | 'RQF' | 'EQF' | 'NZQF' | 'MQF' | 'US' | 'Canadian' | 'Other';

export interface FrameworkLevel {
  value: string;
  label: string;
  description?: string;
  equivalentAQF?: string; // AQF equivalent for comparison
}

export interface FrameworkConfig {
  code: QualificationFramework;
  name: string;
  fullName: string;
  countries: string[];
  levels: FrameworkLevel[];
}

// Country to Framework mapping
export const COUNTRY_FRAMEWORKS: Record<string, QualificationFramework[]> = {
  'Australia': ['AQF', 'Non-AQF'],
  'United Kingdom': ['RQF'],
  'England': ['RQF'],
  'Scotland': ['RQF'],
  'Wales': ['RQF'],
  'Northern Ireland': ['RQF'],
  'New Zealand': ['NZQF'],
  'Malaysia': ['MQF'],
  'United States': ['US'],
  'USA': ['US'],
  'Canada': ['Canadian'],
  // European countries use EQF
  'Germany': ['EQF'],
  'France': ['EQF'],
  'Italy': ['EQF'],
  'Spain': ['EQF'],
  'Netherlands': ['EQF'],
  'Belgium': ['EQF'],
  'Austria': ['EQF'],
  'Sweden': ['EQF'],
  'Denmark': ['EQF'],
  'Finland': ['EQF'],
  'Norway': ['EQF'],
  'Ireland': ['EQF'],
  'Portugal': ['EQF'],
  'Poland': ['EQF'],
  'Czech Republic': ['EQF'],
  'Hungary': ['EQF'],
  'Greece': ['EQF'],
  'Switzerland': ['EQF'],
};

// Get frameworks for a country (with fallback to all frameworks)
export function getFrameworksForCountry(country: string | null | undefined): QualificationFramework[] {
  if (!country) return ['AQF', 'Non-AQF', 'RQF', 'EQF', 'NZQF', 'MQF', 'US', 'Canadian', 'Other'];
  return COUNTRY_FRAMEWORKS[country] || ['Other'];
}

// Framework configurations with all levels
export const FRAMEWORK_CONFIGS: Record<QualificationFramework, FrameworkConfig> = {
  'AQF': {
    code: 'AQF',
    name: 'AQF',
    fullName: 'Australian Qualifications Framework',
    countries: ['Australia'],
    levels: [
      { value: 'VCE (11-12)', label: 'VCE (Year 11-12)', description: 'Victorian Certificate of Education', equivalentAQF: 'Senior Secondary' },
      { value: 'Certificate I', label: 'Certificate I', description: 'AQF Level 1', equivalentAQF: 'Certificate I' },
      { value: 'Certificate II', label: 'Certificate II', description: 'AQF Level 2', equivalentAQF: 'Certificate II' },
      { value: 'Certificate III', label: 'Certificate III', description: 'AQF Level 3', equivalentAQF: 'Certificate III' },
      { value: 'Certificate IV', label: 'Certificate IV', description: 'AQF Level 4', equivalentAQF: 'Certificate IV' },
      { value: 'Diploma', label: 'Diploma', description: 'AQF Level 5', equivalentAQF: 'Diploma' },
      { value: 'Advanced Diploma', label: 'Advanced Diploma', description: 'AQF Level 6', equivalentAQF: 'Advanced Diploma' },
      { value: 'Associate Degree', label: 'Associate Degree', description: 'AQF Level 6', equivalentAQF: 'Associate Degree' },
      { value: 'Bachelor Degree', label: 'Bachelor Degree', description: 'AQF Level 7', equivalentAQF: 'Bachelor Degree' },
      { value: 'Bachelor Honours', label: 'Bachelor Honours', description: 'AQF Level 8', equivalentAQF: 'Bachelor Honours' },
      { value: 'Graduate Certificate', label: 'Graduate Certificate', description: 'AQF Level 8', equivalentAQF: 'Graduate Certificate' },
      { value: 'Graduate Diploma', label: 'Graduate Diploma', description: 'AQF Level 8', equivalentAQF: 'Graduate Diploma' },
      { value: 'Masters Degree', label: 'Masters Degree', description: 'AQF Level 9', equivalentAQF: 'Masters Degree' },
      { value: 'Doctoral Degree', label: 'Doctoral Degree', description: 'AQF Level 10', equivalentAQF: 'Doctoral Degree' },
      { value: 'Higher Doctoral Degree', label: 'Higher Doctoral Degree', description: 'Beyond AQF Level 10', equivalentAQF: 'Higher Doctoral Degree' },
    ],
  },
  'Non-AQF': {
    code: 'Non-AQF',
    name: 'Non-AQF',
    fullName: 'Non-AQF Courses (Australia)',
    countries: ['Australia'],
    levels: [
      { value: 'ELICOS - General English', label: 'ELICOS - General English', description: 'English Language Intensive Course - General' },
      { value: 'ELICOS - EAP', label: 'ELICOS - EAP', description: 'English for Academic Purposes' },
      { value: 'ELICOS - Exam Prep', label: 'ELICOS - Exam Prep', description: 'IELTS/PTE/TOEFL Preparation' },
      { value: 'Professional Year - Accounting', label: 'Professional Year - Accounting', description: 'CPA/ICA/IPA accredited (44 weeks)' },
      { value: 'Professional Year - IT', label: 'Professional Year - IT', description: 'ACS accredited (44 weeks)' },
      { value: 'Professional Year - Engineering', label: 'Professional Year - Engineering', description: 'Engineers Australia accredited (44 weeks)' },
      { value: 'Foundation', label: 'Foundation Program', description: 'University preparation pathway' },
      { value: 'Pathway Program', label: 'Pathway Program', description: 'Articulation to higher qualification' },
      { value: 'Short Course', label: 'Short Course', description: 'Non-accredited short courses' },
    ],
  },
  'RQF': {
    code: 'RQF',
    name: 'RQF',
    fullName: 'Regulated Qualifications Framework (UK)',
    countries: ['United Kingdom', 'England', 'Wales', 'Northern Ireland'],
    levels: [
      { value: 'RQF Entry Level', label: 'Entry Level', description: 'Entry Level Certificate', equivalentAQF: 'Below Certificate I' },
      { value: 'RQF Level 1', label: 'Level 1', description: 'GCSE (grades 3-1)', equivalentAQF: 'Certificate I' },
      { value: 'RQF Level 2', label: 'Level 2', description: 'GCSE (grades 9-4)', equivalentAQF: 'Certificate II' },
      { value: 'RQF Level 3', label: 'Level 3', description: 'A-Level, BTEC National', equivalentAQF: 'Certificate IV' },
      { value: 'RQF Level 4', label: 'Level 4', description: 'Certificate of Higher Education', equivalentAQF: 'Diploma' },
      { value: 'RQF Level 5', label: 'Level 5', description: 'Foundation Degree, HND', equivalentAQF: 'Advanced Diploma' },
      { value: 'RQF Level 6', label: 'Level 6', description: "Bachelor's Degree", equivalentAQF: 'Bachelor Degree' },
      { value: 'RQF Level 7', label: 'Level 7', description: "Master's Degree", equivalentAQF: 'Masters Degree' },
      { value: 'RQF Level 8', label: 'Level 8', description: 'Doctoral Degree', equivalentAQF: 'Doctoral Degree' },
    ],
  },
  'EQF': {
    code: 'EQF',
    name: 'EQF',
    fullName: 'European Qualifications Framework',
    countries: ['Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Austria', 'Sweden', 'Denmark', 'Finland', 'Norway', 'Ireland', 'Portugal', 'Poland', 'Czech Republic', 'Hungary', 'Greece', 'Switzerland'],
    levels: [
      { value: 'EQF Level 1', label: 'Level 1', description: 'Basic general knowledge', equivalentAQF: 'Below Certificate I' },
      { value: 'EQF Level 2', label: 'Level 2', description: 'Basic factual knowledge', equivalentAQF: 'Certificate I' },
      { value: 'EQF Level 3', label: 'Level 3', description: 'Knowledge of facts and principles', equivalentAQF: 'Certificate II' },
      { value: 'EQF Level 4', label: 'Level 4', description: 'Factual & theoretical knowledge', equivalentAQF: 'Certificate IV' },
      { value: 'EQF Level 5', label: 'Level 5', description: 'Comprehensive specialized knowledge', equivalentAQF: 'Diploma' },
      { value: 'EQF Level 6', label: 'Level 6', description: "Bachelor's Degree", equivalentAQF: 'Bachelor Degree' },
      { value: 'EQF Level 7', label: 'Level 7', description: "Master's Degree", equivalentAQF: 'Masters Degree' },
      { value: 'EQF Level 8', label: 'Level 8', description: 'Doctoral Degree', equivalentAQF: 'Doctoral Degree' },
    ],
  },
  'NZQF': {
    code: 'NZQF',
    name: 'NZQF',
    fullName: 'New Zealand Qualifications and Credentials Framework',
    countries: ['New Zealand'],
    levels: [
      { value: 'NZQF Level 1', label: 'Level 1', description: 'Certificate Level 1', equivalentAQF: 'Certificate I' },
      { value: 'NZQF Level 2', label: 'Level 2', description: 'Certificate Level 2', equivalentAQF: 'Certificate II' },
      { value: 'NZQF Level 3', label: 'Level 3', description: 'Certificate Level 3', equivalentAQF: 'Certificate III' },
      { value: 'NZQF Level 4', label: 'Level 4', description: 'Certificate Level 4', equivalentAQF: 'Certificate IV' },
      { value: 'NZQF Level 5', label: 'Level 5', description: 'Diploma Level 5', equivalentAQF: 'Diploma' },
      { value: 'NZQF Level 6', label: 'Level 6', description: 'Diploma Level 6', equivalentAQF: 'Advanced Diploma' },
      { value: 'NZQF Level 7', label: 'Level 7', description: "Bachelor's Degree", equivalentAQF: 'Bachelor Degree' },
      { value: 'NZQF Level 8', label: 'Level 8', description: 'Postgraduate Diploma, Honours', equivalentAQF: 'Graduate Diploma' },
      { value: 'NZQF Level 9', label: 'Level 9', description: "Master's Degree", equivalentAQF: 'Masters Degree' },
      { value: 'NZQF Level 10', label: 'Level 10', description: 'Doctoral Degree', equivalentAQF: 'Doctoral Degree' },
    ],
  },
  'MQF': {
    code: 'MQF',
    name: 'MQF',
    fullName: 'Malaysian Qualifications Framework',
    countries: ['Malaysia'],
    levels: [
      { value: 'MQF Level 1', label: 'Level 1', description: 'Skills Certificate 1', equivalentAQF: 'Certificate I' },
      { value: 'MQF Level 2', label: 'Level 2', description: 'Skills Certificate 2', equivalentAQF: 'Certificate II' },
      { value: 'MQF Level 3', label: 'Level 3', description: 'Skills Certificate 3', equivalentAQF: 'Certificate III' },
      { value: 'MQF Foundation', label: 'Foundation', description: 'Foundation/Matriculation', equivalentAQF: 'Certificate IV' },
      { value: 'MQF Level 4', label: 'Level 4 - Diploma', description: 'Diploma (2+ years)', equivalentAQF: 'Diploma' },
      { value: 'MQF Level 5', label: 'Level 5 - Advanced Diploma', description: 'Advanced Diploma', equivalentAQF: 'Advanced Diploma' },
      { value: 'MQF Level 6', label: 'Level 6 - Bachelor', description: "Bachelor's Degree", equivalentAQF: 'Bachelor Degree' },
      { value: 'MQF Level 7', label: 'Level 7 - Master', description: "Master's Degree", equivalentAQF: 'Masters Degree' },
      { value: 'MQF Level 8', label: 'Level 8 - Doctoral', description: 'Doctoral Degree', equivalentAQF: 'Doctoral Degree' },
    ],
  },
  'US': {
    code: 'US',
    name: 'US',
    fullName: 'United States Degree System',
    countries: ['United States', 'USA'],
    levels: [
      { value: 'US Associate Degree', label: 'Associate Degree', description: '2-year degree (A.A./A.S.)', equivalentAQF: 'Diploma' },
      { value: 'US Bachelor Degree', label: 'Bachelor Degree', description: '4-year degree (B.A./B.S.)', equivalentAQF: 'Bachelor Degree' },
      { value: 'US Master Degree', label: 'Master Degree', description: 'Graduate degree (M.A./M.S./MBA)', equivalentAQF: 'Masters Degree' },
      { value: 'US Doctoral Degree', label: 'Doctoral Degree', description: 'PhD', equivalentAQF: 'Doctoral Degree' },
      { value: 'US Professional Doctorate', label: 'Professional Doctorate', description: 'MD, JD, Ed.D', equivalentAQF: 'Doctoral Degree' },
    ],
  },
  'Canadian': {
    code: 'Canadian',
    name: 'Canadian',
    fullName: 'Canadian Qualification System',
    countries: ['Canada'],
    levels: [
      { value: 'Canadian Certificate', label: 'Certificate', description: '1-year program', equivalentAQF: 'Certificate IV' },
      { value: 'Canadian Diploma', label: 'Diploma', description: '2-year college program', equivalentAQF: 'Diploma' },
      { value: 'Canadian Advanced Diploma', label: 'Advanced Diploma', description: '3-year college program', equivalentAQF: 'Advanced Diploma' },
      { value: 'Canadian Associate Degree', label: 'Associate Degree', description: '2-year degree (BC only)', equivalentAQF: 'Diploma' },
      { value: 'Canadian CEGEP', label: 'CEGEP (DEC)', description: 'Quebec pre-university (2 years)', equivalentAQF: 'Diploma' },
      { value: 'Canadian Bachelor Degree', label: 'Bachelor Degree', description: '3-4 year degree', equivalentAQF: 'Bachelor Degree' },
      { value: 'Canadian Master Degree', label: 'Master Degree', description: 'Graduate degree', equivalentAQF: 'Masters Degree' },
      { value: 'Canadian Doctoral Degree', label: 'Doctoral Degree', description: 'PhD', equivalentAQF: 'Doctoral Degree' },
    ],
  },
  'Other': {
    code: 'Other',
    name: 'Other',
    fullName: 'Other Qualification Framework',
    countries: [],
    levels: [
      { value: 'Other', label: 'Custom Level', description: 'Enter custom qualification level' },
    ],
  },
};

// Get levels for a specific framework
export function getLevelsForFramework(framework: QualificationFramework): FrameworkLevel[] {
  return FRAMEWORK_CONFIGS[framework]?.levels || [];
}

// Get default framework for a country
export function getDefaultFramework(country: string | null | undefined): QualificationFramework {
  if (!country) return 'AQF';
  const frameworks = COUNTRY_FRAMEWORKS[country];
  return frameworks?.[0] || 'Other';
}

// All frameworks for dropdown
export const ALL_FRAMEWORKS: { value: QualificationFramework; label: string; fullName: string }[] = [
  { value: 'AQF', label: 'AQF', fullName: 'Australian Qualifications Framework' },
  { value: 'Non-AQF', label: 'Non-AQF', fullName: 'Non-AQF (Australia)' },
  { value: 'RQF', label: 'RQF', fullName: 'UK Regulated Qualifications Framework' },
  { value: 'EQF', label: 'EQF', fullName: 'European Qualifications Framework' },
  { value: 'NZQF', label: 'NZQF', fullName: 'New Zealand Qualifications Framework' },
  { value: 'MQF', label: 'MQF', fullName: 'Malaysian Qualifications Framework' },
  { value: 'US', label: 'US', fullName: 'United States Degree System' },
  { value: 'Canadian', label: 'Canadian', fullName: 'Canadian Qualification System' },
  { value: 'Other', label: 'Other', fullName: 'Other/Custom Framework' },
];
