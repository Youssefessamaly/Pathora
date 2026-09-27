import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { PathoraColors, PathoraRadius } from '@/constants/pathora-theme';

export type PathoraCheckboxProps = {
  checked: boolean;
  onToggle: () => void;
  style?: StyleProp<ViewStyle>;
};

export function PathoraCheckbox({ checked, onToggle, style }: PathoraCheckboxProps) {
  return (
    <Pressable
      onPress={onToggle}
      hitSlop={8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={[styles.box, checked && styles.boxChecked, style]}>
      {checked && (
        <SymbolView
          name={{ ios: 'checkmark', android: 'check', web: 'check' }}
          size={13}
          tintColor={PathoraColors.surface}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 20,
    height: 20,
    borderRadius: PathoraRadius[8],
    borderWidth: 1.5,
    borderColor: PathoraColors.borderStrong,
    backgroundColor: PathoraColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    backgroundColor: PathoraColors.teal600,
    borderColor: PathoraColors.teal600,
  },
});
