import { useRouter } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';

import { PathoraColors } from '@/constants/pathora-theme';
import { useAuth } from '@/context/auth-context';

export type OnboardingGuardProps = {
  children: ReactNode;
};

/**
 * Client-side gate for the onboarding flow: requires an authenticated INTERN session.
 * The backend independently enforces this on every request regardless of this guard.
 */
export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isInitializing, user } = useAuth();
  const isIntern = user?.role === 'INTERN';

  useEffect(() => {
    if (isInitializing) {
      return;
    }
    if (!isAuthenticated || !isIntern) {
      router.replace('/login');
    }
  }, [isInitializing, isAuthenticated, isIntern, router]);

  if (isInitializing || !isAuthenticated || !isIntern) {
    return <View style={{ flex: 1, backgroundColor: PathoraColors.paper }} />;
  }

  return <>{children}</>;
}
