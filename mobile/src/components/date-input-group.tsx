import { StyleSheet, Text, View } from 'react-native';

import { PathoraInput } from '@/components/pathora-input';
import { PathoraColors, PathoraFonts, PathoraSpacing } from '@/constants/pathora-theme';

export type DateInputGroupProps = {
  label: string;
  day: string;
  month: string;
  year: string;
  onChangeDay: (value: string) => void;
  onChangeMonth: (value: string) => void;
  onChangeYear: (value: string) => void;
};

/** DD / MM / YYYY input row, matching the date-of-birth input used by intern onboarding. */
export function DateInputGroup({
  label,
  day,
  month,
  year,
  onChangeDay,
  onChangeMonth,
  onChangeYear,
}: DateInputGroupProps) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <PathoraInput
          label=""
          value={day}
          onChangeText={(text) => onChangeDay(text.replace(/\D/g, '').slice(0, 2))}
          placeholder="DD"
          keyboardType="number-pad"
          style={styles.itemSmall}
        />
        <PathoraInput
          label=""
          value={month}
          onChangeText={(text) => onChangeMonth(text.replace(/\D/g, '').slice(0, 2))}
          placeholder="MM"
          keyboardType="number-pad"
          style={styles.itemSmall}
        />
        <PathoraInput
          label=""
          value={year}
          onChangeText={(text) => onChangeYear(text.replace(/\D/g, '').slice(0, 4))}
          placeholder="YYYY"
          keyboardType="number-pad"
          style={styles.itemLarge}
        />
      </View>
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
  },
  itemSmall: {
    flex: 1,
  },
  itemLarge: {
    flex: 1.5,
  },
});
