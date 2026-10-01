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
import { ApiError, getInternInternships, getInternProfileOrNull, type InternInternship } from '@/lib/api';
import { formatDisplayDate } from '@/lib/date';
import { buildMatchExplanations, formatMinimumAcademicYearLabel, WORK_MODE_LABELS } from '@/lib/internship-options';
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

function InternshipFeedCard({ item, onPress }: { item: InternInternship; onPress: () => void }) {
  const explanations = buildMatchExplanations(item);
  const skillNames = item.skills.slice(0, 4).map((skill) => skill.name);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.cardCompany} numberOfLines={1}>
            {item.companyName}
          </Text>
        </View>
        <View style={styles.matchBadge}>
          <Text style={styles.matchBadgeText}>{item.relevancePercentage}% match</Text>
        </View>
      </View>

      <Text style={styles.cardMeta}>
        {WORK_MODE_LABELS[item.workMode]} · {item.location}
        {item.minimumAcademicYear !== null && ` · ${formatMinimumAcademicYearLabel(item.minimumAcademicYear)}`}
      </Text>
      <Text style={styles.cardDeadline}>Deadline {formatDisplayDate(item.applicationDeadline)}</Text>

      {skillNames.length > 0 && (
        <Text style={styles.cardSkills} numberOfLines={1}>
          {skillNames.join(' · ')}
        </Text>
      )}

      {explanations.length > 0 && (
        <View style={styles.explanationBlock}>
          {explanations.map((line) => (
            <Text key={line} style={styles.explanationText}>
              {line}
            </Text>
          ))}
        </View>
      )}
    </Pressable>
  );
}

function InternHomeScreen() {
  const router = useRouter();
  const { user, token, signOut } = useAuth();

  const [internships, setInternships] = useState<InternInternship[] | null>(null);
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
        const profile = await getInternProfileOrNull(token).catch(() => null);
        const nextStep = resolveFirstIncompleteOnboardingStep(profile);
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>{user?.email}</Text>
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
    paddingHorizontal: PathoraSpacing[24],
    paddingTop: 8,
    paddingBottom: PathoraSpacing[8],
  },
  headerText: {
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: PathoraSpacing[12],
    marginBottom: 6,
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
  matchBadge: {
    borderRadius: PathoraRadius[999],
    backgroundColor: PathoraColors.teal100,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  matchBadgeText: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 12.5,
    color: PathoraColors.teal700,
  },
  cardMeta: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 13,
    color: PathoraColors.textSecondary,
    marginBottom: 2,
  },
  cardDeadline: {
    fontFamily: PathoraFonts.en.medium,
    fontSize: 12.5,
    color: PathoraColors.textTertiary,
    marginBottom: 8,
  },
  cardSkills: {
    fontFamily: PathoraFonts.en.medium,
    fontSize: 12.5,
    color: PathoraColors.ink700,
  },
  explanationBlock: {
    marginTop: 8,
    gap: 3,
  },
  explanationText: {
    fontFamily: PathoraFonts.en.medium,
    fontSize: 12,
    color: PathoraColors.teal700,
  },
  signOutButton: {
    marginHorizontal: PathoraSpacing[24],
    marginBottom: PathoraSpacing[16],
  },
});
