import type { CourseIntakeTemplate } from "./schema";

// Re-export the template type for convenience
export type IntakeTemplate = CourseIntakeTemplate;

export interface ComputedIntake {
  templateId: string;
  month: number;
  monthName: string;
  intakeName: string;
  startDate: Date;
  applicationOpenDate: Date;
  applicationDeadline: Date;
  status: "open" | "closed" | "upcoming";
  year: number;
  displayLabel: string;
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const COUNTRY_INTAKE_RECOMMENDATIONS: Record<string, { months: number[]; names: string[] }> = {
  "Australia": { 
    months: [2, 7, 11], 
    names: ["February (Semester 1)", "July (Semester 2)", "November (Trimester 3)"] 
  },
  "New Zealand": { 
    months: [2, 7], 
    names: ["February (Semester 1)", "July (Semester 2)"] 
  },
  "United Kingdom": { 
    months: [9, 1, 5], 
    names: ["September (Autumn)", "January (Spring)", "May (Summer)"] 
  },
  "UK": { 
    months: [9, 1, 5], 
    names: ["September (Autumn)", "January (Spring)", "May (Summer)"] 
  },
  "Canada": { 
    months: [9, 1, 5], 
    names: ["September (Fall)", "January (Winter)", "May (Summer)"] 
  },
  "United States": { 
    months: [8, 1, 5], 
    names: ["August (Fall)", "January (Spring)", "May (Summer)"] 
  },
  "USA": { 
    months: [8, 1, 5], 
    names: ["August (Fall)", "January (Spring)", "May (Summer)"] 
  },
};

export const DEFAULT_INTAKE_RECOMMENDATIONS = {
  months: [2, 7],
  names: ["February", "July"]
};

export function getMonthName(month: number): string {
  return MONTH_NAMES[month - 1] || "";
}

export function getIntakeRecommendations(country: string | null | undefined): { months: number[]; names: string[] } {
  if (!country) return DEFAULT_INTAKE_RECOMMENDATIONS;
  return COUNTRY_INTAKE_RECOMMENDATIONS[country] || DEFAULT_INTAKE_RECOMMENDATIONS;
}

// Returns intake recommendations with detailed configuration for the course editor
export function getCountryIntakeRecommendations(country: string | null | undefined): Array<{
  month: number;
  name: string;
  startDay: number;
  deadlineWeeksBefore: number;
}> {
  const recs = getIntakeRecommendations(country);
  return recs.months.map((month, idx) => ({
    month,
    name: recs.names[idx] || MONTH_NAMES[month - 1],
    startDay: month === 2 ? 15 : month === 7 ? 10 : month === 8 ? 20 : month === 9 ? 1 : month === 11 ? 1 : 1,
    deadlineWeeksBefore: 8,
  }));
}

export function computeIntakeDate(
  month: number,
  startDay: number,
  referenceDate: Date = new Date()
): { startDate: Date; year: number } {
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth() + 1;
  const currentDay = referenceDate.getDate();

  let targetYear = currentYear;
  
  if (month < currentMonth || (month === currentMonth && startDay < currentDay)) {
    targetYear = currentYear + 1;
  }

  const startDate = new Date(targetYear, month - 1, startDay);
  return { startDate, year: targetYear };
}

export function computeDeadlineDate(startDate: Date, weeksBeforeStart: number): Date {
  const deadline = new Date(startDate);
  deadline.setDate(deadline.getDate() - (weeksBeforeStart * 7));
  return deadline;
}

export function computeOpenDate(startDate: Date, monthsBeforeStart: number): Date {
  const openDate = new Date(startDate);
  openDate.setMonth(openDate.getMonth() - monthsBeforeStart);
  return openDate;
}

export function getIntakeStatus(
  applicationOpenDate: Date,
  applicationDeadline: Date,
  referenceDate: Date = new Date()
): "open" | "closed" | "upcoming" {
  const now = referenceDate.getTime();
  const openTime = applicationOpenDate.getTime();
  const deadlineTime = applicationDeadline.getTime();

  if (now < openTime) {
    return "upcoming";
  } else if (now <= deadlineTime) {
    return "open";
  } else {
    return "closed";
  }
}

export function computeIntakesFromTemplates(
  templates: CourseIntakeTemplate[],
  referenceDate: Date = new Date()
): ComputedIntake[] {
  const activeTemplates = templates.filter(t => t.isActive !== false);
  
  const computedIntakes: ComputedIntake[] = activeTemplates.map(template => {
    const { startDate, year } = computeIntakeDate(
      template.month,
      template.startDay || 1,
      referenceDate
    );
    
    const applicationDeadline = computeDeadlineDate(
      startDate,
      template.deadlineWeeksBefore || 8
    );
    
    const applicationOpenDate = computeOpenDate(
      startDate,
      template.openMonthsBefore || 6
    );
    
    const status = getIntakeStatus(applicationOpenDate, applicationDeadline, referenceDate);
    
    const monthName = getMonthName(template.month);
    const intakeName = template.intakeName || monthName;
    const displayLabel = `${monthName} ${year}`;

    return {
      templateId: template.id,
      month: template.month,
      monthName,
      intakeName,
      startDate,
      applicationOpenDate,
      applicationDeadline,
      status,
      year,
      displayLabel,
    };
  });

  return computedIntakes.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

export function getNextIntake(templates: CourseIntakeTemplate[], referenceDate: Date = new Date()): ComputedIntake | null {
  const computed = computeIntakesFromTemplates(templates, referenceDate);
  const openIntakes = computed.filter(i => i.status === "open");
  if (openIntakes.length > 0) {
    return openIntakes[0];
  }
  const upcomingIntakes = computed.filter(i => i.status === "upcoming");
  if (upcomingIntakes.length > 0) {
    return upcomingIntakes[0];
  }
  return computed[0] || null;
}

export function formatIntakeDate(date: Date): string {
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatIntakeDateShort(date: Date): string {
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function getUpcomingIntakes(
  templates: CourseIntakeTemplate[],
  count: number = 3,
  referenceDate: Date = new Date()
): ComputedIntake[] {
  const computed = computeIntakesFromTemplates(templates, referenceDate);
  const openOrUpcoming = computed.filter(i => i.status === "open" || i.status === "upcoming");
  return openOrUpcoming.slice(0, count);
}
