import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PathoraColors, PathoraFonts, PathoraRadius } from '@/constants/pathora-theme';

export type OnboardingOption = {
  label: string;
  value: string;
};

export type OnboardingOptionGroupProps = {
  label: string;
  options: OnboardingOption[];
  value: string | null;
  onChange: (value: string) => void;
};

export function OnboardingOptionGroup({ label, options, value, onChange }: OnboardingOptionGroupProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[styles.pill, selected && styles.pillSelected]}>
              <Text style={[styles.pillLabel, selected && styles.pillLabelSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 13,
    color: PathoraColors.ink900,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: PathoraRadius[12],
    borderWidth: 1.5,
    borderColor: PathoraColors.borderStrong,
    backgroundColor: PathoraColors.surface,
  },
  pillSelected: {
    borderColor: PathoraColors.teal600,
    backgroundColor: PathoraColors.teal100,
  },
  pillLabel: {
    fontFamily: PathoraFonts.en.semiBold,
    fontSize: 13.5,
    color: PathoraColors.ink900,
  },
  pillLabelSelected: {
    color: PathoraColors.teal700,
  },
});
