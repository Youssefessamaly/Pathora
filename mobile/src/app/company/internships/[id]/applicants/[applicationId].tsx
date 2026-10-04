import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';

import { ApplicationStatusBadge } from '@/components/application-status-badge';
import { AuthBackButton } from '@/components/auth-back-button';
import { OnboardingGuard } from '@/components/onboarding/onboarding-guard';
import { PathoraButton } from '@/components/pathora-button';
import { PathoraColors, PathoraFonts, PathoraRadius, PathoraSpacing } from '@/constants/pathora-theme';
import { useAuth } from '@/context/auth-context';
import {
  ApiError,
  downloadCompanyApplicationCv,
  getCompanyApplicationDetail,
  updateCompanyApplicationStatus,
  type AcademicLevel,
  type CompanyApplicationDecision,
  type CompanyApplicationDetail,
} from '@/lib/api';
import { formatDisplayDate } from '@/lib/date';
import { describeOnboardingError } from '@/lib/onboarding';

const ACADEMIC_LEVEL_LABELS: Record<AcademicLevel, string> = {
  HIGH_SCHOOL: 'High school',
  UNIVERSITY: 'University',
};

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }
  const kb = sizeBytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  }
  return `${(kb / 1024).toFixed(1)} MB`;
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardValue}>{value}</Text>
    </View>
  );
}

function SkillChips({ names }: { names: string[] }) {
  return (
    <View style={styles.chipsWrap}>
      {names.map((name) => (
        <View key={name} style={styles.skillChip}>
          <Text style={styles.skillChipText}>{name}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * The company's full view of a single application — GET
 * .../applications/{applicationId} is the only data source, re-fetched on every focus. The
 * question/answer snapshots rendered below come entirely from application.answers (the
 * immutable snapshot taken at submission time) — the internship's current live application
 * questions are never fetched here, so a historical application always stays accurate even if
 * the company later edits or deletes its questions.
 */
function ApplicantDetailScreen({ internshipId, applicationId }: { internshipId: string; applicationId: string }) {
  const router = useRouter();
  const { token } = useAuth();

  const [application, setApplication] = useState<CompanyApplicationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isDeciding, setIsDeciding] = useState(false);
  const [isOpeningCv, setIsOpeningCv] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }
    try {
      const data = await getCompanyApplicationDetail(token, internshipId, applicationId);
      setApplication(data);
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
  }, [token, internshipId, applicationId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleDecision = (decision: CompanyApplicationDecision) => {
    if (!token || isDeciding) {
      return;
    }

    const isAccept = decision === 'ACCEPTED';

    Alert.alert(
      isAccept ? 'Accept applicant?' : 'Reject applicant?',
      isAccept ? 'Accept this application?' : 'Reject this application?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isAccept ? 'Accept' : 'Reject',
          style: isAccept ? 'default' : 'destructive',
          onPress: async () => {
            setIsDeciding(true);
            try {
              const updated = await updateCompanyApplicationStatus(token, internshipId, applicationId, decision);
              setApplication(updated);
            } catch (decisionError) {
              if (decisionError instanceof ApiError && decisionError.status === 409) {
                // Someone else (or this company, from another device) already decided this
                // application — re-fetch so the screen reflects the real current status rather
                // than silently ignoring the tap.
                await load();
                Alert.alert('Already decided', 'This application was already decided.');
              } else {
                Alert.alert('Something went wrong', describeOnboardingError(decisionError));
              }
            } finally {
              setIsDeciding(false);
            }
          },
        },
      ],
    );
  };

  const handleViewCv = async () => {
    if (!token || !application || isOpeningCv) {
      return;
    }
    setIsOpeningCv(true);
    try {
      const file = await downloadCompanyApplicationCv(token, internshipId, applicationId, application.cv.fileName);
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Not supported', 'Viewing files is not supported on this device.');
        return;
      }
      await Sharing.shareAsync(file.uri, {
        mimeType: application.cv.contentType,
        dialogTitle: 'View CV',
      });
    } catch (downloadError) {
      Alert.alert('Something went wrong', describeOnboardingError(downloadError));
    } finally {
      setIsOpeningCv(false);
    }
  };

  if (notFound) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <AuthBackButton onPress={() => router.back()} style={styles.backButton} />
        <View style={styles.centerContent}>
          <Text style={styles.errorTitle}>This application is unavailable</Text>
          <Text style={styles.errorBody}>It may have been removed, or it may not belong to your account.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <AuthBackButton onPress={() => router.back()} style={styles.backButton} />
        <View style={styles.centerContent}>
          <Text style={styles.errorBody}>{error}</Text>
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

  const applicant = application.applicant;
  const applicantName = [applicant?.firstName, applicant?.lastName].filter(Boolean).join(' ');
  const manualSkillNames = applicant?.skills.map((skill) => skill.name) ?? [];
  const cvDetectedSkillNames = applicant?.cvDetectedSkills.map((skill) => skill.name) ?? [];
  const isApplied = application.status === 'APPLIED';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AuthBackButton onPress={() => router.back()} style={styles.backButton} />

        <View style={styles.headerRow}>
          <Text style={styles.title}>{application.internshipTitle ?? 'Internship no longer available'}</Text>
          <ApplicationStatusBadge status={application.status} />
        </View>
        <Text style={styles.appliedDate}>Applied {formatDisplayDate(application.appliedAt)}</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Applicant</Text>
          <Text style={styles.cardValue}>{applicantName || 'Unknown applicant'}</Text>
          {applicant?.institutionName && <Text style={styles.cardLineSecondary}>{applicant.institutionName}</Text>}
          {applicant?.academicLevel && (
            <Text style={styles.cardLineSecondary}>{ACADEMIC_LEVEL_LABELS[applicant.academicLevel]}</Text>
          )}
          {applicant?.major && <Text style={styles.cardLineSecondary}>{applicant.major}</Text>}
          {applicant?.academicLevel === 'UNIVERSITY' && applicant.academicYear !== null && (
            <Text style={styles.cardLineSecondary}>Year {applicant.academicYear}</Text>
          )}
          {applicant?.expectedGraduationYear && (
            <Text style={styles.cardLineSecondary}>Graduating {applicant.expectedGraduationYear}</Text>
          )}
        </View>

        {(manualSkillNames.length > 0 || cvDetectedSkillNames.length > 0) && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Skills</Text>
            {manualSkillNames.length > 0 && <SkillChips names={manualSkillNames} />}

            {cvDetectedSkillNames.length > 0 && (
              <View style={styles.detectedSkillsBlock}>
                <Text style={styles.detectedSkillsLabel}>Detected from CV</Text>
                <SkillChips names={cvDetectedSkillNames} />
              </View>
            )}
          </View>
        )}

        <InfoCard label="Cover letter" value={application.coverLetter ?? 'No cover letter provided'} />

        {application.linkedinUrl && <InfoCard label="LinkedIn" value={application.linkedinUrl} />}

        {application.portfolioUrl && <InfoCard label="Portfolio" value={application.portfolioUrl} />}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>CV</Text>
          <Text style={styles.cardValue}>{application.cv.fileName}</Text>
          <Text style={styles.cardLineSecondary}>
            {formatFileSize(application.cv.sizeBytes)} · Uploaded {formatDisplayDate(application.cv.uploadedAt)}
          </Text>
          <PathoraButton
            label={isOpeningCv ? 'Opening…' : 'View CV'}
            variant="secondary"
            onPress={handleViewCv}
            disabled={isOpeningCv}
            style={styles.cvButton}
          />
        </View>

        {application.answers.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Questions & answers</Text>
            {application.answers.map((answer) => (
              <View key={answer.questionId} style={styles.answerBlock}>
                <View style={styles.questionRow}>
                  <Text style={styles.questionText}>{answer.questionText}</Text>
                  <Text style={styles.requiredTag}>{answer.required ? 'Required' : 'Optional'}</Text>
                </View>
                <Text style={styles.answerText}>{answer.answer || 'Not provided'}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {isApplied ? (
        <View style={styles.footer}>
          <PathoraButton
            label="Reject"
            variant="destructive"
            onPress={() => handleDecision('REJECTED')}
            disabled={isDeciding}
            style={styles.footerButton}
          />
          <PathoraButton
            label="Accept"
            variant="success"
            onPress={() => handleDecision('ACCEPTED')}
            disabled={isDeciding}
            style={styles.footerButton}
          />
        </View>
      ) : (
        <View style={styles.decidedFooter}>
          <Text
            style={[
              styles.decidedFooterText,
              application.status === 'ACCEPTED' ? styles.decidedFooterTextAccepted : styles.decidedFooterTextRejected,
            ]}>
            {application.status === 'ACCEPTED' ? 'You accepted this applicant' : 'You rejected this applicant'}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

export default function ApplicantDetailRoute() {
  const { id, applicationId } = useLocalSearchParams<{ id: string; applicationId: string }>();

  return (
    <OnboardingGuard role="COMPANY">
      {id && applicationId ? <ApplicantDetailScreen internshipId={id} applicationId={applicationId} /> : null}
    </OnboardingGuard>
  );
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
  cardLineSecondary: {
    fontFamily: PathoraFonts.en.medium,
    fontSize: 13,
    color: PathoraColors.textSecondary,
    marginTop: 2,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  skillChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: PathoraRadius[999],
    backgroundColor: PathoraColors.teal100,
  },
  skillChipText: {
    fontFamily: PathoraFonts.en.semiBold,
    fontSize: 13,
    color: PathoraColors.teal700,
  },
  detectedSkillsBlock: {
    marginTop: PathoraSpacing[12],
  },
  detectedSkillsLabel: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 11.5,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    color: PathoraColors.textTertiary,
  },
  cvButton: {
    marginTop: PathoraSpacing[12],
  },
  answerBlock: {
    marginTop: 10,
    gap: 4,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: PathoraSpacing[12],
  },
  questionText: {
    flex: 1,
    fontFamily: PathoraFonts.en.semiBold,
    fontSize: 13,
    color: PathoraColors.ink900,
  },
  requiredTag: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    color: PathoraColors.textTertiary,
  },
  answerText: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 13.5,
    lineHeight: 19,
    color: PathoraColors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    gap: PathoraSpacing[12],
    paddingHorizontal: PathoraSpacing[24],
    paddingTop: PathoraSpacing[12],
    paddingBottom: PathoraSpacing[16],
    borderTopWidth: 1,
    borderTopColor: PathoraColors.border,
    backgroundColor: PathoraColors.paper,
  },
  footerButton: {
    flex: 1,
  },
  decidedFooter: {
    paddingHorizontal: PathoraSpacing[24],
    paddingTop: PathoraSpacing[12],
    paddingBottom: PathoraSpacing[16],
    borderTopWidth: 1,
    borderTopColor: PathoraColors.border,
    backgroundColor: PathoraColors.paper,
    alignItems: 'center',
  },
  decidedFooterText: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 14,
  },
  decidedFooterTextAccepted: {
    color: PathoraColors.success,
  },
  decidedFooterTextRejected: {
    color: PathoraColors.error,
  },
});
