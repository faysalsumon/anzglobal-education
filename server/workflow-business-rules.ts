/**
 * Application Workflow Business Rules
 * 
 * This module defines:
 * - Document requirements per stage
 * - Stage transition validation rules
 * - Role-based permissions
 * - SLA monitoring configuration
 */

import { applicationStageEnum } from "@shared/schema";

// Define ApplicationStage type from the enum
export type ApplicationStage = typeof applicationStageEnum.enumValues[number];

// Define user roles
export type UserRole = 'student' | 'university' | 'platform_admin' | 'consultant';

// Document requirements per stage
export interface StageDocumentRequirement {
  documentType: string;
  isRequired: boolean;
  description: string;
  maxSizeMB?: number;
  allowedFormats?: string[];
}

export const STAGE_DOCUMENT_REQUIREMENTS: Record<ApplicationStage, StageDocumentRequirement[]> = {
  'Assessment': [
    {
      documentType: 'Academic Transcripts',
      isRequired: true,
      description: 'Official academic transcripts from previous institutions',
      maxSizeMB: 10,
      allowedFormats: ['pdf', 'jpg', 'png'],
    },
    {
      documentType: 'English Test Results',
      isRequired: true,
      description: 'IELTS, TOEFL, or PTE results',
      maxSizeMB: 5,
      allowedFormats: ['pdf'],
    },
    {
      documentType: 'Passport Copy',
      isRequired: true,
      description: 'Valid passport copy',
      maxSizeMB: 5,
      allowedFormats: ['pdf', 'jpg', 'png'],
    },
  ],
  'Documents Verification': [
    {
      documentType: 'Verified Academic Transcripts',
      isRequired: true,
      description: 'University-verified academic transcripts',
      maxSizeMB: 10,
      allowedFormats: ['pdf'],
    },
    {
      documentType: 'Certified English Test Results',
      isRequired: true,
      description: 'Certified English proficiency test results',
      maxSizeMB: 5,
      allowedFormats: ['pdf'],
    },
  ],
  'Collect Docs': [
    {
      documentType: 'Statement of Purpose',
      isRequired: true,
      description: 'Personal statement explaining your academic goals',
      maxSizeMB: 5,
      allowedFormats: ['pdf', 'doc', 'docx'],
    },
    {
      documentType: 'CV/Resume',
      isRequired: true,
      description: 'Current curriculum vitae or resume',
      maxSizeMB: 5,
      allowedFormats: ['pdf', 'doc', 'docx'],
    },
    {
      documentType: 'Recommendation Letters',
      isRequired: false,
      description: 'Letters of recommendation (if applicable)',
      maxSizeMB: 10,
      allowedFormats: ['pdf'],
    },
  ],
  'Offer-Letter': [
    {
      documentType: 'University Offer Letter',
      isRequired: true,
      description: 'Official offer letter from the university',
      maxSizeMB: 5,
      allowedFormats: ['pdf'],
    },
  ],
  'GS-Clearance': [
    {
      documentType: 'GS Clearance Certificate',
      isRequired: true,
      description: 'Genuine Student (GS) requirement clearance',
      maxSizeMB: 5,
      allowedFormats: ['pdf'],
    },
    {
      documentType: 'Financial Evidence',
      isRequired: true,
      description: 'Proof of financial capacity',
      maxSizeMB: 10,
      allowedFormats: ['pdf'],
    },
  ],
  'COE': [
    {
      documentType: 'Confirmation of Enrolment',
      isRequired: true,
      description: 'Official COE from the university',
      maxSizeMB: 5,
      allowedFormats: ['pdf'],
    },
  ],
  'Health Cover': [
    {
      documentType: 'OSHC Policy',
      isRequired: true,
      description: 'Overseas Student Health Cover policy',
      maxSizeMB: 5,
      allowedFormats: ['pdf'],
    },
  ],
  'Visa Lodgment': [
    {
      documentType: 'Visa Application Form',
      isRequired: true,
      description: 'Completed visa application form',
      maxSizeMB: 10,
      allowedFormats: ['pdf'],
    },
    {
      documentType: 'Medical Examination',
      isRequired: true,
      description: 'Health examination results',
      maxSizeMB: 10,
      allowedFormats: ['pdf'],
    },
    {
      documentType: 'Police Clearance',
      isRequired: false,
      description: 'Police clearance certificate (if required)',
      maxSizeMB: 5,
      allowedFormats: ['pdf'],
    },
  ],
  'Refusal/Refunds': [],
  'Application Lost': [],
  'Application Won': [],
};

// Stage transition rules: defines which stages can transition to which stages
export interface StageTransitionRule {
  fromStage: ApplicationStage;
  toStages: ApplicationStage[];
  description: string;
}

export const STAGE_TRANSITION_RULES: StageTransitionRule[] = [
  {
    fromStage: 'Assessment',
    toStages: ['Documents Verification', 'Refusal/Refunds', 'Application Lost'],
    description: 'After assessment, proceed to document verification or reject',
  },
  {
    fromStage: 'Documents Verification',
    toStages: ['Collect Docs', 'Assessment', 'Refusal/Refunds', 'Application Lost'],
    description: 'After verification, collect additional docs or proceed/reject',
  },
  {
    fromStage: 'Collect Docs',
    toStages: ['Offer-Letter', 'Documents Verification', 'Refusal/Refunds', 'Application Lost'],
    description: 'After collecting docs, proceed to offer letter or go back',
  },
  {
    fromStage: 'Offer-Letter',
    toStages: ['GS-Clearance', 'Collect Docs', 'Refusal/Refunds', 'Application Lost'],
    description: 'After offer letter, proceed to GS clearance',
  },
  {
    fromStage: 'GS-Clearance',
    toStages: ['COE', 'Offer-Letter', 'Refusal/Refunds', 'Application Lost'],
    description: 'After GS clearance, proceed to COE',
  },
  {
    fromStage: 'COE',
    toStages: ['Health Cover', 'GS-Clearance', 'Refusal/Refunds', 'Application Lost'],
    description: 'After COE, arrange health cover',
  },
  {
    fromStage: 'Health Cover',
    toStages: ['Visa Lodgment', 'COE', 'Refusal/Refunds', 'Application Lost'],
    description: 'After health cover, lodge visa application',
  },
  {
    fromStage: 'Visa Lodgment',
    toStages: ['Application Won', 'Refusal/Refunds', 'Application Lost', 'Health Cover'],
    description: 'After visa lodgment, await outcome',
  },
  {
    fromStage: 'Refusal/Refunds',
    toStages: [],
    description: 'Application refused or refund processed',
  },
  {
    fromStage: 'Application Lost',
    toStages: [],
    description: 'Application was not successful',
  },
  {
    fromStage: 'Application Won',
    toStages: [],
    description: 'Application completed successfully',
  },
];

// Role-based permissions: defines which roles can transition to which stages
export interface RoleStagePermission {
  role: UserRole;
  canTransitionTo: ApplicationStage[];
  canViewAllApplications: boolean;
  canAssignConsultant: boolean;
  canBulkApprove: boolean;
}

export const ROLE_STAGE_PERMISSIONS: Record<UserRole, RoleStagePermission> = {
  student: {
    role: 'student',
    canTransitionTo: [], // Students cannot transition stages themselves
    canViewAllApplications: false,
    canAssignConsultant: false,
    canBulkApprove: false,
  },
  university: {
    role: 'university',
    canTransitionTo: ['Documents Verification', 'Offer-Letter', 'GS-Clearance', 'COE'],
    canViewAllApplications: false, // Only their university's applications
    canAssignConsultant: false,
    canBulkApprove: false,
  },
  consultant: {
    role: 'consultant',
    canTransitionTo: ['Assessment', 'Documents Verification', 'Collect Docs', 'Health Cover', 'Visa Lodgment', 'Refusal/Refunds', 'Application Lost'],
    canViewAllApplications: false, // Only assigned applications
    canAssignConsultant: false,
    canBulkApprove: false,
  },
  platform_admin: {
    role: 'platform_admin',
    canTransitionTo: ['Assessment', 'Documents Verification', 'Collect Docs', 'Offer-Letter', 'GS-Clearance', 'COE', 'Health Cover', 'Visa Lodgment', 'Refusal/Refunds', 'Application Lost', 'Application Won'],
    canViewAllApplications: true,
    canAssignConsultant: true,
    canBulkApprove: true,
  },
};

// SLA (Service Level Agreement) configuration per stage
export interface StageSLA {
  stage: ApplicationStage;
  standardDays: number; // Expected number of days to complete this stage
  warningDays: number; // Days before showing warning
  criticalDays: number; // Days before showing critical alert
  description: string;
}

export const STAGE_SLA_CONFIG: Record<ApplicationStage, StageSLA> = {
  'Assessment': {
    stage: 'Assessment',
    standardDays: 3,
    warningDays: 2,
    criticalDays: 3,
    description: 'Initial assessment should be completed within 3 business days',
  },
  'Documents Verification': {
    stage: 'Documents Verification',
    standardDays: 5,
    warningDays: 4,
    criticalDays: 5,
    description: 'Document verification should be completed within 5 business days',
  },
  'Collect Docs': {
    stage: 'Collect Docs',
    standardDays: 7,
    warningDays: 5,
    criticalDays: 7,
    description: 'Additional documents should be collected within 7 days',
  },
  'Offer-Letter': {
    stage: 'Offer-Letter',
    standardDays: 10,
    warningDays: 8,
    criticalDays: 10,
    description: 'Offer letter should be issued within 10 business days',
  },
  'GS-Clearance': {
    stage: 'GS-Clearance',
    standardDays: 5,
    warningDays: 4,
    criticalDays: 5,
    description: 'GS clearance should be completed within 5 business days',
  },
  'COE': {
    stage: 'COE',
    standardDays: 7,
    warningDays: 5,
    criticalDays: 7,
    description: 'COE should be issued within 7 business days',
  },
  'Health Cover': {
    stage: 'Health Cover',
    standardDays: 3,
    warningDays: 2,
    criticalDays: 3,
    description: 'Health cover should be arranged within 3 business days',
  },
  'Visa Lodgment': {
    stage: 'Visa Lodgment',
    standardDays: 30,
    warningDays: 25,
    criticalDays: 30,
    description: 'Visa lodgment typically takes 30 days',
  },
  'Refusal/Refunds': {
    stage: 'Refusal/Refunds',
    standardDays: 7,
    warningDays: 5,
    criticalDays: 7,
    description: 'Refund processing within 7 business days',
  },
  'Application Lost': {
    stage: 'Application Lost',
    standardDays: 0,
    warningDays: 0,
    criticalDays: 0,
    description: 'Application was not successful',
  },
  'Application Won': {
    stage: 'Application Won',
    standardDays: 0,
    warningDays: 0,
    criticalDays: 0,
    description: 'Application completed successfully',
  },
};

// Validation functions
export function canUserTransitionToStage(userRole: UserRole, toStage: ApplicationStage): boolean {
  const permissions = ROLE_STAGE_PERMISSIONS[userRole];
  return permissions.canTransitionTo.includes(toStage);
}

export function isValidStageTransition(fromStage: ApplicationStage, toStage: ApplicationStage): boolean {
  const rule = STAGE_TRANSITION_RULES.find(r => r.fromStage === fromStage);
  if (!rule) return false;
  return rule.toStages.includes(toStage);
}

export function getRequiredDocumentsForStage(stage: ApplicationStage): StageDocumentRequirement[] {
  return STAGE_DOCUMENT_REQUIREMENTS[stage] || [];
}

export function getMissingRequiredDocuments(
  stage: ApplicationStage,
  uploadedDocumentTypes: string[]
): StageDocumentRequirement[] {
  const required = getRequiredDocumentsForStage(stage).filter(doc => doc.isRequired);
  return required.filter(doc => !uploadedDocumentTypes.includes(doc.documentType));
}

export function getSLAStatus(stage: ApplicationStage, daysInStage: number): 'on-track' | 'warning' | 'critical' | 'overdue' {
  const sla = STAGE_SLA_CONFIG[stage];
  if (!sla) return 'on-track';

  if (daysInStage > sla.criticalDays) return 'overdue';
  if (daysInStage >= sla.warningDays) return 'warning';
  return 'on-track';
}

export function calculateDaysInStage(stageEnteredAt: Date): number {
  const now = new Date();
  const diff = now.getTime() - stageEnteredAt.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export interface StageValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateStageTransition(
  userRole: UserRole,
  fromStage: ApplicationStage,
  toStage: ApplicationStage,
  uploadedDocumentTypes: string[]
): StageValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check role permissions
  if (!canUserTransitionToStage(userRole, toStage)) {
    errors.push(`Your role (${userRole}) does not have permission to transition to ${toStage}`);
  }

  // Check if transition is valid according to workflow rules
  if (!isValidStageTransition(fromStage, toStage)) {
    errors.push(`Cannot transition from ${fromStage} to ${toStage} according to workflow rules`);
  }

  // Check for missing required documents in current stage
  const missingDocs = getMissingRequiredDocuments(fromStage, uploadedDocumentTypes);
  const isRejection = toStage === 'Refusal/Refunds' || toStage === 'Application Lost';
  if (missingDocs.length > 0 && !isRejection) {
    warnings.push(`Missing required documents: ${missingDocs.map(d => d.documentType).join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function getNextPossibleStages(currentStage: ApplicationStage, userRole: UserRole): ApplicationStage[] {
  const rule = STAGE_TRANSITION_RULES.find(r => r.fromStage === currentStage);
  if (!rule) return [];

  const permissions = ROLE_STAGE_PERMISSIONS[userRole];
  return rule.toStages.filter(stage => permissions.canTransitionTo.includes(stage));
}
