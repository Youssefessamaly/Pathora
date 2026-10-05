import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthBackButton } from '@/components/auth-back-button';
import { PathoraButton } from '@/components/pathora-button';
import { PathoraCheckbox } from '@/components/pathora-checkbox';
import { PathoraInput } from '@/components/pathora-input';
import { PathoraColors, PathoraFonts, PathoraSpacing } from '@/constants/pathora-theme';
import { ApiError, NetworkError, registerCompany } from '@/lib/api';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CompanyRegistrationScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEmailValid = EMAIL_PATTERN.test(email);
  const isPasswordValid = password.length >= 8;
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const canContinue = isEmailValid && isPasswordValid && passwordsMatch && agreedToTerms;

  const handleBack = () => {
    router.replace('/account-type');
  };

  const handleContinue = async () => {
    if (!canContinue || isSubmitting) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await registerCompany({ email: email.trim(), password });

      // Registration succeeded. Send the company to the login page so they can
      // authenticate normally with their newly created account.
      router.replace('/login');
    } catch (error) {
      if (error instanceof ApiError || error instanceof NetworkError) {
        setSubmitError(error.message);
      } else {
        setSubmitError('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = () => {
    router.push('/login');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <AuthBackButton onPress={handleBack} style={styles.backButton} />

          <Text style={styles.title}>Create your company account</Text>
          <Text style={styles.subtitle}>
            You&apos;ll add your company details and verification documents next.
          </Text>

          <View style={styles.fields}>
            <PathoraInput
              label="Official email"
              value={email}
              onChangeText={setEmail}
              placeholder="hr@yourcompany.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />

            <View>
              <PathoraInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Create a password"
                autoCapitalize="none"
                autoComplete="password-new"
                textContentType="newPassword"
                secureTextEntry
              />
              <Text style={styles.hint}>At least 8 characters</Text>
            </View>

            <View>
              <PathoraInput
                label="Confirm password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter your password"
                autoCapitalize="none"
                autoComplete="password-new"
                textContentType="newPassword"
                secureTextEntry
              />
              {confirmPassword.length > 0 && !passwordsMatch && (
                <Text style={styles.error}>Passwords don&apos;t match</Text>
              )}
            </View>
          </View>

          <Pressable
            onPress={() => setAgreedToTerms((current) => !current)}
            hitSlop={4}
            style={styles.termsRow}>
            <PathoraCheckbox
              checked={agreedToTerms}
              onToggle={() => setAgreedToTerms((current) => !current)}
            />
            <Text style={styles.termsText}>
              I agree to Pathora&apos;s Terms of Service and Privacy Policy.
            </Text>
          </Pressable>

          {submitError && <Text style={styles.submitError}>{submitError}</Text>}

          <PathoraButton
            label={isSubmitting ? 'Creating account…' : 'Continue'}
            variant="primary"
            onPress={handleContinue}
            disabled={!canContinue || isSubmitting}
            style={styles.continueButton}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have a company account? </Text>
            <Pressable onPress={handleLogin} hitSlop={8}>
              <Text style={styles.footerLink}>Log in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  title: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 24,
    color: PathoraColors.ink900,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 14,
    lineHeight: 22,
    color: PathoraColors.textSecondary,
    marginBottom: PathoraSpacing[32],
  },
  fields: {
    gap: PathoraSpacing[20],
    marginBottom: PathoraSpacing[24],
  },
  hint: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 12,
    color: PathoraColors.textTertiary,
    marginTop: 6,
  },
  error: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 12,
    color: PathoraColors.error,
    marginTop: 6,
  },
  submitError: {
    fontFamily: PathoraFonts.en.medium,
    fontSize: 13,
    color: PathoraColors.error,
    marginBottom: PathoraSpacing[16],
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: PathoraSpacing[24],
  },
  termsText: {
    flex: 1,
    fontFamily: PathoraFonts.en.regular,
    fontSize: 13,
    lineHeight: 19,
    color: PathoraColors.textSecondary,
  },
  continueButton: {
    marginBottom: PathoraSpacing[24],
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: PathoraSpacing[24],
  },
  footerText: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 13.5,
    color: PathoraColors.textSecondary,
  },
  footerLink: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 13.5,
    color: PathoraColors.teal600,
  },
});
