import type { ApplicationMethod, ApplicationQuestionType, InternshipWorkMode } from '@/lib/api';

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

export const APPLICATION_METHOD_OPTIONS: {
  value: ApplicationMethod;
  title: string;
  description: string;
}[] = [
  {
    value: 'INTERNAL',
    title: 'Apply through Pathora',
    description: 'Applicants complete their application inside Pathora.',
  },
  {
    value: 'EXTERNAL',
    title: 'Apply on company website',
    description: 'Applicants are redirected to your application page.',
  },
];

/** Short, user-facing label — never show the raw ApplicationMethod enum value. */
export const APPLICATION_METHOD_LABELS: Record<ApplicationMethod, string> = {
  INTERNAL: 'Through Pathora',
  EXTERNAL: 'Company website',
};

export const APPLICATION_QUESTION_TYPE_OPTIONS: { label: string; value: ApplicationQuestionType }[] = [
  { label: 'Short answer', value: 'SHORT_TEXT' },
  { label: 'Long answer', value: 'LONG_TEXT' },
];

/** Short, user-facing label — never show the raw ApplicationQuestionType enum value. */
export const APPLICATION_QUESTION_TYPE_LABELS: Record<ApplicationQuestionType, string> = {
  SHORT_TEXT: 'Short answer',
  LONG_TEXT: 'Long answer',
};

/**
 * Basic client-side shape check only (http/https with a host) — the backend remains the
 * authoritative validator. Deliberately rejects javascript:/data:/file:/anything else by
 * requiring the literal http(s):// prefix.
 */
export function isValidExternalApplicationUrl(url: string): boolean {
  return /^https?:\/\/[^\s]+\.[^\s]+$/i.test(url.trim());
}

/**
 * Same linkedin.com/in/... shape the backend requires (InternProfileRequest.linkedinUrl /
 * InternshipApplicationRequest.linkedinUrl) — a basic client-side check only, backend remains
 * authoritative.
 */
export function isValidLinkedinUrl(url: string): boolean {
  return /^(https?:\/\/)?(www\.)?linkedin\.com\/in\/[\w%-]+\/?$/i.test(url.trim());
}

/** Computes a sensible next displayOrder for a newly added question: one past the current
 *  highest, or 0 if there are no questions yet — the company never has to work this out. */
export function nextQuestionDisplayOrder(questions: { displayOrder: number }[]): number {
  if (questions.length === 0) {
    return 0;
  }
  return Math.max(...questions.map((question) => question.displayOrder)) + 1;
}
