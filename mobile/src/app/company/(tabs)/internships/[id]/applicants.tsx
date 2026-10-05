import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApplicationStatusBadge } from '@/components/application-status-badge';
import { AuthBackButton } from '@/components/auth-back-button';
import { OnboardingGuard } from '@/components/onboarding/onboarding-guard';
import { PathoraButton } from '@/components/pathora-button';
import { PathoraColors, PathoraFonts, PathoraRadius, PathoraSpacing } from '@/constants/pathora-theme';
import { useAuth } from '@/context/auth-context';
import {
  ApiError,
  getCompanyInternshipApplications,
  type AcademicLevel,
  type CompanyApplicationListItem,
} from '@/lib/api';
import { formatDisplayDate } from '@/lib/date';
import { describeOnboardingError } from '@/lib/onboarding';

const ACADEMIC_LEVEL_LABELS: Record<AcademicLevel, string> = {
  HIGH_SCHOOL: 'High school',
  UNIVERSITY: 'University',
};

function applicantMetaLine(application: CompanyApplicationListItem): string | null {
  const parts = [
    application.institutionName,
    application.academicLevel ? ACADEMIC_LEVEL_LABELS[application.academicLevel] : null,
    application.major,
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(' · ') : null;
}

function ApplicantCard({ application, onPress }: { application: CompanyApplicationListItem; onPress: () => void }) {
  const metaLine = applicantMetaLine(application);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {application.applicantName ?? 'Unknown applicant'}
          </Text>
          {metaLine && (
            <Text style={styles.cardMeta} numberOfLines={1}>
              {metaLine}
            </Text>
          )}
        </View>
        <ApplicationStatusBadge status={application.status} />
      </View>
      <Text style={styles.cardDate}>Applied {formatDisplayDate(application.appliedAt)}</Text>
    </Pressable>
  );
}

/**
 * The company's applicant list for one of its own internships — GET
 * /company/internships/{internshipId}/applications is the single source of truth, re-fetched
 * on every focus (e.g. returning here right after deciding an applicant) so the list never
 * shows a status this screen itself cached from before.
 */
function ApplicantsScreen({ internshipId }: { internshipId: string }) {
  const router = useRouter();
  const { token } = useAuth();

  const [applications, setApplications] = useState<CompanyApplicationListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }
    try {
      const data = await getCompanyInternshipApplications(token, internshipId);
      setApplications(data);
      setError(null);
      setNotFound(false);
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.status === 404) {
        setNotFound(true);
        setError(null);
      } else {
        setError(describeOnboardingError(loadError));
      }
    }
  }, [token, internshipId]);

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
      <AuthBackButton onPress={() => router.back()} style={styles.backButton} />
      <Text style={styles.title}>Applicants</Text>

      {applications === null && !error && !notFound && (
        <View style={styles.centerContent}>
          <ActivityIndicator color={PathoraColors.teal600} />
        </View>
      )}

      {notFound && (
        <View style={styles.centerContent}>
          <Text style={styles.errorTitle}>This internship is unavailable</Text>
          <Text style={styles.errorBody}>It may have been removed, or it may not belong to your account.</Text>
        </View>
      )}

      {error && !notFound && (
        <View style={styles.centerContent}>
          <Text style={styles.errorBody}>{error}</Text>
          <PathoraButton label="Try again" variant="secondary" onPress={load} style={styles.retryButton} />
        </View>
      )}

      {applications !== null && !error && !notFound && applications.length === 0 && (
        <ScrollView
          contentContainerStyle={styles.emptyContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
          <Text style={styles.emptyTitle}>No applicants yet</Text>
          <Text style={styles.emptyBody}>Applications submitted through Pathora will appear here.</Text>
        </ScrollView>
      )}

      {applications !== null && !error && !notFound && applications.length > 0 && (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
          {applications.map((application) => (
            <ApplicantCard
              key={application.applicationId}
              application={application}
              onPress={() =>
                router.push({
                  pathname: '/company/internships/[id]/applicants/[applicationId]',
                  params: { id: internshipId, applicationId: application.applicationId },
                })
              }
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

export default function ApplicantsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <OnboardingGuard role="COMPANY">{id ? <ApplicantsScreen internshipId={id} /> : null}</OnboardingGuard>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PathoraColors.paper,
  },
  backButton: {
    marginTop: 8,
    marginLeft: PathoraSpacing[24] - 6,
    alignSelf: 'flex-start',
  },
  title: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 22,
    color: PathoraColors.ink900,
    paddingHorizontal: PathoraSpacing[24],
    paddingTop: PathoraSpacing[16],
    paddingBottom: PathoraSpacing[16],
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: PathoraSpacing[24],
    gap: PathoraSpacing[16],
  },
  errorTitle: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 16,
    color: PathoraColors.ink900,
    textAlign: 'center',
  },
  errorBody: {
    fontFamily: PathoraFonts.en.medium,
    fontSize: 14,
    lineHeight: 20,
    color: PathoraColors.textSecondary,
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
    gap: PathoraSpacing[12],
  },
  card: {
    borderRadius: PathoraRadius[14],
    backgroundColor: PathoraColors.surface,
    borderWidth: 1,
    borderColor: PathoraColors.border,
    padding: PathoraSpacing[16],
    marginBottom: PathoraSpacing[12],
  },
  cardPressed: {
    opacity: 0.7,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: PathoraSpacing[12],
    marginBottom: 6,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 15,
    color: PathoraColors.ink900,
  },
  cardMeta: {
    fontFamily: PathoraFonts.en.medium,
    fontSize: 13,
    color: PathoraColors.textSecondary,
    marginTop: 2,
  },
  cardDate: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 12.5,
    color: PathoraColors.textTertiary,
  },
});
