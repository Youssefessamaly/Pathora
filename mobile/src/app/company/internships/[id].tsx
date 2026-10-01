import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthBackButton } from '@/components/auth-back-button';
import { OnboardingGuard } from '@/components/onboarding/onboarding-guard';
import { PathoraButton } from '@/components/pathora-button';
import { PathoraColors, PathoraFonts, PathoraRadius, PathoraSpacing } from '@/constants/pathora-theme';
import { useAuth } from '@/context/auth-context';
import { closeCompanyInternship, getCompanyInternship, type CompanyInternship } from '@/lib/api';
import { formatDisplayDate } from '@/lib/date';
import { formatMinimumAcademicYearLabel, WORK_MODE_LABELS } from '@/lib/internship-options';
import { describeOnboardingError } from '@/lib/onboarding';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function InternshipDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();

  const [internship, setInternship] = useState<CompanyInternship | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const load = useCallback(async () => {
    if (!token || !id) {
      return;
    }
    try {
      const data = await getCompanyInternship(token, id);
      setInternship(data);
      setError(null);
    } catch (loadError) {
      setError(describeOnboardingError(loadError));
    }
  }, [token, id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleClose = () => {
    Alert.alert('Close this internship?', 'Interns will no longer be able to see or apply to it.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close internship',
        style: 'destructive',
        onPress: async () => {
          if (!token || !id) {
            return;
          }
          setIsClosing(true);
          try {
            const updated = await closeCompanyInternship(token, id);
            setInternship(updated);
          } catch (closeError) {
            Alert.alert('Something went wrong', describeOnboardingError(closeError));
          } finally {
            setIsClosing(false);
          }
        },
      },
    ]);
  };

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

  const isOpen = internship.status === 'OPEN';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AuthBackButton onPress={() => router.back()} style={styles.backButton} />

        <View style={styles.headerRow}>
          <Text style={styles.title}>{internship.title}</Text>
          <View style={[styles.statusBadge, isOpen ? styles.statusBadgeOpen : styles.statusBadgeClosed]}>
            <Text style={[styles.statusBadgeText, isOpen ? styles.statusBadgeTextOpen : styles.statusBadgeTextClosed]}>
              {isOpen ? 'Open' : 'Closed'}
            </Text>
          </View>
        </View>
        <Text style={styles.companyName}>{internship.companyName}</Text>

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
              label="Minimum academic year"
              value={formatMinimumAcademicYearLabel(internship.minimumAcademicYear)}
            />
          )}
        </View>

        <View>
          <Text style={styles.label}>Required skills</Text>
          <View style={styles.chipsWrap}>
            {internship.skills.map((skill) => (
              <View key={skill.id} style={styles.skillChip}>
                <Text style={styles.skillChipText}>{skill.name}</Text>
              </View>
            ))}
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

        <PathoraButton
          label="Edit internship"
          variant="secondary"
          onPress={() =>
            router.push({ pathname: '/company/internships/[id]/edit', params: { id: internship.id } })
          }
          style={styles.actionButton}
        />

        {isOpen && (
          <PathoraButton
            label={isClosing ? 'Closing…' : 'Close internship'}
            variant="secondary"
            onPress={handleClose}
            disabled={isClosing}
            style={styles.actionButton}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function InternshipDetailsRoute() {
  return (
    <OnboardingGuard role="COMPANY">
      <InternshipDetailsScreen />
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: PathoraSpacing[12],
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 22,
    color: PathoraColors.ink900,
  },
  statusBadge: {
    borderRadius: PathoraRadius[999],
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
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
  companyName: {
    fontFamily: PathoraFonts.en.medium,
    fontSize: 14,
    color: PathoraColors.textSecondary,
    marginBottom: PathoraSpacing[20],
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
  skillChipText: {
    fontFamily: PathoraFonts.en.semiBold,
    fontSize: 13,
    color: PathoraColors.teal700,
  },
  actionButton: {
    marginBottom: PathoraSpacing[12],
  },
});
