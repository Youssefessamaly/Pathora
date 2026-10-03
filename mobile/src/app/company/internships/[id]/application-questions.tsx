import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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
import { OnboardingGuard } from '@/components/onboarding/onboarding-guard';
import { OnboardingOptionGroup } from '@/components/onboarding/onboarding-option-group';
import { PathoraButton } from '@/components/pathora-button';
import { PathoraCheckbox } from '@/components/pathora-checkbox';
import { PathoraInput } from '@/components/pathora-input';
import { PathoraColors, PathoraFonts, PathoraRadius, PathoraSpacing } from '@/constants/pathora-theme';
import { useAuth } from '@/context/auth-context';
import {
  ApiError,
  createCompanyApplicationQuestion,
  deleteCompanyApplicationQuestion,
  getCompanyApplicationQuestions,
  NetworkError,
  updateCompanyApplicationQuestion,
  type ApplicationQuestion,
  type ApplicationQuestionType,
  type ApplicationQuestionUpdatePayload,
} from '@/lib/api';
import {
  APPLICATION_QUESTION_TYPE_LABELS,
  APPLICATION_QUESTION_TYPE_OPTIONS,
  nextQuestionDisplayOrder,
} from '@/lib/internship-options';
import { describeOnboardingError } from '@/lib/onboarding';

const LOCKED_MESSAGE =
  'Application questions are locked because this internship has already received an application.';

function isLockConflict(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409;
}

/** The generic 409 copy from friendlyMessageForStatus is auth-specific and wrong here — show
 *  the locked-questions message instead whenever the conflict is this one. */
function describeQuestionError(error: unknown): string {
  if (isLockConflict(error)) {
    return LOCKED_MESSAGE;
  }
  return describeOnboardingError(error);
}

function parseDisplayOrder(raw: string): number | null {
  if (raw.trim().length === 0) {
    return null;
  }
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function RequiredToggleRow({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <Pressable onPress={onToggle} style={styles.requiredRow} accessibilityRole="button">
      <PathoraCheckbox checked={checked} onToggle={onToggle} />
      <Text style={styles.requiredLabel}>Required</Text>
    </Pressable>
  );
}

function QuestionCard({
  question,
  disabled,
  onSave,
  onDelete,
}: {
  question: ApplicationQuestion;
  disabled: boolean;
  onSave: (questionId: string, payload: ApplicationQuestionUpdatePayload) => Promise<string | null>;
  onDelete: (questionId: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(question.questionText);
  const [type, setType] = useState<ApplicationQuestionType>(question.questionType);
  const [required, setRequired] = useState(question.required);
  const [order, setOrder] = useState(String(question.displayOrder));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = text.trim().length > 0 && order.trim().length > 0;

  const handleStartEdit = () => {
    setText(question.questionText);
    setType(question.questionType);
    setRequired(question.required);
    setOrder(String(question.displayOrder));
    setError(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setError(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!canSave || isSaving) {
      return;
    }
    const parsedOrder = parseDisplayOrder(order);
    if (parsedOrder === null) {
      setError('Order must be zero or greater.');
      return;
    }

    setError(null);
    setIsSaving(true);
    const failureMessage = await onSave(question.id, {
      questionText: text.trim(),
      questionType: type,
      required,
      displayOrder: parsedOrder,
    });
    setIsSaving(false);

    if (failureMessage) {
      setError(failureMessage);
      return;
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <View style={styles.card}>
        <View style={styles.cardFields}>
          <PathoraInput
            label="Question"
            value={text}
            onChangeText={(value) => setText(value.slice(0, 500))}
            multiline
            numberOfLines={3}
          />
          <OnboardingOptionGroup
            label="Answer type"
            options={APPLICATION_QUESTION_TYPE_OPTIONS}
            value={type}
            onChange={(value) => setType(value as ApplicationQuestionType)}
          />
          <RequiredToggleRow checked={required} onToggle={() => setRequired((current) => !current)} />
          <PathoraInput
            label="Order"
            value={order}
            onChangeText={(value) => setOrder(value.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad"
          />
        </View>

        {error && <Text style={styles.cardError}>{error}</Text>}

        <View style={styles.editActions}>
          <PathoraButton
            label="Cancel"
            variant="secondary"
            onPress={handleCancel}
            disabled={isSaving}
            style={styles.editActionButton}
          />
          <PathoraButton
            label={isSaving ? 'Saving…' : 'Save'}
            variant="primary"
            onPress={handleSave}
            disabled={!canSave || isSaving}
            style={styles.editActionButton}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.questionText}>{question.questionText}</Text>

      <View style={styles.badgeRow}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{APPLICATION_QUESTION_TYPE_LABELS[question.questionType]}</Text>
        </View>
        <View style={[styles.requiredBadge, question.required ? styles.requiredBadgeOn : styles.requiredBadgeOff]}>
          <Text
            style={[
              styles.requiredBadgeText,
              question.required ? styles.requiredBadgeTextOn : styles.requiredBadgeTextOff,
            ]}>
            {question.required ? 'Required' : 'Optional'}
          </Text>
        </View>
        <Text style={styles.orderText}>Order {question.displayOrder}</Text>
      </View>

      <View style={styles.cardActions}>
        <Pressable
          onPress={handleStartEdit}
          disabled={disabled}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.cardActionButton}>
          <Text style={[styles.cardActionText, disabled && styles.cardActionTextDisabled]}>Edit</Text>
        </Pressable>
        <Pressable
          onPress={() => onDelete(question.id)}
          disabled={disabled}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.cardActionButton}>
          <Text style={[styles.cardActionTextDestructive, disabled && styles.cardActionTextDisabled]}>
            Delete
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function ApplicationQuestionsScreen({ internshipId }: { internshipId: string }) {
  const router = useRouter();
  const { token } = useAuth();

  const [questions, setQuestions] = useState<ApplicationQuestion[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionType, setNewQuestionType] = useState<ApplicationQuestionType>('SHORT_TEXT');
  const [newRequired, setNewRequired] = useState(false);
  const [newDisplayOrder, setNewDisplayOrder] = useState('0');
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }
    try {
      const data = await getCompanyApplicationQuestions(token, internshipId);
      setQuestions(data);
      setNewDisplayOrder(String(nextQuestionDisplayOrder(data)));
      setLoadError(null);
    } catch (error) {
      setLoadError(describeOnboardingError(error));
    }
  }, [token, internshipId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const canAddQuestion =
    newQuestionText.trim().length > 0 &&
    newQuestionText.trim().length <= 500 &&
    parseDisplayOrder(newDisplayOrder) !== null;

  const resetAddForm = (currentQuestions: ApplicationQuestion[]) => {
    setNewQuestionText('');
    setNewQuestionType('SHORT_TEXT');
    setNewRequired(false);
    setNewDisplayOrder(String(nextQuestionDisplayOrder(currentQuestions)));
  };

  const handleAddQuestion = async () => {
    if (!canAddQuestion || isAddingQuestion || !token) {
      return;
    }

    const parsedOrder = parseDisplayOrder(newDisplayOrder);
    if (parsedOrder === null) {
      setAddError('Order must be zero or greater.');
      return;
    }

    setAddError(null);
    setIsAddingQuestion(true);

    try {
      const created = await createCompanyApplicationQuestion(token, internshipId, {
        questionText: newQuestionText.trim(),
        questionType: newQuestionType,
        required: newRequired,
        displayOrder: parsedOrder,
      });
      setQuestions((current) => {
        const next = [...(current ?? []), created];
        resetAddForm(next);
        return next;
      });
    } catch (error) {
      // TEMPORARY DIAGNOSTIC — remove once the add-question failure is root-caused.
      // Never logs the token, headers, or any request/response body beyond ApiError.body
      // (already documented as never containing secrets).
      console.error('Create application question failed:', {
        type: (error as { constructor?: { name?: string } })?.constructor?.name,
        status: error instanceof ApiError ? error.status : undefined,
        body: error instanceof ApiError ? error.body : undefined,
        isNetworkError: error instanceof NetworkError,
        message: error instanceof Error ? error.message : String(error),
      });

      if (isLockConflict(error)) {
        setIsLocked(true);
      }
      setAddError(describeQuestionError(error));
    } finally {
      setIsAddingQuestion(false);
    }
  };

  const handleSaveQuestion = async (
    questionId: string,
    payload: ApplicationQuestionUpdatePayload,
  ): Promise<string | null> => {
    if (!token) {
      return 'Please try again.';
    }
    try {
      const updated = await updateCompanyApplicationQuestion(token, internshipId, questionId, payload);
      setQuestions((current) => (current ?? []).map((question) => (question.id === questionId ? updated : question)));
      return null;
    } catch (error) {
      if (isLockConflict(error)) {
        setIsLocked(true);
      }
      return describeQuestionError(error);
    }
  };

  const handleDeleteQuestion = (questionId: string) => {
    Alert.alert('Delete this question?', 'This removes it from future applications.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!token) {
            return;
          }
          try {
            await deleteCompanyApplicationQuestion(token, internshipId, questionId);
            setQuestions((current) => {
              const next = (current ?? []).filter((question) => question.id !== questionId);
              resetAddForm(next);
              return next;
            });
          } catch (error) {
            if (isLockConflict(error)) {
              setIsLocked(true);
            }
            Alert.alert('Something went wrong', describeQuestionError(error));
          }
        },
      },
    ]);
  };

  const handleDone = () => {
    router.replace({ pathname: '/company/internships/[id]', params: { id: internshipId } });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <AuthBackButton onPress={() => router.back()} style={styles.backButton} />

          <Text style={styles.title}>Application questions</Text>
          <Text style={styles.subtitle}>Add questions applicants will answer when applying through Pathora.</Text>

          {isLocked && (
            <View style={styles.lockedBanner}>
              <Text style={styles.lockedBannerText}>{LOCKED_MESSAGE}</Text>
            </View>
          )}

          {questions === null && !loadError && (
            <View style={styles.centerContent}>
              <ActivityIndicator color={PathoraColors.teal600} />
            </View>
          )}

          {loadError && (
            <View style={styles.centerContent}>
              <Text style={styles.errorText}>{loadError}</Text>
              <PathoraButton label="Try again" variant="secondary" onPress={load} style={styles.retryButton} />
            </View>
          )}

          {questions !== null && !loadError && (
            <>
              {questions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No custom questions yet</Text>
                  <Text style={styles.emptyBody}>
                    Applicants will still submit their CV and standard application details.
                  </Text>
                </View>
              ) : (
                <View style={styles.list}>
                  {questions.map((question) => (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      disabled={isLocked}
                      onSave={handleSaveQuestion}
                      onDelete={handleDeleteQuestion}
                    />
                  ))}
                </View>
              )}

              <View style={styles.addForm}>
                <Text style={styles.addFormTitle}>Add question</Text>

                <View style={styles.cardFields}>
                  <PathoraInput
                    label="Question"
                    value={newQuestionText}
                    onChangeText={(text) => setNewQuestionText(text.slice(0, 500))}
                    placeholder="Why are you interested in this internship?"
                    multiline
                    numberOfLines={3}
                  />

                  <OnboardingOptionGroup
                    label="Answer type"
                    options={APPLICATION_QUESTION_TYPE_OPTIONS}
                    value={newQuestionType}
                    onChange={(value) => setNewQuestionType(value as ApplicationQuestionType)}
                  />

                  <RequiredToggleRow checked={newRequired} onToggle={() => setNewRequired((current) => !current)} />

                  <PathoraInput
                    label="Order"
                    value={newDisplayOrder}
                    onChangeText={(text) => setNewDisplayOrder(text.replace(/\D/g, '').slice(0, 4))}
                    keyboardType="number-pad"
                  />
                </View>

                {addError && <Text style={styles.cardError}>{addError}</Text>}

                <PathoraButton
                  label={isAddingQuestion ? 'Adding…' : 'Add question'}
                  variant="primary"
                  onPress={handleAddQuestion}
                  disabled={!canAddQuestion || isAddingQuestion || isLocked}
                  style={styles.addButton}
                />
              </View>
            </>
          )}

          <PathoraButton label="Done" variant="secondary" onPress={handleDone} style={styles.doneButton} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function ApplicationQuestionsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <OnboardingGuard role="COMPANY">
      {id ? <ApplicationQuestionsScreen internshipId={id} /> : null}
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
    // Generous slack (well beyond a typical software keyboard's height) so the "Add question"
    // and "Done" buttons at the bottom of a long form can always be scrolled above the
    // keyboard/safe area — on Android in particular, KeyboardAvoidingView applies no padding
    // of its own here (behavior is undefined on that platform), so the ScrollView itself must
    // provide enough room to scroll the buttons into view.
    paddingBottom: PathoraSpacing[64] * 3,
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
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 14,
    lineHeight: 20,
    color: PathoraColors.textSecondary,
    marginBottom: PathoraSpacing[20],
  },
  lockedBanner: {
    borderRadius: PathoraRadius[12],
    backgroundColor: PathoraColors.amber100,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: PathoraSpacing[20],
  },
  lockedBannerText: {
    fontFamily: PathoraFonts.en.semiBold,
    fontSize: 13,
    lineHeight: 19,
    color: PathoraColors.amber600,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: PathoraSpacing[40],
    gap: PathoraSpacing[16],
  },
  errorText: {
    fontFamily: PathoraFonts.en.medium,
    fontSize: 14,
    color: PathoraColors.error,
    textAlign: 'center',
  },
  retryButton: {
    minWidth: 140,
  },
  emptyState: {
    borderRadius: PathoraRadius[14],
    backgroundColor: PathoraColors.surface,
    borderWidth: 1,
    borderColor: PathoraColors.border,
    paddingVertical: PathoraSpacing[24],
    paddingHorizontal: PathoraSpacing[20],
    alignItems: 'center',
    gap: 6,
    marginBottom: PathoraSpacing[20],
  },
  emptyTitle: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 15,
    color: PathoraColors.ink900,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 13,
    lineHeight: 19,
    color: PathoraColors.textSecondary,
    textAlign: 'center',
  },
  list: {
    gap: PathoraSpacing[12],
    marginBottom: PathoraSpacing[20],
  },
  card: {
    borderRadius: PathoraRadius[14],
    backgroundColor: PathoraColors.surface,
    borderWidth: 1,
    borderColor: PathoraColors.border,
    padding: PathoraSpacing[16],
    gap: PathoraSpacing[12],
  },
  cardFields: {
    gap: PathoraSpacing[16],
  },
  questionText: {
    fontFamily: PathoraFonts.en.semiBold,
    fontSize: 14.5,
    lineHeight: 20,
    color: PathoraColors.ink900,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    borderRadius: PathoraRadius[999],
    backgroundColor: PathoraColors.paper,
    borderWidth: 1,
    borderColor: PathoraColors.borderStrong,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeBadgeText: {
    fontFamily: PathoraFonts.en.semiBold,
    fontSize: 11.5,
    color: PathoraColors.textSecondary,
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
    fontSize: 11.5,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  requiredBadgeTextOn: {
    color: PathoraColors.teal700,
  },
  requiredBadgeTextOff: {
    color: PathoraColors.textTertiary,
  },
  orderText: {
    fontFamily: PathoraFonts.en.medium,
    fontSize: 12,
    color: PathoraColors.textTertiary,
  },
  cardActions: {
    flexDirection: 'row',
    gap: PathoraSpacing[20],
  },
  cardActionButton: {
    paddingVertical: 4,
  },
  cardActionText: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 13,
    color: PathoraColors.teal700,
  },
  cardActionTextDestructive: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 13,
    color: PathoraColors.error,
  },
  cardActionTextDisabled: {
    color: PathoraColors.textTertiary,
  },
  cardError: {
    fontFamily: PathoraFonts.en.medium,
    fontSize: 12.5,
    color: PathoraColors.error,
  },
  editActions: {
    flexDirection: 'row',
    gap: PathoraSpacing[12],
  },
  editActionButton: {
    flex: 1,
  },
  requiredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  requiredLabel: {
    fontFamily: PathoraFonts.en.semiBold,
    fontSize: 13.5,
    color: PathoraColors.ink900,
  },
  addForm: {
    borderRadius: PathoraRadius[14],
    backgroundColor: PathoraColors.surface,
    borderWidth: 1,
    borderColor: PathoraColors.border,
    padding: PathoraSpacing[16],
    gap: PathoraSpacing[16],
    marginBottom: PathoraSpacing[24],
  },
  addFormTitle: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 15.5,
    color: PathoraColors.ink900,
  },
  addButton: {
    marginTop: 4,
  },
  doneButton: {
    marginBottom: PathoraSpacing[24],
  },
});
