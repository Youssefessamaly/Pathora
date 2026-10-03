import { StyleSheet, Text, View } from 'react-native';

import { PathoraColors, PathoraFonts, PathoraRadius } from '@/constants/pathora-theme';
import type { InternApplicationStatus } from '@/lib/api';

const STATUS_LABELS: Record<InternApplicationStatus, string> = {
  APPLIED: 'Applied',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
};

/**
 * Shared Pathora badge for the three currently-supported statuses — used by both the
 * applications list and application detail screens. No INTERVIEW/SHORTLISTED/etc. states
 * exist on the backend, so none are rendered here.
 */
export function ApplicationStatusBadge({ status }: { status: InternApplicationStatus }) {
  return (
    <View style={[styles.badge, badgeStyles[status]]}>
      <Text style={[styles.badgeText, badgeTextStyles[status]]}>{STATUS_LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: PathoraRadius[999],
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 11.5,
  },
});

const badgeStyles: Record<InternApplicationStatus, { backgroundColor: string }> = {
  // Informational/in-progress — same teal tint used elsewhere for an active/open state.
  APPLIED: { backgroundColor: PathoraColors.teal100 },
  // Success — same light tint, dedicated success text color.
  ACCEPTED: { backgroundColor: PathoraColors.teal100 },
  // Error — light tint built from the existing error color (no separate "error100" token).
  REJECTED: { backgroundColor: 'rgba(193, 68, 58, 0.12)' },
};

const badgeTextStyles: Record<InternApplicationStatus, { color: string }> = {
  APPLIED: { color: PathoraColors.teal700 },
  ACCEPTED: { color: PathoraColors.success },
  REJECTED: { color: PathoraColors.error },
};
