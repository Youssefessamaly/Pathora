import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthBackButton } from '@/components/auth-back-button';
import { PathoraButton } from '@/components/pathora-button';
import { PathoraInput } from '@/components/pathora-input';
import { PathoraColors, PathoraFonts, PathoraSpacing } from '@/constants/pathora-theme';
import { ApiError, forgotPassword, NetworkError } from '@/lib/api';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEmailValid = EMAIL_PATTERN.test(email);

  const handleBack = () => {
    router.back();
  };

  const handleSendCode = async () => {
    if (!isEmailValid || isSubmitting) {
      return;
    }

    const trimmedEmail = email.trim();

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await forgotPassword({ email: trimmedEmail });
      router.push({ pathname: '/verify-otp', params: { email: trimmedEmail } });
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.status === 400 ? 'Please enter a valid email address.' : error.message);
      } else if (error instanceof NetworkError) {
        setSubmitError('Unable to reach Pathora. Please try again.');
      } else {
        setSubmitError('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
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

          <Text style={styles.title}>Reset your password</Text>
          <Text style={styles.subtitle}>
            Enter your email address and we&apos;ll send you a 6-digit code to reset your password.
          </Text>

          <View style={styles.fields}>
            <PathoraInput
              label="Email address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
          </View>

          {submitError && <Text style={styles.submitError}>{submitError}</Text>}

          <PathoraButton
            label={isSubmitting ? 'Sending…' : 'Send code'}
            variant="primary"
            onPress={handleSendCode}
            disabled={!isEmailValid || isSubmitting}
            style={styles.sendButton}
          />
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
  submitError: {
    fontFamily: PathoraFonts.en.medium,
    fontSize: 13,
    color: PathoraColors.error,
    marginBottom: PathoraSpacing[16],
  },
  sendButton: {
    marginBottom: PathoraSpacing[24],
  },
});
