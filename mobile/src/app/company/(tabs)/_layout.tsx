import { Tabs, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { PathoraButton } from '@/components/pathora-button';
import { CompanyLiquidTabBar } from '@/components/company-liquid-tab-bar';
import { PathoraColors } from '@/constants/pathora-theme';
import { useAuth } from '@/context/auth-context';
import { resolveCompanyPostAuthRoute } from '@/lib/onboarding';

/**
 * Client-side gate for the whole COMPANY tab group: requires an authenticated COMPANY session
 * AND a freshly-verified APPROVED status, re-checked on every focus (not just first mount) via
 * resolveCompanyPostAuthRoute — the same resolver login and the onboarding-completion screens
 * use, so all entry points can never disagree. The backend independently enforces both on every
 * request regardless of this guard — this exists so a PENDING/REJECTED company (or one still mid
 * onboarding) that lands on /company directly, or via a stale restored route, is bounced to the
 * correct screen before any of the four tabs — not just the dashboard — ever render.
 */
function CompanyTabsGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isInitializing, user, token, signOut } = useAuth();
  const isCompany = user?.role === 'COMPANY';

  const [checkState, setCheckState] = useState<'checking' | 'approved' | 'error'>('checking');

  useEffect(() => {
    if (isInitializing) {
      return;
    }
    if (!isAuthenticated) {
      // No valid session at all — clear any accumulated authenticated history and route to
      // the signed-out flow via replacement.
      router.dismissAll();
      router.replace('/welcome');
      return;
    }
    if (!isCompany) {
      // Signed in, but as the wrong role — send them to their own home instead of bouncing an
      // already-authenticated user back to the login screen.
      router.replace(user?.role === 'INTERN' ? '/intern' : '/login');
    }
  }, [isInitializing, isAuthenticated, isCompany, user?.role, router]);

  const checkApproval = useCallback(() => {
    if (!token) {
      return;
    }
    setCheckState('checking');
    resolveCompanyPostAuthRoute(token)
      .then((route) => {
        if (route === '/company') {
          setCheckState('approved');
        } else {
          router.replace(route);
        }
      })
      .catch(() => setCheckState('error'));
  }, [token, router]);

  useFocusEffect(
    useCallback(() => {
      if (!isInitializing && isAuthenticated && isCompany) {
        checkApproval();
      }
    }, [isInitializing, isAuthenticated, isCompany, checkApproval]),
  );

  const handleGuardSignOut = async () => {
    await signOut();
    router.dismissAll();
    router.replace('/welcome');
  };

  if (isInitializing || !isAuthenticated || !isCompany || checkState === 'checking') {
    return (
      <View style={{ flex: 1, backgroundColor: PathoraColors.paper, alignItems: 'center', justifyContent: 'center' }}>
        {!isInitializing && isAuthenticated && isCompany && <ActivityIndicator color={PathoraColors.teal600} />}
      </View>
    );
  }

  if (checkState === 'error') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: PathoraColors.paper,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
          gap: 16,
        }}>
        <PathoraButton label="Try again" variant="secondary" onPress={checkApproval} />
        <PathoraButton label="Log out" variant="secondary" onPress={handleGuardSignOut} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function CompanyTabsLayout() {
  return (
    <CompanyTabsGuard>
      <Tabs
        tabBar={(props) => <CompanyLiquidTabBar {...props} />}
        screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="internships" options={{ title: 'Internships' }} />
        <Tabs.Screen name="applicants" options={{ title: 'Applicants' }} />
        <Tabs.Screen name="profile" options={{ title: 'Company' }} />
      </Tabs>
    </CompanyTabsGuard>
  );
}
