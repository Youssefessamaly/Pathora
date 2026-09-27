import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthBackButton } from '@/components/auth-back-button';
import { PathoraButton } from '@/components/pathora-button';
import { PathoraInput } from '@/components/pathora-input';
import { PathoraColors, PathoraFonts, PathoraSpacing } from '@/constants/pathora-theme';
import { ApiError, NetworkError, resetPassword } from '@/lib/api';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; resetToken?: string }>();
  const [resetToken, setResetToken] = useState<string | null>(params.resetToken ?? null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!resetToken) {
      router.replace('/forgot-password');
    }
  }, [resetToken, router]);

  const isPasswordValid = newPassword.length >= 8;
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = isPasswordValid && passwordsMatch;

  const handleBack = () => {
    router.back();
  };

  const handleReset = async () => {
    if (!canSubmit || isSubmitting || !resetToken) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await resetPassword({ resetToken, newPassword });
      setResetToken(null);
      Alert.alert('Password reset', 'Your password has been reset successfully. Please log in.');
      router.replace('/login');
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError('This reset link has expired or is invalid. Please start again.');
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

          <Text style={styles.title}>Create new password</Text>
          <Text style={styles.subtitle}>Use a password you haven&apos;t used before.</Text>

          <View style={styles.fields}>
            <View>
              <PathoraInput
                label="New password"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Create a new password"
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
                placeholder="Re-enter your new password"
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

          {submitError && <Text style={styles.submitError}>{submitError}</Text>}

          <PathoraButton
            label={isSubmitting ? 'Resetting…' : 'Reset password'}
            variant="primary"
            onPress={handleReset}
            disabled={!canSubmit || isSubmitting}
            style={styles.resetButton}
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
  resetButton: {
    marginBottom: PathoraSpacing[24],
  },
});
