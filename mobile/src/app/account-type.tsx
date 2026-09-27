import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountTypeCard } from '@/components/account-type-card';
import { AuthBackButton } from '@/components/auth-back-button';
import { PathoraColors, PathoraFonts, PathoraSpacing } from '@/constants/pathora-theme';

export default function AccountTypeScreen() {
  const router = useRouter();

  const handleStudent = () => {
    router.push('/register/student');
  };

  const handleCompany = () => {
    router.push('/register/company');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AuthBackButton style={styles.backButton} />

        <Text style={styles.title}>How will you use Pathora?</Text>
        <Text style={styles.subtitle}>Choose the account that fits what you&apos;ll do on Pathora.</Text>

        <AccountTypeCard
          title="I'm a student"
          description="Find and apply to internships that match your profile."
          iconName={{ ios: 'person.fill', android: 'person', web: 'person' }}
          onPress={handleStudent}
        />

        <AccountTypeCard
          title="I'm a company"
          description="Post internships and review applicants."
          iconName={{ ios: 'building.2.fill', android: 'apartment', web: 'apartment' }}
          onPress={handleCompany}
        />
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
  backButton: {
    marginTop: 8,
    marginBottom: PathoraSpacing[24],
    alignSelf: 'flex-start',
  },
  title: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 24,
    color: PathoraColors.ink900,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 14,
    lineHeight: 22,
    color: PathoraColors.textSecondary,
    marginBottom: PathoraSpacing[32],
  },
});
