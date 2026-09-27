import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthBackButton } from '@/components/auth-back-button';
import { PathoraButton } from '@/components/pathora-button';
import { PathoraCheckbox } from '@/components/pathora-checkbox';
import { PathoraInput } from '@/components/pathora-input';
import { PathoraColors, PathoraFonts, PathoraSpacing } from '@/constants/pathora-theme';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function StudentRegistrationScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const isEmailValid = EMAIL_PATTERN.test(email);
  const isPasswordValid = password.length >= 8;
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const canContinue = isEmailValid && isPasswordValid && passwordsMatch && agreedToTerms;

  const handleBack = () => {
    router.replace('/account-type');
  };

  const handleContinue = () => {
    // TODO: create the onboarding flow and call the backend once they exist
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

          <Text style={styles.title}>Create your student account</Text>
          <Text style={styles.subtitle}>
            Just the basics for now — you&apos;ll add your name, education and skills next.
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
            <PathoraCheckbox checked={agreedToTerms} onToggle={() => setAgreedToTerms((current) => !current)} />
            <Text style={styles.termsText}>
              I agree to Pathora&apos;s Terms of Service and Privacy Policy.
            </Text>
          </Pressable>

          <PathoraButton
            label="Continue"
            variant="primary"
            onPress={handleContinue}
            disabled={!canContinue}
            style={styles.continueButton}
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
});
