import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApplicationStatusBadge } from '@/components/application-status-badge';
import { AuthBackButton } from '@/components/auth-back-button';
import { OnboardingGuard } from '@/components/onboarding/onboarding-guard';
import { PathoraButton } from '@/components/pathora-button';
import { PathoraColors, PathoraFonts, PathoraRadius, PathoraSpacing } from '@/constants/pathora-theme';
import { useAuth } from '@/context/auth-context';
import { getInternApplication, type InternApplication } from '@/lib/api';
import { formatDisplayDate } from '@/lib/date';
import { describeOnboardingError } from '@/lib/onboarding';

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardValue}>{value}</Text>
    </View>
  );
}

/**
 * A single application's full detail — GET /intern/applications/{id} is the only data
 * source. The question/answer snapshots rendered below come entirely from
 * application.answers (question text/type/required/order as the backend snapshotted them at
 * submission time) — the current live internship questions are never fetched here, so an
 * old application always stays historically accurate even if the company later edits or
 * deletes its questions.
 */
function ApplicationDetailsScreen({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const { token } = useAuth();

  const [application, setApplication] = useState<InternApplication | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }
    try {
      const data = await getInternApplication(token, applicationId);
      setApplication(data);
      setError(null);
    } catch (loadError) {
      setError(describeOnboardingError(loadError));
    }
  }, [token, applicationId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <AuthBackButton onPress={() => router.back()} style={styles.backButton} />
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
          <PathoraButton label="Try again" variant="secondary" onPress={load} style={styles.retryButton} />
        </View>
      </SafeAreaView>
    );
  }

  if (!application) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <AuthBackButton onPress={() => router.back()} style={styles.backButton} />
        <View style={styles.centerContent}>
          <ActivityIndicator color={PathoraColors.teal600} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AuthBackButton onPress={() => router.back()} style={styles.backButton} />

        <View style={styles.headerRow}>
          <Text style={styles.title}>{application.internshipTitle ?? 'Internship no longer available'}</Text>
          <ApplicationStatusBadge status={application.status} />
        </View>
        <Text style={styles.companyName}>{application.companyName ?? 'Unknown company'}</Text>
        <Text style={styles.appliedDate}>Applied {formatDisplayDate(application.appliedAt)}</Text>

        <InfoCard label="CV" value={application.cvFileName} />

        <InfoCard label="Cover letter" value={application.coverLetter ?? 'No cover letter provided'} />

        {application.linkedinUrl && <InfoCard label="LinkedIn" value={application.linkedinUrl} />}

        {application.portfolioUrl && <InfoCard label="Portfolio" value={application.portfolioUrl} />}

        {application.answers.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Application questions</Text>
            {application.answers.map((answer) => (
              <View key={answer.questionId} style={styles.answerBlock}>
                <Text style={styles.questionText}>{answer.questionText}</Text>
                <Text style={styles.answerText}>{answer.answer || 'Not provided'}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function ApplicationDetailsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <OnboardingGuard>{id ? <ApplicationDetailsScreen applicationId={id} /> : null}</OnboardingGuard>;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PathoraColors.paper,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: PathoraSpacing[24],
    paddingBottom: PathoraSpacing[24],
  },
  backButton: {
    marginTop: 8,
    marginBottom: PathoraSpacing[24],
    alignSelf: 'flex-start',
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: PathoraSpacing[12],
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 20,
    color: PathoraColors.ink900,
  },
  companyName: {
    fontFamily: PathoraFonts.en.medium,
    fontSize: 14,
    color: PathoraColors.textSecondary,
    marginBottom: 4,
  },
  appliedDate: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 12.5,
    color: PathoraColors.textTertiary,
    marginBottom: PathoraSpacing[20],
  },
  card: {
    borderRadius: PathoraRadius[14],
    backgroundColor: PathoraColors.surface,
    borderWidth: 1,
    borderColor: PathoraColors.border,
    padding: PathoraSpacing[16],
    marginBottom: PathoraSpacing[16],
  },
  cardLabel: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: PathoraColors.textTertiary,
    marginBottom: 6,
  },
  cardValue: {
    fontFamily: PathoraFonts.en.semiBold,
    fontSize: 14.5,
    lineHeight: 21,
    color: PathoraColors.ink900,
  },
  answerBlock: {
    marginTop: 10,
    gap: 4,
  },
  questionText: {
    fontFamily: PathoraFonts.en.semiBold,
    fontSize: 13,
    color: PathoraColors.ink900,
  },
  answerText: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 13.5,
    lineHeight: 19,
    color: PathoraColors.textSecondary,
  },
});
