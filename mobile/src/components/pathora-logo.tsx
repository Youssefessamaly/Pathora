import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View, type ViewProps } from 'react-native';

import { PathoraColors, PathoraFonts, PathoraGradients, PathoraRadius, PathoraSpacing } from '@/constants/pathora-theme';

export type PathoraLogoProps = ViewProps;

export function PathoraLogo({ style, ...rest }: PathoraLogoProps) {
  return (
    <View style={[styles.container, style]} {...rest}>
      <LinearGradient
        colors={PathoraGradients.logoMark}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.mark}
      />
      <Text style={styles.wordmark}>Pathora</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PathoraSpacing[8],
  },
  mark: {
    width: 30,
    height: 30,
    borderRadius: PathoraRadius[8],
  },
  wordmark: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 16,
    color: PathoraColors.ink900,
  },
});
