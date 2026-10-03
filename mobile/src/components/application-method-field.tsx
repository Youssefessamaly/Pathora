import { StyleSheet, Text, View } from 'react-native';

import { PathoraInput } from '@/components/pathora-input';
import { PathoraSelectableCard } from '@/components/pathora-selectable-card';
import { PathoraColors, PathoraFonts, PathoraSpacing } from '@/constants/pathora-theme';
import type { ApplicationMethod } from '@/lib/api';
import { APPLICATION_METHOD_OPTIONS } from '@/lib/internship-options';

export type ApplicationMethodFieldProps = {
  value: ApplicationMethod | null;
  onChange: (method: ApplicationMethod) => void;
  externalUrl: string;
  onChangeExternalUrl: (text: string) => void;
  /** Shown under the URL input only — the field itself doesn't know what "invalid" means. */
  urlError?: string | null;
};

/**
 * "How should interns apply?" — INTERNAL vs EXTERNAL, shared by the create and edit internship
 * screens. Deliberately never renders the raw ApplicationMethod enum value anywhere.
 */
export function ApplicationMethodField({
  value,
  onChange,
  externalUrl,
  onChangeExternalUrl,
  urlError,
}: ApplicationMethodFieldProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>How should interns apply?</Text>

      <View style={styles.cards}>
        {APPLICATION_METHOD_OPTIONS.map((option) => (
          <PathoraSelectableCard
            key={option.value}
            title={option.title}
            description={option.description}
            selected={value === option.value}
            onPress={() => onChange(option.value)}
          />
        ))}
      </View>

      {value === 'EXTERNAL' && (
        <View style={styles.urlField}>
          <PathoraInput
            label="Application URL"
            value={externalUrl}
            onChangeText={onChangeExternalUrl}
            placeholder="https://company.com/careers/apply"
            autoCapitalize="none"
            keyboardType="url"
          />
          {urlError && <Text style={styles.urlError}>{urlError}</Text>}
        </View>
      )}
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
  cards: {
    gap: PathoraSpacing[12],
  },
  urlField: {
    marginTop: 4,
  },
  urlError: {
    fontFamily: PathoraFonts.en.medium,
    fontSize: 12,
    color: PathoraColors.error,
    marginTop: 8,
  },
});
