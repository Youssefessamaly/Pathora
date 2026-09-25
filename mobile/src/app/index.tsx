import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PathoraButton } from '@/components/pathora-button';
import { PathoraLogo } from '@/components/pathora-logo';
import { PathoraColors, PathoraFonts, PathoraGradients, PathoraRadius, PathoraSpacing } from '@/constants/pathora-theme';

export default function WelcomeScreen() {
  const router = useRouter();

  const handleCreateAccount = () => {
    router.push('/account-type');
  };

  const handleLogin = () => {
    router.push('/login');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <PathoraLogo style={styles.logo} />

        <View style={styles.hero}>
          <LinearGradient
            colors={PathoraGradients.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroCircleAmber} />
          <View style={styles.heroCircleSoftLower} />
          <View style={styles.heroCircleSoftRight} />
        </View>

        <Text style={styles.title}>Find internships built for where you are</Text>
        <Text style={styles.subtitle}>
          Pathora matches verified companies in Egypt with students ready to grow.
        </Text>

        <PathoraButton label="Create account" variant="primary" onPress={handleCreateAccount} style={styles.primaryButton} />
        <PathoraButton label="I already have an account" variant="secondary" onPress={handleLogin} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PathoraColors.paper,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: PathoraSpacing[24],
  },
  logo: {
    marginTop: 18,
    marginBottom: PathoraSpacing[24],
  },
  hero: {
    width: '100%',
    height: 150,
    borderRadius: PathoraRadius[20],
    marginBottom: 26,
    overflow: 'hidden',
  },
  heroCircleAmber: {
    position: 'absolute',
    top: -18,
    right: -18,
    width: 70,
    height: 70,
    borderRadius: PathoraRadius[999],
    backgroundColor: PathoraColors.amber500,
  },
  heroCircleSoftLower: {
    position: 'absolute',
    bottom: -12,
    left: -10,
    width: 40,
    height: 40,
    borderRadius: PathoraRadius[999],
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  heroCircleSoftRight: {
    position: 'absolute',
    bottom: 18,
    right: 56,
    width: 18,
    height: 18,
    borderRadius: PathoraRadius[999],
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  title: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 24,
    lineHeight: 29,
    color: PathoraColors.ink900,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 14,
    lineHeight: 22,
    color: PathoraColors.textSecondary,
    marginBottom: 26,
  },
  primaryButton: {
    marginBottom: 10,
  },
});
