import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { I18nManager, Pressable, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';

import { PathoraColors, PathoraRadius } from '@/constants/pathora-theme';

export type AuthBackButtonProps = {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function AuthBackButton({ onPress, style }: AuthBackButtonProps) {
  const router = useRouter();
  // '/' is now the launch splash gate, not a screen to land back on — the default destination
  // is the Welcome screen it hands off to.
  const handlePress = onPress ?? (() => router.replace('/welcome'));

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}>
      <SymbolView
        name={{
          ios: I18nManager.isRTL ? 'chevron.right' : 'chevron.left',
          android: I18nManager.isRTL ? 'chevron_right' : 'chevron_left',
          web: I18nManager.isRTL ? 'chevron_right' : 'chevron_left',
        }}
        size={22}
        tintColor={PathoraColors.ink900}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: PathoraRadius[999],
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
