import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OnboardingGuard } from '@/components/onboarding/onboarding-guard';
import { OnboardingOptionGroup } from '@/components/onboarding/onboarding-option-group';
import { OnboardingStepHeader } from '@/components/onboarding/onboarding-step-header';
import { PathoraButton } from '@/components/pathora-button';
import { PathoraInput } from '@/components/pathora-input';
import { PathoraColors, PathoraFonts, PathoraSpacing } from '@/constants/pathora-theme';
import { useAuth } from '@/context/auth-context';
import { getCompanyProfileOrNull, updateCompanyProfile } from '@/lib/api';
import { describeOnboardingError } from '@/lib/onboarding';

const COMPANY_SIZE_OPTIONS = ['1-10', '11-50', '51-200', '201-500', '501+'].map((size) => ({
  label: size,
  value: size,
}));

function CompanyBasicsScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!token) {
        return;
      }
      try {
        const profile = await getCompanyProfileOrNull(token);
        if (cancelled || !profile) {
          return;
        }
        setCompanyName(profile.companyName ?? '');
        setIndustry(profile.industry ?? '');
        setCompanySize(profile.companySize);
      } catch {
        // Best-effort prefill only — leave fields blank if it fails.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const canContinue =
    companyName.trim().length > 0 && industry.trim().length > 0 && companySize !== null;

  const handleContinue = async () => {
    if (!canContinue || isSubmitting || !token) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await updateCompanyProfile(token, {
        companyName: companyName.trim(),
        industry: industry.trim(),
        companySize: companySize ?? undefined,
      });
      router.push('/company/onboarding/details');
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
          <OnboardingStepHeader step={1} heading="Tell us about your company" />

          <View style={styles.fields}>
            <PathoraInput
              label="Company name"
              value={companyName}
              onChangeText={setCompanyName}
              placeholder="Pathora Technologies"
              autoCapitalize="words"
            />

            <PathoraInput
              label="Industry"
              value={industry}
              onChangeText={setIndustry}
              placeholder="Software"
              autoCapitalize="words"
            />

            <OnboardingOptionGroup
              label="Company size"
              options={COMPANY_SIZE_OPTIONS}
              value={companySize}
              onChange={setCompanySize}
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

export default function CompanyBasicsRoute() {
  return (
    <OnboardingGuard role="COMPANY">
      <CompanyBasicsScreen />
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
    paddingTop: PathoraSpacing[24],
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
