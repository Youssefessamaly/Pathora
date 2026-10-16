import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';

import { ApplicationFilter, ApplicationMetric } from '@/components/application-polish';
import { ApplicationStatusBadge } from '@/components/application-status-badge';
import { AuthBackButton } from '@/components/auth-back-button';
import { OnboardingGuard } from '@/components/onboarding/onboarding-guard';
import { PathoraButton } from '@/components/pathora-button';
import { PathoraColors, PathoraFonts } from '@/constants/pathora-theme';
import { useAuth } from '@/context/auth-context';
import { ApiError, getCompanyInternshipApplications, type AcademicLevel, type CompanyApplicationListItem, type CompanyApplicationStatus } from '@/lib/api';
import { formatDisplayDate } from '@/lib/date';
import { initialsForName } from '@/lib/initials';
import { describeOnboardingError } from '@/lib/onboarding';

type Filter = 'ALL' | CompanyApplicationStatus;
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'ALL', label: 'All' }, { key: 'APPLIED', label: 'To review' },
  { key: 'ACCEPTED', label: 'Accepted' }, { key: 'REJECTED', label: 'Rejected' },
];
const ACADEMIC_LEVEL_LABELS: Record<AcademicLevel, string> = { HIGH_SCHOOL: 'High school', UNIVERSITY: 'University' };

function educationSummary(item: CompanyApplicationListItem) {
  return [item.institutionName, item.major, item.academicLevel ? ACADEMIC_LEVEL_LABELS[item.academicLevel] : null]
    .filter((value): value is string => Boolean(value)).join(' · ');
}

function CandidateCard({ applicant, index, onPress }: { applicant: CompanyApplicationListItem; index: number; onPress: () => void }) {
  const meta = educationSummary(applicant);
  return (
    <Animated.View entering={FadeInDown.duration(300).delay(Math.min(index, 7) * 35).reduceMotion(ReduceMotion.System)}>
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <View style={styles.cardTop}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initialsForName(applicant.applicantName)}</Text></View>
          <View style={styles.cardIdentity}>
            <Text numberOfLines={1} style={styles.name}>{applicant.applicantName ?? 'Unknown applicant'}</Text>
            {meta ? <Text numberOfLines={2} style={styles.education}>{meta}</Text> : null}
          </View>
          <ApplicationStatusBadge status={applicant.status} />
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.date}>Applied {formatDisplayDate(applicant.appliedAt)}</Text>
          <View style={styles.viewRow}>
            <Text style={styles.viewText}>Review</Text>
            <SymbolView name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }} size={14} tintColor={PathoraColors.teal700} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function RoleApplicants({ internshipId }: { internshipId: string }) {
  const router = useRouter();
  const { token } = useAuth();
  const requestId = useRef(0);
  const [applications, setApplications] = useState<CompanyApplicationListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    const current = ++requestId.current;
    try {
      const data = await getCompanyInternshipApplications(token, internshipId);
      if (current !== requestId.current) return;
      setApplications(data); setError(null); setNotFound(false);
    } catch (err) {
      if (current !== requestId.current) return;
      if (err instanceof ApiError && err.status === 404) { setNotFound(true); setError(null); }
      else { setNotFound(false); setError(describeOnboardingError(err)); }
    }
  }, [token, internshipId]);

  useFocusEffect(useCallback(() => { void load(); return () => { requestId.current += 1; }; }, [load]));
  const refresh = async () => { setRefreshing(true); try { await load(); } finally { setRefreshing(false); } };
  const all = applications ?? [];
  const counts = {
    ALL: all.length,
    APPLIED: all.filter((a) => a.status === 'APPLIED').length,
    ACCEPTED: all.filter((a) => a.status === 'ACCEPTED').length,
    REJECTED: all.filter((a) => a.status === 'REJECTED').length,
  };
  const visible = useMemo(() => {
    const search = query.trim().toLowerCase();
    return all.filter((a) => (filter === 'ALL' || a.status === filter) &&
      (!search || [a.applicantName, a.institutionName, a.major].some((val) => val?.toLowerCase().includes(search))));
  }, [applications, filter, query]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={PathoraColors.teal600} />}>
        <AuthBackButton onPress={() => router.back()} style={styles.backButton} />
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>ROLE MANAGEMENT</Text>
          <Text style={styles.title}>Applicants<Text style={styles.titleDot}>.</Text></Text>
          <Text style={styles.subtitle}>Review applications for this internship.</Text>
        </View>
        {applications === null && !error && !notFound ? (
          <View style={styles.center}><ActivityIndicator size="large" color={PathoraColors.teal600} /></View>
        ) : error || notFound ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>{notFound ? 'This internship is unavailable' : 'Unable to load applicants'}</Text>
            <Text style={styles.stateBody}>{notFound ? 'It may have been removed, or may not belong to your account.' : error}</Text>
            {!notFound && <PathoraButton label="Try again" variant="secondary" onPress={() => void load()} style={styles.retry} />}
          </View>
        ) : (
          <>
            <View style={styles.sectionHeading}>
              <Text style={styles.eyebrow}>AT A GLANCE</Text>
              <Text style={styles.sectionTitle}>Applications overview</Text>
            </View>
            <View style={styles.metrics}>
              <ApplicationMetric label="Applicants" value={counts.ALL} />
              <ApplicationMetric label="To review" value={counts.APPLIED} tint="amber" />
              <ApplicationMetric label="Accepted" value={counts.ACCEPTED} />
            </View>
            <View style={styles.searchBox}>
              <SymbolView name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} size={19} tintColor={PathoraColors.textTertiary} />
              <TextInput value={query} onChangeText={setQuery} placeholder="Search candidates" autoCorrect={false}
                placeholderTextColor={PathoraColors.textTertiary} style={styles.searchInput} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {FILTERS.map(({ key, label }) => <ApplicationFilter key={key} title={label} count={counts[key]} selected={filter === key} onPress={() => setFilter(key)} />)}
            </ScrollView>
            <View style={styles.resultsHead}>
              <Text style={styles.resultsText}>{visible.length} {visible.length === 1 ? 'candidate' : 'candidates'}</Text>
              <Text style={styles.sortText}>Newest first</Text>
            </View>
            {visible.length === 0 ? (
              <View style={styles.stateCard}>
                <Text style={styles.stateTitle}>{all.length ? 'No matching candidates' : 'No applications yet'}</Text>
                <Text style={styles.stateBody}>{all.length ? 'Try a different status or search term.' : 'Students who apply through Path will appear here.'}</Text>
                {all.length > 0 && <Pressable onPress={() => { setQuery(''); setFilter('ALL'); }}><Text style={styles.clearText}>Clear filters →</Text></Pressable>}
              </View>
            ) : visible.map((applicant, index) => <CandidateCard key={applicant.applicationId} applicant={applicant} index={index}
              onPress={() => router.push({ pathname: '/company/internships/[id]/applicants/[applicationId]',
                params: { id: internshipId, applicationId: applicant.applicationId } })} />)}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function ApplicantsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <OnboardingGuard role="COMPANY">{id ? <RoleApplicants internshipId={id} /> : null}</OnboardingGuard>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PathoraColors.paper },
  content: { flexGrow: 1, paddingTop: 12, paddingHorizontal: 20, paddingBottom: 155, gap: 16 },
  backButton: { alignSelf: 'flex-start', marginLeft: -5 },
  heading: { gap: 6 },
  eyebrow: { color: PathoraColors.teal600, fontFamily: PathoraFonts.en.bold, fontSize: 10, letterSpacing: 1.5 },
  title: { color: PathoraColors.ink900, fontFamily: PathoraFonts.en.extraBold, fontSize: 29, lineHeight: 39 },
  titleDot: { color: PathoraColors.teal500 },
  subtitle: { color: PathoraColors.textSecondary, fontFamily: PathoraFonts.en.medium, fontSize: 12.5 },
  sectionHeading: { gap: 4, marginTop: 5 },
  sectionTitle: { color: PathoraColors.ink900, fontFamily: PathoraFonts.en.extraBold, fontSize: 21 },
  metrics: { flexDirection: 'row', gap: 9 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#DDE5DD',
    borderRadius: 15, backgroundColor: PathoraColors.surface, paddingHorizontal: 14, minHeight: 50 },
  searchInput: { flex: 1, paddingVertical: 12, fontFamily: PathoraFonts.en.medium, fontSize: 13.5, color: PathoraColors.ink900 },
  filters: { gap: 9, paddingVertical: 2 },
  resultsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultsText: { fontFamily: PathoraFonts.en.bold, color: PathoraColors.ink900, fontSize: 13 },
  sortText: { fontFamily: PathoraFonts.en.medium, color: PathoraColors.textTertiary, fontSize: 11.5 },
  card: { padding: 16, gap: 14, backgroundColor: PathoraColors.surface, borderRadius: 18,
    borderWidth: 1, borderColor: PathoraColors.border },
  pressed: { opacity: 0.74 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  avatar: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: PathoraColors.teal100 },
  avatarText: { color: PathoraColors.teal700, fontFamily: PathoraFonts.en.extraBold, fontSize: 16 },
  cardIdentity: { flex: 1, minWidth: 0, gap: 4 },
  name: { color: PathoraColors.ink900, fontFamily: PathoraFonts.en.bold, fontSize: 14.5 },
  education: { color: PathoraColors.textSecondary, fontFamily: PathoraFonts.en.medium, fontSize: 12, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0EEE9' },
  date: { fontFamily: PathoraFonts.en.medium, fontSize: 11.5, color: PathoraColors.textSecondary, flexShrink: 1 },
  viewRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  viewText: { fontFamily: PathoraFonts.en.bold, fontSize: 11.5, color: PathoraColors.teal700 },
  center: { minHeight: 240, justifyContent: 'center', alignItems: 'center' },
  stateCard: { backgroundColor: PathoraColors.surface, borderRadius: 20, borderWidth: 1, borderColor: PathoraColors.border,
    padding: 28, gap: 12, alignItems: 'center' },
  stateTitle: { fontFamily: PathoraFonts.en.extraBold, fontSize: 16, color: PathoraColors.ink900, textAlign: 'center' },
  stateBody: { fontFamily: PathoraFonts.en.medium, fontSize: 12.5, lineHeight: 20, color: PathoraColors.textSecondary, textAlign: 'center' },
  clearText: { fontFamily: PathoraFonts.en.bold, color: PathoraColors.teal700 },
  retry: { minWidth: 160 },
});
