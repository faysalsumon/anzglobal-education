export type ApplicationStage = 
  | "Assessment"
  | "Collect Docs"
  | "Documents Verification"
  | "Offer-Letter"
  | "GS-Clearance"
  | "COE"
  | "Health Cover"
  | "Visa Lodgment"
  | "Application Won"
  | "Refusal/Refunds"
  | "Application Lost";

export interface StageConfig {
  name: ApplicationStage;
  displayName: string;
  description: string;
  category: 'pre-offer' | 'offer' | 'visa' | 'outcome';
  dotColor: string;
  badgeClass: string;
  isTerminal: boolean;
}

export const ALL_STAGES: ApplicationStage[] = [
  "Assessment",
  "Collect Docs",
  "Documents Verification",
  "Offer-Letter",
  "GS-Clearance",
  "COE",
  "Health Cover",
  "Visa Lodgment",
  "Application Won",
  "Refusal/Refunds",
  "Application Lost",
];

export const ACTIVE_STAGES: ApplicationStage[] = [
  "Assessment",
  "Collect Docs",
  "Documents Verification",
  "Offer-Letter",
  "GS-Clearance",
  "COE",
  "Health Cover",
  "Visa Lodgment",
];

export const TERMINAL_STAGES: ApplicationStage[] = [
  "Application Won",
  "Refusal/Refunds",
  "Application Lost",
];

export const STAGE_CONFIG: Record<ApplicationStage, StageConfig> = {
  "Assessment": {
    name: "Assessment",
    displayName: "Assessment",
    description: "Initial application assessment",
    category: "pre-offer",
    dotColor: "bg-slate-400",
    badgeClass: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
    isTerminal: false,
  },
  "Collect Docs": {
    name: "Collect Docs",
    displayName: "Collect Docs",
    description: "Collecting required documents",
    category: "pre-offer",
    dotColor: "bg-slate-400",
    badgeClass: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
    isTerminal: false,
  },
  "Documents Verification": {
    name: "Documents Verification",
    displayName: "Documents Verification",
    description: "Verifying submitted documents",
    category: "pre-offer",
    dotColor: "bg-blue-500",
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    isTerminal: false,
  },
  "Offer-Letter": {
    name: "Offer-Letter",
    displayName: "Offer Letter",
    description: "Awaiting or processing offer letter",
    category: "offer",
    dotColor: "bg-rose-500",
    badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
    isTerminal: false,
  },
  "GS-Clearance": {
    name: "GS-Clearance",
    displayName: "GS Clearance",
    description: "Genuine Student clearance process",
    category: "offer",
    dotColor: "bg-amber-500",
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    isTerminal: false,
  },
  "COE": {
    name: "COE",
    displayName: "COE",
    description: "Confirmation of Enrollment",
    category: "offer",
    dotColor: "bg-sky-400",
    badgeClass: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
    isTerminal: false,
  },
  "Health Cover": {
    name: "Health Cover",
    displayName: "Health Cover",
    description: "Health insurance arrangement",
    category: "visa",
    dotColor: "bg-sky-400",
    badgeClass: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
    isTerminal: false,
  },
  "Visa Lodgment": {
    name: "Visa Lodgment",
    displayName: "Visa Lodgment",
    description: "Visa application submitted",
    category: "visa",
    dotColor: "bg-rose-500",
    badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
    isTerminal: false,
  },
  "Application Won": {
    name: "Application Won",
    displayName: "Application Won",
    description: "Application successfully completed",
    category: "outcome",
    dotColor: "bg-green-500",
    badgeClass: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    isTerminal: true,
  },
  "Refusal/Refunds": {
    name: "Refusal/Refunds",
    displayName: "Refusal/Refunds",
    description: "Application refused or refunded",
    category: "outcome",
    dotColor: "bg-purple-500",
    badgeClass: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    isTerminal: true,
  },
  "Application Lost": {
    name: "Application Lost",
    displayName: "Application Lost",
    description: "Application withdrawn or lost",
    category: "outcome",
    dotColor: "bg-red-500",
    badgeClass: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    isTerminal: true,
  },
};

export function getStageIndex(stage: ApplicationStage): number {
  return ALL_STAGES.indexOf(stage);
}

export function isBackwardTransition(fromStage: ApplicationStage, toStage: ApplicationStage): boolean {
  const fromIndex = getStageIndex(fromStage);
  const toIndex = getStageIndex(toStage);
  return toIndex < fromIndex && !TERMINAL_STAGES.includes(toStage);
}

export function isTerminalStage(stage: ApplicationStage): boolean {
  return TERMINAL_STAGES.includes(stage);
}

export function getNextStage(currentStage: ApplicationStage): ApplicationStage | null {
  const index = ACTIVE_STAGES.indexOf(currentStage);
  if (index === -1 || index === ACTIVE_STAGES.length - 1) return null;
  return ACTIVE_STAGES[index + 1];
}

// Student-facing simplified stages (5 main milestones) - maps internal stages to simplified view
export interface StudentStage {
  id: string;
  name: string;
  internalStages: ApplicationStage[];
}

export const STUDENT_STAGES: StudentStage[] = [
  { id: "assessment", name: "Initial Assessment", internalStages: ["Assessment", "Collect Docs", "Documents Verification"] },
  { id: "applied", name: "Applied to Institution", internalStages: ["Offer-Letter"] },
  { id: "offer", name: "Offer Letter", internalStages: ["GS-Clearance"] },
  { id: "payment", name: "Payment", internalStages: ["COE"] },
  { id: "coe", name: "COE Issued", internalStages: ["Health Cover", "Visa Lodgment", "Application Won"] },
];

// Helper to map internal stage to student stage index
export function getStudentStageIndex(internalStage: ApplicationStage): number {
  for (let i = 0; i < STUDENT_STAGES.length; i++) {
    if (STUDENT_STAGES[i].internalStages.includes(internalStage)) {
      return i;
    }
  }
  return -1; // Terminal or unknown stage
}

// Get current student-facing stage from internal stage
export function getStudentStage(internalStage: ApplicationStage): StudentStage | null {
  const index = getStudentStageIndex(internalStage);
  return index >= 0 ? STUDENT_STAGES[index] : null;
}

// Calculate progress percentage based on student-facing stages
export function calculateStudentProgress(internalStage: ApplicationStage): number {
  if (internalStage === "Application Won") return 100;
  if (internalStage === "Refusal/Refunds" || internalStage === "Application Lost") return 0;
  
  const stageIndex = getStudentStageIndex(internalStage);
  if (stageIndex < 0) return 0;
  
  return Math.round(((stageIndex + 1) / STUDENT_STAGES.length) * 100);
}

export function getPreviousStage(currentStage: ApplicationStage): ApplicationStage | null {
  const index = ACTIVE_STAGES.indexOf(currentStage);
  if (index <= 0) return null;
  return ACTIVE_STAGES[index - 1];
}
