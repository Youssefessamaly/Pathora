import { Pressable, StyleSheet, Text, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native';

import { PathoraColors, PathoraFonts, PathoraRadius } from '@/constants/pathora-theme';

export type PathoraButtonVariant = 'primary' | 'secondary';

export type PathoraButtonProps = {
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: PathoraButtonVariant;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

export function PathoraButton({
  label,
  onPress,
  variant = 'primary',
  style,
  disabled = false,
}: PathoraButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      <Text style={[styles.label, isPrimary ? styles.labelPrimary : styles.labelSecondary]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: PathoraRadius[12],
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primary: {
    backgroundColor: PathoraColors.teal600,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: PathoraColors.borderStrong,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 14.5,
  },
  labelPrimary: {
    color: PathoraColors.surface,
  },
  labelSecondary: {
    color: PathoraColors.ink900,
  },
});
