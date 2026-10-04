import { useRouter, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApplicantPreviewRow } from '@/components/applicant-preview-row';
import { PathoraButton } from '@/components/pathora-button';
import { PathoraColors, PathoraFonts, PathoraRadius, PathoraSpacing } from '@/constants/pathora-theme';
import { useAuth } from '@/context/auth-context';
import {
  getCompanyInternships,
  getCompanyProfileOrNull,
  type CompanyInternship,
  type CompanyProfile,
} from '@/lib/api';
import { getAllCompanyApplications, type CompanyApplicantEntry } from '@/lib/company-applicants';
import { describeOnboardingError, resolveCompanyPostAuthRoute } from '@/lib/onboarding';
import { initialsFor } from '@/lib/initials';

const APPLICANT_PREVIEW_COUNT = 3;

/**
 * Client-side gate for the company home: requires an authenticated COMPANY session AND a
 * freshly-verified APPROVED status. The backend independently enforces both on every request
 * regardless of this guard — this exists so a PENDING/REJECTED company (or one still mid
 * onboarding) that lands on /company directly, or via a stale restored route, is bounced to
 * the correct screen instead of seeing a dashboard whose data it can't actually use. Re-checked
 * on every focus (not just first mount) via resolveCompanyPostAuthRoute — the same resolver
 * login and the onboarding-completion screen use — so all entry points can never disagree.
 */
function CompanyHomeGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isInitializing, user, token, signOut } = useAuth();
  const isCompany = user?.role === 'COMPANY';

  const [checkState, setCheckState] = useState<'checking' | 'approved' | 'error'>('checking');

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

  const checkApproval = useCallback(() => {
    if (!token) {
      return;
    }
    setCheckState('checking');
    resolveCompanyPostAuthRoute(token)
      .then((route) => {
        if (route === '/company') {
          setCheckState('approved');
        } else {
          router.replace(route);
        }
      })
      .catch(() => setCheckState('error'));
  }, [token, router]);

  useFocusEffect(
    useCallback(() => {
      if (!isInitializing && isAuthenticated && isCompany) {
        checkApproval();
      }
    }, [isInitializing, isAuthenticated, isCompany, checkApproval]),
  );

  const handleGuardSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  if (isInitializing || !isAuthenticated || !isCompany || checkState === 'checking') {
    return <View style={styles.guardFallback} />;
  }

  if (checkState === 'error') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Unable to verify your account status. Please try again.</Text>
          <PathoraButton label="Try again" variant="secondary" onPress={checkApproval} style={styles.retryButton} />
          <PathoraButton label="Log out" variant="secondary" onPress={handleGuardSignOut} style={styles.retryButton} />
        </View>
      </SafeAreaView>
    );
  }

  return <>{children}</>;
}

function companyInitials(companyName: string | null | undefined, email: string | undefined): string {
  const name = companyName?.trim();
  if (!name) {
    return initialsFor(null, null, email);
  }
  const words = name.split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 2).map((word) => word.charAt(0));
  return (letters.join('') || '?').toUpperCase();
}

function StatCard({
  label,
  value,
  active,
  onPress,
}: {
  label: string;
  value: number;
  active: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.statCard, pressed && onPress && styles.statCardPressed]}>
      <Text style={[styles.statValue, !active && styles.statValueMuted]}>{value}</Text>
      <Text style={[styles.statLabel, !active && styles.statLabelMuted]}>{label}</Text>
    </Pressable>
  );
}

function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onSeeAll && (
        <Pressable onPress={onSeeAll} accessibilityRole="button" hitSlop={8}>
          <Text style={styles.seeAllText}>See all</Text>
        </Pressable>
      )}
    </View>
  );
}

function ApplicantSectionCard({
  applications,
  isLoading,
  emptyTitle,
  emptyBody,
  onApplicantPress,
}: {
  applications: CompanyApplicantEntry[];
  isLoading: boolean;
  emptyTitle: string;
  emptyBody: string;
  onApplicantPress: (application: CompanyApplicantEntry) => void;
}) {
  if (isLoading) {
    return (
      <View style={[styles.sectionCard, styles.sectionCardLoading]}>
        <ActivityIndicator color={PathoraColors.teal600} />
      </View>
    );
  }

  if (applications.length === 0) {
    return (
      <View style={styles.sectionCard}>
        <Text style={styles.sectionEmptyTitle}>{emptyTitle}</Text>
        <Text style={styles.sectionEmptyBody}>{emptyBody}</Text>
      </View>
    );
  }

  return (
    <View style={styles.sectionCard}>
      {applications.map((application, index) => (
        <View
          key={application.applicationId}
          style={index > 0 ? styles.applicantRowDivider : undefined}>
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

function UpcomingInterviewsCard() {
  return (
    <View style={styles.interviewsCard}>
      <View style={styles.interviewsIconRow}>
        <SymbolView
          name={{ ios: 'calendar', android: 'event', web: 'event' }}
          size={18}
          tintColor={PathoraColors.amber600}
        />
        <Text style={styles.interviewsTitle}>No upcoming interviews yet</Text>
      </View>
      <Text style={styles.interviewsBody}>Scheduled interviews will appear here.</Text>
    </View>
  );
}

/**
 * The company home dashboard. Real data sources:
 * - getCompanyInternships -> Active count and the internship titles attached to applicants
 * - getAllCompanyApplications (client-side composition over the existing per-internship
 *   GET /company/internships/{id}/applications — there is no cross-internship backend
 *   endpoint) -> "Applicants requiring review" (status APPLIED) and "Recent applicants"
 * - getCompanyProfileOrNull -> company name for the header/avatar
 * Drafts/Paused and Upcoming interviews have no backing data model yet (InternshipStatus is
 * only OPEN/CLOSED, and there is no interview scheduling feature at all) — they are rendered
 * as explicit, honest empty/passive states rather than invented from CLOSED or faked data.
 */
function CompanyHomeScreen() {
  const router = useRouter();
  const { user, token, signOut } = useAuth();

  const [internships, setInternships] = useState<CompanyInternship[] | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [applications, setApplications] = useState<CompanyApplicantEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }

    let internshipsData: CompanyInternship[];
    try {
      internshipsData = await getCompanyInternships(token);
      setInternships(internshipsData);
      setError(null);
    } catch (loadError) {
      setError(describeOnboardingError(loadError));
      return;
    }

    // Best-effort secondary data for the header and applicant sections — never blocks the
    // stat cards, which only need internshipsData above.
    const [profileResult, applicationsResult] = await Promise.all([
      getCompanyProfileOrNull(token).catch(() => null),
      getAllCompanyApplications(token, internshipsData).catch(() => [] as CompanyApplicantEntry[]),
    ]);
    setCompanyProfile(profileResult);
    setApplications(applicationsResult);
  }, [token]);

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

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  const handleAvatarPress = () => {
    Alert.alert('Account', user?.email, [
      { text: 'Log out', style: 'destructive', onPress: handleSignOut },
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
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.centerContent}>
          <ActivityIndicator color={PathoraColors.teal600} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
          <PathoraButton label="Try again" variant="secondary" onPress={load} style={styles.retryButton} />
        </View>
      </SafeAreaView>
    );
  }

  const activeCount = internships?.filter((internship) => internship.status === 'OPEN').length ?? 0;
  const applicantsLoading = applications === null;
  const applicationsForReview = (applications ?? []).filter((application) => application.status === 'APPLIED');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>
              {companyProfile?.companyName?.trim() || 'Welcome back'}
            </Text>
            <Text style={styles.subtitle}>Here&apos;s what needs your attention.</Text>
          </View>
          <Pressable
            onPress={handleAvatarPress}
            accessibilityRole="button"
            accessibilityLabel="Account"
            style={styles.avatar}>
            <Text style={styles.avatarText}>{companyInitials(companyProfile?.companyName, user?.email)}</Text>
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <StatCard label="Active" value={activeCount} active onPress={() => router.push('/company/internships')} />
          {/* No "draft" state exists in the current internship model (status is only
              OPEN/CLOSED) — shown muted/non-interactive rather than invented. */}
          <StatCard label="Drafts" value={0} active={false} />
          {/* CLOSED is a real status, but it is a distinct, one-way state (no "reopen" action
              exists) — it is not the same concept as "paused," so it is never relabeled here. */}
          <StatCard label="Paused" value={0} active={false} />
        </View>

        <View style={styles.section}>
          <SectionHeader
            title="Applicants requiring review"
            onSeeAll={() => router.push({ pathname: '/company/applicants', params: { status: 'APPLIED' } })}
          />
          <ApplicantSectionCard
            applications={applicationsForReview.slice(0, APPLICANT_PREVIEW_COUNT)}
            isLoading={applicantsLoading}
            emptyTitle="Nothing needs review right now"
            emptyBody="New applicants will show up here."
            onApplicantPress={goToApplicantDetail}
          />
        </View>

        <View style={styles.section}>
          <SectionHeader title="Upcoming interviews" />
          <UpcomingInterviewsCard />
        </View>

        <View style={styles.section}>
          <SectionHeader title="Recent applicants" onSeeAll={() => router.push('/company/applicants')} />
          <ApplicantSectionCard
            applications={(applications ?? []).slice(0, APPLICANT_PREVIEW_COUNT)}
            isLoading={applicantsLoading}
            emptyTitle="No applicants yet"
            emptyBody="Applications submitted through Pathora will appear here."
            onApplicantPress={goToApplicantDetail}
          />
        </View>
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
    paddingTop: 8,
    paddingBottom: PathoraSpacing[32],
    gap: PathoraSpacing[20],
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: PathoraSpacing[12],
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 22,
    color: PathoraColors.ink900,
  },
  subtitle: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 13,
    color: PathoraColors.textSecondary,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: PathoraRadius[999],
    backgroundColor: PathoraColors.ink900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 15,
    color: PathoraColors.surface,
  },
  statsRow: {
    flexDirection: 'row',
    gap: PathoraSpacing[12],
  },
  statCard: {
    flex: 1,
    borderRadius: PathoraRadius[14],
    backgroundColor: PathoraColors.surface,
    borderWidth: 1,
    borderColor: PathoraColors.border,
    paddingVertical: PathoraSpacing[16],
    alignItems: 'center',
    gap: 4,
  },
  statCardPressed: {
    opacity: 0.7,
  },
  statValue: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 20,
    color: PathoraColors.ink900,
  },
  statValueMuted: {
    color: PathoraColors.textTertiary,
  },
  statLabel: {
    fontFamily: PathoraFonts.en.medium,
    fontSize: 12,
    color: PathoraColors.textSecondary,
  },
  statLabelMuted: {
    color: PathoraColors.textTertiary,
  },
  section: {
    gap: PathoraSpacing[12],
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 16,
    color: PathoraColors.ink900,
  },
  seeAllText: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 13,
    color: PathoraColors.teal600,
  },
  sectionCard: {
    borderRadius: PathoraRadius[14],
    backgroundColor: PathoraColors.surface,
    borderWidth: 1,
    borderColor: PathoraColors.border,
    paddingHorizontal: PathoraSpacing[16],
    paddingVertical: PathoraSpacing[8],
  },
  sectionCardLoading: {
    paddingVertical: PathoraSpacing[24],
    alignItems: 'center',
  },
  sectionEmptyTitle: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 14.5,
    color: PathoraColors.ink900,
    paddingTop: PathoraSpacing[12],
  },
  sectionEmptyBody: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 13,
    lineHeight: 19,
    color: PathoraColors.textSecondary,
    paddingBottom: PathoraSpacing[12],
    paddingTop: 2,
  },
  applicantRowDivider: {
    borderTopWidth: 1,
    borderTopColor: PathoraColors.border,
  },
  interviewsCard: {
    borderRadius: PathoraRadius[14],
    backgroundColor: PathoraColors.amber100,
    paddingVertical: PathoraSpacing[16],
    paddingHorizontal: PathoraSpacing[16],
    gap: 4,
  },
  interviewsIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  interviewsTitle: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 14.5,
    color: PathoraColors.amber600,
  },
  interviewsBody: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 13,
    lineHeight: 19,
    color: PathoraColors.amberTextOnTint,
  },
});
