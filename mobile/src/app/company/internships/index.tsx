import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
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

import { AuthBackButton } from '@/components/auth-back-button';
import { OnboardingGuard } from '@/components/onboarding/onboarding-guard';
import { PathoraButton } from '@/components/pathora-button';
import { PathoraColors, PathoraFonts, PathoraRadius, PathoraSpacing } from '@/constants/pathora-theme';
import { useAuth } from '@/context/auth-context';
import { getCompanyInternships, type CompanyInternship } from '@/lib/api';
import { formatDisplayDate } from '@/lib/date';
import { describeOnboardingError } from '@/lib/onboarding';
import { WORK_MODE_LABELS } from '@/lib/internship-options';

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

function CompanyInternshipsListScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [internships, setInternships] = useState<CompanyInternship[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.headerRow}>
        <AuthBackButton onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Your internships</Text>
        <View style={styles.headerSpacer} />
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
          <Text style={styles.emptyBody}>
            Post your first internship to start attracting Pathora interns.
          </Text>
          <PathoraButton label="Post internship" variant="primary" onPress={handleCreate} />
        </ScrollView>
      )}

      {internships !== null && !error && internships.length > 0 && (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
          <PathoraButton
            label="Post internship"
            variant="primary"
            onPress={handleCreate}
            style={styles.createButton}
          />

          {internships.map((internship) => (
            <InternshipCard
              key={internship.id}
              internship={internship}
              onPress={() =>
                router.push({ pathname: '/company/internships/[id]', params: { id: internship.id } })
              }
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

export default function CompanyInternshipsListRoute() {
  return (
    <OnboardingGuard role="COMPANY">
      <CompanyInternshipsListScreen />
    </OnboardingGuard>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PathoraColors.paper,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PathoraSpacing[24],
    paddingTop: 8,
    paddingBottom: PathoraSpacing[16],
  },
  headerTitle: {
    flex: 1,
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 18,
    color: PathoraColors.ink900,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
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
  listContent: {
    paddingHorizontal: PathoraSpacing[24],
    paddingBottom: PathoraSpacing[24],
  },
  createButton: {
    marginBottom: PathoraSpacing[20],
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
