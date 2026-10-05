import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthBackButton } from '@/components/auth-back-button';
import { OnboardingGuard } from '@/components/onboarding/onboarding-guard';
import { PathoraButton } from '@/components/pathora-button';
import { PathoraColors, PathoraFonts, PathoraRadius, PathoraSpacing } from '@/constants/pathora-theme';
import { useAuth } from '@/context/auth-context';
import {
  ApiError,
  favoriteInternship,
  getInternInternship,
  getInternProfileOrNull,
  type InternInternship,
  unfavoriteInternship,
} from '@/lib/api';
import { formatDisplayDate } from '@/lib/date';
import {
  buildMatchExplanations,
  formatMinimumAcademicYearEligibility,
  isValidExternalApplicationUrl,
  WORK_MODE_LABELS,
} from '@/lib/internship-options';
import { describeOnboardingError, resolveFirstIncompleteOnboardingStep } from '@/lib/onboarding';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function InternInternshipDetailsScreen({ internshipId }: { internshipId: string }) {
  const router = useRouter();
  const { token } = useAuth();

  const [internship, setInternship] = useState<InternInternship | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [isOpeningExternalUrl, setIsOpeningExternalUrl] = useState(false);
  const [isUpdatingFavorite, setIsUpdatingFavorite] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }
    try {
      const data = await getInternInternship(token, internshipId);
      setInternship(data);
      setError(null);
      setNotFound(false);
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.status === 403) {
        const profile = await getInternProfileOrNull(token).catch(() => null);
        const nextStep = resolveFirstIncompleteOnboardingStep(profile);
        router.replace(nextStep ?? '/onboarding/personal');
        return;
      }
      if (loadError instanceof ApiError && loadError.status === 404) {
        setNotFound(true);
        return;
      }
      setError(describeOnboardingError(loadError));
    }
  }, [token, internshipId, router]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleFavoritePress = async () => {
    if (!token || !internship || isUpdatingFavorite) {
      return;
    }

    setIsUpdatingFavorite(true);
    try {
      if (internship.favorited) {
        await unfavoriteInternship(token, internship.id);
      } else {
        await favoriteInternship(token, internship.id);
      }
      setInternship((current) =>
        current ? { ...current, favorited: !current.favorited } : current,
      );
    } catch {
      Alert.alert('Unable to update favorite', 'Please try again.');
    } finally {
      setIsUpdatingFavorite(false);
    }
  };

  const handleApplyPress = async (current: InternInternship) => {
    setApplyError(null);

    // EXTERNAL and INTERNAL are mutually exclusive, enforced by an unconditional `return` at
    // the end of this branch — nothing below it can execute for an EXTERNAL internship, no
    // matter what Linking does. Never opens the Pathora form, never fetches application
    // questions, never calls the internal application endpoint. Backend data is
    // authoritative; only a validated http(s) URL is ever opened.
    if (current.applicationMethod === 'EXTERNAL') {
      const url = current.externalApplicationUrl;
      if (!url || !isValidExternalApplicationUrl(url)) {
        setApplyError('This internship’s application link is unavailable right now.');
        return;
      }

      setIsOpeningExternalUrl(true);
      try {
        const canOpen = await Linking.canOpenURL(url);
        if (!canOpen) {
          setApplyError('Unable to open the company’s application page.');
          return;
        }
        await Linking.openURL(url);
      } catch {
        setApplyError('Unable to open the company’s application page.');
      } finally {
        setIsOpeningExternalUrl(false);
      }
      return;
    }

    // INTERNAL only — reached only when the EXTERNAL branch above did not return.
    router.push({ pathname: '/intern/internships/[id]/apply', params: { id: current.id } });
  };

  if (notFound) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <AuthBackButton onPress={() => router.back()} style={styles.backButton} />
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>This internship is no longer available.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <AuthBackButton onPress={() => router.back()} style={styles.backButton} />
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
          <PathoraButton label="Try again" variant="secondary" onPress={load} style={styles.retryButton} />
        </View>
      </SafeAreaView>
    );
  }

  if (!internship) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <AuthBackButton onPress={() => router.back()} style={styles.backButton} />
        <View style={styles.centerContent}>
          <ActivityIndicator color={PathoraColors.teal600} />
        </View>
      </SafeAreaView>
    );
  }

  const explanations = buildMatchExplanations(internship);
  const matchedSkillIds = new Set(internship.matchedSkills.map((skill) => skill.id));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AuthBackButton onPress={() => router.back()} style={styles.backButton} />

        <View style={styles.titleRow}>
          <Text style={styles.title}>{internship.title}</Text>
          <Pressable
            onPress={handleFavoritePress}
            disabled={isUpdatingFavorite}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={internship.favorited ? 'Remove from favorites' : 'Add to favorites'}
            accessibilityState={{ selected: internship.favorited, disabled: isUpdatingFavorite }}
            style={({ pressed }) => [
              styles.favoriteButton,
              internship.favorited && styles.favoriteButtonActive,
              pressed && !isUpdatingFavorite && styles.favoriteButtonPressed,
              isUpdatingFavorite && styles.favoriteButtonDisabled,
            ]}>
            <SymbolView
              name={
                internship.favorited
                  ? { ios: 'bookmark.fill', android: 'bookmark', web: 'bookmark' }
                  : { ios: 'bookmark', android: 'bookmark_border', web: 'bookmark_border' }
              }
              size={22}
              tintColor={internship.favorited ? PathoraColors.teal700 : PathoraColors.textSecondary}
            />
          </Pressable>
        </View>
        <Text style={styles.companyName}>{internship.companyName}</Text>

        <View style={styles.matchBadge}>
          <Text style={styles.matchBadgeText}>{internship.relevancePercentage}% match</Text>
        </View>

        <Text style={styles.description}>{internship.description}</Text>

        <View style={styles.infoCard}>
          <InfoRow label="Location" value={internship.location} />
          <InfoRow label="Work mode" value={WORK_MODE_LABELS[internship.workMode]} />
          <InfoRow label="Application deadline" value={formatDisplayDate(internship.applicationDeadline)} />
          {internship.startDate && <InfoRow label="Start date" value={formatDisplayDate(internship.startDate)} />}
          {internship.durationMonths && (
            <InfoRow
              label="Duration"
              value={`${internship.durationMonths} month${internship.durationMonths === 1 ? '' : 's'}`}
            />
          )}
          {internship.minimumAcademicYear !== null && (
            <InfoRow
              label="Eligibility"
              value={formatMinimumAcademicYearEligibility(internship.minimumAcademicYear)}
            />
          )}
        </View>

        <View>
          <Text style={styles.label}>Required skills</Text>
          <View style={styles.chipsWrap}>
            {internship.skills.map((skill) => {
              const isMatched = matchedSkillIds.has(skill.id);
              return (
                <View key={skill.id} style={[styles.skillChip, !isMatched && styles.skillChipUnmatched]}>
                  <Text style={[styles.skillChipText, !isMatched && styles.skillChipTextUnmatched]}>
                    {skill.name}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {internship.targetMajors.length > 0 && (
          <View>
            <Text style={styles.label}>Target majors</Text>
            <View style={styles.chipsWrap}>
              {internship.targetMajors.map((major) => (
                <View key={major} style={styles.skillChip}>
                  <Text style={styles.skillChipText}>{major}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.whyCard}>
          <Text style={styles.whyTitle}>Why this matches you</Text>
          <Text style={styles.whyPercentage}>{internship.relevancePercentage}% match</Text>

          {explanations.length > 0 ? (
            <View style={styles.whyList}>
              {explanations.map((line) => (
                <View key={line} style={styles.whyRow}>
                  <SymbolView
                    name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
                    size={16}
                    tintColor={PathoraColors.teal600}
                  />
                  <Text style={styles.whyText}>{line}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.whyEmptyText}>
              This internship doesn&apos;t match your skills or major yet.
            </Text>
          )}
        </View>

        {applyError && <Text style={styles.applyError}>{applyError}</Text>}

        <PathoraButton
          label={
            internship.applicationMethod === 'INTERNAL'
              ? 'Apply through Pathora'
              : isOpeningExternalUrl
                ? 'Opening…'
                : 'Apply on company website'
          }
          variant="primary"
          onPress={() => handleApplyPress(internship)}
          disabled={isOpeningExternalUrl}
          style={styles.applyButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

export default function InternInternshipDetailsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <OnboardingGuard>
      {id ? <InternInternshipDetailsScreen internshipId={id} /> : null}
    </OnboardingGuard>
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
    paddingBottom: PathoraSpacing[24],
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
  retryButton: {
    minWidth: 140,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: PathoraSpacing[12],
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 22,
    color: PathoraColors.ink900,
  },
  favoriteButton: {
    width: 42,
    height: 42,
    borderRadius: PathoraRadius[12],
    borderWidth: 1,
    borderColor: PathoraColors.border,
    backgroundColor: PathoraColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteButtonActive: {
    backgroundColor: PathoraColors.teal100,
    borderColor: PathoraColors.teal400,
  },
  favoriteButtonPressed: {
    opacity: 0.7,
  },
  favoriteButtonDisabled: {
    opacity: 0.45,
  },
  companyName: {
    fontFamily: PathoraFonts.en.medium,
    fontSize: 14,
    color: PathoraColors.textSecondary,
    marginBottom: PathoraSpacing[16],
  },
  matchBadge: {
    alignSelf: 'flex-start',
    borderRadius: PathoraRadius[999],
    backgroundColor: PathoraColors.teal100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: PathoraSpacing[20],
  },
  matchBadgeText: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 13.5,
    color: PathoraColors.teal700,
  },
  description: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 14.5,
    lineHeight: 22,
    color: PathoraColors.ink900,
    marginBottom: PathoraSpacing[20],
  },
  infoCard: {
    borderRadius: PathoraRadius[14],
    backgroundColor: PathoraColors.surface,
    borderWidth: 1,
    borderColor: PathoraColors.border,
    paddingVertical: PathoraSpacing[16],
    paddingHorizontal: PathoraSpacing[16],
    marginBottom: PathoraSpacing[20],
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: PathoraSpacing[12],
  },
  infoLabel: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 13,
    color: PathoraColors.textSecondary,
  },
  infoValue: {
    fontFamily: PathoraFonts.en.semiBold,
    fontSize: 13,
    color: PathoraColors.ink900,
    flexShrink: 1,
    textAlign: 'right',
  },
  label: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 13,
    color: PathoraColors.ink900,
    marginBottom: 8,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: PathoraSpacing[24],
  },
  skillChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: PathoraRadius[999],
    backgroundColor: PathoraColors.teal100,
  },
  skillChipUnmatched: {
    backgroundColor: PathoraColors.paper,
    borderWidth: 1,
    borderColor: PathoraColors.borderStrong,
  },
  skillChipText: {
    fontFamily: PathoraFonts.en.semiBold,
    fontSize: 13,
    color: PathoraColors.teal700,
  },
  skillChipTextUnmatched: {
    color: PathoraColors.textSecondary,
  },
  whyCard: {
    borderRadius: PathoraRadius[14],
    backgroundColor: PathoraColors.teal100,
    paddingVertical: PathoraSpacing[20],
    paddingHorizontal: PathoraSpacing[16],
    marginBottom: PathoraSpacing[24],
  },
  whyTitle: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 14,
    color: PathoraColors.teal700,
    marginBottom: 6,
  },
  whyPercentage: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 28,
    color: PathoraColors.teal700,
    marginBottom: PathoraSpacing[12],
  },
  whyList: {
    gap: 8,
  },
  whyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  whyText: {
    fontFamily: PathoraFonts.en.medium,
    fontSize: 13.5,
    color: PathoraColors.teal700,
    flexShrink: 1,
  },
  whyEmptyText: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 13,
    color: PathoraColors.teal700,
  },
  applyError: {
    fontFamily: PathoraFonts.en.medium,
    fontSize: 13,
    color: PathoraColors.error,
    marginBottom: PathoraSpacing[12],
    textAlign: 'center',
  },
  applyButton: {
    marginBottom: PathoraSpacing[8],
  },
});
