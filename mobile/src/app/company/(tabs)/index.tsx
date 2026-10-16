import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApplicantPreviewRow } from '@/components/applicant-preview-row';
import { PathoraButton } from '@/components/pathora-button';
import { PathoraLogo } from '@/components/pathora-logo';
import { PathoraColors, PathoraFonts, PathoraRadius, PathoraSpacing } from '@/constants/pathora-theme';
import { useAuth } from '@/context/auth-context';
import {
  getCompanyInternships,
  getCompanyProfileOrNull,
  type CompanyInternship,
  type CompanyProfile,
} from '@/lib/api';
import { getAllCompanyApplications, type CompanyApplicantEntry } from '@/lib/company-applicants';
import { formatDisplayDate } from '@/lib/date';
import { initialsFor } from '@/lib/initials';
import { WORK_MODE_LABELS } from '@/lib/internship-options';
import { describeOnboardingError } from '@/lib/onboarding';

/** Keep dashboard previews compact. Full lists remain available in their own tabs. */
const PREVIEW_LIMIT = 2;

function companyInitials(companyName: string | null | undefined, email: string | undefined) {
  const name = companyName?.trim();
  if (!name) return initialsFor(null, null, email);
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

function SectionHeading({
  eyebrow,
  title,
  actionLabel,
  onAction,
}: {
  eyebrow: string;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionHeadingText}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={10}
          style={({ pressed }) => [styles.sectionLinkTouch, pressed && styles.pressed]}>
          <Text style={styles.sectionLink}>{actionLabel}  →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function MetricCard({
  label,
  value,
  accent,
  unavailable,
  onPress,
}: {
  label: string;
  value: number | null;
  accent?: boolean;
  unavailable?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value === null ? (unavailable ? 'unavailable' : 'loading') : value}`}
      style={({ pressed }) => [
        styles.metricCard,
        accent && styles.metricCardAccent,
        pressed && styles.pressed,
      ]}>
      <View style={[styles.metricIndicator, accent && styles.metricIndicatorAmber]} />
      <Text style={styles.metricValue}>{value === null ? '—' : value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </Pressable>
  );
}

function ApplicantPreview({
  applications,
  isLoading,
  isUnavailable,
  onApplicantPress,
  emptyTitle,
  emptyDescription,
}: {
  applications: CompanyApplicantEntry[];
  isLoading: boolean;
  isUnavailable: boolean;
  onApplicantPress: (application: CompanyApplicantEntry) => void;
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (isUnavailable) {
    return (
      <View style={[styles.whiteCard, styles.emptyCard]}>
        <View style={styles.emptyTextWrap}>
          <Text style={styles.emptyTitle}>Applicants unavailable</Text>
          <Text style={styles.emptyDescription}>Pull down to retry loading applications.</Text>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.whiteCard, styles.loadingCard]}>
        <ActivityIndicator color={PathoraColors.teal600} />
        <Text style={styles.loadingCardLabel}>Loading applicants…</Text>
      </View>
    );
  }

  if (applications.length === 0) {
    return (
      <View style={[styles.whiteCard, styles.emptyCard]}>
        <View style={styles.emptyIconCircle}>
          <Text style={styles.emptyIcon}>✓</Text>
        </View>
        <View style={styles.emptyTextWrap}>
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
          <Text style={styles.emptyDescription}>{emptyDescription}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.applicantsCard}>
      {applications.slice(0, PREVIEW_LIMIT).map((application, index) => (
        <View
          key={application.applicationId}
          style={index !== 0 ? styles.applicantDivider : undefined}>
          <ApplicantPreviewRow
            applicantName={application.applicantName}
            internshipTitle={application.internshipTitle}
            appliedAt={application.appliedAt}
            status={application.status}
            tintIndex={index}
            onPress={() => onApplicantPress(application)}
          />
        </View>
      ))}
    </View>
  );
}

function InternshipPreview({
  internship,
  onPress,
}: {
  internship: CompanyInternship;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View internship ${internship.title}`}
      style={({ pressed }) => [styles.internshipRow, pressed && styles.pressed]}>
      <View style={styles.roleIconBox}>
        <PathoraLogo variant="mark" size={23} />
      </View>
      <View style={styles.internshipInfo}>
        <Text style={styles.internshipTitle} numberOfLines={1}>{internship.title}</Text>
        <Text style={styles.internshipMeta} numberOfLines={1}>
          {WORK_MODE_LABELS[internship.workMode]} · {internship.location}
        </Text>
        <Text style={styles.internshipDeadline} numberOfLines={1}>
          Apply by {formatDisplayDate(internship.applicationDeadline)}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

/**
 * All dashboard numbers come from existing company endpoints. The backend currently supports
 * OPEN and CLOSED internships only; it does not support drafts, pauses, or interviews.
 * Applications are merged client-side from the per-internship endpoint. This existing helper
 * is best-effort: individual failed internship requests can cause an undercount.
 */
function CompanyHomeScreen() {
  const router = useRouter();
  const { user, token, signOut } = useAuth();

  const [internships, setInternships] = useState<CompanyInternship[] | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [applications, setApplications] = useState<CompanyApplicantEntry[] | null>(null);
  const [applicantsUnavailable, setApplicantsUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;

    let internshipsData: CompanyInternship[];
    try {
      internshipsData = await getCompanyInternships(token);
      setInternships(internshipsData);
      setError(null);
    } catch (loadError) {
      setError(describeOnboardingError(loadError));
      return;
    }

    // Secondary requests should not prevent the company from viewing its active listings.
    const [profileResult, applicationsResult] = await Promise.all([
      getCompanyProfileOrNull(token).catch(() => null),
      getAllCompanyApplications(token, internshipsData).catch(() => null),
    ]);
    setCompanyProfile(profileResult);
    setApplications(applicationsResult);
    setApplicantsUnavailable(applicationsResult === null);
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void load();
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

  const handleSignOut = async () => {
    await signOut();
    router.dismissAll();
    router.replace('/welcome');
  };

  const handleAvatarPress = () => {
    Alert.alert('Account', user?.email, [
      { text: 'Log out', style: 'destructive', onPress: () => void handleSignOut() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const goToApplicantDetail = (application: CompanyApplicantEntry) => {
    router.push({
      pathname: '/company/internships/[id]/applicants/[applicationId]',
      params: { id: application.internshipId, applicationId: application.applicationId },
    });
  };

  if (internships === null && !error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.centerContent}>
          <PathoraLogo size={34} wordmarkSize={21} />
          <ActivityIndicator color={PathoraColors.teal600} style={styles.startupSpinner} />
          <Text style={styles.loadingCardLabel}>Preparing your company workspace…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.centerContent}>
          <Text style={styles.errorTitle}>We couldn't load your dashboard</Text>
          <Text style={styles.errorText}>{error}</Text>
          <PathoraButton label="Try again" variant="secondary" onPress={() => void load()} style={styles.retryButton} />
        </View>
      </SafeAreaView>
    );
  }

  const openInternships = (internships ?? [])
    .filter((internship) => internship.status === 'OPEN')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const reviewApplications = (applications ?? []).filter((application) => application.status === 'APPLIED');
  const companyName = companyProfile?.companyName?.trim() || 'Your company';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={PathoraColors.teal600}
            colors={[PathoraColors.teal600]}
          />
        }>
        <View style={styles.topBar}>
          <View>
            <PathoraLogo size={25} wordmarkSize={17} />
            <Text style={styles.topBarCaption}>COMPANY WORKSPACE</Text>
          </View>
          <Pressable
            onPress={handleAvatarPress}
            accessibilityRole="button"
            accessibilityLabel="Open account options"
            style={({ pressed }) => [styles.companyAvatar, pressed && styles.pressed]}>
            <Text style={styles.companyAvatarText}>{companyInitials(companyProfile?.companyName, user?.email)}</Text>
          </Pressable>
        </View>

        <View style={styles.welcomeBlock}>
          <Text style={styles.greeting}>GOOD TO SEE YOU</Text>
          <Text style={styles.companyName} numberOfLines={2}>{companyName}</Text>
          <Text style={styles.welcomeSubtext}>Here's what's happening with your hiring.</Text>
        </View>

        <LinearGradient
          colors={[PathoraColors.teal700, PathoraColors.teal600, PathoraColors.ink900]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}>
          <View pointerEvents="none" style={styles.heroCircleLarge} />
          <View pointerEvents="none" style={styles.heroCircleSmall} />
          <View style={styles.heroEyebrowWrap}>
            <View style={styles.heroDot} />
            <Text style={styles.heroEyebrow}>YOUR NEXT GREAT HIRE STARTS HERE</Text>
          </View>
          <Text style={styles.heroTitle}>Make room for{'\n'}new talent.</Text>
          <Text style={styles.heroDescription}>
            Share a new opportunity and connect with students ready to grow.
          </Text>
          <Pressable
            onPress={() => router.push('/company/internships/new')}
            accessibilityRole="button"
            accessibilityLabel="Post an internship"
            style={({ pressed }) => [styles.heroButton, pressed && styles.heroButtonPressed]}>
            <Text style={styles.heroButtonText}>+  Post an internship</Text>
            <Text style={styles.heroButtonArrow}>↗</Text>
          </Pressable>
        </LinearGradient>

        <View style={styles.section}>
          <SectionHeading eyebrow="AT A GLANCE" title="Your hiring pulse" />
          <View style={styles.metricsRow}>
            <MetricCard label="Open roles" value={openInternships.length} onPress={() => router.push('/company/internships')} />
            <MetricCard
              label="To review"
              value={applications ? reviewApplications.length : null}
              accent={reviewApplications.length > 0}
              unavailable={applicantsUnavailable}
              onPress={() => router.push({ pathname: '/company/applicants', params: { status: 'APPLIED' } })}
            />
            <MetricCard label="Applicants" value={applications?.length ?? null} unavailable={applicantsUnavailable} onPress={() => router.push('/company/applicants')} />
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeading
            eyebrow="STAY ON TOP"
            title="Needs your attention"
            actionLabel="View all"
            onAction={() => router.push({ pathname: '/company/applicants', params: { status: 'APPLIED' } })}
          />
          <ApplicantPreview
            applications={reviewApplications}
            isLoading={applications === null && !applicantsUnavailable}
            isUnavailable={applicantsUnavailable}
            emptyTitle="You're all caught up"
            emptyDescription="New applications waiting for review will appear here."
            onApplicantPress={goToApplicantDetail}
          />
        </View>

        <View style={styles.section}>
          <SectionHeading
            eyebrow="YOUR OPPORTUNITIES"
            title="Open internships"
            actionLabel="View all"
            onAction={() => router.push('/company/internships')}
          />
          {openInternships.length === 0 ? (
            <View style={[styles.whiteCard, styles.emptyInternshipsCard]}>
              <Text style={styles.emptyTitle}>Your first opportunity starts here</Text>
              <Text style={styles.emptyDescription}>
                Publish an internship to make your company visible to students.
              </Text>
              <Pressable
                onPress={() => router.push('/company/internships/new')}
                accessibilityRole="button"
                style={({ pressed }) => [styles.textActionTouch, pressed && styles.pressed]}>
                <Text style={styles.inlineAction}>Create an internship  →</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.internshipCard}>
              {openInternships.slice(0, PREVIEW_LIMIT).map((internship, index) => (
                <View key={internship.id} style={index > 0 ? styles.applicantDivider : undefined}>
                  <InternshipPreview
                    internship={internship}
                    onPress={() => router.push({ pathname: '/company/internships/[id]', params: { id: internship.id } })}
                  />
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <SectionHeading
            eyebrow="RECENT ACTIVITY"
            title="Latest applicants"
            actionLabel="View all"
            onAction={() => router.push('/company/applicants')}
          />
          <ApplicantPreview
            applications={applications ?? []}
            isLoading={applications === null && !applicantsUnavailable}
            isUnavailable={applicantsUnavailable}
            emptyTitle="No applications yet"
            emptyDescription="Once students apply, you'll find their applications here."
            onApplicantPress={goToApplicantDetail}
          />
        </View>

        <Text style={styles.footerText}>Made for meaningful first steps.  ·  Path</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function CompanyHomeRoute() {
  return <CompanyHomeScreen />;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PathoraColors.paper },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: PathoraSpacing[20],
    paddingTop: PathoraSpacing[8],
    paddingBottom: 130,
    gap: PathoraSpacing[24],
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: PathoraSpacing[24],
    gap: PathoraSpacing[12],
  },
  startupSpinner: { marginTop: PathoraSpacing[16] },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topBarCaption: {
    marginTop: 2,
    marginLeft: 2,
    fontFamily: PathoraFonts.en.bold,
    fontSize: 9,
    letterSpacing: 1.6,
    color: PathoraColors.textTertiary,
  },
  companyAvatar: {
    width: 46,
    height: 46,
    borderRadius: PathoraRadius[14],
    backgroundColor: PathoraColors.teal100,
    borderWidth: 1,
    borderColor: '#CFE5DF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyAvatarText: {
    color: PathoraColors.teal700,
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 16,
  },
  pressed: { opacity: 0.72 },
  welcomeBlock: { gap: 3 },
  greeting: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 10.5,
    letterSpacing: 2.0,
    color: PathoraColors.teal600,
  },
  companyName: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.8,
    color: PathoraColors.ink900,
  },
  welcomeSubtext: {
    marginTop: 2,
    fontFamily: PathoraFonts.en.regular,
    fontSize: 13.5,
    color: PathoraColors.textSecondary,
  },
  hero: {
    overflow: 'hidden',
    borderRadius: PathoraRadius[20],
    paddingHorizontal: PathoraSpacing[24],
    paddingVertical: PathoraSpacing[24],
    gap: PathoraSpacing[12],
    minHeight: 232,
    justifyContent: 'center',
    shadowColor: PathoraColors.teal700,
    shadowOpacity: 0.15,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  heroCircleLarge: {
    position: 'absolute',
    width: 214,
    height: 214,
    right: -86,
    top: -92,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.17)',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.045)',
  },
  heroCircleSmall: {
    position: 'absolute',
    width: 118,
    height: 118,
    right: -44,
    bottom: -57,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
  },
  heroEyebrowWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroDot: { width: 7, height: 7, borderRadius: 999, backgroundColor: PathoraColors.amber500 },
  heroEyebrow: {
    fontFamily: PathoraFonts.en.bold,
    letterSpacing: 1.15,
    fontSize: 9,
    color: '#E2F4EF',
  },
  heroTitle: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 25,
    lineHeight: 32,
    letterSpacing: -0.65,
    color: PathoraColors.surface,
  },
  heroDescription: {
    maxWidth: '90%',
    fontFamily: PathoraFonts.en.regular,
    fontSize: 12.5,
    lineHeight: 19,
    color: '#E3F3F0',
  },
  heroButton: {
    alignSelf: 'flex-start',
    marginTop: PathoraSpacing[8],
    flexDirection: 'row',
    alignItems: 'center',
    gap: PathoraSpacing[16],
    backgroundColor: PathoraColors.surface,
    paddingLeft: PathoraSpacing[16],
    paddingRight: PathoraSpacing[12],
    paddingVertical: PathoraSpacing[12],
    borderRadius: PathoraRadius[12],
    minHeight: 46,
  },
  heroButtonPressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  heroButtonText: { color: PathoraColors.teal700, fontFamily: PathoraFonts.en.extraBold, fontSize: 12.5 },
  heroButtonArrow: { color: PathoraColors.teal700, fontFamily: PathoraFonts.en.bold, fontSize: 17 },
  section: { gap: PathoraSpacing[12] },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 },
  sectionHeadingText: { flex: 1, gap: 3 },
  eyebrow: {
    fontFamily: PathoraFonts.en.bold,
    color: PathoraColors.teal600,
    fontSize: 10,
    letterSpacing: 1.6,
  },
  sectionTitle: { fontFamily: PathoraFonts.en.extraBold, fontSize: 19, letterSpacing: -0.4, color: PathoraColors.ink900 },
  sectionLinkTouch: { paddingVertical: 5 },
  sectionLink: { fontFamily: PathoraFonts.en.bold, fontSize: 12.5, color: PathoraColors.teal600 },
  metricsRow: { flexDirection: 'row', gap: PathoraSpacing[8] },
  metricCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: PathoraColors.surface,
    borderRadius: PathoraRadius[14],
    borderWidth: 1,
    borderColor: PathoraColors.border,
    paddingHorizontal: PathoraSpacing[12],
    paddingVertical: PathoraSpacing[16],
    minHeight: 112,
    justifyContent: 'center',
    gap: PathoraSpacing[8],
  },
  metricCardAccent: { backgroundColor: '#FFF6E8', borderColor: '#F3DDBA' },
  metricIndicator: { width: 25, height: 4, borderRadius: 999, backgroundColor: PathoraColors.teal500 },
  metricIndicatorAmber: { backgroundColor: PathoraColors.amber500 },
  metricValue: { fontFamily: PathoraFonts.en.extraBold, fontSize: 28, color: PathoraColors.ink900, lineHeight: 32 },
  metricLabel: { fontFamily: PathoraFonts.en.semiBold, fontSize: 11.5, color: PathoraColors.textSecondary },
  whiteCard: {
    borderRadius: PathoraRadius[14],
    backgroundColor: PathoraColors.surface,
    borderColor: PathoraColors.border,
    borderWidth: 1,
  },
  loadingCard: {
    paddingVertical: PathoraSpacing[24],
    paddingHorizontal: PathoraSpacing[20],
    alignItems: 'center',
    gap: PathoraSpacing[8],
  },
  loadingCardLabel: { fontFamily: PathoraFonts.en.medium, color: PathoraColors.textSecondary, fontSize: 12.5, textAlign: 'center' },
  applicantsCard: {
    backgroundColor: PathoraColors.surface,
    borderColor: PathoraColors.border,
    borderWidth: 1,
    borderRadius: PathoraRadius[14],
    paddingVertical: PathoraSpacing[4],
    paddingHorizontal: PathoraSpacing[16],
  },
  applicantDivider: { borderTopWidth: 1, borderTopColor: PathoraColors.border },
  emptyCard: {
    padding: PathoraSpacing[16],
    flexDirection: 'row',
    alignItems: 'center',
    gap: PathoraSpacing[12],
  },
  emptyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PathoraColors.teal100,
  },
  emptyIcon: { fontFamily: PathoraFonts.en.extraBold, fontSize: 20, color: PathoraColors.teal700 },
  emptyTextWrap: { flex: 1, gap: 3 },
  emptyTitle: { fontFamily: PathoraFonts.en.bold, fontSize: 13.5, color: PathoraColors.ink900 },
  emptyDescription: { fontFamily: PathoraFonts.en.regular, fontSize: 12.5, lineHeight: 18, color: PathoraColors.textSecondary },
  emptyInternshipsCard: { padding: PathoraSpacing[20], gap: PathoraSpacing[8] },
  textActionTouch: { alignSelf: 'flex-start', paddingVertical: 5 },
  inlineAction: { fontFamily: PathoraFonts.en.bold, color: PathoraColors.teal600, fontSize: 12.5 },
  internshipCard: {
    backgroundColor: PathoraColors.surface,
    borderWidth: 1,
    borderColor: PathoraColors.border,
    borderRadius: PathoraRadius[14],
    paddingHorizontal: PathoraSpacing[16],
    paddingVertical: PathoraSpacing[4],
  },
  internshipRow: { flexDirection: 'row', alignItems: 'center', gap: PathoraSpacing[12], paddingVertical: PathoraSpacing[14] },
  roleIconBox: { width: 41, height: 41, borderRadius: PathoraRadius[12], backgroundColor: PathoraColors.teal100, alignItems: 'center', justifyContent: 'center' },
  internshipInfo: { flex: 1, gap: 3 },
  internshipTitle: { fontFamily: PathoraFonts.en.bold, fontSize: 14, color: PathoraColors.ink900 },
  internshipMeta: { fontFamily: PathoraFonts.en.medium, color: PathoraColors.textSecondary, fontSize: 12 },
  internshipDeadline: { fontFamily: PathoraFonts.en.medium, color: PathoraColors.teal600, fontSize: 11.5 },
  chevron: { fontFamily: PathoraFonts.en.medium, fontSize: 26, color: PathoraColors.textTertiary },
  footerText: { textAlign: 'center', fontFamily: PathoraFonts.en.medium, fontSize: 10.5, color: PathoraColors.textTertiary, marginTop: 2 },
  errorTitle: { textAlign: 'center', fontFamily: PathoraFonts.en.bold, fontSize: 18, color: PathoraColors.ink900 },
  errorText: { textAlign: 'center', fontFamily: PathoraFonts.en.medium, fontSize: 13.5, color: PathoraColors.error },
  retryButton: { maxWidth: 170, marginTop: PathoraSpacing[12] },
});
