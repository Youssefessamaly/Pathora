import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthBackButton } from '@/components/auth-back-button';
import { OnboardingGuard } from '@/components/onboarding/onboarding-guard';
import { OnboardingOptionGroup } from '@/components/onboarding/onboarding-option-group';
import { OnboardingStepHeader } from '@/components/onboarding/onboarding-step-header';
import { PathoraButton } from '@/components/pathora-button';
import { PathoraInput } from '@/components/pathora-input';
import { PathoraColors, PathoraFonts, PathoraSpacing } from '@/constants/pathora-theme';
import { useAuth } from '@/context/auth-context';
import { getInternProfileOrNull, updateInternProfile, type AcademicLevel } from '@/lib/api';
import { describeOnboardingError } from '@/lib/onboarding';

const ACADEMIC_LEVEL_OPTIONS = [
  { label: 'High school', value: 'HIGH_SCHOOL' },
  { label: 'University', value: 'UNIVERSITY' },
];

const ACADEMIC_YEAR_OPTIONS = ['1', '2', '3', '4', '5', '6'].map((year) => ({ label: year, value: year }));

function EducationScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [institutionName, setInstitutionName] = useState('');
  const [academicLevel, setAcademicLevel] = useState<AcademicLevel | null>(null);
  const [academicYear, setAcademicYear] = useState<string | null>(null);
  const [major, setMajor] = useState('');
  const [expectedGraduationYear, setExpectedGraduationYear] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!token) {
        return;
      }
      try {
        const profile = await getInternProfileOrNull(token);
        if (cancelled || !profile) {
          return;
        }
        setInstitutionName(profile.institutionName ?? '');
        setAcademicLevel(profile.academicLevel);
        setAcademicYear(profile.academicYear ? String(profile.academicYear) : null);
        setMajor(profile.major ?? '');
        setExpectedGraduationYear(
          profile.expectedGraduationYear ? String(profile.expectedGraduationYear) : '',
        );
      } catch {
        // Best-effort prefill only — leave fields blank if it fails.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleChangeAcademicLevel = (value: string) => {
    setAcademicLevel(value as AcademicLevel);
    if (value === 'HIGH_SCHOOL') {
      setAcademicYear(null);
    }
  };

  const canContinue =
    institutionName.trim().length > 0 &&
    academicLevel !== null &&
    major.trim().length > 0 &&
    expectedGraduationYear.length === 4 &&
    (academicLevel !== 'UNIVERSITY' || academicYear !== null);

  const handleBack = () => {
    router.replace('/onboarding/personal');
  };

  const handleContinue = async () => {
    if (!canContinue || isSubmitting || !token || !academicLevel) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await updateInternProfile(token, {
        institutionName: institutionName.trim(),
        academicLevel,
        major: major.trim(),
        expectedGraduationYear: Number(expectedGraduationYear),
        // Omitted (not sent as null) for HIGH_SCHOOL: the backend's PATCH treats an
        // omitted field and an explicit null identically (leaves it untouched), so
        // there is currently no way to clear a previously-set academicYear via PATCH.
        ...(academicLevel === 'UNIVERSITY' && academicYear ? { academicYear: Number(academicYear) } : {}),
      });
      router.push('/onboarding/skills');
    } catch (error) {
      setSubmitError(describeOnboardingError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <AuthBackButton onPress={handleBack} style={styles.backButton} />

          <OnboardingStepHeader step={2} heading="Your education" />

          <View style={styles.fields}>
            <PathoraInput
              label="Educational institution"
              value={institutionName}
              onChangeText={setInstitutionName}
              placeholder="Cairo University"
              autoCapitalize="words"
            />

            <OnboardingOptionGroup
              label="Academic level"
              options={ACADEMIC_LEVEL_OPTIONS}
              value={academicLevel}
              onChange={handleChangeAcademicLevel}
            />

            {academicLevel === 'UNIVERSITY' && (
              <OnboardingOptionGroup
                label="Academic year"
                options={ACADEMIC_YEAR_OPTIONS}
                value={academicYear}
                onChange={setAcademicYear}
              />
            )}

            <PathoraInput
              label="Major / study track"
              value={major}
              onChangeText={setMajor}
              placeholder="Computer Science"
              autoCapitalize="words"
            />

            <PathoraInput
              label="Expected graduation year"
              value={expectedGraduationYear}
              onChangeText={(text) => setExpectedGraduationYear(text.replace(/\D/g, '').slice(0, 4))}
              placeholder="2027"
              keyboardType="number-pad"
            />
          </View>

          {submitError && <Text style={styles.submitError}>{submitError}</Text>}

          <PathoraButton
            label={isSubmitting ? 'Saving…' : 'Continue'}
            variant="primary"
            onPress={handleContinue}
            disabled={!canContinue || isSubmitting}
            style={styles.continueButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function EducationRoute() {
  return (
    <OnboardingGuard>
      <EducationScreen />
    </OnboardingGuard>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PathoraColors.paper,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: PathoraSpacing[24],
  },
  backButton: {
    marginTop: 8,
    marginBottom: PathoraSpacing[24],
    alignSelf: 'flex-start',
  },
  fields: {
    gap: PathoraSpacing[20],
    marginBottom: PathoraSpacing[24],
  },
  submitError: {
    fontFamily: PathoraFonts.en.medium,
    fontSize: 13,
    color: PathoraColors.error,
    marginBottom: PathoraSpacing[16],
  },
  continueButton: {
    marginBottom: PathoraSpacing[24],
  },
});
