/**
 * Path | Student internship details · Phase 1 / Step 6.
 *
 * Visual-only refresh: the existing personalized internship API, saved-state
 * updates, internal application wizard, external website redirect, onboarding
 * protection, and error handling remain intact.
 *
 * The details stack sits inside the student tab navigator. Scroll content gets
 * extra bottom clearance so the last action stays reachable above the floating
 * Liquid Glass navigation without painting a beige footer underneath it.
 */
import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useCallback, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
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

type IconName = SymbolViewProps['name'];

function Icon({ name, size = 17, color = PathoraColors.textSecondary }: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <SymbolView name={name} size={size} tintColor={color} />;
}

function initials(name: string) {
  return (name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('') || '?').toUpperCase();
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function DetailTile({ label, value, icon }: { label: string; value: string; icon: IconName }) {
  return (
    <View style={styles.detailTile}>
      <View style={styles.tileIcon}>
        <Icon name={icon} size={17} color={PathoraColors.teal700} />
      </View>
      <View style={styles.tileCopy}>
        <Text style={styles.tileLabel}>{label}</Text>
        <Text style={styles.tileValue}>{value}</Text>
      </View>
    </View>
  );
}

function SectionCard({ children }: { children: ReactNode }) {
  return <View style={styles.sectionCard}>{children}</View>;
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
    if (!token) return;
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
        setError(null);
        return;
      }
      setError(describeOnboardingError(loadError));
    }
  }, [token, internshipId, router]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const handleFavoritePress = async () => {
    if (!token || !internship || isUpdatingFavorite) return;
    setIsUpdatingFavorite(true);
    try {
      if (internship.favorited) {
        await unfavoriteInternship(token, internship.id);
      } else {
        await favoriteInternship(token, internship.id);
      }
      setInternship((current) => current ? { ...current, favorited: !current.favorited } : current);
    } catch {
      Alert.alert('Unable to update favorite', 'Please try again.');
    } finally {
      setIsUpdatingFavorite(false);
    }
  };

  const handleApplyPress = async (current: InternInternship) => {
    setApplyError(null);

    // External applications must never enter Path's internal wizard.
    // Keep the backend-provided, validated http(s) URL as the only destination.
    if (current.applicationMethod === 'EXTERNAL') {
      const url = current.externalApplicationUrl;
      if (!url || !isValidExternalApplicationUrl(url)) {
        setApplyError('This internship’s application link is unavailable right now.');
        return;
      }
      setIsOpeningExternalUrl(true);
      try {
        if (!(await Linking.canOpenURL(url))) {
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

    router.push({ pathname: '/intern/internships/[id]/apply', params: { id: current.id } });
  };

  if (notFound || error || !internship) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.stateHeader}>
          <AuthBackButton onPress={() => router.back()} />
          <Text style={styles.stateHeaderTitle}>Internship details</Text>
        </View>
        <View style={styles.centerContent}>
          {notFound ? (
            <>
              <View style={styles.stateIcon}><Icon name={{ ios: 'briefcase.fill', android: 'work_off', web: 'work_off' }} size={29} color={PathoraColors.teal700} /></View>
              <Text style={styles.stateTitle}>Opportunity unavailable</Text>
              <Text style={styles.stateText}>This internship is no longer available.</Text>
            </>
          ) : error ? (
            <>
              <View style={styles.stateIcon}><Icon name={{ ios: 'wifi.exclamationmark', android: 'wifi_off', web: 'wifi_off' }} size={29} color={PathoraColors.teal700} /></View>
              <Text style={styles.stateTitle}>Something went wrong</Text>
              <Text style={styles.stateText}>{error}</Text>
              <PathoraButton label="Try again" variant="secondary" onPress={() => void load()} style={styles.retryButton} />
            </>
          ) : (
            <>
              <ActivityIndicator size="large" color={PathoraColors.teal600} />
              <Text style={styles.loadingText}>Loading opportunity…</Text>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const explanations = buildMatchExplanations(internship);
  const matchedSkillIds = new Set(internship.matchedSkills.map((skill) => skill.id));
  const matchPercent = Math.min(100, Math.max(0, Number.isFinite(internship.relevancePercentage) ? internship.relevancePercentage : 0));
  const isExternal = internship.applicationMethod === 'EXTERNAL';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <View style={styles.backWrap}>
            <AuthBackButton onPress={() => router.back()} />
            <Text style={styles.topBarTitle}>Internship details</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={internship.favorited ? 'Remove from favorites' : 'Save internship to favorites'}
            accessibilityState={{ selected: internship.favorited, disabled: isUpdatingFavorite }}
            disabled={isUpdatingFavorite}
            onPress={handleFavoritePress}
            hitSlop={8}
            style={({ pressed }) => [
              styles.saveButton,
              internship.favorited && styles.saveButtonActive,
              pressed && !isUpdatingFavorite && styles.touchPressed,
              isUpdatingFavorite && styles.disabled,
            ]}>
            <Icon
              name={internship.favorited
                ? { ios: 'bookmark.fill', android: 'bookmark', web: 'bookmark' }
                : { ios: 'bookmark', android: 'bookmark_border', web: 'bookmark_border' }}
              color={internship.favorited ? PathoraColors.teal700 : PathoraColors.textSecondary}
              size={20}
            />
          </Pressable>
        </View>

        <Animated.View entering={FadeInDown.duration(350).reduceMotion(ReduceMotion.System)}>
          <View style={styles.identityRow}>
            <View style={styles.companyLogo}>
              <Text style={styles.companyInitials}>{initials(internship.companyName)}</Text>
            </View>
            <View style={styles.identityCopy}>
              <Text style={styles.identityEyebrow}>INTERNSHIP OPPORTUNITY</Text>
              <Text style={styles.roleTitle}>{internship.title}</Text>
              <Text style={styles.companyName}>{internship.companyName}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Icon name={{ ios: 'mappin.and.ellipse', android: 'place', web: 'place' }} size={15} />
              <Text style={styles.metaText}>{internship.location}</Text>
            </View>
            <View style={styles.metaChip}>
              <Icon name={{ ios: 'building.2', android: 'domain', web: 'domain' }} size={15} />
              <Text style={styles.metaText}>{WORK_MODE_LABELS[internship.workMode]}</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(350).delay(70).reduceMotion(ReduceMotion.System)} style={styles.matchCard}>
          <View style={styles.matchHeader}>
            <View style={styles.matchHeaderLabel}>
              <Icon name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }} size={18} color={PathoraColors.teal700} />
              <View>
                <Text style={styles.matchEyebrow}>PERSONALIZED FOR YOU</Text>
                <Text style={styles.matchTitle}>Your match</Text>
              </View>
            </View>
            <Text style={styles.matchPercentage}>{internship.relevancePercentage}%</Text>
          </View>
          <View style={styles.progressTrack} accessibilityLabel={`${internship.relevancePercentage} percent match`}>
            <LinearGradient
              colors={['#218979', PathoraColors.teal700]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${matchPercent}%` as `${number}%` }]}
            />
          </View>
          {explanations.length > 0 ? (
            <View style={styles.reasonsList}>
              {explanations.map((explanation) => (
                <View key={explanation} style={styles.reasonRow}>
                  <Icon name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }} size={16} color={PathoraColors.teal600} />
                  <Text style={styles.reasonText}>{explanation}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.matchFootnote}>Explore the requirements below to see whether this role is right for you.</Text>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(350).delay(125).reduceMotion(ReduceMotion.System)} style={styles.contentSection}>
          <SectionTitle eyebrow="AT A GLANCE" title="Opportunity details" />
          <View style={styles.detailGrid}>
            <DetailTile label="Apply by" value={formatDisplayDate(internship.applicationDeadline)} icon={{ ios: 'calendar', android: 'event', web: 'event' }} />
            {internship.startDate ? (
              <DetailTile label="Starts" value={formatDisplayDate(internship.startDate)} icon={{ ios: 'calendar.badge.clock', android: 'date_range', web: 'date_range' }} />
            ) : null}
            {internship.durationMonths ? (
              <DetailTile label="Duration" value={`${internship.durationMonths} month${internship.durationMonths === 1 ? '' : 's'}`} icon={{ ios: 'clock', android: 'schedule', web: 'schedule' }} />
            ) : null}
            {internship.minimumAcademicYear !== null ? (
              <DetailTile label="Eligibility" value={formatMinimumAcademicYearEligibility(internship.minimumAcademicYear)} icon={{ ios: 'graduationcap', android: 'school', web: 'school' }} />
            ) : null}
            <DetailTile label="Apply via" value={isExternal ? 'Company website' : 'Path'} icon={{ ios: 'arrow.up.right.square', android: 'open_in_new', web: 'open_in_new' }} />
          </View>
        </Animated.View>

        <View style={styles.contentSection}>
          <SectionTitle eyebrow="THE OPPORTUNITY" title="About the role" />
          <SectionCard>
            <Text style={styles.description}>{internship.description}</Text>
          </SectionCard>
        </View>

        <View style={styles.contentSection}>
          <View style={styles.sectionTitleRow}>
            <SectionTitle eyebrow="WHAT YOU'LL NEED" title="Required skills" />
            <View style={styles.skillsCountPill}>
              <Text style={styles.skillsCountText}>{internship.skills.length} skills</Text>
            </View>
          </View>
          <SectionCard>
            {internship.skills.length > 0 ? (
              <>
                <View style={styles.skillsWrap}>
                  {internship.skills.map((skill) => {
                    const matched = matchedSkillIds.has(skill.id);
                    return (
                      <View key={skill.id} style={[styles.skillChip, matched && styles.skillChipMatched]}>
                        {matched ? (
                          <Icon name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={12} color={PathoraColors.teal700} />
                        ) : null}
                        <Text style={[styles.skillText, matched && styles.skillTextMatched]}>{skill.name}</Text>
                      </View>
                    );
                  })}
                </View>
                {internship.matchedSkillCount > 0 ? (
                  <View style={styles.skillLegend}>
                    <Icon name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }} size={15} color={PathoraColors.teal600} />
                    <Text style={styles.skillLegendText}>Teal skills match your profile</Text>
                  </View>
                ) : null}
              </>
            ) : (
              <Text style={styles.emptySectionText}>No specific skills were listed for this opportunity.</Text>
            )}
          </SectionCard>
        </View>

        {internship.targetMajors.length > 0 ? (
          <View style={styles.contentSection}>
            <SectionTitle eyebrow="WHO IT'S FOR" title="Target majors" />
            <SectionCard>
              <View style={styles.skillsWrap}>
                {internship.targetMajors.map((major) => (
                  <View key={major} style={styles.majorChip}>
                    <Icon name={{ ios: 'graduationcap', android: 'school', web: 'school' }} size={15} color={PathoraColors.teal700} />
                    <Text style={styles.majorText}>{major}</Text>
                  </View>
                ))}
              </View>
            </SectionCard>
          </View>
        ) : null}

        <View style={styles.applicationSection}>
          <View style={styles.applicationTop}>
            <View style={styles.applicationIcon}>
              <Icon name={{ ios: 'paperplane.fill', android: 'send', web: 'send' }} size={19} color={PathoraColors.teal700} />
            </View>
            <View style={styles.applicationTextWrap}>
              <Text style={styles.applicationTitle}>Interested in this role?</Text>
              <Text style={styles.applicationSubtitle}>
                {isExternal ? 'Continue to the company website to apply.' : 'Apply securely using your Path profile.'}
              </Text>
            </View>
          </View>
          {applyError ? <Text style={styles.applyError}>{applyError}</Text> : null}
          <Pressable
            disabled={isOpeningExternalUrl}
            accessibilityRole="button"
            accessibilityLabel={isExternal ? 'Apply on company website' : 'Apply through Path'}
            accessibilityState={{ disabled: isOpeningExternalUrl }}
            onPress={() => void handleApplyPress(internship)}
            style={({ pressed }) => [styles.applyPressable, pressed && !isOpeningExternalUrl && styles.applyPressed, isOpeningExternalUrl && styles.disabled]}>
            <LinearGradient colors={['#178273', '#116259', '#0D4A43']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.applyGradient}>
              {isOpeningExternalUrl ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.applyLabel}>{isExternal ? 'Apply on company website' : 'Apply through Path'}</Text>
                  <Icon
                    name={isExternal
                      ? { ios: 'arrow.up.right', android: 'north_east', web: 'north_east' }
                      : { ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }}
                    color="#FFFFFF"
                    size={20}
                  />
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>

        <Text style={styles.endCaption}>Your next chapter starts with Path.</Text>
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
  safeArea: { flex: 1, backgroundColor: PathoraColors.paper },
  scrollContent: {
    paddingHorizontal: PathoraSpacing[20],
    paddingTop: PathoraSpacing[12],
    paddingBottom: 160,
    gap: PathoraSpacing[24],
  },
  touchPressed: { opacity: 0.77, transform: [{ scale: 0.96 }] },
  disabled: { opacity: 0.5 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 1 },
  backWrap: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  topBarTitle: { fontFamily: PathoraFonts.en.bold, color: PathoraColors.ink900, fontSize: 13 },
  saveButton: { width: 43, height: 43, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: PathoraColors.border, backgroundColor: PathoraColors.surface },
  saveButtonActive: { backgroundColor: PathoraColors.teal100, borderColor: '#C5E4DE' },
  identityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 13 },
  companyLogo: { width: 61, height: 61, borderRadius: 19, backgroundColor: PathoraColors.teal100, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D2EAE3' },
  companyInitials: { color: PathoraColors.teal700, fontFamily: PathoraFonts.en.extraBold, fontSize: 21 },
  identityCopy: { flex: 1, gap: 6, paddingTop: 3 },
  identityEyebrow: { fontFamily: PathoraFonts.en.bold, color: PathoraColors.teal600, fontSize: 10, letterSpacing: 1.4 },
  roleTitle: { color: PathoraColors.ink900, fontFamily: PathoraFonts.en.extraBold, fontSize: 24, lineHeight: 31, letterSpacing: -0.7 },
  companyName: { color: PathoraColors.textSecondary, fontFamily: PathoraFonts.en.semiBold, fontSize: 13.5 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%', paddingVertical: 9, paddingHorizontal: 11, borderRadius: 11, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: PathoraColors.border },
  metaText: { fontFamily: PathoraFonts.en.medium, fontSize: 12, color: PathoraColors.textSecondary, flexShrink: 1 },
  matchCard: { backgroundColor: '#EEF7F3', borderRadius: 20, borderWidth: 1, borderColor: '#D6EAE1', padding: 19, gap: 14 },
  matchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  matchHeaderLabel: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  matchEyebrow: { fontFamily: PathoraFonts.en.bold, color: PathoraColors.teal600, letterSpacing: 1.05, fontSize: 9 },
  matchTitle: { color: PathoraColors.teal700, fontFamily: PathoraFonts.en.extraBold, fontSize: 19, marginTop: 3 },
  matchPercentage: { fontFamily: PathoraFonts.en.extraBold, fontSize: 27, color: PathoraColors.teal700 },
  progressTrack: { height: 8, width: '100%', backgroundColor: '#D5E5DF', borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  reasonsList: { gap: 8 },
  reasonRow: { flexDirection: 'row', gap: 9, alignItems: 'center' },
  reasonText: { flex: 1, color: PathoraColors.teal700, fontFamily: PathoraFonts.en.medium, fontSize: 12.5, lineHeight: 18 },
  matchFootnote: { color: PathoraColors.teal700, fontFamily: PathoraFonts.en.medium, fontSize: 12, lineHeight: 18 },
  contentSection: { gap: 12 },
  sectionHeading: { gap: 4 },
  sectionEyebrow: { fontFamily: PathoraFonts.en.bold, color: PathoraColors.teal600, letterSpacing: 1.45, fontSize: 9.5 },
  sectionTitle: { fontFamily: PathoraFonts.en.extraBold, color: PathoraColors.ink900, fontSize: 20.5, lineHeight: 27, letterSpacing: -0.45 },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  sectionCard: { padding: 17, backgroundColor: '#FFFFFF', borderRadius: 19, borderWidth: 1, borderColor: PathoraColors.border, shadowColor: PathoraColors.ink900, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  detailTile: { backgroundColor: '#FFFFFF', borderColor: PathoraColors.border, borderWidth: 1, borderRadius: 16, padding: 12, flexBasis: '46%', flexGrow: 1, minWidth: 0, minHeight: 91, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  tileIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: PathoraColors.teal100, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  tileCopy: { flex: 1, gap: 5, paddingTop: 1, minWidth: 0 },
  tileLabel: { fontFamily: PathoraFonts.en.medium, fontSize: 10.5, color: PathoraColors.textSecondary },
  tileValue: { fontFamily: PathoraFonts.en.bold, fontSize: 11.5, lineHeight: 16, color: PathoraColors.ink900 },
  description: { fontFamily: PathoraFonts.en.regular, fontSize: 13.5, lineHeight: 22, color: PathoraColors.ink700 },
  skillsCountPill: { backgroundColor: PathoraColors.teal100, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99 },
  skillsCountText: { color: PathoraColors.teal700, fontFamily: PathoraFonts.en.bold, fontSize: 11 },
  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F3F4F4', paddingHorizontal: 11, paddingVertical: 8, borderRadius: 10, maxWidth: '100%' },
  skillChipMatched: { backgroundColor: PathoraColors.teal100 },
  skillText: { color: PathoraColors.textSecondary, fontFamily: PathoraFonts.en.semiBold, fontSize: 11.5, flexShrink: 1 },
  skillTextMatched: { color: PathoraColors.teal700 },
  skillLegend: { borderTopWidth: 1, borderTopColor: '#F0EEE9', paddingTop: 13, marginTop: 15, flexDirection: 'row', alignItems: 'center', gap: 7 },
  skillLegendText: { color: PathoraColors.textSecondary, fontFamily: PathoraFonts.en.medium, fontSize: 11 },
  majorChip: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#EFF5F2', paddingHorizontal: 11, paddingVertical: 8, borderRadius: 10, maxWidth: '100%' },
  majorText: { color: PathoraColors.teal700, fontFamily: PathoraFonts.en.semiBold, fontSize: 11.5, flexShrink: 1 },
  emptySectionText: { color: PathoraColors.textSecondary, fontFamily: PathoraFonts.en.regular, fontSize: 12.5 },
  applicationSection: { padding: 18, borderRadius: 19, borderWidth: 1, borderColor: PathoraColors.border, backgroundColor: '#FFFFFF', gap: 16 },
  applicationTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  applicationIcon: { width: 41, height: 41, borderRadius: 12, backgroundColor: PathoraColors.teal100, alignItems: 'center', justifyContent: 'center' },
  applicationTextWrap: { flex: 1, gap: 4 },
  applicationTitle: { fontFamily: PathoraFonts.en.bold, color: PathoraColors.ink900, fontSize: 15.5 },
  applicationSubtitle: { fontFamily: PathoraFonts.en.medium, color: PathoraColors.textSecondary, fontSize: 11.5, lineHeight: 17 },
  applyError: { fontFamily: PathoraFonts.en.medium, fontSize: 12.5, color: PathoraColors.error, lineHeight: 18 },
  applyPressable: { borderRadius: 14, overflow: 'hidden' },
  applyPressed: { transform: [{ scale: 0.988 }], opacity: 0.9 },
  applyGradient: { minHeight: 53, paddingHorizontal: 17, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 11 },
  applyLabel: { color: '#FFFFFF', fontFamily: PathoraFonts.en.bold, fontSize: 13.5, textAlign: 'center', flexShrink: 1 },
  endCaption: { color: PathoraColors.textTertiary, fontFamily: PathoraFonts.en.medium, fontSize: 11.5, textAlign: 'center' },
  stateHeader: { paddingTop: 11, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', gap: 8 },
  stateHeaderTitle: { fontFamily: PathoraFonts.en.bold, color: PathoraColors.ink900, fontSize: 14 },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: PathoraSpacing[24], paddingBottom: 110, gap: 13 },
  stateIcon: { height: 66, width: 66, backgroundColor: PathoraColors.teal100, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  stateTitle: { fontFamily: PathoraFonts.en.extraBold, color: PathoraColors.ink900, fontSize: 18, textAlign: 'center' },
  stateText: { fontFamily: PathoraFonts.en.medium, color: PathoraColors.textSecondary, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  loadingText: { fontFamily: PathoraFonts.en.medium, color: PathoraColors.textSecondary, fontSize: 12.5 },
  retryButton: { minWidth: 150 },
});
