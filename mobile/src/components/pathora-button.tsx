import { Pressable, StyleSheet, Text, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native';

import { PathoraColors, PathoraFonts, PathoraRadius } from '@/constants/pathora-theme';

export type PathoraButtonVariant = 'primary' | 'secondary' | 'success' | 'destructive';

export type PathoraButtonProps = {
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: PathoraButtonVariant;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

const FILLED_VARIANTS: Record<PathoraButtonVariant, boolean> = {
  primary: true,
  secondary: false,
  success: true,
  destructive: true,
};

const VARIANT_STYLES: Record<PathoraButtonVariant, ViewStyle> = {
  primary: { backgroundColor: PathoraColors.teal600 },
  secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: PathoraColors.borderStrong },
  success: { backgroundColor: PathoraColors.success },
  destructive: { backgroundColor: PathoraColors.error },
};

export function PathoraButton({
  label,
  onPress,
  variant = 'primary',
  style,
  disabled = false,
}: PathoraButtonProps) {
  const isFilled = FILLED_VARIANTS[variant];

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        VARIANT_STYLES[variant],
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      <Text style={[styles.label, isFilled ? styles.labelFilled : styles.labelSecondary]}>{label}</Text>
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
  labelFilled: {
    color: PathoraColors.surface,
  },
  labelSecondary: {
    color: PathoraColors.ink900,
  },
});
