import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CompanyApprovalBadge } from '@/components/company-approval-badge';
import { OnboardingGuard } from '@/components/onboarding/onboarding-guard';
import { PathoraButton } from '@/components/pathora-button';
import { PathoraColors, PathoraFonts, PathoraRadius, PathoraSpacing } from '@/constants/pathora-theme';
import { useAuth } from '@/context/auth-context';
import { getCompanyApprovalStatus, getCompanyProfileOrNull, type CompanyApprovalStatus } from '@/lib/api';
import { describeOnboardingError } from '@/lib/onboarding';

/**
 * Lands here only once onboarding is already complete (see resolveCompanyPostAuthRoute) — a
 * PENDING company with incomplete onboarding is routed to finish onboarding instead, never
 * here. GET /company/approval-status is the only data source; nothing about the review (an
 * ETA, a reviewer, a reason) is invented beyond what the backend actually returns.
 */
function ApprovalPendingScreen() {
  const router = useRouter();
  const { token, signOut } = useAuth();

  const [status, setStatus] = useState<CompanyApprovalStatus | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }
    try {
      const approval = await getCompanyApprovalStatus(token);
      setError(null);

      if (approval.status === 'APPROVED') {
        router.replace('/company');
        return;
      }
      if (approval.status === 'REJECTED') {
        router.replace('/company/approval-rejected');
        return;
      }
      setStatus(approval.status);
    } catch (loadError) {
      // A failed check must never be mistaken for APPROVED — stay on this screen and let the
      // admin look retry.
      setError(describeOnboardingError(loadError));
    }

    // Best-effort — the company name is a nice-to-have on this screen, never required.
    getCompanyProfileOrNull(token)
      .then((profile) => setCompanyName(profile?.companyName ?? null))
      .catch(() => undefined);
  }, [token, router]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleCheckStatus = async () => {
    if (isChecking) {
      return;
    }
    setIsChecking(true);
    await load();
    setIsChecking(false);
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <SymbolView
              name={{ ios: 'clock.fill', android: 'schedule', web: 'schedule' }}
              size={28}
              tintColor={PathoraColors.amber600}
            />
          </View>

          <Text style={styles.title}>Your company is under review</Text>
          <Text style={styles.body}>
            Your company profile has been submitted for approval. You&apos;ll be able to access
            internships and applicants once your account is approved.
          </Text>

          {companyName && <Text style={styles.companyName}>{companyName}</Text>}

          {status && <CompanyApprovalBadge status={status} />}

          {!status && !error && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={PathoraColors.teal600} />
            </View>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        <View style={styles.actions}>
          <PathoraButton
            label={isChecking ? 'Checking…' : 'Check status'}
            variant="primary"
            onPress={handleCheckStatus}
            disabled={isChecking}
            style={styles.actionButton}
          />
          <PathoraButton
            label="Log out"
            variant="secondary"
            onPress={handleSignOut}
            disabled={isChecking}
            style={styles.actionButton}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function ApprovalPendingRoute() {
  return (
    <OnboardingGuard role="COMPANY">
      <ApprovalPendingScreen />
    </OnboardingGuard>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PathoraColors.paper,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: PathoraSpacing[24],
    gap: PathoraSpacing[24],
  },
  card: {
    borderRadius: PathoraRadius[20],
    backgroundColor: PathoraColors.surface,
    borderWidth: 1,
    borderColor: PathoraColors.border,
    paddingVertical: PathoraSpacing[32],
    paddingHorizontal: PathoraSpacing[24],
    alignItems: 'center',
    gap: PathoraSpacing[12],
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: PathoraRadius[999],
    backgroundColor: PathoraColors.amber100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 20,
    color: PathoraColors.ink900,
    textAlign: 'center',
  },
  body: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 14,
    lineHeight: 21,
    color: PathoraColors.textSecondary,
    textAlign: 'center',
  },
  companyName: {
    fontFamily: PathoraFonts.en.bold,
    fontSize: 14.5,
    color: PathoraColors.ink900,
    marginTop: 4,
  },
  loadingRow: {
    paddingTop: 4,
  },
  errorText: {
    fontFamily: PathoraFonts.en.medium,
    fontSize: 13,
    color: PathoraColors.error,
    textAlign: 'center',
  },
  actions: {
    gap: PathoraSpacing[12],
  },
  actionButton: {
    marginBottom: 0,
  },
});
