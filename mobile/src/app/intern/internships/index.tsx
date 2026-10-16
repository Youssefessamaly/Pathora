import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InternshipFeedCard } from '@/components/internship-feed-card';
import { PathoraButton } from '@/components/pathora-button';
import { PathoraSearchInput } from '@/components/pathora-search-input';
import { PathoraColors, PathoraFonts, PathoraSpacing } from '@/constants/pathora-theme';
import { useAuth } from '@/context/auth-context';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  ApiError,
  favoriteInternship,
  getInternInternships,
  getInternProfileOrNull,
  type InternInternship,
  unfavoriteInternship,
} from '@/lib/api';
import { describeOnboardingError, resolveFirstIncompleteOnboardingStep } from '@/lib/onboarding';

const SEARCH_DEBOUNCE_MS = 350;

/**
 * The Internships tab: the intern's full personalized, backend-ranked feed, with real
 * text search over title/company/location/skills (GET /intern/internships?search=...). The
 * dashboard Home tab shows only a short preview of this same data ("Recommended for you" +
 * See all) — this screen is the complete, searchable list. Results are never re-sorted or
 * re-filtered client-side; the backend remains the single source of truth for both
 * eligibility and (when searching) the match itself.
 */
function InternshipsListScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { search: initialSearchParam } = useLocalSearchParams<{ search?: string }>();

  const [query, setQuery] = useState(initialSearchParam ?? '');
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const isSearchActive = debouncedQuery.trim().length > 0;

  const [internships, setInternships] = useState<InternInternship[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [updatingFavoriteIds, setUpdatingFavoriteIds] = useState<Set<string>>(new Set());
  const hasLoadedOnce = useRef(false);

  const load = useCallback(
    async (searchTerm: string) => {
      if (!token) {
        return;
      }
      // Only the very first load (nothing on screen yet) shows the big centered spinner —
      // a search-driven refetch keeps the current results visible with a small inline
      // indicator instead, so typing never causes the list to flicker away and back.
      if (hasLoadedOnce.current) {
        setIsSearching(true);
      }
      try {
        const data = await getInternInternships(token, searchTerm);
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
      } finally {
        hasLoadedOnce.current = true;
        setIsSearching(false);
      }
    },
    [token, router],
  );

  // Fires on mount, on every return-to-screen focus, and whenever the debounced query changes
  // while focused — one source of truth for "when do we (re)fetch", matching the debounce so
  // fast typing settles into roughly one request rather than one per keystroke.
  useFocusEffect(
    useCallback(() => {
      load(debouncedQuery);
    }, [load, debouncedQuery]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await load(debouncedQuery);
    setRefreshing(false);
  };

  const handleFavoritePress = async (internship: InternInternship) => {
    if (!token || updatingFavoriteIds.has(internship.id)) {
      return;
    }

    setUpdatingFavoriteIds((current) => new Set(current).add(internship.id));
    try {
      if (internship.favorited) {
        await unfavoriteInternship(token, internship.id);
      } else {
        await favoriteInternship(token, internship.id);
      }

      setInternships((current) =>
        current?.map((item) =>
          item.id === internship.id ? { ...item, favorited: !internship.favorited } : item,
        ) ?? null,
      );
    } catch {
      Alert.alert('Unable to update favorite', 'Please try again.');
    } finally {
      setUpdatingFavoriteIds((current) => {
        const next = new Set(current);
        next.delete(internship.id);
        return next;
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Text style={styles.title}>Internships</Text>

      <PathoraSearchInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search internships, companies, or skills"
        style={styles.searchInput}
      />

      {internships === null && !error && (
        <View style={styles.centerContent}>
          <ActivityIndicator color={PathoraColors.teal600} />
        </View>
      )}

      {error && (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
          <PathoraButton
            label="Try again"
            variant="secondary"
            onPress={() => load(debouncedQuery)}
            style={styles.retryButton}
          />
        </View>
      )}

      {internships !== null && !error && internships.length === 0 && (
        <ScrollView
          contentContainerStyle={styles.emptyContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
          {isSearchActive ? (
            <>
              <Text style={styles.emptyTitle}>No internships found</Text>
              <Text style={styles.emptyBody}>Try a different title, company, location, or skill.</Text>
            </>
          ) : (
            <>
              <Text style={styles.emptyTitle}>No open internships yet</Text>
              <Text style={styles.emptyBody}>New opportunities will appear here when companies post them.</Text>
            </>
          )}
        </ScrollView>
      )}

      {internships !== null && !error && internships.length > 0 && (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
          {isSearching && (
            <View style={styles.inlineLoadingRow}>
              <ActivityIndicator size="small" color={PathoraColors.teal600} />
            </View>
          )}
          {internships.map((internship) => (
            <InternshipFeedCard
              key={internship.id}
              item={internship}
              onPress={() =>
                router.push({ pathname: '/intern/internships/[id]', params: { id: internship.id } })
              }
              onFavoritePress={() => handleFavoritePress(internship)}
              favoriteDisabled={updatingFavoriteIds.has(internship.id)}
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
  searchInput: {
    marginHorizontal: PathoraSpacing[24],
    marginBottom: PathoraSpacing[16],
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
    paddingBottom: 130,
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
  },
  listContent: {
    paddingHorizontal: PathoraSpacing[24],
    paddingBottom: 130,
  },
  inlineLoadingRow: {
    alignItems: 'center',
    paddingBottom: PathoraSpacing[12],
  },
});
