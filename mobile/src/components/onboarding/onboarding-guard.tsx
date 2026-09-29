import { useRouter } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';

import { PathoraColors } from '@/constants/pathora-theme';
import { useAuth } from '@/context/auth-context';
import type { UserRole } from '@/lib/api';

export type OnboardingGuardProps = {
  children: ReactNode;
  /** Role required to view this onboarding flow. Defaults to INTERN for the existing flow. */
  role?: UserRole;
};

/**
 * Client-side gate for an onboarding flow: requires an authenticated session with the given role.
 * The backend independently enforces this on every request regardless of this guard.
 */
export function OnboardingGuard({ children, role = 'INTERN' }: OnboardingGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isInitializing, user } = useAuth();
  const hasRequiredRole = user?.role === role;

  useEffect(() => {
    if (isInitializing) {
      return;
    }
    if (!isAuthenticated || !hasRequiredRole) {
      router.replace('/login');
    }
  }, [isInitializing, isAuthenticated, hasRequiredRole, router]);

  if (isInitializing || !isAuthenticated || !hasRequiredRole) {
    return <View style={{ flex: 1, backgroundColor: PathoraColors.paper }} />;
  }

  return <>{children}</>;
}
