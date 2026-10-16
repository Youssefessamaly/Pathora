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
import { getInternProfileOrNull, updateInternProfile } from '@/lib/api';
import { describeOnboardingError } from '@/lib/onboarding';

const EGYPT_PHONE_PATTERN = /^(01[0125]\d{8}|\+201[0125]\d{8})$/;

type ParsedDateOfBirth = { iso: string; error: null } | { iso: null; error: string };

function parseDateOfBirth(day: string, month: string, year: string): ParsedDateOfBirth {
  if (!day || !month || !year || year.length < 4) {
    return { iso: null, error: 'Enter your full date of birth.' };
  }

  const dayNum = Number(day);
  const monthNum = Number(month);
  const yearNum = Number(year);

  const candidate = new Date(Date.UTC(yearNum, monthNum - 1, dayNum));
  const isRealDate =
    candidate.getUTCFullYear() === yearNum &&
    candidate.getUTCMonth() === monthNum - 1 &&
    candidate.getUTCDate() === dayNum;

  if (!isRealDate) {
    return { iso: null, error: 'Enter a valid date of birth.' };
  }

  if (candidate.getTime() >= Date.now()) {
    return { iso: null, error: 'Date of birth must be in the past.' };
  }

  const iso = `${yearNum.toString().padStart(4, '0')}-${monthNum.toString().padStart(2, '0')}-${dayNum
    .toString()
    .padStart(2, '0')}`;

  return { iso, error: null };
}

function PersonalDetailsScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
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
        setFirstName(profile.firstName ?? '');
        setLastName(profile.lastName ?? '');
        setPhoneNumber(profile.phoneNumber ?? '');
        if (profile.dateOfBirth) {
          const [y, m, d] = profile.dateOfBirth.split('-');
          setYear(y ?? '');
          setMonth(m ?? '');
          setDay(d ?? '');
        }
      } catch {
        // Best-effort prefill only — leave fields blank if it fails.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const isPhoneValid = EGYPT_PHONE_PATTERN.test(phoneNumber.trim());
  const canContinue =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    day.length > 0 &&
    month.length > 0 &&
    year.length === 4 &&
    isPhoneValid;

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/welcome');
    }
  };

  const handleContinue = async () => {
    if (!canContinue || isSubmitting || !token) {
      return;
    }

    const dob = parseDateOfBirth(day, month, year);
    if (dob.iso === null) {
      setSubmitError(dob.error);
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await updateInternProfile(token, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth: dob.iso,
        phoneNumber: phoneNumber.trim(),
      });
      router.push('/onboarding/education');
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

          <OnboardingStepHeader step={1} heading="Tell us about yourself" />

          <View style={styles.fields}>
            <View style={styles.row}>
              <PathoraInput
                label="First name"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Amina"
                autoCapitalize="words"
                textContentType="givenName"
                style={styles.rowItem}
              />
              <PathoraInput
                label="Last name"
                value={lastName}
                onChangeText={setLastName}
                placeholder="Hassan"
                autoCapitalize="words"
                textContentType="familyName"
                style={styles.rowItem}
              />
            </View>

            <View>
              <Text style={styles.label}>Date of birth</Text>
              <View style={styles.dobRow}>
                <PathoraInput
                  label=""
                  value={day}
                  onChangeText={(text) => setDay(text.replace(/\D/g, '').slice(0, 2))}
                  placeholder="DD"
                  keyboardType="number-pad"
                  style={styles.dobItemSmall}
                />
                <PathoraInput
                  label=""
                  value={month}
                  onChangeText={(text) => setMonth(text.replace(/\D/g, '').slice(0, 2))}
                  placeholder="MM"
                  keyboardType="number-pad"
                  style={styles.dobItemSmall}
                />
                <PathoraInput
                  label=""
                  value={year}
                  onChangeText={(text) => setYear(text.replace(/\D/g, '').slice(0, 4))}
                  placeholder="YYYY"
                  keyboardType="number-pad"
                  style={styles.dobItemLarge}
                />
              </View>
            </View>

            <PathoraInput
              label="Phone number"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="01012345678"
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
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

export default function PersonalDetailsRoute() {
  return (
    <OnboardingGuard>
      <PersonalDetailsScreen />
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
  row: {
    flexDirection: 'row',
    gap: PathoraSpacing[12],
  },
  rowItem: {
    flex: 1,
  },
  label: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 13,
    color: PathoraColors.ink900,
    marginBottom: 8,
  },
  dobRow: {
    flexDirection: 'row',
    gap: PathoraSpacing[12],
  },
  dobItemSmall: {
    flex: 1,
  },
  dobItemLarge: {
    flex: 1.5,
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
