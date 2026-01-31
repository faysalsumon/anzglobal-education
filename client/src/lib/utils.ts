import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type FeePeriod = 'annual' | 'per_semester' | 'per_trimester' | 'per_term' | 'total';

export function getFeePeriodLabel(feePeriod?: string | null): string {
  const labels: Record<string, string> = {
    'annual': '/ year',
    'per_semester': '/ semester',
    'per_trimester': '/ trimester',
    'per_term': '/ term',
    'total': 'total',
  };
  return labels[feePeriod || 'annual'] || '/ year';
}

export function getFeePeriodTitle(feePeriod?: string | null): string {
  const titles: Record<string, string> = {
    'annual': 'Annual Tuition',
    'per_semester': 'Semester Tuition',
    'per_trimester': 'Trimester Tuition',
    'per_term': 'Term Tuition',
    'total': 'Total Course Tuition',
  };
  return titles[feePeriod || 'annual'] || 'Annual Tuition';
}

export function getFeePeriodFullLabel(feePeriod?: string | null): string {
  const labels: Record<string, string> = {
    'annual': 'Per Year',
    'per_semester': 'Per Semester',
    'per_trimester': 'Per Trimester',
    'per_term': 'Per Term',
    'total': 'Full Course Fee',
  };
  return labels[feePeriod || 'annual'] || 'Per Year';
}
