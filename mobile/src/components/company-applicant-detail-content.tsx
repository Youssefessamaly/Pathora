import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';

import { ApplicationDetailCard, ApplicationDetailText } from '@/components/application-polish';
import { ApplicationStatusBadge } from '@/components/application-status-badge';
import { AuthBackButton } from '@/components/auth-back-button';
import { PathoraButton } from '@/components/pathora-button';
import { PathoraColors, PathoraFonts } from '@/constants/pathora-theme';
import { useAuth } from '@/context/auth-context';
import {
  ApiError, downloadCompanyApplicationCv, getCompanyApplicationDetail, updateCompanyApplicationStatus,
  type AcademicLevel, type CompanyApplicationDecision, type CompanyApplicationDetail,
} from '@/lib/api';
import { formatDisplayDate } from '@/lib/date';
import { initialsForName } from '@/lib/initials';
import { describeOnboardingError } from '@/lib/onboarding';

const ACADEMIC_LEVEL_LABELS: Record<AcademicLevel, string> = { HIGH_SCHOOL: 'High school', UNIVERSITY: 'University' };
function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  const kb = sizeBytes / 1024;
  return kb < 1024 ? `${kb.toFixed(kb < 10 ? 1 : 0)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

function SkillChips({ names, detected = false }: { names: string[]; detected?: boolean }) {
  return (
    <View style={styles.chips}>
      {names.map((name) => (
        <View key={name} style={[styles.skillChip, detected && styles.detectedChip]}>
          <Text style={[styles.skillText, detected && styles.detectedText]}>{name}</Text>
        </View>
      ))}
    </View>
  );
}

/** Uses only the existing authenticated applicant detail, CV snapshot and decision APIs. */
export function CompanyApplicantDetailContent({ internshipId, applicationId }: { internshipId: string; applicationId: string }) {
  const router = useRouter();
  const { token } = useAuth();
  const [application, setApplication] = useState<CompanyApplicationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isDeciding, setIsDeciding] = useState(false);
  const [isOpeningCv, setIsOpeningCv] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getCompanyApplicationDetail(token, internshipId, applicationId);
      setApplication(data); setError(null); setNotFound(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) { setNotFound(true); setError(null); }
      else { setError(describeOnboardingError(err)); setNotFound(false); }
    }
  }, [token, internshipId, applicationId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const handleDecision = (decision: CompanyApplicationDecision) => {
    if (!token || isDeciding) return;
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
            } catch (err) {
              if (err instanceof ApiError && err.status === 409) {
                await load();
                Alert.alert('Already decided', 'This application was already decided.');
              } else Alert.alert('Something went wrong', describeOnboardingError(err));
            } finally { setIsDeciding(false); }
          },
        },
      ],
    );
  };

  const handleViewCv = async () => {
    if (!token || !application || isOpeningCv) return;
    setIsOpeningCv(true);
    try {
      const file = await downloadCompanyApplicationCv(token, internshipId, applicationId, application.cv.fileName);
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) { Alert.alert('Not supported', 'Viewing files is not supported on this device.'); return; }
      await Sharing.shareAsync(file.uri, { mimeType: application.cv.contentType, dialogTitle: 'View CV' });
    } catch (err) { Alert.alert('Something went wrong', describeOnboardingError(err)); }
    finally { setIsOpeningCv(false); }
  };

  if (notFound || error || !application) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <AuthBackButton onPress={() => router.back()} style={styles.backButton} />
        <View style={styles.center}>
          {notFound ? (
            <><Text style={styles.stateTitle}>This application is unavailable</Text><Text style={styles.stateBody}>It may have been removed, or may not belong to your account.</Text></>
          ) : error ? (
            <><Text style={styles.stateBody}>{error}</Text><PathoraButton label="Try again" variant="secondary" onPress={() => void load()} style={styles.retry} /></>
          ) : <ActivityIndicator size="large" color={PathoraColors.teal600} />}
        </View>
      </SafeAreaView>
    );
  }

  const applicant = application.applicant;
  const applicantName = [applicant?.firstName, applicant?.lastName].filter(Boolean).join(' ') || 'Unknown applicant';
  const manualSkills = applicant?.skills.map((skill) => skill.name) ?? [];
  const detectedSkills = applicant?.cvDetectedSkills.map((skill) => skill.name) ?? [];
  const isApplied = application.status === 'APPLIED';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AuthBackButton onPress={() => router.back()} style={styles.backButton} />
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>CANDIDATE REVIEW</Text>
          <Text style={styles.headingTitle}>Application details<Text style={styles.dot}>.</Text></Text>
          <Text style={styles.subheading}>Review the candidate and their submission.</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initialsForName(applicantName)}</Text></View>
            <View style={styles.profileIdentity}>
              <Text style={styles.profileName} numberOfLines={2}>{applicantName}</Text>
              <Text style={styles.profileRole} numberOfLines={2}>{application.internshipTitle ?? 'Internship no longer available'}</Text>
            </View>
          </View>
          <View style={styles.statusRow}>
            <ApplicationStatusBadge status={application.status} />
            <Text style={styles.dateText}>Applied {formatDisplayDate(application.appliedAt)}</Text>
          </View>
        </View>

        <ApplicationDetailCard label="Academic background">
          {applicant?.institutionName && <ApplicationDetailText>{applicant.institutionName}</ApplicationDetailText>}
          {applicant?.major && <ApplicationDetailText muted>{applicant.major}</ApplicationDetailText>}
          {applicant?.academicLevel && <ApplicationDetailText muted>{ACADEMIC_LEVEL_LABELS[applicant.academicLevel]}{applicant.academicLevel === 'UNIVERSITY' && applicant.academicYear !== null ? ` · Year ${applicant.academicYear}` : ''}</ApplicationDetailText>}
          {applicant?.expectedGraduationYear && <ApplicationDetailText muted>Graduating {applicant.expectedGraduationYear}</ApplicationDetailText>}
          {!applicant && <ApplicationDetailText muted>Applicant profile unavailable</ApplicationDetailText>}
          {applicant && !applicant.institutionName && !applicant.major && !applicant.academicLevel && !applicant.expectedGraduationYear && <ApplicationDetailText muted>No academic details provided.</ApplicationDetailText>}
        </ApplicationDetailCard>

        {(manualSkills.length > 0 || detectedSkills.length > 0) && (
          <ApplicationDetailCard label="Candidate skills">
            {manualSkills.length > 0 && <><Text style={styles.minorHeading}>Profile skills</Text><SkillChips names={manualSkills} /></>}
            {detectedSkills.length > 0 && <>
              <Text style={styles.minorHeading}>Detected in submitted CV</Text>
              <SkillChips names={detectedSkills} detected />
            </>}
          </ApplicationDetailCard>
        )}

        <ApplicationDetailCard label="Submitted CV">
          <View style={styles.cvRow}>
            <View style={styles.cvIcon}><SymbolView name={{ ios: 'doc.text', android: 'description', web: 'description' }} size={24} tintColor={PathoraColors.teal700} /></View>
            <View style={styles.cvCopy}>
              <Text style={styles.cvFile} numberOfLines={2}>{application.cv.fileName}</Text>
              <Text style={styles.cvMeta}>{formatFileSize(application.cv.sizeBytes)} · Uploaded {formatDisplayDate(application.cv.uploadedAt)}</Text>
            </View>
          </View>
          <PathoraButton label={isOpeningCv ? 'Opening…' : 'View CV'} variant="secondary"
            onPress={() => void handleViewCv()} disabled={isOpeningCv} style={styles.cvButton} />
        </ApplicationDetailCard>

        <ApplicationDetailCard label="Cover letter">
          <ApplicationDetailText muted={!application.coverLetter}>{application.coverLetter || 'No cover letter provided'}</ApplicationDetailText>
        </ApplicationDetailCard>
        {(application.linkedinUrl || application.portfolioUrl) && <ApplicationDetailCard label="Provided links">
          {application.linkedinUrl && <><Text style={styles.minorHeading}>LinkedIn</Text><ApplicationDetailText>{application.linkedinUrl}</ApplicationDetailText></>}
          {application.portfolioUrl && <><Text style={styles.minorHeading}>Portfolio</Text><ApplicationDetailText>{application.portfolioUrl}</ApplicationDetailText></>}
        </ApplicationDetailCard>}

        {application.answers.length > 0 && (
          <ApplicationDetailCard label="Application questions">
            {application.answers.map((answer, index) => <View key={answer.questionId} style={[styles.answer, index > 0 && styles.answerDivider]}>
              <View style={styles.questionRow}>
                <Text style={styles.question}>{answer.questionText}</Text>
                <Text style={styles.required}>{answer.required ? 'Required' : 'Optional'}</Text>
              </View>
              <ApplicationDetailText muted>{answer.answer || 'Not provided'}</ApplicationDetailText>
            </View>)}
          </ApplicationDetailCard>
        )}

        <ApplicationDetailCard label="Application decision">
          {isApplied ? (
            <>
              <Text style={styles.decisionHint}>Review the application carefully. Decisions are final.</Text>
              <View style={styles.actions}>
                <View style={styles.actionButton}>
                  <PathoraButton label="Reject" variant="destructive" onPress={() => handleDecision('REJECTED')} disabled={isDeciding} />
                </View>
                <View style={styles.actionButton}>
                  <PathoraButton label="Accept" variant="success" onPress={() => handleDecision('ACCEPTED')} disabled={isDeciding} />
                </View>
              </View>
            </>
          ) : (
            <View style={styles.decisionDone}>
              <SymbolView name={{ ios: application.status === 'ACCEPTED' ? 'checkmark.circle.fill' : 'xmark.circle.fill',
                android: application.status === 'ACCEPTED' ? 'check_circle' : 'cancel',
                web: application.status === 'ACCEPTED' ? 'check_circle' : 'cancel' }} size={20}
                tintColor={application.status === 'ACCEPTED' ? PathoraColors.success : PathoraColors.error} />
              <Text style={styles.decisionDoneText}>{application.status === 'ACCEPTED' ? 'You accepted this applicant' : 'You rejected this applicant'}</Text>
            </View>
          )}
        </ApplicationDetailCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PathoraColors.paper },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 158, gap: 14 },
  backButton: { alignSelf: 'flex-start', marginLeft: -5 },
  center: { flex: 1, paddingHorizontal: 26, justifyContent: 'center', alignItems: 'center', gap: 14 },
  stateTitle: { fontFamily: PathoraFonts.en.extraBold, color: PathoraColors.ink900, fontSize: 18, textAlign: 'center' },
  stateBody: { fontFamily: PathoraFonts.en.medium, color: PathoraColors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 21 },
  retry: { minWidth: 160 },
  heading: { gap: 6, marginBottom: 4 },
  eyebrow: { fontFamily: PathoraFonts.en.bold, color: PathoraColors.teal600, fontSize: 10, letterSpacing: 1.5 },
  headingTitle: { fontFamily: PathoraFonts.en.extraBold, color: PathoraColors.ink900, fontSize: 26, lineHeight: 35 },
  dot: { color: PathoraColors.teal500 },
  subheading: { fontFamily: PathoraFonts.en.medium, color: PathoraColors.textSecondary, fontSize: 12.5 },
  profileCard: { backgroundColor: PathoraColors.surface, borderRadius: 20, borderWidth: 1,
    borderColor: PathoraColors.border, padding: 19, gap: 17 },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 56, height: 56, backgroundColor: PathoraColors.teal100, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: PathoraColors.teal700, fontFamily: PathoraFonts.en.extraBold, fontSize: 20 },
  profileIdentity: { flex: 1, gap: 5 },
  profileName: { fontFamily: PathoraFonts.en.extraBold, fontSize: 18, color: PathoraColors.ink900 },
  profileRole: { fontFamily: PathoraFonts.en.medium, fontSize: 12.5, color: PathoraColors.textSecondary, lineHeight: 18 },
  statusRow: { borderTopWidth: 1, borderTopColor: '#F0EEE9', paddingTop: 13,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  dateText: { color: PathoraColors.textSecondary, fontFamily: PathoraFonts.en.medium, fontSize: 11.5 },
  minorHeading: { fontFamily: PathoraFonts.en.bold, fontSize: 12.5, color: PathoraColors.ink900, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  skillChip: { borderRadius: 99, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: PathoraColors.teal100 },
  detectedChip: { backgroundColor: '#F0F2F2' },
  skillText: { color: PathoraColors.teal700, fontSize: 12, fontFamily: PathoraFonts.en.semiBold },
  detectedText: { color: PathoraColors.textSecondary },
  cvRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cvIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: PathoraColors.teal100, justifyContent: 'center', alignItems: 'center' },
  cvCopy: { flex: 1, gap: 3 },
  cvFile: { color: PathoraColors.ink900, fontFamily: PathoraFonts.en.bold, fontSize: 13.5 },
  cvMeta: { color: PathoraColors.textSecondary, fontFamily: PathoraFonts.en.medium, fontSize: 11.5 },
  cvButton: { marginTop: 4 },
  answer: { gap: 7 },
  answerDivider: { borderTopWidth: 1, borderTopColor: '#F0EEE9', paddingTop: 12, marginTop: 5 },
  questionRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  question: { fontFamily: PathoraFonts.en.bold, color: PathoraColors.ink900, fontSize: 13, lineHeight: 20, flex: 1 },
  required: { fontFamily: PathoraFonts.en.bold, fontSize: 10, color: PathoraColors.textTertiary, marginTop: 2 },
  decisionHint: { fontFamily: PathoraFonts.en.medium, fontSize: 12.5, lineHeight: 20, color: PathoraColors.textSecondary },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionButton: { flex: 1 },
  decisionDone: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  decisionDoneText: { fontFamily: PathoraFonts.en.bold, fontSize: 13.5, color: PathoraColors.ink900, flex: 1 },
});
