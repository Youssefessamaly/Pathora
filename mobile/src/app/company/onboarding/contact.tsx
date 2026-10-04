import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthBackButton } from '@/components/auth-back-button';
import { OnboardingGuard } from '@/components/onboarding/onboarding-guard';
import { OnboardingStepHeader } from '@/components/onboarding/onboarding-step-header';
import { PathoraButton } from '@/components/pathora-button';
import { PathoraInput } from '@/components/pathora-input';
import { PathoraColors, PathoraFonts, PathoraSpacing } from '@/constants/pathora-theme';
import { useAuth } from '@/context/auth-context';
import { completeCompanyOnboarding, getCompanyProfileOrNull, updateCompanyProfile } from '@/lib/api';
import { describeOnboardingError, getOnboardingMissingFields, resolveCompanyPostAuthRoute } from '@/lib/onboarding';

const EGYPT_PHONE_PATTERN = /^(01[0125]\d{8}|\+201[0125]\d{8})$/;

function CompanyContactScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
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
        setContactName(profile.contactName ?? '');
        setContactPhone(profile.contactPhone ?? '');
      } catch {
        // Best-effort prefill only — leave fields blank if it fails.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const isPhoneValid = EGYPT_PHONE_PATTERN.test(contactPhone.trim());
  const canFinish = contactName.trim().length > 0 && isPhoneValid;

  const handleBack = () => {
    router.replace('/company/onboarding/details');
  };

  const handleFinish = async () => {
    if (!canFinish || isSubmitting || !token) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await updateCompanyProfile(token, {
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
      });

      // Onboarding is only marked complete once the backend confirms it — a failure here
      // (e.g. the backend still finds required fields missing) must not navigate away.
      await completeCompanyOnboarding(token);

      // Completing onboarding never lands directly on the dashboard anymore — a brand-new
      // company is still PENDING at this point, so the shared resolver sends it to the
      // approval-pending screen instead (and APPROVED/REJECTED are still handled correctly
      // for the rarer case of a company revisiting this step after already being decided).
      router.replace(await resolveCompanyPostAuthRoute(token));
    } catch (error) {
      const missingFields = getOnboardingMissingFields(error);
      setSubmitError(
        missingFields
          ? `Please complete: ${missingFields.join(', ')}`
          : describeOnboardingError(error),
      );
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

          <OnboardingStepHeader step={3} heading="Contact person" />

          <View style={styles.fields}>
            <PathoraInput
              label="Contact name"
              value={contactName}
              onChangeText={setContactName}
              placeholder="Sara Ahmed"
              autoCapitalize="words"
              textContentType="name"
            />

            <PathoraInput
              label="Contact phone"
              value={contactPhone}
              onChangeText={setContactPhone}
              placeholder="01012345678"
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
            />
          </View>

          {submitError && <Text style={styles.submitError}>{submitError}</Text>}

          <PathoraButton
            label={isSubmitting ? 'Finishing…' : 'Finish'}
            variant="primary"
            onPress={handleFinish}
            disabled={!canFinish || isSubmitting}
            style={styles.finishButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function CompanyContactRoute() {
  return (
    <OnboardingGuard role="COMPANY">
      <CompanyContactScreen />
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
  finishButton: {
    marginBottom: PathoraSpacing[24],
  },
});
