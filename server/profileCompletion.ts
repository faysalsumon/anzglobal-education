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
  partialSections: {
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
    required: ['emergencyContactName', 'emergencyContactMobile'],
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
  const partialSections = {
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
      partialSections,
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

  const checkPartialFields = (fields: string[]): boolean => {
    const filled = fields.filter(field => {
      const value = profile[field as keyof StudentProfile];
      return value && !(typeof value === 'string' && value.trim() === '');
    });
    return filled.length > 0 && filled.length < fields.length;
  };

  // Personal Info
  completedSections.personalInfo = checkFields(requirements.personalInfo.required, 'Personal Info');
  if (!completedSections.personalInfo) {
    partialSections.personalInfo = checkPartialFields(requirements.personalInfo.required);
  }

  // Passport — complete only if hasPassport===true AND all required fields filled
  // Partial if: hasPassport===false (opted out), OR hasPassport===true but fields incomplete
  if (profile.hasPassport === true) {
    completedSections.passport = checkFields(requirements.passport.required, 'Passport');
    if (!completedSections.passport) {
      partialSections.passport = true; // said yes but hasn't filled details
    }
  } else if (profile.hasPassport === false) {
    // Explicitly said "not yet" — treat as partially engaged (consultant can follow up)
    partialSections.passport = true;
  }
  // If hasPassport is null/undefined (never answered), neither complete nor partial

  // Funding
  completedSections.funding = checkFields(requirements.funding.required, 'Funding');
  if (!completedSections.funding) {
    partialSections.funding = checkPartialFields(requirements.funding.required);
  }

  // Emergency
  completedSections.emergency = checkFields(requirements.emergency.required, 'Emergency Contact');
  if (!completedSections.emergency) {
    partialSections.emergency = checkPartialFields(requirements.emergency.required);
  }

  // Preferences is optional
  completedSections.preferences = !!(profile.destinationCountry || profile.preferredCourseLevel) || requirements.preferences.optional;

  // Education
  if (educations.length >= requirements.education.minimumRecords) {
    completedSections.education = true;
  } else {
    missingFields.push(`At least ${requirements.education.minimumRecords} education record(s) required`);
    if (educations.length > 0) {
      partialSections.education = true;
    }
  }

  // Language Test
  if (languageScores.length >= requirements.languageTest.minimumRecords) {
    completedSections.languageTest = true;
  } else {
    missingFields.push(`At least ${requirements.languageTest.minimumRecords} language test score(s) required`);
    if (languageScores.length > 0) {
      partialSections.languageTest = true;
    }
  }

  // Employment — complete if has records OR optional; partial if said yes but no records added yet
  completedSections.employment = employments.length > 0 || requirements.employment.optional;
  if (!completedSections.employment) {
    if (profile.hasWorkExperience === true && employments.length === 0) {
      partialSections.employment = true;
    }
  }

  // SOP
  completedSections.sop = !!(profile.statementOfPurpose && profile.statementOfPurpose.trim().length > 0) || requirements.sop.optional;
  if (!completedSections.sop) {
    partialSections.sop = !!(profile.statementOfPurpose && profile.statementOfPurpose.trim().length > 0 && profile.statementOfPurpose.trim().length < 50);
  }

  // Bio
  completedSections.bio = !!(profile.bio && profile.bio.trim().length > 0) || requirements.bio.optional;
  if (!completedSections.bio) {
    partialSections.bio = !!(profile.bio && profile.bio.trim().length > 0 && profile.bio.trim().length < 50);
  }

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
    partialSections,
  };
}

function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}
