import { StyleSheet, Text, View } from 'react-native';

import { PathoraColors, PathoraFonts, PathoraRadius } from '@/constants/pathora-theme';
import type { CompanyApprovalStatus } from '@/lib/api';

const LABELS: Record<CompanyApprovalStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

/** The company account's own approval status — a different status domain from
 *  ApplicationStatusBadge (which is about one application's APPLIED/ACCEPTED/REJECTED), so
 *  kept as its own small component rather than overloading that one. */
export function CompanyApprovalBadge({ status }: { status: CompanyApprovalStatus }) {
  return (
    <View style={[styles.badge, badgeStyles[status]]}>
      <Text style={[styles.badgeText, badgeTextStyles[status]]}>{LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'center',
    borderRadius: PathoraRadius[999],
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  badgeText: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 12.5,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});

const badgeStyles: Record<CompanyApprovalStatus, { backgroundColor: string }> = {
  PENDING: { backgroundColor: PathoraColors.amber100 },
  APPROVED: { backgroundColor: PathoraColors.teal100 },
  REJECTED: { backgroundColor: 'rgba(193, 68, 58, 0.12)' },
};

const badgeTextStyles: Record<CompanyApprovalStatus, { color: string }> = {
  PENDING: { color: PathoraColors.amberTextOnTint },
  APPROVED: { color: PathoraColors.success },
  REJECTED: { color: PathoraColors.error },
};
