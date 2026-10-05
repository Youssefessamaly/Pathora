import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CompanyApprovalBadge } from '@/components/company-approval-badge';
import { PathoraButton } from '@/components/pathora-button';
import { PathoraColors, PathoraFonts, PathoraRadius, PathoraSpacing } from '@/constants/pathora-theme';
import { useAuth } from '@/context/auth-context';
import { getCompanyApprovalStatus, getCompanyProfileOrNull, type CompanyApprovalStatus, type CompanyProfile } from '@/lib/api';
import { describeOnboardingError } from '@/lib/onboarding';

function companyInitials(companyName: string | null | undefined, email: string | undefined): string {
  const name = companyName?.trim();
  if (!name) {
    return (email?.trim()?.charAt(0) ?? '?').toUpperCase();
  }
  const words = name.split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 2).map((word) => word.charAt(0));
  return (letters.join('') || '?').toUpperCase();
}

function InfoRow({ label, value, isLast }: { label: string; value: string; isLast: boolean }) {
  return (
    <View style={[styles.infoRow, isLast && styles.infoRowLast]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/**
 * The Company tab: the company's own profile, approval status, and account exit. Everything
 * shown is a real field from CompanyProfile/CompanyApprovalStatus — no HR multi-account
 * management or settings screen is built here, since the backend has no such model (single
 * User <-> CompanyProfile, no separate HR-accounts endpoint, no change-password endpoint) —
 * see the task's final report for this gap.
 */
function CompanyProfileScreen() {
  const router = useRouter();
  const { user, token, signOut } = useAuth();

  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<CompanyApprovalStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }
    try {
      const [profileResult, approvalResult] = await Promise.all([
        getCompanyProfileOrNull(token),
        getCompanyApprovalStatus(token),
      ]);
      setProfile(profileResult);
      setApprovalStatus(approvalResult.status);
      setError(null);
    } catch (loadError) {
      setError(describeOnboardingError(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleEditProfile = () => {
    router.push('/company/onboarding/company');
  };

  const handleSignOut = async () => {
    await signOut();
    // Clear the entire authenticated stack along with the session so Back can never reopen
    // a protected screen after logout.
    router.dismissAll();
    router.replace('/welcome');
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

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error ?? 'Unable to load your company profile.'}</Text>
          <PathoraButton label="Try again" variant="secondary" onPress={load} style={styles.retryButton} />
        </View>
      </SafeAreaView>
    );
  }

  const locationLine = [profile.industry, profile.location].filter(Boolean).join(' · ');

  const contactRows: { label: string; value: string }[] = [];
  if (profile.website) {
    contactRows.push({ label: 'Website', value: profile.website });
  }
  if (profile.contactName) {
    contactRows.push({ label: 'Contact person', value: profile.contactName });
  }
  if (user?.email) {
    contactRows.push({ label: 'Contact email', value: user.email });
  }
  if (profile.contactPhone) {
    contactRows.push({ label: 'Contact phone', value: profile.contactPhone });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.banner} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.identityRow}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>{companyInitials(profile.companyName, user?.email)}</Text>
          </View>
          <View style={styles.identityText}>
            <Text style={styles.companyName} numberOfLines={1}>
              {profile.companyName?.trim() || 'Your company'}
            </Text>
            {locationLine.length > 0 && (
              <Text style={styles.locationLine} numberOfLines={1}>
                {locationLine}
              </Text>
            )}
          </View>
        </View>

        {approvalStatus && <CompanyApprovalBadge status={approvalStatus} />}

        <PathoraButton
          label="Edit profile"
          variant="secondary"
          onPress={handleEditProfile}
          style={styles.editButton}
        />

        {profile.description && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>About</Text>
            <Text style={styles.aboutText}>{profile.description}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Contact</Text>
          <View style={styles.card}>
            {contactRows.map((row, index) => (
              <InfoRow key={row.label} label={row.label} value={row.value} isLast={index === contactRows.length - 1} />
            ))}
          </View>
        </View>

        <PathoraButton label="Log out" variant="secondary" onPress={handleSignOut} style={styles.signOutButton} />
      </ScrollView>
    </SafeAreaView>
  );
}

export default function CompanyProfileRoute() {
  return <CompanyProfileScreen />;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PathoraColors.paper,
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
  banner: {
    height: 96,
    backgroundColor: PathoraColors.teal700,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: PathoraSpacing[24],
    paddingBottom: PathoraSpacing[32],
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: PathoraSpacing[12],
    marginTop: -30,
    marginBottom: PathoraSpacing[16],
  },
  logo: {
    width: 58,
    height: 58,
    borderRadius: PathoraRadius[14],
    backgroundColor: PathoraColors.teal100,
    borderWidth: 3,
    borderColor: PathoraColors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 19,
    color: PathoraColors.teal700,
  },
  identityText: {
    flex: 1,
    paddingBottom: 4,
    gap: 2,
  },
  companyName: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 18,
    color: PathoraColors.ink900,
  },
  locationLine: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 12.5,
    color: PathoraColors.textSecondary,
  },
  editButton: {
    alignSelf: 'flex-start',
    marginTop: PathoraSpacing[16],
    marginBottom: PathoraSpacing[8],
  },
  section: {
    marginTop: PathoraSpacing[20],
    gap: PathoraSpacing[8],
  },
  sectionLabel: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 13,
    color: PathoraColors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  aboutText: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 13.5,
    lineHeight: 20,
    color: PathoraColors.textSecondary,
  },
  card: {
    borderRadius: PathoraRadius[14],
    backgroundColor: PathoraColors.surface,
    borderWidth: 1,
    borderColor: PathoraColors.border,
    paddingHorizontal: PathoraSpacing[16],
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: PathoraSpacing[12],
    paddingVertical: PathoraSpacing[12],
    borderBottomWidth: 1,
    borderBottomColor: PathoraColors.border,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 13,
    color: PathoraColors.textSecondary,
  },
  infoValue: {
    flex: 1,
    textAlign: 'right',
    fontFamily: PathoraFonts.en.semiBold,
    fontSize: 13,
    color: PathoraColors.ink900,
  },
  signOutButton: {
    marginTop: PathoraSpacing[24],
  },
});
