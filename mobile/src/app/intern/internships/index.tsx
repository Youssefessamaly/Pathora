/**
 * Path | Student internship discovery — Phase 1 / Step 5.
 * Matches and default ordering come from the backend. Work-mode chips are
 * a view-only filter on the returned feed and preserve its server ranking.
 * The tab remains full-bleed behind the floating navigation bar.
 */
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InternshipFeedCard } from '@/components/internship-feed-card';
import { PathoraButton } from '@/components/pathora-button';
import { PathoraSearchInput } from '@/components/pathora-search-input';
import { PathoraColors, PathoraFonts, PathoraGradients, PathoraSpacing } from '@/constants/pathora-theme';
import { useAuth } from '@/context/auth-context';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  ApiError,
  favoriteInternship,
  getInternInternships,
  getInternProfileOrNull,
  type InternshipWorkMode,
  type InternInternship,
  unfavoriteInternship,
} from '@/lib/api';
import { describeOnboardingError, resolveFirstIncompleteOnboardingStep } from '@/lib/onboarding';

const SEARCH_DEBOUNCE_MS = 350;
type ModeFilter = 'ALL' | InternshipWorkMode;
const MODE_FILTERS: { value: ModeFilter; label: string }[] = [
  { value: 'ALL', label: 'All roles' },
  { value: 'REMOTE', label: 'Remote' },
  { value: 'HYBRID', label: 'Hybrid' },
  { value: 'ONSITE', label: 'On-site' },
];

function Icon({ name, color = PathoraColors.textSecondary, size = 16 }: {
  name: SymbolViewProps['name']; color?: string; size?: number;
}) {
  return <SymbolView name={name} size={size} tintColor={color} />;
}

function ModeChip({ title, count, active, onPress }: {
  title: string; count: number | null; active: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${title}${count === null ? '' : `, ${count} internships`}`}
      style={({ pressed }) => [styles.filterChip, active && styles.filterChipSelected, pressed && styles.pressed]}>
      <Text style={[styles.filterLabel, active && styles.filterLabelSelected]}>{title}</Text>
      {count !== null && (
        <View style={[styles.filterCountBox, active && styles.filterCountBoxSelected]}>
          <Text style={[styles.filterCount, active && styles.filterCountSelected]}>{count}</Text>
        </View>
      )}
    </Pressable>
  );
}

function StateCard({ title, description, icon, action, onAction, error = false }: {
  title: string;
  description: string;
  icon: SymbolViewProps['name'];
  action?: string;
  onAction?: () => void;
  error?: boolean;
}) {
  return (
    <View style={styles.stateCard}>
      <View style={[styles.stateIcon, error && styles.stateIconError]}>
        <Icon name={icon} color={error ? PathoraColors.error : PathoraColors.teal700} size={28} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateDescription}>{description}</Text>
      {action && onAction && (
        <PathoraButton label={action} variant="secondary" onPress={onAction} style={styles.stateButton} />
      )}
    </View>
  );
}

function InternshipsListScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { search: initialSearchParam } = useLocalSearchParams<{ search?: string }>();

  const [query, setQuery] = useState(initialSearchParam ?? '');
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const [mode, setMode] = useState<ModeFilter>('ALL');
  const [internships, setInternships] = useState<InternInternship[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [updatingFavoriteIds, setUpdatingFavoriteIds] = useState<Set<string>>(new Set());
  const loadedOnce = useRef(false);
  const requestVersion = useRef(0);

  const load = useCallback(async (searchTerm: string) => {
    if (!token) return;
    const currentRequest = ++requestVersion.current;
    if (loadedOnce.current) setIsSearching(true);
    try {
      const data = await getInternInternships(token, searchTerm);
      if (currentRequest !== requestVersion.current) return;
      setInternships(data);
      setError(null);
    } catch (loadError) {
      if (currentRequest !== requestVersion.current) return;
      if (loadError instanceof ApiError && loadError.status === 403) {
        const profile = await getInternProfileOrNull(token).catch(() => null);
        if (currentRequest !== requestVersion.current) return;
        const nextStep = resolveFirstIncompleteOnboardingStep(profile);
        router.replace(nextStep ?? '/onboarding/personal');
        return;
      }
      setError(describeOnboardingError(loadError));
    } finally {
      if (currentRequest === requestVersion.current) {
        loadedOnce.current = true;
        setIsSearching(false);
      }
    }
  }, [router, token]);

  // Cancel stale search responses when typing, leaving the tab, or switching requests.
  useFocusEffect(useCallback(() => {
    void load(debouncedQuery);
    return () => { requestVersion.current += 1; };
  }, [debouncedQuery, load]));

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await load(debouncedQuery); }
    finally { setRefreshing(false); }
  };

  const handleFavoritePress = async (internship: InternInternship) => {
    if (!token || updatingFavoriteIds.has(internship.id)) return;
    setUpdatingFavoriteIds((current) => new Set(current).add(internship.id));
    try {
      if (internship.favorited) await unfavoriteInternship(token, internship.id);
      else await favoriteInternship(token, internship.id);
      setInternships((current) => current?.map((item) => item.id === internship.id
        ? { ...item, favorited: !internship.favorited } : item) ?? null);
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

  const counts = useMemo(() => ({
    ALL: internships?.length ?? 0,
    REMOTE: internships?.filter((item) => item.workMode === 'REMOTE').length ?? 0,
    HYBRID: internships?.filter((item) => item.workMode === 'HYBRID').length ?? 0,
    ONSITE: internships?.filter((item) => item.workMode === 'ONSITE').length ?? 0,
  }), [internships]);
  // Filter without changing the backend's relevance order.
  const visible = useMemo(() => internships?.filter((item) => mode === 'ALL' || item.workMode === mode) ?? [], [internships, mode]);
  const hasTextSearch = debouncedQuery.trim().length > 0;
  const isInitialLoad = internships === null && error === null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={PathoraColors.teal600} />}>
        <View style={styles.pageHeader}>
          <View style={styles.headerCopy}>
            <Text style={styles.headerEyebrow}>PATH / FOR STUDENTS</Text>
            <Text style={styles.pageTitle}>Discover<Text style={styles.titleDot}>.</Text></Text>
            <Text style={styles.pageSubtitle}>Your next opportunity starts here.</Text>
          </View>
          <View style={styles.headerBadge}>
            <Icon name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }} size={25} color={PathoraColors.teal700} />
          </View>
        </View>

        <View style={styles.searchSection}>
          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionEyebrow}>YOUR SEARCH</Text>
              <Text style={styles.sectionTitle}>Explore internships</Text>
            </View>
            <Text style={styles.sectionHelper}>Find your fit</Text>
          </View>
          <PathoraSearchInput
            value={query}
            onChangeText={setQuery}
            placeholder="Role, company, city or skill"
            style={styles.searchInput}
          />
          <Text style={styles.filterLabelHeading}>WORK STYLE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow} keyboardShouldPersistTaps="handled">
            {MODE_FILTERS.map((filter) => (
              <ModeChip
                key={filter.value}
                title={filter.label}
                count={internships !== null && !error ? counts[filter.value] : null}
                active={mode === filter.value}
                onPress={() => setMode(filter.value)}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.resultsSection}>
          <View style={styles.resultsHeading}>
            <View style={styles.resultsTitleGroup}>
              <Text style={styles.resultsTitle}>Opportunities for you</Text>
              <Text style={styles.resultsSubtitle}>
                {isSearching ? 'Updating results…' : internships !== null && !error
                  ? `${visible.length} ${visible.length === 1 ? 'internship' : 'internships'} found`
                  : 'Personalized internship listings'}
              </Text>
            </View>
            {isSearching ? (
              <ActivityIndicator color={PathoraColors.teal600} size="small" />
            ) : (
              <View style={styles.sortInfo}>
                <Icon name={{ ios: 'line.3.horizontal.decrease', android: 'sort', web: 'sort' }} size={13} />
                <Text style={styles.sortText}>Best match</Text>
              </View>
            )}
          </View>

          {isInitialLoad && (
            <View style={styles.loadingPanel}>
              <ActivityIndicator color={PathoraColors.teal600} size="large" />
              <Text style={styles.loadingCaption}>Finding internships for you…</Text>
            </View>
          )}
          {error && (
            <StateCard
              error
              title="Couldn't load internships"
              description={error}
              icon={{ ios: 'wifi.exclamationmark', android: 'wifi_off', web: 'wifi_off' }}
              action="Try again"
              onAction={() => { void load(debouncedQuery); }}
            />
          )}
          {internships !== null && !error && visible.length === 0 && (
            <StateCard
              title={hasTextSearch ? 'No matching internships' : mode !== 'ALL' ? 'No roles in this work style' : 'Your next role is on its way'}
              description={hasTextSearch
                ? 'Try another role, company, city or skill. You can also change the work-style filter.'
                : mode !== 'ALL'
                  ? 'Try All roles to see every available internship.'
                  : 'New internships will show up here when companies publish them.'}
              icon={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
              action={hasTextSearch || mode !== 'ALL' ? 'Clear filters' : undefined}
              onAction={() => { setQuery(''); setMode('ALL'); }}
            />
          )}
          {internships !== null && !error && visible.map((internship, index) => (
            <Animated.View
              key={internship.id}
              entering={FadeInDown.duration(330).delay(Math.min(index, 6) * 45).reduceMotion(ReduceMotion.System)}>
              <InternshipFeedCard
                item={internship}
                onPress={() => router.push({ pathname: '/intern/internships/[id]', params: { id: internship.id } })}
                onFavoritePress={() => { void handleFavoritePress(internship); }}
                favoriteDisabled={updatingFavoriteIds.has(internship.id)}
              />
            </Animated.View>
          ))}
        </View>
        <Text style={styles.bottomHint}>PATH · YOUR NEXT CHAPTER</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function InternshipsListRoute() {
  return <InternshipsListScreen />;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PathoraColors.paper },
  // Preserves the latest full-bleed change: content scrolls behind the floating bottom bar.
  scrollContent: { paddingHorizontal: PathoraSpacing[24], paddingTop: 12, paddingBottom: 150, gap: 24 },
  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  headerCopy: { flex: 1, gap: 3 },
  headerEyebrow: { color: PathoraColors.teal600, letterSpacing: 1.7, fontFamily: PathoraFonts.en.bold, fontSize: 10 },
  pageTitle: { color: PathoraColors.ink900, fontFamily: PathoraFonts.en.extraBold, fontSize: 29, lineHeight: 39, letterSpacing: -0.8 },
  titleDot: { color: PathoraColors.teal500 },
  pageSubtitle: { color: PathoraColors.textSecondary, fontFamily: PathoraFonts.en.medium, fontSize: 12.5, lineHeight: 18 },
  headerBadge: { height: 49, width: 49, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: PathoraColors.teal100 },
  hero: { borderRadius: 20, padding: 22, overflow: 'hidden', gap: 13, minHeight: 230,
    shadowColor: PathoraColors.teal700, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 17, elevation: 3 },
  heroHalo: { position: 'absolute', width: 235, height: 235, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', right: -93, top: -106, backgroundColor: 'rgba(255,255,255,0.045)' },
  heroHaloSmall: { position: 'absolute', width: 140, height: 140, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', right: -30, bottom: -73 },
  heroEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroDot: { height: 7, width: 7, borderRadius: 99, backgroundColor: PathoraColors.amber500 },
  heroEyebrow: { color: '#E2F5F0', letterSpacing: 1.25, fontFamily: PathoraFonts.en.bold, fontSize: 9.5 },
  heroTitle: { color: '#FFFFFF', fontFamily: PathoraFonts.en.extraBold, fontSize: 24, lineHeight: 32, letterSpacing: -0.5, maxWidth: '88%' },
  heroSubtitle: { color: '#DBF0EB', fontFamily: PathoraFonts.en.medium, fontSize: 12.5, lineHeight: 19, maxWidth: '95%' },
  heroFooter: { marginTop: 4, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 11, paddingVertical: 9, gap: 8 },
  heroIconCircle: { height: 24, width: 24, borderRadius: 8, backgroundColor: '#E7F4F0', justifyContent: 'center', alignItems: 'center' },
  heroFooterText: { color: '#FFFFFF', fontFamily: PathoraFonts.en.bold, fontSize: 11.5 },
  searchSection: { gap: 12 },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 },
  sectionEyebrow: { color: PathoraColors.teal600, fontFamily: PathoraFonts.en.bold, fontSize: 10, letterSpacing: 1.45 },
  sectionTitle: { fontFamily: PathoraFonts.en.extraBold, fontSize: 21, lineHeight: 29, letterSpacing: -0.55, color: PathoraColors.ink900, marginTop: 4 },
  sectionHelper: { color: PathoraColors.textTertiary, fontFamily: PathoraFonts.en.medium, fontSize: 11.5, paddingBottom: 3 },
  searchInput: { backgroundColor: PathoraColors.surface, borderColor: '#DDE5DD', borderRadius: 15, paddingVertical: 13 },
  filterLabelHeading: { marginTop: 2, color: PathoraColors.textSecondary, fontFamily: PathoraFonts.en.bold, fontSize: 10, letterSpacing: 1.1 },
  filtersRow: { gap: 8, paddingRight: 1 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: PathoraColors.border, paddingHorizontal: 12, paddingVertical: 9 },
  filterChipSelected: { backgroundColor: PathoraColors.teal700, borderColor: PathoraColors.teal700 },
  filterLabel: { color: PathoraColors.textSecondary, fontFamily: PathoraFonts.en.bold, fontSize: 11.5 },
  filterLabelSelected: { color: '#FFFFFF' },
  filterCountBox: { borderRadius: 9, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: '#F1F2F0' },
  filterCountBoxSelected: { backgroundColor: 'rgba(255,255,255,0.18)' },
  filterCount: { fontFamily: PathoraFonts.en.bold, fontSize: 10, color: PathoraColors.textSecondary },
  filterCountSelected: { color: '#FFFFFF' },
  resultsSection: { gap: 12 },
  resultsHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 1 },
  resultsTitleGroup: { flex: 1, gap: 3 },
  resultsTitle: { fontFamily: PathoraFonts.en.extraBold, fontSize: 18, lineHeight: 25, color: PathoraColors.ink900, letterSpacing: -0.4 },
  resultsSubtitle: { fontFamily: PathoraFonts.en.medium, fontSize: 12, color: PathoraColors.textSecondary },
  sortInfo: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EDF3F0', paddingHorizontal: 9, paddingVertical: 8, borderRadius: 9 },
  sortText: { color: PathoraColors.teal700, fontFamily: PathoraFonts.en.bold, fontSize: 10.5 },
  loadingPanel: { minHeight: 250, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingCaption: { color: PathoraColors.textSecondary, fontFamily: PathoraFonts.en.medium, fontSize: 12.5 },
  stateCard: { borderRadius: 20, backgroundColor: '#FFFFFF', borderColor: PathoraColors.border, borderWidth: 1, paddingHorizontal: 20, paddingVertical: 33, alignItems: 'center', gap: 12 },
  stateIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: PathoraColors.teal100, alignItems: 'center', justifyContent: 'center' },
  stateIconError: { backgroundColor: '#FBECEC' },
  stateTitle: { color: PathoraColors.ink900, fontFamily: PathoraFonts.en.extraBold, fontSize: 17, lineHeight: 24, textAlign: 'center' },
  stateDescription: { color: PathoraColors.textSecondary, fontFamily: PathoraFonts.en.medium, fontSize: 12.5, lineHeight: 19, textAlign: 'center' },
  stateButton: { marginTop: 3, minWidth: 150 },
  bottomHint: { marginTop: 5, textAlign: 'center', color: PathoraColors.textTertiary, fontFamily: PathoraFonts.en.bold, fontSize: 10, letterSpacing: 1.35 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.985 }] },
});
