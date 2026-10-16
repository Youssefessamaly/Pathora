/**
 * Path · Company Internships
 * Phase 1 / Step 4 visual refresh.
 *
 * Single-screen replacement. Real OPEN/CLOSED status, existing company endpoints,
 * original nested internship routes, and pull-to-refresh are preserved.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PathoraButton } from '@/components/pathora-button';
import { PathoraSearchInput } from '@/components/pathora-search-input';
import { PathoraColors, PathoraFonts, PathoraRadius, PathoraSpacing } from '@/constants/pathora-theme';
import { useAuth } from '@/context/auth-context';
import {
  getCompanyInternshipApplications,
  getCompanyInternships,
  type CompanyInternship,
  type InternshipStatus,
} from '@/lib/api';
import { formatDisplayDate } from '@/lib/date';
import { describeOnboardingError } from '@/lib/onboarding';
import { WORK_MODE_LABELS } from '@/lib/internship-options';

type ListingFilter = 'ALL' | InternshipStatus;
type ApplicantCount = { total: number; pending: number };
// undefined = still loading, null = could not load, object = loaded.
type ApplicantCountLookup = Record<string, ApplicantCount | null>;

const FILTERS: { value: ListingFilter; title: string }[] = [
  { value: 'ALL', title: 'All' },
  { value: 'OPEN', title: 'Open' },
  { value: 'CLOSED', title: 'Closed' },
];

function SmallIcon({
  name,
  size = 16,
  color = PathoraColors.textSecondary,
}: {
  name: SymbolViewProps['name'];
  size?: number;
  color?: string;
}) {
  // Uses the app's existing platform-aware SF / Material symbol mappings.
  return <SymbolView name={name} size={size} tintColor={color} />;
}

function StatusPill({ status }: { status: InternshipStatus }) {
  const open = status === 'OPEN';
  return (
    <View style={[styles.statusPill, open ? styles.statusPillOpen : styles.statusPillClosed]}>
      <View style={[styles.statusDot, open ? styles.statusDotOpen : styles.statusDotClosed]} />
      <Text style={[styles.statusPillText, open ? styles.statusTextOpen : styles.statusTextClosed]}>
        {open ? 'Open' : 'Closed'}
      </Text>
    </View>
  );
}

function OverviewTile({ number, label, tone }: { number: number; label: string; tone?: 'teal' | 'muted' }) {
  return (
    <View style={styles.overviewTile}>
      <View style={[styles.overviewAccent, tone === 'teal' && styles.overviewAccentTeal, tone === 'muted' && styles.overviewAccentMuted]} />
      <Text style={styles.overviewNumber}>{number}</Text>
      <Text style={styles.overviewLabel}>{label}</Text>
    </View>
  );
}

function InternshipCard({
  internship,
  count,
  countsReady,
  index,
  onOpen,
  onApplicants,
}: {
  internship: CompanyInternship;
  count: ApplicantCount | null | undefined;
  countsReady: boolean;
  index: number;
  onOpen: () => void;
  onApplicants: () => void;
}) {
  const isExternal = internship.applicationMethod === 'EXTERNAL';
  const isOpen = internship.status === 'OPEN';

  return (
    <Animated.View
      entering={FadeInDown.duration(330).delay(Math.min(index, 6) * 48).reduceMotion(ReduceMotion.System)}
      style={styles.listingCard}>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`Manage ${internship.title}, ${isOpen ? 'open' : 'closed'} internship`}
        style={({ pressed }) => [styles.cardMain, pressed && styles.touchPressed]}>
        <View style={styles.cardTopLine}>
          <View style={styles.roleMark}>
            <SmallIcon name={{ ios: 'briefcase.fill', android: 'work', web: 'work' }} size={23} color={PathoraColors.teal700} />
          </View>
          <View style={styles.cardTitleArea}>
            <Text style={styles.roleEyebrow}>INTERNSHIP OPPORTUNITY</Text>
            <Text numberOfLines={2} style={styles.roleTitle}>{internship.title}</Text>
          </View>
          <StatusPill status={internship.status} />
        </View>

        <View style={styles.cardMetadata}>
          <View style={styles.metaToken}>
            <SmallIcon name={{ ios: 'mappin.and.ellipse', android: 'place', web: 'place' }} size={14} />
            <Text style={styles.metaText} numberOfLines={1}>{internship.location}</Text>
          </View>
          <View style={styles.metaToken}>
            <SmallIcon name={{ ios: 'building.2', android: 'domain', web: 'domain' }} size={14} />
            <Text style={styles.metaText}>{WORK_MODE_LABELS[internship.workMode]}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailLine}>
            <SmallIcon name={{ ios: 'calendar', android: 'event', web: 'event' }} size={15} color={PathoraColors.teal600} />
            <Text style={styles.detailText}>Apply by {formatDisplayDate(internship.applicationDeadline)}</Text>
          </View>
          <View style={[styles.methodPill, isExternal && styles.methodPillExternal]}>
            <Text style={[styles.methodText, isExternal && styles.methodTextExternal]}>
              {isExternal ? 'Company website' : 'Apply in Path'}
            </Text>
          </View>
        </View>
      </Pressable>

      <View style={styles.cardFooter}>
        {isExternal ? (
          <View style={styles.applicantSummary}>
            <SmallIcon name={{ ios: 'arrow.up.right.square', android: 'open_in_new', web: 'open_in_new' }} size={15} />
            <Text style={styles.applicantInfo}>External applications</Text>
          </View>
        ) : !countsReady ? (
          <View style={styles.applicantSummary}>
            <ActivityIndicator size="small" color={PathoraColors.teal600} />
            <Text style={styles.applicantInfo}>Checking applicants…</Text>
          </View>
        ) : count === null || count === undefined ? (
          <View style={styles.applicantSummary}>
            <SmallIcon name={{ ios: 'person.2', android: 'group', web: 'group' }} size={17} />
            <Text style={styles.applicantInfo}>Applicants unavailable</Text>
          </View>
        ) : (
          <View style={styles.applicantSummary}>
            <SmallIcon name={{ ios: 'person.2.fill', android: 'group', web: 'group' }} size={17} color={PathoraColors.teal600} />
            <Text style={styles.applicantInfo}>
              <Text style={styles.applicantInfoStrong}>{count.total}</Text> applicants
            </Text>
            {count.pending > 0 ? (
              <View style={styles.reviewChip}>
                <Text style={styles.reviewChipText}>{count.pending} to review</Text>
              </View>
            ) : null}
          </View>
        )}
        <Pressable
          onPress={isExternal ? onOpen : onApplicants}
          accessibilityRole="button"
          accessibilityLabel={isExternal ? `Manage ${internship.title}` : `View applicants for ${internship.title}`}
          style={({ pressed }) => [styles.footerActionTouch, pressed && styles.touchPressed]}>
          <Text style={styles.footerActionText}>{isExternal ? 'Manage' : 'Applicants'}</Text>
          <SmallIcon name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }} size={16} color={PathoraColors.teal700} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

function FilterOption({
  title,
  total,
  active,
  onPress,
}: {
  title: string;
  total: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.filterChip, active && styles.filterChipActive, pressed && styles.touchPressed]}>
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{title}</Text>
      <View style={[styles.filterCountBox, active && styles.filterCountBoxActive]}>
        <Text style={[styles.filterCount, active && styles.filterCountActive]}>{total}</Text>
      </View>
    </Pressable>
  );
}

export default function CompanyInternshipsListRoute() {
  const router = useRouter();
  const { token } = useAuth();
  const requestId = useRef(0);

  const [internships, setInternships] = useState<CompanyInternship[] | null>(null);
  const [applicantCounts, setApplicantCounts] = useState<ApplicantCountLookup>({});
  const [countsReady, setCountsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<ListingFilter>('ALL');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    const currentRequestId = ++requestId.current;

    try {
      const data = await getCompanyInternships(token);
      if (currentRequestId !== requestId.current) return;

      setInternships(data);
      setError(null);
      setCountsReady(false);
      setApplicantCounts({});

      // The backend provides applications per internship, not in the internships list.
      // External applications happen off-platform and must never display an invented count.
      const internalListings = data.filter((item) => item.applicationMethod === 'INTERNAL');
      const results = await Promise.allSettled(
        internalListings.map((item) => getCompanyInternshipApplications(token, item.id)),
      );
      if (currentRequestId !== requestId.current) return;

      const nextCounts: ApplicantCountLookup = {};
      internalListings.forEach((item, index) => {
        const result = results[index];
        nextCounts[item.id] = result.status === 'fulfilled'
          ? {
              total: result.value.length,
              pending: result.value.filter((application) => application.status === 'APPLIED').length,
            }
          : null; // Failed requests are 'unavailable', not a fabricated zero.
      });
      setApplicantCounts(nextCounts);
      setCountsReady(true);
    } catch (loadError) {
      if (currentRequestId === requestId.current) {
        setError(describeOnboardingError(loadError));
      }
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        // Ignore stale results when the company navigates away or switches tabs.
        requestId.current += 1;
      };
    }, [load]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const openCount = (internships ?? []).filter((item) => item.status === 'OPEN').length;
  const closedCount = (internships ?? []).filter((item) => item.status === 'CLOSED').length;
  const totalCount = internships?.length ?? 0;
  const searching = query.trim().toLocaleLowerCase();

  const visible = useMemo(() => {
    if (!internships) return [];
    return internships
      .filter((item) => filter === 'ALL' || item.status === filter)
      .filter((item) => {
        if (!searching) return true;
        return [item.title, item.location, WORK_MODE_LABELS[item.workMode]]
          .some((value) => value.toLocaleLowerCase().includes(searching));
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [internships, filter, searching]);

  const openRole = (id: string) => {
    router.push({ pathname: '/company/internships/[id]', params: { id } });
  };
  const openApplicants = (id: string) => {
    router.push({ pathname: '/company/internships/[id]/applicants', params: { id } });
  };
  const createRole = () => router.push('/company/internships/new');
  const isInitialLoading = internships === null && error === null;
  const isEmpty = internships !== null && internships.length === 0;
  const noResults = internships !== null && internships.length > 0 && visible.length === 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={PathoraColors.teal600}
            colors={[PathoraColors.teal600]}
          />
        }>
        <View style={styles.headerRow}>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.eyebrow}>COMPANY WORKSPACE</Text>
            <Text style={styles.pageTitle}>Internships<Text style={styles.titleDot}>.</Text></Text>
            <Text style={styles.pageSubtitle}>Every opportunity, beautifully organized.</Text>
          </View>
          <Pressable
            onPress={createRole}
            accessibilityRole="button"
            accessibilityLabel="Post an internship"
            style={({ pressed }) => [styles.headerAddButton, pressed && styles.touchPressed]}>
            <SmallIcon name={{ ios: 'plus', android: 'add', web: 'add' }} color={PathoraColors.surface} size={23} />
          </Pressable>
        </View>

        {isInitialLoading ? (
          <View style={styles.loadingPanel}>
            <ActivityIndicator size="large" color={PathoraColors.teal600} />
            <Text style={styles.loadingCaption}>Loading your internships…</Text>
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <View style={styles.stateIconCircle}>
              <SmallIcon name={{ ios: 'wifi.exclamationmark', android: 'wifi_off', web: 'wifi_off' }} color={PathoraColors.teal700} size={25} />
            </View>
            <Text style={styles.stateTitle}>We could not load your internships</Text>
            <Text style={styles.stateBody}>{error}</Text>
            <PathoraButton label="Try again" variant="primary" onPress={() => void load()} style={styles.stateButton} />
          </View>
        ) : (
          <>
            <View style={styles.overviewSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionEyebrow}>AT A GLANCE</Text>
                <Text style={styles.sectionTitle}>Your opportunities</Text>
              </View>
              <View style={styles.overviewRow}>
                <OverviewTile number={totalCount} label="Total" />
                <OverviewTile number={openCount} label="Open" tone="teal" />
                <OverviewTile number={closedCount} label="Closed" tone="muted" />
              </View>
            </View>

            {isEmpty ? (
              <View style={styles.stateCard}>
                <View style={styles.stateIconCircle}>
                  <SmallIcon name={{ ios: 'briefcase.fill', android: 'work', web: 'work' }} color={PathoraColors.teal700} size={26} />
                </View>
                <Text style={styles.stateTitle}>Your first internship awaits</Text>
                <Text style={styles.stateBody}>
                  Share a role, discover emerging talent, and manage applications right here.
                </Text>
                <PathoraButton label="Create your first internship" onPress={createRole} style={styles.stateButton} />
              </View>
            ) : (
              <View style={styles.listSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionEyebrow}>ROLE MANAGEMENT</Text>
                  <Text style={styles.sectionTitle}>Manage your listings</Text>
                </View>

                <PathoraSearchInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search your internships"
                  style={styles.searchInput}
                />

                <View style={styles.filterRow}>
                  {FILTERS.map(({ value, title }) => (
                    <FilterOption
                      key={value}
                      title={title}
                      total={value === 'ALL' ? totalCount : value === 'OPEN' ? openCount : closedCount}
                      active={filter === value}
                      onPress={() => setFilter(value)}
                    />
                  ))}
                </View>

                <View style={styles.resultsHeader}>
                  <Text style={styles.resultsLabel}>
                    {visible.length} {visible.length === 1 ? 'internship' : 'internships'}
                  </Text>
                  <Text style={styles.resultsSort}>Newest first</Text>
                </View>

                {noResults ? (
                  <View style={styles.noResultsCard}>
                    <SmallIcon name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} size={27} color={PathoraColors.teal600} />
                    <Text style={styles.noResultsTitle}>Nothing matches just yet</Text>
                    <Text style={styles.noResultsBody}>Try a different search or choose another status.</Text>
                    <Pressable
                      onPress={() => { setQuery(''); setFilter('ALL'); }}
                      accessibilityRole="button"
                      style={({ pressed }) => [styles.resetTouch, pressed && styles.touchPressed]}>
                      <Text style={styles.resetText}>Clear filters  →</Text>
                    </Pressable>
                  </View>
                ) : (
                  visible.map((internship, index) => (
                    <InternshipCard
                      key={internship.id}
                      internship={internship}
                      count={applicantCounts[internship.id]}
                      countsReady={countsReady}
                      index={index}
                      onOpen={() => openRole(internship.id)}
                      onApplicants={() => openApplicants(internship.id)}
                    />
                  ))
                )}
              </View>
            )}
            <Text style={styles.footerSignature}>Your next great hire starts with Path.</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PathoraColors.paper },
  scrollContent: {
    paddingHorizontal: PathoraSpacing[20],
    paddingTop: PathoraSpacing[16],
    paddingBottom: 130,
    flexGrow: 1,
    gap: PathoraSpacing[24],
  },
  touchPressed: { opacity: 0.74 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headerTitleWrap: { flex: 1, gap: 4 },
  eyebrow: { color: PathoraColors.teal600, fontSize: 10, letterSpacing: 1.7, fontFamily: PathoraFonts.en.bold },
  pageTitle: { fontFamily: PathoraFonts.en.extraBold, fontSize: 29, lineHeight: 39, letterSpacing: -0.9, color: PathoraColors.ink900 },
  titleDot: { color: PathoraColors.teal500 },
  pageSubtitle: { color: PathoraColors.textSecondary, fontSize: 12.5, lineHeight: 19, fontFamily: PathoraFonts.en.medium },
  headerAddButton: {
    height: 46, width: 46, borderRadius: 16,
    backgroundColor: PathoraColors.teal700,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: PathoraColors.teal700, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.17, shadowRadius: 9, elevation: 3,
  },
  loadingPanel: { flex: 1, minHeight: 330, gap: 14, justifyContent: 'center', alignItems: 'center' },
  loadingCaption: { color: PathoraColors.textSecondary, fontFamily: PathoraFonts.en.medium, fontSize: 13 },
  overviewSection: { gap: PathoraSpacing[16] },
  sectionHeader: { gap: 3 },
  sectionEyebrow: { fontFamily: PathoraFonts.en.bold, fontSize: 10, letterSpacing: 1.5, color: PathoraColors.teal600 },
  sectionTitle: { fontFamily: PathoraFonts.en.extraBold, fontSize: 21, lineHeight: 28, letterSpacing: -0.5, color: PathoraColors.ink900 },
  overviewRow: { flexDirection: 'row', gap: 9 },
  overviewTile: {
    flex: 1, minWidth: 0, backgroundColor: PathoraColors.surface, borderColor: PathoraColors.border, borderWidth: 1,
    borderRadius: 16, paddingVertical: 16, paddingHorizontal: 13, gap: 7,
    shadowColor: PathoraColors.ink900, shadowOpacity: 0.025, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1,
  },
  overviewAccent: { width: 22, height: 4, borderRadius: 999, backgroundColor: PathoraColors.amber500 },
  overviewAccentTeal: { backgroundColor: PathoraColors.teal500 },
  overviewAccentMuted: { backgroundColor: '#BBC3C7' },
  overviewNumber: { color: PathoraColors.ink900, fontFamily: PathoraFonts.en.extraBold, fontSize: 25, lineHeight: 32 },
  overviewLabel: { color: PathoraColors.textSecondary, fontFamily: PathoraFonts.en.medium, fontSize: 12 },
  listSection: { gap: PathoraSpacing[16] },
  searchInput: { borderColor: '#DDE5DD', backgroundColor: '#FFFFFF', borderRadius: 15, paddingVertical: 13 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: {
    flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9,
    backgroundColor: '#FFFFFF', borderRadius: 999, borderColor: PathoraColors.border, borderWidth: 1,
  },
  filterChipActive: { backgroundColor: PathoraColors.teal700, borderColor: PathoraColors.teal700 },
  filterText: { fontFamily: PathoraFonts.en.bold, fontSize: 12, color: PathoraColors.textSecondary },
  filterTextActive: { color: '#FFFFFF' },
  filterCountBox: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99, backgroundColor: PathoraColors.paper },
  filterCountBoxActive: { backgroundColor: 'rgba(255,255,255,0.18)' },
  filterCount: { fontFamily: PathoraFonts.en.bold, fontSize: 10, color: PathoraColors.textSecondary },
  filterCountActive: { color: '#FFFFFF' },
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 1 },
  resultsLabel: { color: PathoraColors.ink900, fontFamily: PathoraFonts.en.bold, fontSize: 13 },
  resultsSort: { color: PathoraColors.textTertiary, fontFamily: PathoraFonts.en.medium, fontSize: 11.5 },
  listingCard: {
    backgroundColor: '#FFFFFF', borderRadius: 19, borderWidth: 1, borderColor: PathoraColors.border,
    overflow: 'hidden',
    shadowColor: PathoraColors.ink900, shadowOpacity: 0.045, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  cardMain: { paddingHorizontal: 17, paddingTop: 18, paddingBottom: 16, gap: 16 },
  cardTopLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  roleMark: { backgroundColor: PathoraColors.teal100, borderRadius: 14, width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  cardTitleArea: { flex: 1, minWidth: 0, gap: 4 },
  roleEyebrow: { fontFamily: PathoraFonts.en.bold, fontSize: 9, color: PathoraColors.teal600, letterSpacing: 1.1 },
  roleTitle: { fontFamily: PathoraFonts.en.bold, fontSize: 15.5, lineHeight: 21, color: PathoraColors.ink900 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 99, paddingVertical: 7, paddingHorizontal: 9 },
  statusPillOpen: { backgroundColor: PathoraColors.teal100 },
  statusPillClosed: { backgroundColor: '#F0F1F2' },
  statusDot: { width: 6, height: 6, borderRadius: 999 },
  statusDotOpen: { backgroundColor: PathoraColors.teal500 },
  statusDotClosed: { backgroundColor: '#8A94A0' },
  statusPillText: { fontFamily: PathoraFonts.en.bold, fontSize: 10.5 },
  statusTextOpen: { color: PathoraColors.teal700 },
  statusTextClosed: { color: PathoraColors.textSecondary },
  cardMetadata: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaToken: {
    flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 0,
    backgroundColor: '#F6F7F6', borderRadius: 9, paddingHorizontal: 9, paddingVertical: 7,
    maxWidth: '100%',
  },
  metaText: { fontFamily: PathoraFonts.en.medium, fontSize: 11.5, color: PathoraColors.textSecondary, flexShrink: 1 },
  detailRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  detailLine: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  detailText: { fontFamily: PathoraFonts.en.medium, color: PathoraColors.textSecondary, fontSize: 11.5 },
  methodPill: { backgroundColor: '#EFF5F2', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8 },
  methodPillExternal: { backgroundColor: PathoraColors.amber100 },
  methodText: { fontFamily: PathoraFonts.en.bold, fontSize: 10, color: PathoraColors.teal700 },
  methodTextExternal: { color: PathoraColors.amberTextOnTint },
  cardFooter: {
    paddingHorizontal: 17, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#F0EEE9',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6,
    backgroundColor: '#FEFEFD',
  },
  applicantSummary: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, flexWrap: 'wrap' },
  applicantInfo: { color: PathoraColors.textSecondary, fontFamily: PathoraFonts.en.medium, fontSize: 11.5 },
  applicantInfoStrong: { color: PathoraColors.ink900, fontFamily: PathoraFonts.en.bold },
  reviewChip: { borderRadius: 7, backgroundColor: PathoraColors.amber100, paddingHorizontal: 7, paddingVertical: 4 },
  reviewChipText: { fontFamily: PathoraFonts.en.bold, fontSize: 10, color: PathoraColors.amberTextOnTint },
  footerActionTouch: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingVertical: 4, paddingLeft: 5 },
  footerActionText: { color: PathoraColors.teal700, fontFamily: PathoraFonts.en.bold, fontSize: 11.5 },
  stateCard: {
    borderRadius: PathoraRadius[20], borderWidth: 1, borderColor: PathoraColors.border, backgroundColor: '#FFFFFF',
    alignItems: 'center', paddingHorizontal: PathoraSpacing[20], paddingVertical: PathoraSpacing[32], gap: 13,
  },
  stateIconCircle: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: PathoraColors.teal100 },
  stateTitle: { color: PathoraColors.ink900, fontFamily: PathoraFonts.en.extraBold, fontSize: 18, lineHeight: 25, textAlign: 'center' },
  stateBody: { color: PathoraColors.textSecondary, fontFamily: PathoraFonts.en.regular, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  stateButton: { marginTop: 5, maxWidth: 270 },
  noResultsCard: {
    paddingVertical: 30, paddingHorizontal: 20, borderRadius: PathoraRadius[20], borderWidth: 1,
    borderColor: PathoraColors.border, backgroundColor: '#FFFFFF', alignItems: 'center', gap: 9,
  },
  noResultsTitle: { color: PathoraColors.ink900, fontFamily: PathoraFonts.en.bold, fontSize: 16, textAlign: 'center' },
  noResultsBody: { color: PathoraColors.textSecondary, fontFamily: PathoraFonts.en.medium, fontSize: 12, textAlign: 'center' },
  resetTouch: { paddingHorizontal: 10, paddingVertical: 8, marginTop: 4 },
  resetText: { color: PathoraColors.teal700, fontFamily: PathoraFonts.en.bold, fontSize: 12.5 },
  footerSignature: { textAlign: 'center', color: PathoraColors.textTertiary, fontSize: 11, fontFamily: PathoraFonts.en.medium, marginTop: 6 },
});
