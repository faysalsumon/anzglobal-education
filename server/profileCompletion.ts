import type { StudentProfile, StudentEducation, StudentLanguageScore } from "@shared/schema";

export interface ProfileCompletionResult {
  isComplete: boolean;
  percentage: number;
  missingFields: string[];
  completedSections: {
    personalInfo: boolean;
    education: boolean;
    languageTest: boolean;
  };
}

export interface ProfileCompletionRequirements {
  personalInfo: {
    required: string[];
    optional: string[];
  };
  education: {
    minimumRecords: number;
  };
  languageTest: {
    minimumRecords: number;
  };
}

const DEFAULT_REQUIREMENTS: ProfileCompletionRequirements = {
  personalInfo: {
    required: ['firstName', 'lastName', 'phone', 'dateOfBirth', 'nationality', 'country'],
    optional: ['bio', 'profileImageUrl'],
  },
  education: {
    minimumRecords: 1,
  },
  languageTest: {
    minimumRecords: 1,
  },
};

export function calculateProfileCompletion(
  profile: StudentProfile | undefined,
  educations: StudentEducation[],
  languageScores: StudentLanguageScore[],
  requirements: ProfileCompletionRequirements = DEFAULT_REQUIREMENTS
): ProfileCompletionResult {
  const missingFields: string[] = [];
  const completedSections = {
    personalInfo: false,
    education: false,
    languageTest: false,
  };

  if (!profile) {
    return {
      isComplete: false,
      percentage: 0,
      missingFields: ['Profile not created'],
      completedSections,
    };
  }

  const personalInfoMissing: string[] = [];
  requirements.personalInfo.required.forEach((field) => {
    const value = profile[field as keyof StudentProfile];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      personalInfoMissing.push(field);
    }
  });

  if (personalInfoMissing.length === 0) {
    completedSections.personalInfo = true;
  } else {
    missingFields.push(...personalInfoMissing.map(f => `Personal Info: ${formatFieldName(f)}`));
  }

  if (educations.length >= requirements.education.minimumRecords) {
    completedSections.education = true;
  } else {
    missingFields.push(`At least ${requirements.education.minimumRecords} education record(s) required`);
  }

  if (languageScores.length >= requirements.languageTest.minimumRecords) {
    completedSections.languageTest = true;
  } else {
    missingFields.push(`At least ${requirements.languageTest.minimumRecords} language test score(s) required`);
  }

  const totalSections = 3;
  const completedCount = Object.values(completedSections).filter(Boolean).length;
  const percentage = Math.round((completedCount / totalSections) * 100);
  const isComplete = completedCount === totalSections;

  return {
    isComplete,
    percentage,
    missingFields,
    completedSections,
  };
}

function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}
