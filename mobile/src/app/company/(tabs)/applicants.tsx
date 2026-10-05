import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApplicantPreviewRow } from '@/components/applicant-preview-row';
import { PathoraButton } from '@/components/pathora-button';
import { PathoraColors, PathoraFonts, PathoraRadius, PathoraSpacing } from '@/constants/pathora-theme';
import { useAuth } from '@/context/auth-context';
import { getCompanyInternships } from '@/lib/api';
import { getAllCompanyApplications, type CompanyApplicantEntry } from '@/lib/company-applicants';
import { describeOnboardingError } from '@/lib/onboarding';

/**
 * The company's applicants across every one of its internships — there is no such endpoint on
 * the backend (only the per-internship GET /company/internships/{id}/applications), so this
 * screen composes getAllCompanyApplications over the company's own internship list. Both
 * dashboard "See all" links land here; the optional `status` param narrows it to exactly the
 * same APPLIED filter the "Applicants requiring review" section itself uses, so the screen the
 * company lands on always matches what they tapped from.
 */
function CompanyApplicantsScreen({ reviewOnly }: { reviewOnly: boolean }) {
  const router = useRouter();
  const { token } = useAuth();

  const [applications, setApplications] = useState<CompanyApplicantEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }
    try {
      const internships = await getCompanyInternships(token);
      const merged = await getAllCompanyApplications(token, internships);
      setApplications(merged);
      setError(null);
    } catch (loadError) {
      setError(describeOnboardingError(loadError));
    }
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

  const visibleApplications = reviewOnly
    ? (applications ?? []).filter((application) => application.status === 'APPLIED')
    : applications;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Text style={styles.title}>{reviewOnly ? 'Applicants requiring review' : 'Applicants'}</Text>

      {applications === null && !error && (
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

      {visibleApplications !== null && !error && visibleApplications.length === 0 && (
        <ScrollView
          contentContainerStyle={styles.emptyContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
          <Text style={styles.emptyTitle}>{reviewOnly ? 'Nothing needs review right now' : 'No applicants yet'}</Text>
          <Text style={styles.emptyBody}>
            {reviewOnly
              ? 'New applicants will show up here.'
              : 'Applicants will appear here once students start applying.'}
          </Text>
        </ScrollView>
      )}

      {visibleApplications !== null && !error && visibleApplications.length > 0 && (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
          {visibleApplications.map((application, index) => (
            <View key={application.applicationId} style={styles.card}>
              <ApplicantPreviewRow
                applicantName={application.applicantName}
                internshipTitle={application.internshipTitle}
                appliedAt={application.appliedAt}
                status={application.status}
                tintIndex={index}
                onPress={() =>
                  router.push({
                    pathname: '/company/internships/[id]/applicants/[applicationId]',
                    params: { id: application.internshipId, applicationId: application.applicationId },
                  })
                }
              />
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

export default function CompanyApplicantsRoute() {
  const { status } = useLocalSearchParams<{ status?: string }>();

  return <CompanyApplicantsScreen reviewOnly={status === 'APPLIED'} />;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PathoraColors.paper,
  },
  title: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 20,
    color: PathoraColors.ink900,
    letterSpacing: -0.2,
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
    paddingBottom: PathoraSpacing[24],
    gap: PathoraSpacing[12],
  },
  card: {
    borderRadius: PathoraRadius[14],
    backgroundColor: PathoraColors.surface,
    borderWidth: 1,
    borderColor: PathoraColors.border,
    paddingHorizontal: PathoraSpacing[16],
    marginBottom: PathoraSpacing[12],
  },
});
