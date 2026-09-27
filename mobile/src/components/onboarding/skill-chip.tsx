import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PathoraColors, PathoraFonts, PathoraRadius } from '@/constants/pathora-theme';

export type SkillChipProps = {
  label: string;
  onRemove: () => void;
};

export function SkillChip({ label, onRemove }: SkillChipProps) {
  return (
    <View style={styles.chip}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={onRemove}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${label}`}>
        <SymbolView
          name={{ ios: 'xmark', android: 'close', web: 'close' }}
          size={12}
          tintColor={PathoraColors.teal700}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: PathoraRadius[999],
    backgroundColor: PathoraColors.teal100,
  },
  label: {
    fontFamily: PathoraFonts.en.semiBold,
    fontSize: 13,
    color: PathoraColors.teal700,
  },
});
