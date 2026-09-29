import { useRouter } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PathoraButton } from '@/components/pathora-button';
import { PathoraColors, PathoraFonts, PathoraRadius, PathoraSpacing } from '@/constants/pathora-theme';
import { useAuth } from '@/context/auth-context';

/**
 * Client-side gate for the company home: requires an authenticated COMPANY session.
 * The backend independently enforces this on every request regardless of this guard.
 */
function CompanyHomeGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isInitializing, user } = useAuth();
  const isCompany = user?.role === 'COMPANY';

  useEffect(() => {
    if (isInitializing) {
      return;
    }
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (!isCompany) {
      // Signed in, but as the wrong role — send them to their own home instead of
      // bouncing an already-authenticated user back to the login screen.
      router.replace(user?.role === 'INTERN' ? '/intern' : '/login');
    }
  }, [isInitializing, isAuthenticated, isCompany, user?.role, router]);

  if (isInitializing || !isAuthenticated || !isCompany) {
    return <View style={styles.guardFallback} />;
  }

  return <>{children}</>;
}

function CompanyHomeScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>{user?.email}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Pathora company home</Text>
          <Text style={styles.cardBody}>
            Post internships and manage your listings here. More of your dashboard is on the
            way.
          </Text>
        </View>

        <PathoraButton
          label="Post internship"
          variant="primary"
          onPress={() => router.push('/company/internships/new')}
          style={styles.actionButton}
        />

        <PathoraButton
          label="Manage internships"
          variant="secondary"
          onPress={() => router.push('/company/internships')}
          style={styles.actionButton}
        />

        <PathoraButton
          label="Log out"
          variant="secondary"
          onPress={handleSignOut}
          style={styles.signOutButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

export default function CompanyHomeRoute() {
  return (
    <CompanyHomeGuard>
      <CompanyHomeScreen />
    </CompanyHomeGuard>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PathoraColors.paper,
  },
  guardFallback: {
    flex: 1,
    backgroundColor: PathoraColors.paper,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: PathoraSpacing[24],
    paddingTop: PathoraSpacing[16],
  },
  title: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 24,
    color: PathoraColors.ink900,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 14,
    color: PathoraColors.textSecondary,
    marginBottom: PathoraSpacing[32],
  },
  card: {
    borderRadius: PathoraRadius[14],
    backgroundColor: PathoraColors.surface,
    borderWidth: 1,
    borderColor: PathoraColors.border,
    paddingVertical: PathoraSpacing[20],
    paddingHorizontal: PathoraSpacing[16],
    marginBottom: PathoraSpacing[32],
  },
  cardTitle: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 15,
    color: PathoraColors.ink900,
    marginBottom: 8,
  },
  cardBody: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 13.5,
    lineHeight: 20,
    color: PathoraColors.textSecondary,
  },
  actionButton: {
    marginBottom: PathoraSpacing[16],
  },
  signOutButton: {
    marginTop: PathoraSpacing[8],
    marginBottom: PathoraSpacing[24],
  },
});
