import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { PathoraColors, PathoraFonts, PathoraRadius } from '@/constants/pathora-theme';

export type PathoraSearchInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * A real, typable search field — the counterpart to PathoraSearchBar (which is tap-only and
 * just navigates elsewhere). Same pill visual treatment so the two read as one consistent
 * design language wherever either appears.
 */
export function PathoraSearchInput({ value, onChangeText, placeholder, style }: PathoraSearchInputProps) {
  return (
    <View style={[styles.bar, style]}>
      <SymbolView
        name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
        size={18}
        tintColor={PathoraColors.textTertiary}
      />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={PathoraColors.textTertiary}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        returnKeyType="search"
        clearButtonMode="never"
      />
      {value.length > 0 && (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Clear search">
          <SymbolView
            name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
            size={18}
            tintColor={PathoraColors.textTertiary}
          />
        </Pressable>
      )}
    </View>
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
    paddingVertical: 11,
  },
  input: {
    flex: 1,
    padding: 0,
    fontFamily: PathoraFonts.en.regular,
    fontSize: 14,
    color: PathoraColors.ink900,
  },
});
