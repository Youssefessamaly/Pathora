import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InternshipFeedCard } from '@/components/internship-feed-card';
import { PathoraButton } from '@/components/pathora-button';
import { PathoraSearchBar } from '@/components/pathora-search-bar';
import { ProfileStrengthCard } from '@/components/profile-strength-card';
import { PathoraColors, PathoraFonts, PathoraRadius, PathoraSpacing } from '@/constants/pathora-theme';
import { useAuth } from '@/context/auth-context';
import {
  ApiError,
  getInternApplications,
  getInternInternships,
  getInternProfileOrNull,
  type InternInternship,
  type InternProfile,
} from '@/lib/api';
import { initialsFor } from '@/lib/initials';
import { describeOnboardingError, resolveFirstIncompleteOnboardingStep } from '@/lib/onboarding';
import { calculateProfileStrength } from '@/lib/profile-strength';

const RECOMMENDED_PREVIEW_COUNT = 3;

function greetingForHour(hour: number): string {
  if (hour < 12) {
    return 'Good morning';
  }
  if (hour < 18) {
    return 'Good afternoon';
  }
  return 'Good evening';
}

function StatCard({
  label,
  value,
  active,
  onPress,
}: {
  label: string;
  value: number;
  active: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.statCard, pressed && onPress && styles.statCardPressed]}>
      <Text style={[styles.statValue, !active && styles.statValueMuted]}>{value}</Text>
      <Text style={[styles.statLabel, !active && styles.statLabelMuted]}>{label}</Text>
    </Pressable>
  );
}

function InternHomeScreen() {
  const router = useRouter();
  const { user, token } = useAuth();

  const [internships, setInternships] = useState<InternInternship[] | null>(null);
  const [profile, setProfile] = useState<InternProfile | null>(null);
  const [applicationsCount, setApplicationsCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }
    try {
      const data = await getInternInternships(token);
      setInternships(data);
      setError(null);
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.status === 403) {
        // Profile missing or onboarding incomplete — don't show a raw feed error,
        // send them to resume onboarding instead.
        const incompleteProfile = await getInternProfileOrNull(token).catch(() => null);
        const nextStep = resolveFirstIncompleteOnboardingStep(incompleteProfile);
        router.replace(nextStep ?? '/onboarding/personal');
        return;
      }
      setError(describeOnboardingError(loadError));
      return;
    }

    // Best-effort secondary data for the greeting/profile-strength/stats — never blocks the
    // feed (the one piece of this screen the intern actually came here for).
    const [profileResult, applicationsResult] = await Promise.allSettled([
      getInternProfileOrNull(token),
      getInternApplications(token),
    ]);
    setProfile(profileResult.status === 'fulfilled' ? profileResult.value : null);
    setApplicationsCount(applicationsResult.status === 'fulfilled' ? applicationsResult.value.length : 0);
  }, [token, router]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleSearchPress = () => {
    router.push('/intern/internships');
  };

  const handleSeeAllPress = () => {
    router.push('/intern/internships');
  };

  const handleProfileStrengthPress = () => {
    const nextStep = resolveFirstIncompleteOnboardingStep(profile);
    router.push(nextStep ?? '/intern/profile');
  };

  const greeting = greetingForHour(new Date().getHours());
  const firstName = profile?.firstName?.trim();
  const strength = profile ? calculateProfileStrength(profile) : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {internships === null && !error && (
        <View style={styles.centerContent}>
          <ActivityIndicator color={PathoraColors.teal600} />
        </View>
      )}

      {error && (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
          <PathoraButton label="Try again" variant="secondary" onPress={load} style={styles.retryButton} />
        </View>
      )}

      {internships !== null && !error && (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.title}>
                {greeting}
                {firstName ? `, ${firstName}` : ''}
              </Text>
              <Text style={styles.subtitle}>Let&apos;s find your next opportunity.</Text>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initialsFor(profile?.firstName ?? null, profile?.lastName ?? null, user?.email)}</Text>
            </View>
          </View>

          <PathoraSearchBar
            placeholder="Search internships"
            onPress={handleSearchPress}
            style={styles.searchBar}
          />

          {strength && (
            <ProfileStrengthCard
              percentage={strength.percentage}
              isOnboardingComplete={strength.isOnboardingComplete}
              onActionPress={handleProfileStrengthPress}
            />
          )}

          <View style={styles.statsRow}>
            <StatCard
              label="Applications"
              value={applicationsCount}
              active
              onPress={() => router.push('/intern/applications')}
            />
            {/* Saved internships have no backend yet — shown muted/non-interactive so the
                layout matches the design without claiming the feature exists. */}
            <StatCard label="Saved" value={0} active={false} />
            {/* No INTERVIEW application status exists yet — always 0, never derived from
                ACCEPTED. */}
            <StatCard label="Interviews" value={0} active={false} />
          </View>

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recommended for you</Text>
            {internships.length > 0 && (
              <Pressable onPress={handleSeeAllPress} accessibilityRole="button" hitSlop={8}>
                <Text style={styles.seeAllText}>See all</Text>
              </Pressable>
            )}
          </View>

          {internships.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No open internships yet</Text>
              <Text style={styles.emptyBody}>
                New opportunities will appear here when companies post them.
              </Text>
            </View>
          ) : (
            internships.slice(0, RECOMMENDED_PREVIEW_COUNT).map((internship) => (
              <InternshipFeedCard
                key={internship.id}
                item={internship}
                onPress={() =>
                  router.push({ pathname: '/intern/internships/[id]', params: { id: internship.id } })
                }
              />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

export default function InternHomeRoute() {
  return <InternHomeScreen />;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PathoraColors.paper,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: PathoraSpacing[24],
    paddingTop: 8,
    paddingBottom: PathoraSpacing[32],
    gap: PathoraSpacing[20],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: PathoraSpacing[12],
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 22,
    color: PathoraColors.ink900,
  },
  subtitle: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 13,
    color: PathoraColors.textSecondary,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: PathoraRadius[999],
    backgroundColor: PathoraColors.teal100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 15,
    color: PathoraColors.teal700,
  },
  searchBar: {
    marginTop: -4,
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
  statsRow: {
    flexDirection: 'row',
    gap: PathoraSpacing[12],
  },
  statCard: {
    flex: 1,
    borderRadius: PathoraRadius[14],
    backgroundColor: PathoraColors.surface,
    borderWidth: 1,
    borderColor: PathoraColors.border,
    paddingVertical: PathoraSpacing[16],
    alignItems: 'center',
    gap: 4,
  },
  statCardPressed: {
    opacity: 0.7,
  },
  statValue: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 20,
    color: PathoraColors.ink900,
  },
  statValueMuted: {
    color: PathoraColors.textTertiary,
  },
  statLabel: {
    fontFamily: PathoraFonts.en.medium,
    fontSize: 12,
    color: PathoraColors.textSecondary,
  },
  statLabelMuted: {
    color: PathoraColors.textTertiary,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: PathoraSpacing[8],
  },
  sectionTitle: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 16,
    color: PathoraColors.ink900,
  },
  seeAllText: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 13,
    color: PathoraColors.teal600,
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
  },
  emptyTitle: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 16,
    color: PathoraColors.ink900,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 13.5,
    lineHeight: 19,
    color: PathoraColors.textSecondary,
    textAlign: 'center',
  },
});
