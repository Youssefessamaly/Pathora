import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InternshipFeedCard } from '@/components/internship-feed-card';
import { PathoraButton } from '@/components/pathora-button';
import { PathoraColors, PathoraFonts, PathoraSpacing } from '@/constants/pathora-theme';
import { useAuth } from '@/context/auth-context';
import {
  ApiError,
  getFavoriteInternships,
  getInternProfileOrNull,
  type InternInternship,
  unfavoriteInternship,
} from '@/lib/api';
import { describeOnboardingError, resolveFirstIncompleteOnboardingStep } from '@/lib/onboarding';

function FavoritesScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [favorites, setFavorites] = useState<InternInternship[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const data = await getFavoriteInternships(token);
      setFavorites(data);
      setError(null);
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.status === 403) {
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

  const handleRemoveFavorite = async (internship: InternInternship) => {
    if (!token || removingIds.has(internship.id)) {
      return;
    }

    setRemovingIds((current) => new Set(current).add(internship.id));
    try {
      await unfavoriteInternship(token, internship.id);
      setFavorites((current) => current?.filter((item) => item.id !== internship.id) ?? null);
    } catch {
      Alert.alert('Unable to remove favorite', 'Please try again.');
    } finally {
      setRemovingIds((current) => {
        const next = new Set(current);
        next.delete(internship.id);
        return next;
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Text style={styles.title}>Favorites</Text>
      <Text style={styles.subtitle}>Internships you saved for later.</Text>

      {favorites === null && !error && (
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

      {favorites !== null && !error && favorites.length === 0 && (
        <ScrollView
          contentContainerStyle={styles.emptyContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptyBody}>
            Tap the bookmark icon on an internship to save it here.
          </Text>
          <PathoraButton
            label="Browse internships"
            variant="secondary"
            onPress={() => router.push('/intern/internships')}
            style={styles.browseButton}
          />
        </ScrollView>
      )}

      {favorites !== null && !error && favorites.length > 0 && (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
          {favorites.map((internship) => (
            <InternshipFeedCard
              key={internship.id}
              item={internship}
              onPress={() =>
                router.push({ pathname: '/intern/internships/[id]', params: { id: internship.id } })
              }
              onFavoritePress={() => handleRemoveFavorite(internship)}
              favoriteDisabled={removingIds.has(internship.id)}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

export default function FavoritesRoute() {
  return <FavoritesScreen />;
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
  },
  subtitle: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 13,
    color: PathoraColors.textSecondary,
    paddingHorizontal: PathoraSpacing[24],
    paddingTop: 4,
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
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 14,
    lineHeight: 20,
    color: PathoraColors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  browseButton: {
    marginTop: PathoraSpacing[12],
    minWidth: 180,
  },
  listContent: {
    paddingHorizontal: PathoraSpacing[24],
    paddingBottom: PathoraSpacing[24],
  },
});
