import { db } from "./db";
import { profileSectionVerifications, profileChangeHistory, PROFILE_SECTIONS, ProfileSection, VerificationStatus } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const SECTION_FIELD_MAPPING: Record<ProfileSection, string[]> = {
  personal: [
    'firstName', 'lastName', 'middleName', 'dateOfBirth', 'gender',
    'nationality', 'email', 'phone', 'countryCode', 'address', 'city',
    'state', 'country', 'postalCode', 'profilePhotoUrl'
  ],
  passport: [
    'passportNumber', 'passportExpiryDate', 'passportCountry',
    'currentVisaStatus', 'australianVisaType', 'visaExpiryDate', 
    'visaNumber', 'currentLocationCountry'
  ],
  education: ['educations'],
  language: ['languageScores', 'englishTestType', 'englishTestScore', 'englishTestDate'],
  preferences: [
    'preferredCountry', 'preferredCourseLevel', 'preferredIntake',
    'budgetMin', 'budgetMax', 'preferredRegion'
  ],
  employment: ['employments'],
  funding: [
    'fundingSource', 'sponsorName', 'sponsorRelationship', 
    'sponsorContactEmail', 'sponsorContactPhone', 'sponsorAddress'
  ],
  emergency: ['emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelationship'],
  sop: ['statementOfPurpose'],
  bio: ['bio', 'careerGoals']
};

export function getFieldSection(fieldName: string): ProfileSection | null {
  for (const [section, fields] of Object.entries(SECTION_FIELD_MAPPING)) {
    if (fields.includes(fieldName)) {
      return section as ProfileSection;
    }
  }
  return null;
}

export interface FieldChange {
  fieldName: string;
  oldValue: any;
  newValue: any;
  section: ProfileSection;
}

export function detectChanges(oldData: Record<string, any>, newData: Record<string, any>): FieldChange[] {
  const changes: FieldChange[] = [];
  const allFields = Array.from(new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]));
  
  for (const field of allFields) {
    const oldValue = oldData?.[field];
    const newValue = newData?.[field];
    
    if (field === 'id' || field === 'userId' || field === 'createdAt' || field === 'updatedAt') {
      continue;
    }
    
    const normalizedOld = normalizeValue(oldValue);
    const normalizedNew = normalizeValue(newValue);
    
    if (normalizedOld !== normalizedNew) {
      const section = getFieldSection(field);
      if (section) {
        changes.push({
          fieldName: field,
          oldValue: oldValue,
          newValue: newValue,
          section
        });
      }
    }
  }
  
  return changes;
}

function normalizeValue(value: any): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

export async function trackProfileChanges(
  studentProfileId: string,
  changes: FieldChange[],
  changedBy?: string,
  changeReason?: string
): Promise<void> {
  if (changes.length === 0) return;
  
  const affectedSections = new Set<ProfileSection>();
  
  for (const change of changes) {
    await db.insert(profileChangeHistory).values({
      studentProfileId,
      section: change.section,
      fieldName: change.fieldName,
      oldValue: change.oldValue ? String(change.oldValue) : null,
      newValue: change.newValue ? String(change.newValue) : null,
      changedBy,
      changeReason,
    });
    
    affectedSections.add(change.section);
  }
  
  const sectionsArray = Array.from(affectedSections);
  for (const section of sectionsArray) {
    await markSectionNeedsReverification(studentProfileId, section);
  }
}

export async function markSectionNeedsReverification(
  studentProfileId: string,
  section: ProfileSection
): Promise<void> {
  const existingVerification = await db.query.profileSectionVerifications.findFirst({
    where: and(
      eq(profileSectionVerifications.studentProfileId, studentProfileId),
      eq(profileSectionVerifications.section, section)
    ),
  });
  
  if (existingVerification) {
    if (existingVerification.status === 'verified') {
      await db.update(profileSectionVerifications)
        .set({
          status: 'needs_reverification',
          lastUpdatedAt: new Date(),
        })
        .where(eq(profileSectionVerifications.id, existingVerification.id));
    }
  } else {
    await db.insert(profileSectionVerifications).values({
      studentProfileId,
      section,
      status: 'unverified',
    });
  }
}

export async function getVerificationStatus(
  studentProfileId: string
): Promise<Record<ProfileSection, VerificationStatus>> {
  const verifications = await db.query.profileSectionVerifications.findMany({
    where: eq(profileSectionVerifications.studentProfileId, studentProfileId),
  });
  
  const result: Record<ProfileSection, VerificationStatus> = {} as any;
  
  for (const section of PROFILE_SECTIONS) {
    const verification = verifications.find(v => v.section === section);
    result[section] = (verification?.status as VerificationStatus) || 'unverified';
  }
  
  return result;
}

export async function trackEducationChange(
  studentProfileId: string,
  action: 'create' | 'update' | 'delete',
  oldData?: any,
  newData?: any,
  changedBy?: string
): Promise<void> {
  await db.insert(profileChangeHistory).values({
    studentProfileId,
    section: 'education',
    fieldName: `education_${action}`,
    oldValue: oldData ? JSON.stringify(oldData) : null,
    newValue: newData ? JSON.stringify(newData) : null,
    changedBy,
    changeReason: `Education record ${action}d`,
  });
  
  await markSectionNeedsReverification(studentProfileId, 'education');
}

export async function trackLanguageChange(
  studentProfileId: string,
  action: 'create' | 'update' | 'delete',
  oldData?: any,
  newData?: any,
  changedBy?: string
): Promise<void> {
  await db.insert(profileChangeHistory).values({
    studentProfileId,
    section: 'language',
    fieldName: `language_score_${action}`,
    oldValue: oldData ? JSON.stringify(oldData) : null,
    newValue: newData ? JSON.stringify(newData) : null,
    changedBy,
    changeReason: `Language score ${action}d`,
  });
  
  await markSectionNeedsReverification(studentProfileId, 'language');
}

export async function trackEmploymentChange(
  studentProfileId: string,
  action: 'create' | 'update' | 'delete',
  oldData?: any,
  newData?: any,
  changedBy?: string
): Promise<void> {
  await db.insert(profileChangeHistory).values({
    studentProfileId,
    section: 'employment',
    fieldName: `employment_${action}`,
    oldValue: oldData ? JSON.stringify(oldData) : null,
    newValue: newData ? JSON.stringify(newData) : null,
    changedBy,
    changeReason: `Employment record ${action}d`,
  });
  
  await markSectionNeedsReverification(studentProfileId, 'employment');
}
