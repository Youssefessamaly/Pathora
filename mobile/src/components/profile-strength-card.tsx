import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PathoraColors, PathoraFonts, PathoraRadius, PathoraSpacing } from '@/constants/pathora-theme';

export type ProfileStrengthCardProps = {
  percentage: number;
  isOnboardingComplete: boolean;
  onActionPress: () => void;
};

/**
 * The dark teal "Profile strength" banner from the dashboard design. percentage is always a
 * real, caller-computed value (see @/lib/profile-strength) — never hardcoded. When onboarding
 * is already complete, the CTA switches from "finish it" copy to a softer "view it" action
 * instead of telling the intern to complete something the backend already considers done.
 */
export function ProfileStrengthCard({ percentage, isOnboardingComplete, onActionPress }: ProfileStrengthCardProps) {
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  const guidance = !isOnboardingComplete
    ? 'Finish your profile so recommendations reflect who you are.'
    : clampedPercentage >= 100
      ? "You're all set — your profile is fully filled in."
      : 'Add your CV or LinkedIn to strengthen your profile further.';

  const actionLabel = isOnboardingComplete ? 'View profile' : 'Complete profile';

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Profile strength</Text>
        <Text style={styles.value}>{clampedPercentage}%</Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${clampedPercentage}%` }]} />
      </View>

      <Text style={styles.guidance}>{guidance}</Text>

      <Pressable
        onPress={onActionPress}
        accessibilityRole="button"
        style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}>
        <Text style={styles.actionButtonText}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: PathoraRadius[14],
    backgroundColor: PathoraColors.teal700,
    padding: PathoraSpacing[16],
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 14,
    color: PathoraColors.surface,
  },
  value: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 18,
    color: PathoraColors.surface,
  },
  progressTrack: {
    height: 8,
    borderRadius: PathoraRadius[999],
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: PathoraRadius[999],
    backgroundColor: PathoraColors.amber500,
  },
  guidance: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 12.5,
    lineHeight: 18,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  actionButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: PathoraRadius[999],
    backgroundColor: PathoraColors.surface,
  },
  actionButtonPressed: {
    opacity: 0.85,
  },
  actionButtonText: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 13,
    color: PathoraColors.teal700,
  },
});
