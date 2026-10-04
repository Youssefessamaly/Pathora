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
import { getCompanyApprovalStatus, type CompanyApprovalStatus } from '@/lib/api';
import { formatDisplayDate } from '@/lib/date';
import { describeOnboardingError } from '@/lib/onboarding';

/**
 * GET /company/approval-status is the only data source. The backend does not store a
 * rejection reason, so none is shown or invented here — only the status itself and, when
 * present, when it was decided.
 */
function ApprovalRejectedScreen() {
  const router = useRouter();
  const { token, signOut } = useAuth();

  const [status, setStatus] = useState<CompanyApprovalStatus | null>(null);
  const [reviewedAt, setReviewedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }
    try {
      const approval = await getCompanyApprovalStatus(token);
      setError(null);

      // The backend's current transition rule is one-way (a decision is never reversed), but
      // this screen still reacts correctly if that ever changes rather than assuming REJECTED
      // is permanent.
      if (approval.status === 'APPROVED') {
        router.replace('/company');
        return;
      }
      if (approval.status === 'PENDING') {
        router.replace('/company/approval-pending');
        return;
      }
      setStatus(approval.status);
      setReviewedAt(approval.reviewedAt);
    } catch (loadError) {
      setError(describeOnboardingError(loadError));
    }
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
              name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
              size={28}
              tintColor={PathoraColors.error}
            />
          </View>

          <Text style={styles.title}>Your company registration was not approved</Text>
          <Text style={styles.body}>
            Your company account cannot access Pathora&apos;s employer features at this time.
          </Text>

          {status && <CompanyApprovalBadge status={status} />}

          {reviewedAt && <Text style={styles.reviewedText}>Reviewed {formatDisplayDate(reviewedAt)}</Text>}

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

export default function ApprovalRejectedRoute() {
  return (
    <OnboardingGuard role="COMPANY">
      <ApprovalRejectedScreen />
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
    backgroundColor: 'rgba(193, 68, 58, 0.12)',
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
  reviewedText: {
    fontFamily: PathoraFonts.en.medium,
    fontSize: 12.5,
    color: PathoraColors.textTertiary,
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
