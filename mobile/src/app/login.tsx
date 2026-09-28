import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthBackButton } from '@/components/auth-back-button';
import { PathoraButton } from '@/components/pathora-button';
import { PathoraInput } from '@/components/pathora-input';
import { PathoraColors, PathoraFonts, PathoraSpacing } from '@/constants/pathora-theme';
import { useAuth } from '@/context/auth-context';
import { ApiError, getInternProfileOrNull, NetworkError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth-token';
import { resolveFirstIncompleteOnboardingStep } from '@/lib/onboarding';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEmailValid = EMAIL_PATTERN.test(email);
  const isPasswordValid = password.length > 0;
  const canSubmit = isEmailValid && isPasswordValid;

  const handleForgotPassword = () => {
    router.push('/forgot-password');
  };

  const handleLogin = async () => {
    if (!canSubmit || isSubmitting) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const currentUser = await signIn({ email: email.trim(), password });

      if (currentUser.role === 'INTERN') {
        try {
          const token = await getAccessToken();
          if (!token) {
            throw new Error('Missing access token after sign-in');
          }
          const profile = await getInternProfileOrNull(token);
          const nextOnboardingRoute = resolveFirstIncompleteOnboardingStep(profile);
          router.replace(nextOnboardingRoute ?? '/intern');
        } catch {
          // Signed in, but couldn't determine onboarding status (e.g. network hiccup) —
          // don't guess where to send them. Stay on login rather than risk skipping
          // onboarding.
          setSubmitError('Unable to load your profile. Please try again.');
        }
        return;
      }

      Alert.alert('Success', `Logged in successfully as ${currentUser.role}`);
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.status === 401 ? 'Invalid email or password.' : error.message);
      } else if (error instanceof NetworkError) {
        setSubmitError('Unable to reach Pathora. Please try again.');
      } else {
        setSubmitError('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = () => {
    router.push('/account-type');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AuthBackButton style={styles.backButton} />

        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Log in to keep tracking your applications.</Text>

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

          <View>
            <PathoraInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
              secureTextEntry
            />
            <Pressable
              onPress={handleForgotPassword}
              hitSlop={8}
              style={styles.forgotPasswordButton}>
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </Pressable>
          </View>
        </View>

        {submitError && <Text style={styles.submitError}>{submitError}</Text>}

        <PathoraButton
          label={isSubmitting ? 'Logging in…' : 'Log in'}
          variant="primary"
          onPress={handleLogin}
          disabled={!canSubmit || isSubmitting}
          style={styles.loginButton}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don&apos;t have an account? </Text>
          <Pressable onPress={handleSignUp} hitSlop={8}>
            <Text style={styles.footerLink}>Sign up</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: 10,
  },
  forgotPasswordText: {
    fontFamily: PathoraFonts.en.semiBold,
    fontSize: 13,
    color: PathoraColors.teal600,
  },
  submitError: {
    fontFamily: PathoraFonts.en.medium,
    fontSize: 13,
    color: PathoraColors.error,
    marginBottom: PathoraSpacing[16],
  },
  loginButton: {
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
