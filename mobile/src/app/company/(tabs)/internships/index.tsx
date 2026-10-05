import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
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
import { getCompanyInternships, type CompanyInternship, type InternshipStatus } from '@/lib/api';
import { formatDisplayDate } from '@/lib/date';
import { describeOnboardingError } from '@/lib/onboarding';
import { WORK_MODE_LABELS } from '@/lib/internship-options';

/** 'all' plus every real backend InternshipStatus value — no Draft/Paused filter, since the
 *  backend has no such states (see the two disabled chips rendered after these). */
type RealFilter = 'all' | InternshipStatus;

function InternshipCard({ internship, onPress }: { internship: CompanyInternship; onPress: () => void }) {
  const isOpen = internship.status === 'OPEN';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {internship.title}
        </Text>
        <View style={[styles.statusBadge, isOpen ? styles.statusBadgeOpen : styles.statusBadgeClosed]}>
          <Text style={[styles.statusBadgeText, isOpen ? styles.statusBadgeTextOpen : styles.statusBadgeTextClosed]}>
            {isOpen ? 'Open' : 'Closed'}
          </Text>
        </View>
      </View>

      <Text style={styles.cardMeta}>
        {WORK_MODE_LABELS[internship.workMode]} · {internship.location}
      </Text>
      <Text style={styles.cardDeadline}>
        Apply by {formatDisplayDate(internship.applicationDeadline)}
      </Text>
    </Pressable>
  );
}

function FilterChip({
  label,
  active,
  disabled,
  onPress,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={[styles.chip, active && styles.chipActive, disabled && styles.chipDisabled]}>
      <Text style={[styles.chipText, active && styles.chipTextActive, disabled && styles.chipTextDisabled]}>
        {label}
      </Text>
    </Pressable>
  );
}

function CompanyInternshipsListScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [internships, setInternships] = useState<CompanyInternship[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<RealFilter>('all');

  const load = useCallback(async () => {
    if (!token) {
      return;
    }
    try {
      const data = await getCompanyInternships(token);
      setInternships(data);
      setError(null);
    } catch (loadError) {
      setError(describeOnboardingError(loadError));
    }
  }, [token]);

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

  const handleCreate = () => {
    router.push('/company/internships/new');
  };

  const visibleInternships = useMemo(() => {
    if (!internships) {
      return internships;
    }
    if (filter === 'all') {
      return internships;
    }
    return internships.filter((internship) => internship.status === filter);
  }, [internships, filter]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.appBar}>
        <Text style={styles.appBarTitle}>My Internships</Text>
        <Pressable
          onPress={handleCreate}
          accessibilityRole="button"
          accessibilityLabel="Create internship"
          style={styles.appBarAction}>
          <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={18} tintColor={PathoraColors.ink900} />
        </Pressable>
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
          <Text style={styles.emptyTitle}>No internships yet</Text>
          <Text style={styles.emptyBody}>Create your first internship to start receiving applicants.</Text>
          <PathoraButton label="Create internship" variant="primary" onPress={handleCreate} />
        </ScrollView>
      )}

      {internships !== null && !error && internships.length > 0 && (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
            style={styles.chipScroll}>
            <FilterChip label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
            <FilterChip label="Open" active={filter === 'OPEN'} onPress={() => setFilter('OPEN')} />
            <FilterChip label="Closed" active={filter === 'CLOSED'} onPress={() => setFilter('CLOSED')} />
            {/* Draft and Paused aren't real backend states (InternshipStatus is only
                OPEN/CLOSED) — rendered disabled rather than wired to a fake filter. */}
            <FilterChip label="Draft" disabled />
            <FilterChip label="Paused" disabled />
          </ScrollView>

          <ScrollView
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
            {(visibleInternships ?? []).map((internship) => (
              <InternshipCard
                key={internship.id}
                internship={internship}
                onPress={() =>
                  router.push({ pathname: '/company/internships/[id]', params: { id: internship.id } })
                }
              />
            ))}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

export default function CompanyInternshipsListRoute() {
  return <CompanyInternshipsListScreen />;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PathoraColors.paper,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PathoraSpacing[24],
    paddingTop: 8,
    paddingBottom: PathoraSpacing[16],
  },
  appBarTitle: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 20,
    color: PathoraColors.ink900,
    letterSpacing: -0.2,
  },
  appBarAction: {
    width: 34,
    height: 34,
    borderRadius: PathoraRadius[999],
    backgroundColor: PathoraColors.surface,
    borderWidth: 1,
    borderColor: PathoraColors.border,
    alignItems: 'center',
    justifyContent: 'center',
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
    gap: PathoraSpacing[12],
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
    marginBottom: PathoraSpacing[12],
  },
  chipScroll: {
    flexGrow: 0,
  },
  chipRow: {
    paddingHorizontal: PathoraSpacing[24],
    paddingBottom: PathoraSpacing[16],
    gap: PathoraSpacing[8],
  },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: PathoraRadius[999],
    borderWidth: 1.5,
    borderColor: PathoraColors.borderStrong,
    backgroundColor: PathoraColors.surface,
  },
  chipActive: {
    backgroundColor: PathoraColors.ink900,
    borderColor: PathoraColors.ink900,
  },
  chipDisabled: {
    opacity: 0.45,
  },
  chipText: {
    fontFamily: PathoraFonts.en.semiBold,
    fontSize: 13,
    color: PathoraColors.textSecondary,
  },
  chipTextActive: {
    color: PathoraColors.surface,
  },
  chipTextDisabled: {
    color: PathoraColors.textTertiary,
  },
  listContent: {
    paddingHorizontal: PathoraSpacing[24],
    paddingBottom: PathoraSpacing[24],
  },
  card: {
    borderRadius: PathoraRadius[14],
    backgroundColor: PathoraColors.surface,
    borderWidth: 1,
    borderColor: PathoraColors.border,
    paddingVertical: PathoraSpacing[16],
    paddingHorizontal: PathoraSpacing[16],
    marginBottom: PathoraSpacing[12],
  },
  cardPressed: {
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: PathoraSpacing[12],
    marginBottom: 6,
  },
  cardTitle: {
    flex: 1,
    fontFamily: PathoraFonts.en.bold,
    fontSize: 15.5,
    color: PathoraColors.ink900,
  },
  statusBadge: {
    borderRadius: PathoraRadius[999],
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeOpen: {
    backgroundColor: PathoraColors.teal100,
  },
  statusBadgeClosed: {
    backgroundColor: PathoraColors.border,
  },
  statusBadgeText: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 11.5,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statusBadgeTextOpen: {
    color: PathoraColors.teal700,
  },
  statusBadgeTextClosed: {
    color: PathoraColors.textSecondary,
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
  },
});
