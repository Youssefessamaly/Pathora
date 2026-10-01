import type { InternshipWorkMode } from '@/lib/api';

export const WORK_MODE_OPTIONS: { label: string; value: InternshipWorkMode }[] = [
  { label: 'On-site', value: 'ONSITE' },
  { label: 'Hybrid', value: 'HYBRID' },
  { label: 'Remote', value: 'REMOTE' },
];

export const WORK_MODE_LABELS: Record<InternshipWorkMode, string> = {
  ONSITE: 'On-site',
  HYBRID: 'Hybrid',
  REMOTE: 'Remote',
};

/**
 * Option group values for the minimum-academic-year selector. 'NONE' is a UI-only sentinel
 * for "no restriction" — it never reaches the API; see optionValueToMinimumAcademicYear.
 */
export const MINIMUM_ACADEMIC_YEAR_OPTIONS: { label: string; value: string }[] = [
  { label: 'No restriction', value: 'NONE' },
  { label: 'Year 1+', value: '1' },
  { label: 'Year 2+', value: '2' },
  { label: 'Year 3+', value: '3' },
  { label: 'Year 4+', value: '4' },
  { label: 'Year 5+', value: '5' },
  { label: 'Year 6', value: '6' },
];

export function minimumAcademicYearToOptionValue(value: number | null): string {
  return value === null ? 'NONE' : String(value);
}

export function optionValueToMinimumAcademicYear(value: string): number | null {
  return value === 'NONE' ? null : Number(value);
}

/** Short display label for an already-known (non-null) minimum academic year requirement. */
export function formatMinimumAcademicYearLabel(value: number): string {
  return value >= 6 ? 'Year 6' : `Year ${value}+`;
}

/** Intern-facing eligibility wording — deliberately distinct from the "Year N+" company label
 * so it never reads as part of the match/relevance explanation. */
export function formatMinimumAcademicYearEligibility(value: number): string {
  return `Year ${value} or above`;
}

/**
 * Lightweight, backend-facts-only explanation lines for why an internship matched an
 * intern. Never fabricates a reason: a zero skill match produces no "0 of N" line, and an
 * internship with no major match produces no line about majors at all.
 */
export function buildMatchExplanations(relevance: {
  matchedSkillCount: number;
  totalRequiredSkillCount: number;
  majorMatch: boolean;
}): string[] {
  const lines: string[] = [];

  if (relevance.matchedSkillCount > 0) {
    lines.push(`${relevance.matchedSkillCount} of ${relevance.totalRequiredSkillCount} required skills match`);
  }

  if (relevance.majorMatch) {
    lines.push('Matches your major');
  }

  return lines;
}
