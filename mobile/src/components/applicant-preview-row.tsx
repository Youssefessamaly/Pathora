import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ApplicationStatusBadge } from '@/components/application-status-badge';
import { PathoraColors, PathoraFonts, PathoraRadius, PathoraSpacing } from '@/constants/pathora-theme';
import type { CompanyApplicationStatus } from '@/lib/api';
import { formatDisplayDate } from '@/lib/date';
import { initialsForName } from '@/lib/initials';

const AVATAR_TINTS = [PathoraColors.teal600, PathoraColors.amber500] as const;

export type ApplicantPreviewRowProps = {
  applicantName: string | null;
  internshipTitle: string;
  appliedAt: string;
  status: CompanyApplicationStatus;
  /** Cycles the avatar's fill color for visual variety across a list — purely decorative,
   *  carries no status meaning (unlike the status badge). */
  tintIndex?: number;
  onPress: () => void;
};

/**
 * One applicant row shared by the company dashboard's preview sections and the full
 * applicants list — name, internship context, applied date, and the real backend status.
 */
export function ApplicantPreviewRow({
  applicantName,
  internshipTitle,
  appliedAt,
  status,
  tintIndex = 0,
  onPress,
}: ApplicantPreviewRowProps) {
  const avatarColor = AVATAR_TINTS[tintIndex % AVATAR_TINTS.length];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.avatarText}>{initialsForName(applicantName)}</Text>
      </View>

      <View style={styles.rowText}>
        <Text style={styles.name} numberOfLines={1}>
          {applicantName ?? 'Unknown applicant'}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {internshipTitle} · Applied {formatDisplayDate(appliedAt)}
        </Text>
      </View>

      <ApplicationStatusBadge status={status} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PathoraSpacing[12],
    paddingVertical: PathoraSpacing[12],
  },
  rowPressed: {
    opacity: 0.7,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: PathoraRadius[999],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 13,
    color: PathoraColors.surface,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 14.5,
    color: PathoraColors.ink900,
  },
  meta: {
    fontFamily: PathoraFonts.en.medium,
    fontSize: 12.5,
    color: PathoraColors.textSecondary,
  },
});
