import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PathoraButton } from '@/components/pathora-button';
import { PathoraColors, PathoraFonts, PathoraRadius, PathoraSpacing } from '@/constants/pathora-theme';
import { useAuth } from '@/context/auth-context';
import {
  ApiError,
  getInternInternships,
  getInternProfileOrNull,
  type InternInternship,
  type InternProfile,
} from '@/lib/api';
import { formatDisplayDate } from '@/lib/date';
import { formatMinimumAcademicYearLabel, WORK_MODE_LABELS } from '@/lib/internship-options';
import { describeOnboardingError, resolveFirstIncompleteOnboardingStep } from '@/lib/onboarding';

/**
 * Client-side gate for the intern home: requires an authenticated INTERN session.
 * The backend independently enforces this on every request regardless of this guard.
 */
function InternHomeGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isInitializing, user } = useAuth();
  const isIntern = user?.role === 'INTERN';

  useEffect(() => {
    if (isInitializing) {
      return;
    }
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (!isIntern) {
      // Signed in, but as the wrong role — send them to their own home instead of
      // bouncing an already-authenticated user back to the login screen.
      router.replace(user?.role === 'COMPANY' ? '/company' : '/login');
    }
  }, [isInitializing, isAuthenticated, isIntern, user?.role, router]);

  if (isInitializing || !isAuthenticated || !isIntern) {
    return <View style={styles.guardFallback} />;
  }

  return <>{children}</>;
}

/** First letter of first + last name, falling back to the first letter of an email. */
function initialsFor(firstName: string | null, lastName: string | null, email?: string): string {
  const first = firstName?.trim()?.charAt(0) ?? '';
  const last = lastName?.trim()?.charAt(0) ?? '';
  const combined = `${first}${last}`.toUpperCase();
  if (combined) {
    return combined;
  }
  return (email?.trim()?.charAt(0) ?? '?').toUpperCase();
}

function companyInitials(companyName: string): string {
  const words = companyName.trim().split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 2).map((word) => word.charAt(0));
  return (letters.join('') || '?').toUpperCase();
}

function greetingForHour(hour: number): string {
  if (hour < 12) {
    return 'Good morning';
  }
  if (hour < 18) {
    return 'Good afternoon';
  }
  return 'Good evening';
}

function InternshipFeedCard({ item, onPress }: { item: InternInternship; onPress: () => void }) {
  const skillNames = item.skills.slice(0, 4).map((skill) => skill.name);
  const extraSkillCount = item.skills.length - skillNames.length;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.cardTopRow}>
        <View style={styles.companyBadge}>
          <Text style={styles.companyBadgeText}>{companyInitials(item.companyName)}</Text>
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.cardCompany} numberOfLines={1}>
            {item.companyName}
          </Text>
        </View>
      </View>

      <Text style={styles.cardMeta} numberOfLines={1}>
        {item.location} · {WORK_MODE_LABELS[item.workMode]}
        {item.minimumAcademicYear !== null && ` · ${formatMinimumAcademicYearLabel(item.minimumAcademicYear)}`}
      </Text>

      {skillNames.length > 0 && (
        <View style={styles.chipsWrap}>
          {skillNames.map((name) => (
            <View key={name} style={styles.skillChip}>
              <Text style={styles.skillChipText}>{name}</Text>
            </View>
          ))}
          {extraSkillCount > 0 && (
            <View style={styles.skillChip}>
              <Text style={styles.skillChipText}>+{extraSkillCount}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.cardBottomRow}>
        <Text style={styles.cardDeadline}>Deadline {formatDisplayDate(item.applicationDeadline)}</Text>
        <View style={styles.matchPill}>
          <Text style={styles.matchPillText}>{item.relevancePercentage}% match</Text>
        </View>
      </View>
    </Pressable>
  );
}

function InternHomeScreen() {
  const router = useRouter();
  const { user, token, signOut } = useAuth();

  const [internships, setInternships] = useState<InternInternship[] | null>(null);
  const [profile, setProfile] = useState<InternProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }
    try {
      const [data] = await Promise.all([
        getInternInternships(token),
        // Best-effort — only used for the greeting name, never blocks the feed.
        getInternProfileOrNull(token).then(setProfile).catch(() => undefined),
      ]);
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
    }
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

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  const greeting = greetingForHour(new Date().getHours());
  const firstName = profile?.firstName?.trim();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.title}>
            {greeting}
            {firstName ? `, ${firstName}` : ''}
          </Text>
          <Text style={styles.subtitle}>Internships picked for your profile.</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {initialsFor(profile?.firstName ?? null, profile?.lastName ?? null, user?.email)}
          </Text>
        </View>
      </View>

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

      {internships !== null && !error && internships.length === 0 && (
        <ScrollView
          contentContainerStyle={styles.emptyContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
          <Text style={styles.emptyTitle}>No open internships yet</Text>
          <Text style={styles.emptyBody}>
            New opportunities will appear here when companies post them.
          </Text>
        </ScrollView>
      )}

      {internships !== null && !error && internships.length > 0 && (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
          <Text style={styles.sectionTitle}>Recommended for you</Text>

          {internships.map((internship) => (
            <InternshipFeedCard
              key={internship.id}
              item={internship}
              onPress={() =>
                router.push({ pathname: '/intern/internships/[id]', params: { id: internship.id } })
              }
            />
          ))}
        </ScrollView>
      )}

      <PathoraButton
        label="Log out"
        variant="secondary"
        onPress={handleSignOut}
        style={styles.signOutButton}
      />
    </SafeAreaView>
  );
}

export default function InternHomeRoute() {
  return (
    <InternHomeGuard>
      <InternHomeScreen />
    </InternHomeGuard>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PathoraColors.paper,
  },
  guardFallback: {
    flex: 1,
    backgroundColor: PathoraColors.paper,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: PathoraSpacing[12],
    paddingHorizontal: PathoraSpacing[24],
    paddingTop: 8,
    paddingBottom: PathoraSpacing[8],
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
  emptyContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: PathoraSpacing[24],
    gap: PathoraSpacing[8],
  },
  emptyTitle: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 18,
    color: PathoraColors.ink900,
  },
  emptyBody: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 14,
    lineHeight: 20,
    color: PathoraColors.textSecondary,
    textAlign: 'center',
  },
  sectionTitle: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 16,
    color: PathoraColors.ink900,
    paddingHorizontal: PathoraSpacing[24],
    marginBottom: PathoraSpacing[16],
  },
  listContent: {
    paddingBottom: PathoraSpacing[16],
  },
  card: {
    borderRadius: PathoraRadius[14],
    backgroundColor: PathoraColors.surface,
    borderWidth: 1,
    borderColor: PathoraColors.border,
    paddingVertical: PathoraSpacing[16],
    paddingHorizontal: PathoraSpacing[16],
    marginHorizontal: PathoraSpacing[24],
    marginBottom: PathoraSpacing[12],
  },
  cardPressed: {
    opacity: 0.7,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PathoraSpacing[12],
    marginBottom: PathoraSpacing[12],
  },
  companyBadge: {
    width: 40,
    height: 40,
    borderRadius: PathoraRadius[12],
    backgroundColor: PathoraColors.teal700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyBadgeText: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 13,
    color: PathoraColors.surface,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 15.5,
    color: PathoraColors.ink900,
  },
  cardCompany: {
    fontFamily: PathoraFonts.en.medium,
    fontSize: 13,
    color: PathoraColors.textSecondary,
    marginTop: 2,
  },
  cardMeta: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 13,
    color: PathoraColors.textSecondary,
    marginBottom: PathoraSpacing[12],
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: PathoraSpacing[12],
  },
  skillChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: PathoraRadius[999],
    backgroundColor: PathoraColors.teal100,
  },
  skillChipText: {
    fontFamily: PathoraFonts.en.semiBold,
    fontSize: 12,
    color: PathoraColors.teal700,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: PathoraSpacing[12],
  },
  cardDeadline: {
    fontFamily: PathoraFonts.en.medium,
    fontSize: 12.5,
    color: PathoraColors.textTertiary,
    flexShrink: 1,
  },
  matchPill: {
    borderRadius: PathoraRadius[999],
    backgroundColor: PathoraColors.amber100,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  matchPillText: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 12.5,
    color: PathoraColors.amberTextOnTint,
  },
  signOutButton: {
    marginHorizontal: PathoraSpacing[24],
    marginBottom: PathoraSpacing[16],
  },
});
