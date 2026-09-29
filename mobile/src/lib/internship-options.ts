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
