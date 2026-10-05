import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { PathoraColors, PathoraFonts, PathoraRadius } from '@/constants/pathora-theme';

export type PathoraSearchBarProps = {
  placeholder: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * The rounded white "Search internships" bar from the dashboard design. Not a real text
 * field — tapping it navigates to the Internships screen, which has the actual typable search
 * input (see PathoraSearchInput) and real backend-filtered results. Never produces fake
 * results itself.
 */
export function PathoraSearchBar({ placeholder, onPress, style }: PathoraSearchBarProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={placeholder}
      style={({ pressed }) => [styles.bar, pressed && styles.barPressed, style]}>
      <SymbolView
        name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
        size={18}
        tintColor={PathoraColors.textTertiary}
      />
      <Text style={styles.placeholder}>{placeholder}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: PathoraRadius[999],
    backgroundColor: PathoraColors.surface,
    borderWidth: 1,
    borderColor: PathoraColors.border,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  barPressed: {
    opacity: 0.7,
  },
  placeholder: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 14,
    color: PathoraColors.textTertiary,
  },
});
