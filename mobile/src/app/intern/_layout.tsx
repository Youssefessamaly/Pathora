import { Tabs, useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';

import { PathoraColors, PathoraFonts } from '@/constants/pathora-theme';
import { useAuth } from '@/context/auth-context';

/**
 * Client-side gate for the whole INTERN tab group: requires an authenticated INTERN session.
 * The backend independently enforces this on every request regardless of this guard.
 * Centralized here (once) rather than duplicated per tab, now that /intern is a real
 * multi-screen navigator rather than a single route.
 */
function InternTabsGuard({ children }: { children: ReactNode }) {
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
    return <View style={{ flex: 1, backgroundColor: PathoraColors.paper }} />;
  }

  return <>{children}</>;
}

function TabIcon({ focused, name }: { focused: boolean; name: SymbolViewProps['name'] }) {
  return <SymbolView name={name} size={22} tintColor={focused ? PathoraColors.teal600 : PathoraColors.textTertiary} />;
}

export default function InternTabsLayout() {
  return (
    <InternTabsGuard>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: PathoraColors.teal600,
          tabBarInactiveTintColor: PathoraColors.textTertiary,
          tabBarStyle: {
            backgroundColor: PathoraColors.surface,
            borderTopWidth: 1,
            borderTopColor: PathoraColors.border,
            height: 58,
            paddingTop: 6,
            paddingBottom: 6,
          },
          tabBarLabelStyle: {
            fontFamily: PathoraFonts.en.semiBold,
            fontSize: 11,
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} name={{ ios: 'house.fill', android: 'home', web: 'home' }} />
            ),
          }}
        />
        <Tabs.Screen
          name="internships"
          options={{
            title: 'Internships',
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} name={{ ios: 'briefcase.fill', android: 'work', web: 'work' }} />
            ),
          }}
        />
        <Tabs.Screen
          name="applications"
          options={{
            title: 'Applications',
            tabBarIcon: ({ focused }) => (
              <TabIcon
                focused={focused}
                name={{ ios: 'doc.text.fill', android: 'description', web: 'description' }}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ focused }) => (
              <TabIcon
                focused={focused}
                name={{ ios: 'person.crop.circle.fill', android: 'account_circle', web: 'account_circle' }}
              />
            ),
          }}
        />
      </Tabs>
    </InternTabsGuard>
  );
}
