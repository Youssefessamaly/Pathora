import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { OnboardingGuard } from '@/components/onboarding/onboarding-guard';
import { OnboardingStepHeader } from '@/components/onboarding/onboarding-step-header';
import { PathoraButton } from '@/components/pathora-button';
import { PathoraCheckbox } from '@/components/pathora-checkbox';
import { PathoraInput } from '@/components/pathora-input';
import { PathoraColors, PathoraFonts, PathoraRadius, PathoraSpacing } from '@/constants/pathora-theme';
import { useAuth } from '@/context/auth-context';
import {
  ApiError,
  getInternApplicationQuestions,
  getInternInternship,
  getInternProfileOrNull,
  submitInternshipApplication,
  type ApplicationQuestion,
  type InternInternship,
  type InternProfile,
  type InternshipApplicationAnswerSubmission,
} from '@/lib/api';
import { isValidExternalApplicationUrl, isValidLinkedinUrl } from '@/lib/internship-options';
import { describeOnboardingError } from '@/lib/onboarding';

const MAX_SHORT_TEXT_LENGTH = 500;
const MAX_LONG_TEXT_LENGTH = 5000;

type WizardStep = 1 | 2 | 3 | 'success';

/** Overrides the generic fallback for the two cases this flow needs a specific, friendly
 *  message for; everything else (network, 400, 401/403) reuses the existing messaging. */
function describeApplicationError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return "You've already applied to this internship.";
    }
    if (error.status === 404) {
      return 'This internship is no longer available to apply to.';
    }
  }
  return describeOnboardingError(error);
}

function RequiredBadge({ required }: { required: boolean }) {
  return (
    <View style={[styles.requiredBadge, required ? styles.requiredBadgeOn : styles.requiredBadgeOff]}>
      <Text style={[styles.requiredBadgeText, required ? styles.requiredBadgeTextOn : styles.requiredBadgeTextOff]}>
        {required ? 'Required' : 'Optional'}
      </Text>
    </View>
  );
}

function ApplyScreen({ internshipId }: { internshipId: string }) {
  const router = useRouter();
  const { token } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [internship, setInternship] = useState<InternInternship | null>(null);
  const [profile, setProfile] = useState<InternProfile | null>(null);
  const [questions, setQuestions] = useState<ApplicationQuestion[]>([]);

  const [step, setStep] = useState<WizardStep>(1);

  // Step 1 state — lives here (not inside a per-step component) so it survives moving
  // between steps.
  const [coverLetter, setCoverLetter] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [linkedinError, setLinkedinError] = useState<string | null>(null);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);

  // Step 2 state — keyed by questionId, exactly what the backend expects to receive back.
  // questions is only ever set once (the initial load above), and every reader of `answers`
  // below (rendering, validation, buildAnswersPayload) exclusively iterates the current
  // `questions` array and looks up `answers[question.id]` — so an answer can never be
  // attached to, or read from, a question that doesn't currently exist.
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step2Error, setStep2Error] = useState<string | null>(null);

  // Step 3 state
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Deliberately a one-time load (not useFocusEffect): this is a stateful, linear wizard —
  // refetching on every focus would risk clobbering answers the intern already typed if the
  // app is briefly backgrounded and refocused mid-flow.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!token) {
        return;
      }
      try {
        const loadedInternship = await getInternInternship(token, internshipId);
        if (cancelled) {
          return;
        }

        if (loadedInternship.applicationMethod === 'EXTERNAL') {
          // Defensive — the detail screen never links here for EXTERNAL, but if this route
          // is ever reached directly, never show the Pathora form or fetch questions for it.
          router.replace({ pathname: '/intern/internships/[id]', params: { id: internshipId } });
          return;
        }

        const [loadedProfile, loadedQuestions] = await Promise.all([
          getInternProfileOrNull(token),
          getInternApplicationQuestions(token, internshipId),
        ]);
        if (cancelled) {
          return;
        }

        setInternship(loadedInternship);
        setProfile(loadedProfile);
        setQuestions(loadedQuestions);
        if (loadedProfile?.linkedinUrl) {
          setLinkedinUrl(loadedProfile.linkedinUrl);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(describeApplicationError(error));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally run once per screen instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasCv = Boolean(profile?.cvFileName);

  const handleContinueStep1 = () => {
    if (!hasCv) {
      return;
    }

    let hasError = false;

    if (linkedinUrl.trim() && !isValidLinkedinUrl(linkedinUrl)) {
      setLinkedinError('Enter a valid linkedin.com/in/... URL.');
      hasError = true;
    } else {
      setLinkedinError(null);
    }

    if (portfolioUrl.trim() && !isValidExternalApplicationUrl(portfolioUrl)) {
      setPortfolioError('Enter a valid http:// or https:// URL.');
      hasError = true;
    } else {
      setPortfolioError(null);
    }

    if (hasError) {
      return;
    }

    setStep(2);
  };

  const missingRequiredQuestion = questions.find(
    (question) => question.required && !(answers[question.id]?.trim()),
  );

  const handleContinueStep2 = () => {
    if (missingRequiredQuestion) {
      setStep2Error('Please answer all required questions.');
      return;
    }
    setStep2Error(null);
    setStep(3);
  };

  const buildAnswersPayload = (): InternshipApplicationAnswerSubmission[] => {
    const result: InternshipApplicationAnswerSubmission[] = [];
    for (const question of questions) {
      const trimmed = answers[question.id]?.trim() ?? '';
      if (trimmed.length === 0) {
        // Optional + blank is omitted entirely rather than sent as an empty string.
        continue;
      }
      result.push({ questionId: question.id, answer: trimmed });
    }
    return result;
  };

  const handleSubmit = async () => {
    if (!confirmed || isSubmitting || !token || !internship) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    const trimmedCoverLetter = coverLetter.trim();
    const trimmedLinkedin = linkedinUrl.trim();
    const trimmedPortfolio = portfolioUrl.trim();

    try {
      await submitInternshipApplication(token, internship.id, {
        ...(trimmedCoverLetter ? { coverLetter: trimmedCoverLetter } : {}),
        ...(trimmedLinkedin ? { linkedinUrl: trimmedLinkedin } : {}),
        ...(trimmedPortfolio ? { portfolioUrl: trimmedPortfolio } : {}),
        answers: buildAnswersPayload(),
      });

      setStep('success');
    } catch (error) {
      setSubmitError(describeApplicationError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      return;
    }
    if (step === 3) {
      setStep(2);
      return;
    }
    router.back();
  };

  const handleGoToProfile = () => {
    router.push('/intern/profile');
  };

  const handleViewApplications = () => {
    // Replace, not push — Back from the Applications screen must never land on this
    // already-submitted success screen again.
    router.replace('/intern/applications');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.centerContent}>
          <ActivityIndicator color={PathoraColors.teal600} />
        </View>
      </SafeAreaView>
    );
  }

  if (loadError || !internship) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <AuthBackButton onPress={() => router.back()} style={styles.backButton} />
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{loadError ?? 'Unable to load this application.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'success') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.successContent}>
          <View style={styles.successIconCircle}>
            <SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={30} tintColor={PathoraColors.surface} />
          </View>
          <Text style={styles.successTitle}>Application submitted!</Text>
          <Text style={styles.successBody}>
            We&apos;ll let you know when the company updates your application.
          </Text>
          <PathoraButton
            label="View my applications"
            variant="primary"
            onPress={handleViewApplications}
            style={styles.successButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          key={step}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <AuthBackButton onPress={handleBack} style={styles.backButton} />

          {step === 1 && (
            <>
              <OnboardingStepHeader step={1} heading="CV & cover letter" />

              <View style={styles.fields}>
                <View>
                  <Text style={styles.label}>CV</Text>
                  {hasCv ? (
                    <View style={styles.cvBox}>
                      <SymbolView
                        name={{ ios: 'doc.text.fill', android: 'description', web: 'description' }}
                        size={20}
                        tintColor={PathoraColors.teal600}
                      />
                      <Text style={styles.cvFileName} numberOfLines={1}>
                        {profile?.cvFileName}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.cvMissingBox}>
                      <Text style={styles.cvMissingText}>A CV is required to apply through Pathora.</Text>
                      <PathoraButton
                        label="Go to Profile"
                        variant="secondary"
                        onPress={handleGoToProfile}
                        style={styles.cvMissingButton}
                      />
                    </View>
                  )}
                </View>

                <PathoraInput
                  label="Cover letter (optional)"
                  value={coverLetter}
                  onChangeText={(text) => setCoverLetter(text.slice(0, 5000))}
                  placeholder="Tell the company why you're a great fit."
                  multiline
                  numberOfLines={6}
                />

                <View>
                  <PathoraInput
                    label="LinkedIn (optional)"
                    value={linkedinUrl}
                    onChangeText={(text) => {
                      setLinkedinUrl(text);
                      setLinkedinError(null);
                    }}
                    placeholder="linkedin.com/in/..."
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                  {linkedinError && <Text style={styles.fieldError}>{linkedinError}</Text>}
                </View>

                <View>
                  <PathoraInput
                    label="Portfolio (optional)"
                    value={portfolioUrl}
                    onChangeText={(text) => {
                      setPortfolioUrl(text);
                      setPortfolioError(null);
                    }}
                    placeholder="https://your-portfolio.com"
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                  {portfolioError && <Text style={styles.fieldError}>{portfolioError}</Text>}
                </View>
              </View>

              <PathoraButton
                label="Continue"
                variant="primary"
                onPress={handleContinueStep1}
                disabled={!hasCv}
                style={styles.continueButton}
              />
            </>
          )}

          {step === 2 && (
            <>
              <OnboardingStepHeader step={2} heading="Application questions" />

              {questions.length === 0 ? (
                <View style={styles.emptyQuestionsBox}>
                  <Text style={styles.emptyQuestionsTitle}>No additional questions</Text>
                  <Text style={styles.emptyQuestionsBody}>
                    This company hasn&apos;t added any extra application questions.
                  </Text>
                </View>
              ) : (
                <View style={styles.fields}>
                  {questions.map((question) => {
                    const maxLength =
                      question.questionType === 'SHORT_TEXT' ? MAX_SHORT_TEXT_LENGTH : MAX_LONG_TEXT_LENGTH;
                    const isLong = question.questionType === 'LONG_TEXT';
                    return (
                      <View key={question.id}>
                        <View style={styles.questionHeaderRow}>
                          <Text style={styles.questionText}>{question.questionText}</Text>
                          <RequiredBadge required={question.required} />
                        </View>
                        <PathoraInput
                          label=""
                          value={answers[question.id] ?? ''}
                          onChangeText={(text) =>
                            setAnswers((current) => ({ ...current, [question.id]: text.slice(0, maxLength) }))
                          }
                          multiline={isLong}
                          numberOfLines={isLong ? 5 : undefined}
                          placeholder="Your answer"
                        />
                      </View>
                    );
                  })}
                </View>
              )}

              {step2Error && <Text style={styles.submitError}>{step2Error}</Text>}

              <PathoraButton
                label="Continue"
                variant="primary"
                onPress={handleContinueStep2}
                style={styles.continueButton}
              />
            </>
          )}

          {step === 3 && (
            <>
              <OnboardingStepHeader step={3} heading="Review your application" />

              <View style={styles.reviewCard}>
                <Text style={styles.reviewLabel}>Internship</Text>
                <Text style={styles.reviewValue}>{internship.title}</Text>
                <Text style={styles.reviewSecondary}>{internship.companyName}</Text>
              </View>

              <View style={styles.reviewCard}>
                <Text style={styles.reviewLabel}>CV</Text>
                <Text style={styles.reviewValue}>{profile?.cvFileName}</Text>
              </View>

              <View style={styles.reviewCard}>
                <Text style={styles.reviewLabel}>Cover letter</Text>
                <Text style={styles.reviewValue}>{coverLetter.trim() || 'No cover letter provided'}</Text>
              </View>

              {linkedinUrl.trim().length > 0 && (
                <View style={styles.reviewCard}>
                  <Text style={styles.reviewLabel}>LinkedIn</Text>
                  <Text style={styles.reviewValue}>{linkedinUrl.trim()}</Text>
                </View>
              )}

              {portfolioUrl.trim().length > 0 && (
                <View style={styles.reviewCard}>
                  <Text style={styles.reviewLabel}>Portfolio</Text>
                  <Text style={styles.reviewValue}>{portfolioUrl.trim()}</Text>
                </View>
              )}

              {questions.length > 0 && (
                <View style={styles.reviewCard}>
                  <Text style={styles.reviewLabel}>Application questions</Text>
                  {questions.map((question) => (
                    <View key={question.id} style={styles.reviewQuestionBlock}>
                      <Text style={styles.reviewQuestionText}>{question.questionText}</Text>
                      <Text style={styles.reviewAnswerText}>
                        {answers[question.id]?.trim() || 'Not provided'}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <Pressable
                onPress={() => setConfirmed((current) => !current)}
                style={styles.confirmRow}
                accessibilityRole="button">
                <PathoraCheckbox checked={confirmed} onToggle={() => setConfirmed((current) => !current)} />
                <Text style={styles.confirmText}>I confirm the information above is accurate.</Text>
              </Pressable>

              {submitError && <Text style={styles.submitError}>{submitError}</Text>}

              <PathoraButton
                label={isSubmitting ? 'Submitting…' : 'Submit application'}
                variant="primary"
                onPress={handleSubmit}
                disabled={!confirmed || isSubmitting}
                style={styles.continueButton}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function ApplyRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <OnboardingGuard>{id ? <ApplyScreen internshipId={id} /> : null}</OnboardingGuard>;
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
    paddingBottom: PathoraSpacing[32],
  },
  backButton: {
    marginTop: 8,
    marginBottom: PathoraSpacing[24],
    alignSelf: 'flex-start',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: PathoraSpacing[24],
    gap: PathoraSpacing[16],
  },
  errorText: {
    fontFamily: PathoraFonts.en.medium,
    fontSize: 14,
    color: PathoraColors.error,
    textAlign: 'center',
  },
  fields: {
    gap: PathoraSpacing[20],
    marginBottom: PathoraSpacing[24],
  },
  label: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 13,
    color: PathoraColors.ink900,
    marginBottom: 8,
  },
  cvBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: PathoraRadius[12],
    backgroundColor: PathoraColors.teal100,
    borderWidth: 1,
    borderColor: PathoraColors.teal400,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  cvFileName: {
    flex: 1,
    fontFamily: PathoraFonts.en.semiBold,
    fontSize: 14,
    color: PathoraColors.teal700,
  },
  cvMissingBox: {
    borderRadius: PathoraRadius[12],
    backgroundColor: PathoraColors.surface,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: PathoraColors.borderStrong,
    padding: PathoraSpacing[16],
    gap: PathoraSpacing[12],
  },
  cvMissingText: {
    fontFamily: PathoraFonts.en.medium,
    fontSize: 13.5,
    lineHeight: 19,
    color: PathoraColors.textSecondary,
  },
  cvMissingButton: {
    alignSelf: 'flex-start',
    minWidth: 140,
  },
  fieldError: {
    fontFamily: PathoraFonts.en.medium,
    fontSize: 12,
    color: PathoraColors.error,
    marginTop: 8,
  },
  continueButton: {
    marginBottom: PathoraSpacing[24],
  },
  emptyQuestionsBox: {
    borderRadius: PathoraRadius[14],
    backgroundColor: PathoraColors.surface,
    borderWidth: 1,
    borderColor: PathoraColors.border,
    paddingVertical: PathoraSpacing[24],
    paddingHorizontal: PathoraSpacing[20],
    alignItems: 'center',
    gap: 6,
    marginBottom: PathoraSpacing[24],
  },
  emptyQuestionsTitle: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 15,
    color: PathoraColors.ink900,
    textAlign: 'center',
  },
  emptyQuestionsBody: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 13.5,
    lineHeight: 19,
    color: PathoraColors.textSecondary,
    textAlign: 'center',
  },
  questionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: PathoraSpacing[12],
    marginBottom: 8,
  },
  questionText: {
    flex: 1,
    fontFamily: PathoraFonts.en.semiBold,
    fontSize: 14,
    lineHeight: 20,
    color: PathoraColors.ink900,
  },
  requiredBadge: {
    borderRadius: PathoraRadius[999],
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  requiredBadgeOn: {
    backgroundColor: PathoraColors.teal100,
  },
  requiredBadgeOff: {
    backgroundColor: PathoraColors.paper,
    borderWidth: 1,
    borderColor: PathoraColors.borderStrong,
  },
  requiredBadgeText: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  requiredBadgeTextOn: {
    color: PathoraColors.teal700,
  },
  requiredBadgeTextOff: {
    color: PathoraColors.textTertiary,
  },
  submitError: {
    fontFamily: PathoraFonts.en.medium,
    fontSize: 13,
    color: PathoraColors.error,
    marginBottom: PathoraSpacing[16],
  },
  reviewCard: {
    borderRadius: PathoraRadius[14],
    backgroundColor: PathoraColors.surface,
    borderWidth: 1,
    borderColor: PathoraColors.border,
    padding: PathoraSpacing[16],
    marginBottom: PathoraSpacing[16],
    gap: 4,
  },
  reviewLabel: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: PathoraColors.textTertiary,
    marginBottom: 4,
  },
  reviewValue: {
    fontFamily: PathoraFonts.en.semiBold,
    fontSize: 14.5,
    lineHeight: 21,
    color: PathoraColors.ink900,
  },
  reviewSecondary: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 13,
    color: PathoraColors.textSecondary,
  },
  reviewQuestionBlock: {
    marginTop: 10,
    gap: 4,
  },
  reviewQuestionText: {
    fontFamily: PathoraFonts.en.semiBold,
    fontSize: 13,
    color: PathoraColors.ink900,
  },
  reviewAnswerText: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 13.5,
    lineHeight: 19,
    color: PathoraColors.textSecondary,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: PathoraSpacing[20],
  },
  confirmText: {
    flex: 1,
    fontFamily: PathoraFonts.en.regular,
    fontSize: 13,
    lineHeight: 19,
    color: PathoraColors.textSecondary,
  },
  successContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: PathoraSpacing[32],
    gap: PathoraSpacing[12],
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: PathoraRadius[999],
    backgroundColor: PathoraColors.teal600,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: PathoraSpacing[8],
  },
  successTitle: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 22,
    color: PathoraColors.ink900,
    textAlign: 'center',
  },
  successBody: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 14,
    lineHeight: 21,
    color: PathoraColors.textSecondary,
    textAlign: 'center',
    marginBottom: PathoraSpacing[16],
  },
  successButton: {
    minWidth: 220,
  },
});
