import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthBackButton } from '@/components/auth-back-button';
import { PathoraButton } from '@/components/pathora-button';
import { PathoraInput } from '@/components/pathora-input';
import { PathoraColors, PathoraFonts, PathoraSpacing } from '@/constants/pathora-theme';
import { ApiError, forgotPassword, NetworkError, verifyOtp } from '@/lib/api';

const OTP_DISPLAY_SECONDS = 5 * 60;

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function VerifyOtpScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(OTP_DISPLAY_SECONDS);

  useEffect(() => {
    if (!email) {
      router.replace('/forgot-password');
    }
  }, [email, router]);

  useEffect(() => {
    if (secondsRemaining <= 0) {
      return;
    }
    const interval = setInterval(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsRemaining]);

  const isCodeValid = code.length === 6;
  const isExpiredDisplay = secondsRemaining <= 0;

  const handleBack = () => {
    router.back();
  };

  const handleChangeCode = (text: string) => {
    setCode(text.replace(/[^0-9]/g, '').slice(0, 6));
  };

  const handleVerify = async () => {
    if (!isCodeValid || isSubmitting || !email) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const result = await verifyOtp({ email, code });
      router.push({
        pathname: '/reset-password',
        params: { email, resetToken: result.resetToken },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError('That code is invalid or has expired. Please try again or resend the code.');
      } else if (error instanceof NetworkError) {
        setSubmitError('Unable to reach Pathora. Please try again.');
      } else {
        setSubmitError('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (isResending || !email) {
      return;
    }

    setSubmitError(null);
    setIsResending(true);

    try {
      await forgotPassword({ email });
      setSecondsRemaining(OTP_DISPLAY_SECONDS);
      setCode('');
      Alert.alert('Code sent', 'A new verification code has been sent to your email.');
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
      } else if (error instanceof NetworkError) {
        setSubmitError('Unable to reach Pathora. Please try again.');
      } else {
        setSubmitError('Something went wrong. Please try again.');
      }
    } finally {
      setIsResending(false);
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

          <Text style={styles.title}>Enter verification code</Text>
          <Text style={styles.subtitle}>
            A 6-digit code was sent to {email ?? 'your email'} and is valid for 5 minutes.
          </Text>

          <View style={styles.fields}>
            <PathoraInput
              label="Verification code"
              value={code}
              onChangeText={handleChangeCode}
              placeholder="123456"
              keyboardType="number-pad"
              autoCapitalize="none"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
            />
            <Text style={isExpiredDisplay ? styles.countdownExpired : styles.countdown}>
              {isExpiredDisplay
                ? 'Code expired — request a new one'
                : `Expires in ${formatCountdown(secondsRemaining)}`}
            </Text>
          </View>

          {submitError && <Text style={styles.submitError}>{submitError}</Text>}

          <PathoraButton
            label={isSubmitting ? 'Verifying…' : 'Verify code'}
            variant="primary"
            onPress={handleVerify}
            disabled={!isCodeValid || isSubmitting}
            style={styles.verifyButton}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Didn&apos;t get a code? </Text>
            <Pressable onPress={handleResend} hitSlop={8} disabled={isResending}>
              <Text style={styles.footerLink}>{isResending ? 'Resending…' : 'Resend code'}</Text>
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
  countdown: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 12,
    color: PathoraColors.textTertiary,
    marginTop: 6,
  },
  countdownExpired: {
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
  verifyButton: {
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
