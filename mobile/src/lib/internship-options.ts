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
