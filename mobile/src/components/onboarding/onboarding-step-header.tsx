import { StyleSheet, Text, View } from 'react-native';

import { PathoraColors, PathoraFonts, PathoraRadius, PathoraSpacing } from '@/constants/pathora-theme';

export type OnboardingStepHeaderProps = {
  step: 1 | 2 | 3;
  heading: string;
};

const TOTAL_STEPS = 3;

export function OnboardingStepHeader({ step, heading }: OnboardingStepHeaderProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.progressRow}>
        {Array.from({ length: TOTAL_STEPS }, (_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < step;
          const isCurrent = stepNumber === step;
          return (
            <View
              key={stepNumber}
              style={[styles.bar, isCompleted && styles.barCompleted, isCurrent && styles.barCurrent]}
            />
          );
        })}
      </View>
      <Text style={styles.stepLabel}>{`Step ${step} of ${TOTAL_STEPS}`}</Text>
      <Text style={styles.heading}>{heading}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: PathoraSpacing[32],
  },
  progressRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: PathoraSpacing[16],
  },
  bar: {
    flex: 1,
    height: 4,
    borderRadius: PathoraRadius[999],
    backgroundColor: PathoraColors.border,
  },
  barCompleted: {
    backgroundColor: PathoraColors.teal400,
  },
  barCurrent: {
    backgroundColor: PathoraColors.teal600,
  },
  stepLabel: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 12,
    color: PathoraColors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  heading: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 24,
    color: PathoraColors.ink900,
  },
});
