import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InternshipFeedCard } from '@/components/internship-feed-card';
import { PathoraButton } from '@/components/pathora-button';
import { PathoraColors, PathoraFonts, PathoraSpacing } from '@/constants/pathora-theme';
import { useAuth } from '@/context/auth-context';
import { ApiError, getInternInternships, getInternProfileOrNull, type InternInternship } from '@/lib/api';
import { describeOnboardingError, resolveFirstIncompleteOnboardingStep } from '@/lib/onboarding';

/**
 * The Internships tab: the intern's full personalized, backend-ranked feed. The dashboard
 * Home tab shows only a short preview of this same data ("Recommended for you" + See all) —
 * this screen is the complete list, never recalculated or re-sorted client-side.
 */
function InternshipsListScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [internships, setInternships] = useState<InternInternship[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }
    try {
      const data = await getInternInternships(token);
      setInternships(data);
      setError(null);
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.status === 403) {
        // Profile missing or onboarding incomplete — send them to resume onboarding instead
        // of showing a raw feed error, exactly like the Home tab does.
        const profile = await getInternProfileOrNull(token).catch(() => null);
        const nextStep = resolveFirstIncompleteOnboardingStep(profile);
        router.replace(nextStep ?? '/onboarding/personal');
        return;
      }
      setError(describeOnboardingError(loadError));
    }
  }, [token, router]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Text style={styles.title}>Internships</Text>

      {internships === null && !error && (
        <View style={styles.centerContent}>
          <ActivityIndicator color={PathoraColors.teal600} />
        </View>
      )}

      {error && (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
          <PathoraButton label="Try again" variant="secondary" onPress={load} style={styles.retryButton} />
        </View>
      )}

      {internships !== null && !error && internships.length === 0 && (
        <ScrollView
          contentContainerStyle={styles.emptyContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
          <Text style={styles.emptyTitle}>No open internships yet</Text>
          <Text style={styles.emptyBody}>New opportunities will appear here when companies post them.</Text>
        </ScrollView>
      )}

      {internships !== null && !error && internships.length > 0 && (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
          {internships.map((internship) => (
            <InternshipFeedCard
              key={internship.id}
              item={internship}
              onPress={() =>
                router.push({ pathname: '/intern/internships/[id]', params: { id: internship.id } })
              }
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

export default function InternshipsListRoute() {
  return <InternshipsListScreen />;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PathoraColors.paper,
  },
  title: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 22,
    color: PathoraColors.ink900,
    paddingHorizontal: PathoraSpacing[24],
    paddingTop: 8,
    paddingBottom: PathoraSpacing[16],
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: PathoraSpacing[24],
    gap: PathoraSpacing[16],
  },
  errorText: {
    fontFamily: PathoraFonts.en.medium,
    fontSize: 14,
    color: PathoraColors.error,
    textAlign: 'center',
  },
  retryButton: {
    minWidth: 140,
  },
  emptyContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: PathoraSpacing[24],
    gap: PathoraSpacing[8],
  },
  emptyTitle: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 18,
    color: PathoraColors.ink900,
  },
  emptyBody: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 14,
    lineHeight: 20,
    color: PathoraColors.textSecondary,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: PathoraSpacing[24],
    paddingBottom: PathoraSpacing[24],
  },
});
