import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { PathoraColors, PathoraFonts, PathoraRadius } from '@/constants/pathora-theme';

export type PathoraSelectableCardProps = {
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

/** A single choice in a small set of mutually-exclusive options, each with its own title and
 *  supporting description — e.g. "Apply through Pathora" vs "Apply on company website". */
export function PathoraSelectableCard({ title, description, selected, onPress, style }: PathoraSelectableCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[styles.card, selected && styles.cardSelected, style]}>
      <View style={styles.textContainer}>
        <Text style={[styles.title, selected && styles.titleSelected]}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected && <View style={styles.radioInner} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: PathoraColors.surface,
    borderWidth: 1.5,
    borderColor: PathoraColors.borderStrong,
    borderRadius: PathoraRadius[14],
  },
  cardSelected: {
    borderColor: PathoraColors.teal600,
    backgroundColor: PathoraColors.teal100,
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 14.5,
    color: PathoraColors.ink900,
  },
  titleSelected: {
    color: PathoraColors.teal700,
  },
  description: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 12.5,
    lineHeight: 18,
    color: PathoraColors.textSecondary,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: PathoraRadius[999],
    borderWidth: 1.5,
    borderColor: PathoraColors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: PathoraColors.teal600,
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: PathoraRadius[999],
    backgroundColor: PathoraColors.teal600,
  },
});
