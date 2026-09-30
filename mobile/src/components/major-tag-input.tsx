import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SkillChip } from '@/components/onboarding/skill-chip';
import { PathoraInput } from '@/components/pathora-input';
import { PathoraColors, PathoraFonts, PathoraRadius, PathoraSpacing } from '@/constants/pathora-theme';

export type MajorTagInputProps = {
  label: string;
  majors: string[];
  onChange: (majors: string[]) => void;
  helperText?: string;
};

/**
 * Free-text tag entry for internship target majors — there is no global major catalog to
 * pick from, so this is a simple add/remove chip input rather than a picker like skills.
 */
export function MajorTagInput({ label, majors, onChange, helperText }: MajorTagInputProps) {
  const [draft, setDraft] = useState('');

  const handleAdd = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }

    const isDuplicate = majors.some((major) => major.toLowerCase() === trimmed.toLowerCase());
    setDraft('');
    if (isDuplicate) {
      return;
    }

    onChange([...majors, trimmed]);
  };

  const handleRemove = (index: number) => {
    onChange(majors.filter((_, i) => i !== index));
  };

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <PathoraInput
          label=""
          value={draft}
          onChangeText={setDraft}
          placeholder="Computer Science"
          autoCapitalize="words"
          style={styles.input}
        />
        <Pressable onPress={handleAdd} style={styles.addButton} accessibilityRole="button">
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>

      {majors.length > 0 && (
        <View style={styles.chipsWrap}>
          {majors.map((major, index) => (
            <SkillChip key={`${major.toLowerCase()}-${index}`} label={major} onRemove={() => handleRemove(index)} />
          ))}
        </View>
      )}

      {helperText && <Text style={styles.hint}>{helperText}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 13,
    color: PathoraColors.ink900,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: PathoraSpacing[12],
    alignItems: 'flex-start',
  },
  input: {
    flex: 1,
  },
  addButton: {
    height: 49,
    paddingHorizontal: 18,
    borderRadius: PathoraRadius[12],
    backgroundColor: PathoraColors.teal600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 14,
    color: PathoraColors.surface,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: PathoraSpacing[12],
  },
  hint: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 12,
    color: PathoraColors.textTertiary,
    marginTop: 8,
  },
});
