import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';

import { ApplicationFilter, ApplicationMetric } from '@/components/application-polish';
import { ApplicationStatusBadge } from '@/components/application-status-badge';
import { PathoraButton } from '@/components/pathora-button';
import { PathoraColors, PathoraFonts } from '@/constants/pathora-theme';
import { useAuth } from '@/context/auth-context';
import { getCompanyInternships, type CompanyApplicationStatus } from '@/lib/api';
import { getAllCompanyApplications, type CompanyApplicantEntry } from '@/lib/company-applicants';
import { formatDisplayDate } from '@/lib/date';
import { initialsForName } from '@/lib/initials';
import { describeOnboardingError } from '@/lib/onboarding';

type Filter = 'ALL' | CompanyApplicationStatus;
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'APPLIED', label: 'To review' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'REJECTED', label: 'Rejected' },
];

function ApplicantCard({ applicant, index, onPress }: { applicant: CompanyApplicantEntry; index: number; onPress: () => void }) {
  return (
    <Animated.View entering={FadeInDown.duration(300).delay(Math.min(index, 7) * 35).reduceMotion(ReduceMotion.System)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Review ${applicant.applicantName ?? 'applicant'} for ${applicant.internshipTitle}`}
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
        <View style={styles.cardTop}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initialsForName(applicant.applicantName)}</Text></View>
          <View style={styles.cardIdentity}>
            <Text numberOfLines={1} style={styles.applicantName}>{applicant.applicantName ?? 'Unknown applicant'}</Text>
            <Text numberOfLines={2} style={styles.internshipName}>{applicant.internshipTitle}</Text>
          </View>
          <ApplicationStatusBadge status={applicant.status} />
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.appliedAt}>Applied {formatDisplayDate(applicant.appliedAt)}</Text>
          <View style={styles.reviewLink}>
            <Text style={styles.reviewText}>View application</Text>
            <SymbolView name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }} size={15} tintColor={PathoraColors.teal700} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** Company-wide applicants are composed from the existing per-internship API. */
export default function CompanyApplicantsRoute() {
  const { status } = useLocalSearchParams<{ status?: string }>();
  const initialFilter: Filter = status === 'APPLIED' ? 'APPLIED' : 'ALL';

  // Remount only when the route's requested filter changes. This keeps manual
  // filter selections working without synchronously setting state in an effect.
  return <CompanyApplicantsContent key={initialFilter} initialFilter={initialFilter} />;
}

function CompanyApplicantsContent({ initialFilter }: { initialFilter: Filter }) {
  const router = useRouter();
  const { token } = useAuth();
  const requestId = useRef(0);
  const [applications, setApplications] = useState<CompanyApplicantEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [query, setQuery] = useState('');


  const load = useCallback(async () => {
    if (!token) return;
    const current = ++requestId.current;
    try {
      const internships = await getCompanyInternships(token);
      const data = await getAllCompanyApplications(token, internships);
      if (current !== requestId.current) return;
      setApplications(data);
      setError(null);
    } catch (err) {
      if (current === requestId.current) setError(describeOnboardingError(err));
    }
  }, [token]);

  useFocusEffect(useCallback(() => {
    void load();
    return () => { requestId.current += 1; };
  }, [load]));

  const refresh = async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  };
  const all = applications ?? [];
  const counts = {
    ALL: all.length,
    APPLIED: all.filter((a) => a.status === 'APPLIED').length,
    ACCEPTED: all.filter((a) => a.status === 'ACCEPTED').length,
    REJECTED: all.filter((a) => a.status === 'REJECTED').length,
  };
  const visible = useMemo(() => {
    const search = query.trim().toLowerCase();
    return all.filter((a) =>
      (filter === 'ALL' || a.status === filter) &&
      (!search || [a.applicantName, a.internshipTitle, a.institutionName, a.major]
        .some((value) => value?.toLowerCase().includes(search))),
    );
  }, [applications, filter, query]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={PathoraColors.teal600} />}>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>COMPANY WORKSPACE</Text>
          <Text style={styles.title}>Applicants<Text style={styles.titleDot}>.</Text></Text>
          <Text style={styles.subtitle}>Meet the people behind every application.</Text>
        </View>

        {applications === null && !error ? (
          <View style={styles.center}><ActivityIndicator size="large" color={PathoraColors.teal600} /></View>
        ) : error ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Applicants couldn't be loaded</Text>
            <Text style={styles.emptyBody}>{error}</Text>
            <PathoraButton label="Try again" variant="secondary" onPress={() => void load()} style={styles.retry} />
          </View>
        ) : (
          <>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionEyebrow}>AT A GLANCE</Text>
              <Text style={styles.sectionTitle}>Hiring overview</Text>
            </View>
            <View style={styles.metrics}>
              <ApplicationMetric label="Applicants" value={counts.ALL} />
              <ApplicationMetric label="To review" value={counts.APPLIED} tint="amber" />
              <ApplicationMetric label="Accepted" value={counts.ACCEPTED} />
            </View>

            <View style={styles.sectionHeading}>
              <Text style={styles.sectionEyebrow}>APPLICATION INBOX</Text>
              <Text style={styles.sectionTitle}>Review candidates</Text>
            </View>
            <View style={styles.searchBox}>
              <SymbolView name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} size={19} tintColor={PathoraColors.textTertiary} />
              <TextInput style={styles.searchInput} value={query} onChangeText={setQuery}
                placeholder="Search people or internships" placeholderTextColor={PathoraColors.textTertiary} autoCorrect={false} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {FILTERS.map((item) => (
                <ApplicationFilter key={item.key} title={item.label} count={counts[item.key]}
                  selected={filter === item.key} onPress={() => setFilter(item.key)} />
              ))}
            </ScrollView>
            <View style={styles.resultsHead}>
              <Text style={styles.resultsText}>{visible.length} {visible.length === 1 ? 'application' : 'applications'}</Text>
              <Text style={styles.sortText}>Newest first</Text>
            </View>
            {visible.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <SymbolView name={{ ios: 'person.2', android: 'group', web: 'group' }} size={27} tintColor={PathoraColors.teal700} />
                </View>
                <Text style={styles.emptyTitle}>{all.length ? 'No matching applicants' : 'Your first applicant will appear here'}</Text>
                <Text style={styles.emptyBody}>{all.length ? 'Try another search or status filter.' : 'Applications submitted through Path appear here when students apply.'}</Text>
                {all.length > 0 && <Pressable onPress={() => { setQuery(''); setFilter('ALL'); }}><Text style={styles.clearText}>Clear filters →</Text></Pressable>}
              </View>
            ) : visible.map((applicant, index) => (
              <ApplicantCard key={applicant.applicationId} applicant={applicant} index={index}
                onPress={() => router.push({ pathname: '/company/applicants/[applicationId]',
                  params: { id: applicant.internshipId, applicationId: applicant.applicationId } })} />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PathoraColors.paper },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 155, gap: 16 },
  heading: { gap: 5, marginBottom: 5 },
  eyebrow: { fontFamily: PathoraFonts.en.bold, letterSpacing: 1.6, fontSize: 10, color: PathoraColors.teal600 },
  title: { color: PathoraColors.ink900, fontFamily: PathoraFonts.en.extraBold, fontSize: 30, lineHeight: 41 },
  titleDot: { color: PathoraColors.teal500 },
  subtitle: { color: PathoraColors.textSecondary, fontFamily: PathoraFonts.en.medium, fontSize: 12.5, lineHeight: 20 },
  sectionHeading: { gap: 4, marginTop: 4 },
  sectionEyebrow: { fontFamily: PathoraFonts.en.bold, letterSpacing: 1.4, fontSize: 10, color: PathoraColors.teal600 },
  sectionTitle: { color: PathoraColors.ink900, fontFamily: PathoraFonts.en.extraBold, fontSize: 21, lineHeight: 28 },
  metrics: { flexDirection: 'row', gap: 9, marginBottom: 6 },
  searchBox: { flexDirection: 'row', gap: 10, alignItems: 'center', borderWidth: 1,
    borderColor: '#DDE5DD', borderRadius: 15, backgroundColor: PathoraColors.surface, paddingHorizontal: 14, minHeight: 50 },
  searchInput: { flex: 1, color: PathoraColors.ink900, fontFamily: PathoraFonts.en.medium, fontSize: 13.5, paddingVertical: 12 },
  filters: { gap: 9, paddingVertical: 2 },
  resultsHead: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 },
  resultsText: { fontFamily: PathoraFonts.en.bold, color: PathoraColors.ink900, fontSize: 13 },
  sortText: { fontFamily: PathoraFonts.en.medium, color: PathoraColors.textTertiary, fontSize: 11.5 },
  card: { borderRadius: 18, borderWidth: 1, borderColor: PathoraColors.border, backgroundColor: PathoraColors.surface,
    padding: 16, gap: 14, shadowColor: PathoraColors.ink900, shadowOpacity: 0.035, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  cardPressed: { opacity: 0.75 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  avatar: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: PathoraColors.teal100 },
  avatarText: { color: PathoraColors.teal700, fontFamily: PathoraFonts.en.extraBold, fontSize: 16 },
  cardIdentity: { flex: 1, minWidth: 0, gap: 4 },
  applicantName: { color: PathoraColors.ink900, fontFamily: PathoraFonts.en.bold, fontSize: 14.5 },
  internshipName: { color: PathoraColors.textSecondary, fontFamily: PathoraFonts.en.medium, fontSize: 12, lineHeight: 18 },
  cardBottom: { borderTopWidth: 1, borderTopColor: '#F0EEE9', paddingTop: 12, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  appliedAt: { color: PathoraColors.textSecondary, fontFamily: PathoraFonts.en.medium, fontSize: 11.5, flexShrink: 1 },
  reviewLink: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  reviewText: { color: PathoraColors.teal700, fontFamily: PathoraFonts.en.bold, fontSize: 11.5 },
  center: { minHeight: 280, alignItems: 'center', justifyContent: 'center' },
  emptyCard: { borderRadius: 20, backgroundColor: PathoraColors.surface, borderColor: PathoraColors.border,
    borderWidth: 1, padding: 24, alignItems: 'center', gap: 12 },
  emptyIcon: { backgroundColor: PathoraColors.teal100, borderRadius: 20, height: 58, width: 58, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: PathoraColors.ink900, fontFamily: PathoraFonts.en.extraBold, fontSize: 16, textAlign: 'center' },
  emptyBody: { color: PathoraColors.textSecondary, fontFamily: PathoraFonts.en.medium, fontSize: 12.5, lineHeight: 20, textAlign: 'center' },
  clearText: { color: PathoraColors.teal700, fontFamily: PathoraFonts.en.bold, fontSize: 12.5 },
  retry: { minWidth: 160 },
});
