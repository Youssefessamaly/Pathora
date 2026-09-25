import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { I18nManager, Pressable, StyleSheet, Text, View } from 'react-native';

import { PathoraColors, PathoraFonts, PathoraRadius } from '@/constants/pathora-theme';

export type AccountTypeCardProps = {
  title: string;
  description: string;
  iconName: SymbolViewProps['name'];
  onPress?: () => void;
};

export function AccountTypeCard({ title, description, iconName, onPress }: AccountTypeCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.iconContainer}>
        <SymbolView name={iconName} size={20} tintColor={PathoraColors.teal700} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <SymbolView
        name={{
          ios: I18nManager.isRTL ? 'chevron.left' : 'chevron.right',
          android: I18nManager.isRTL ? 'chevron_left' : 'chevron_right',
          web: I18nManager.isRTL ? 'chevron_left' : 'chevron_right',
        }}
        size={18}
        tintColor={PathoraColors.textTertiary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 18,
    backgroundColor: PathoraColors.surface,
    borderWidth: 1.5,
    borderColor: PathoraColors.borderStrong,
    borderRadius: PathoraRadius[14],
    marginBottom: 14,
  },
  pressed: {
    opacity: 0.85,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: PathoraRadius[12],
    backgroundColor: PathoraColors.teal100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 15.5,
    color: PathoraColors.ink900,
  },
  description: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 13,
    lineHeight: 18,
    color: PathoraColors.textSecondary,
  },
});
