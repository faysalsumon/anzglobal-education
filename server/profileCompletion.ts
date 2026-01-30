import type { StudentProfile, StudentEducation, StudentLanguageScore, StudentEmployment } from "@shared/schema";

export interface ProfileCompletionResult {
  isComplete: boolean;
  percentage: number;
  missingFields: string[];
  completedSections: {
    personalInfo: boolean;
    passport: boolean;
    education: boolean;
    languageTest: boolean;
    preferences: boolean;
    employment: boolean;
    funding: boolean;
    emergency: boolean;
    sop: boolean;
    bio: boolean;
  };
}

export interface ProfileCompletionRequirements {
  personalInfo: {
    required: string[];
    optional: string[];
  };
  passport: {
    required: string[];
  };
  education: {
    minimumRecords: number;
  };
  languageTest: {
    minimumRecords: number;
  };
  preferences: {
    optional: boolean;
  };
  employment: {
    optional: boolean;
  };
  funding: {
    required: string[];
  };
  emergency: {
    required: string[];
  };
  sop: {
    optional: boolean;
  };
  bio: {
    optional: boolean;
  };
}

const DEFAULT_REQUIREMENTS: ProfileCompletionRequirements = {
  personalInfo: {
    required: ['firstName', 'lastName', 'phone', 'dateOfBirth', 'nationality', 'country'],
    optional: ['bio', 'profileImageUrl'],
  },
  passport: {
    required: ['passportNumber', 'passportExpiryDate', 'passportCountry'],
  },
  education: {
    minimumRecords: 1,
  },
  languageTest: {
    minimumRecords: 1,
  },
  preferences: {
    optional: true,
  },
  employment: {
    optional: true,
  },
  funding: {
    required: ['fundingSource'],
  },
  emergency: {
    required: ['emergencyContactName', 'emergencyContactPhone'],
  },
  sop: {
    optional: true,
  },
  bio: {
    optional: true,
  },
};

export function calculateProfileCompletion(
  profile: StudentProfile | undefined,
  educations: StudentEducation[],
  languageScores: StudentLanguageScore[],
  employments: StudentEmployment[] = [],
  requirements: ProfileCompletionRequirements = DEFAULT_REQUIREMENTS
): ProfileCompletionResult {
  const missingFields: string[] = [];
  const completedSections = {
    personalInfo: false,
    passport: false,
    education: false,
    languageTest: false,
    preferences: false,
    employment: false,
    funding: false,
    emergency: false,
    sop: false,
    bio: false,
  };

  if (!profile) {
    return {
      isComplete: false,
      percentage: 0,
      missingFields: ['Profile not created'],
      completedSections,
    };
  }

  const checkFields = (fields: string[], sectionName: string): boolean => {
    const missing: string[] = [];
    fields.forEach((field) => {
      const value = profile[field as keyof StudentProfile];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        missing.push(field);
      }
    });
    if (missing.length > 0) {
      missingFields.push(...missing.map(f => `${sectionName}: ${formatFieldName(f)}`));
      return false;
    }
    return true;
  };

  completedSections.personalInfo = checkFields(requirements.personalInfo.required, 'Personal Info');
  completedSections.passport = checkFields(requirements.passport.required, 'Passport');
  completedSections.funding = checkFields(requirements.funding.required, 'Funding');
  completedSections.emergency = checkFields(requirements.emergency.required, 'Emergency Contact');
  
  // Preferences is optional - for smart recommendations, not required for profile completion
  completedSections.preferences = !!(profile.destinationCountry || profile.preferredCourseLevel) || requirements.preferences.optional;

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

  completedSections.employment = employments.length > 0 || requirements.employment.optional;
  completedSections.sop = !!(profile.statementOfPurpose && profile.statementOfPurpose.trim().length > 0) || requirements.sop.optional;
  completedSections.bio = !!(profile.bio && profile.bio.trim().length > 0) || requirements.bio.optional;

  const requiredSections = ['personalInfo', 'passport', 'education', 'languageTest', 'funding', 'emergency'] as const;
  const totalRequiredSections = requiredSections.length;
  const completedRequiredCount = requiredSections.filter(s => completedSections[s]).length;
  const percentage = Math.round((completedRequiredCount / totalRequiredSections) * 100);
  const isComplete = completedRequiredCount === totalRequiredSections;

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
