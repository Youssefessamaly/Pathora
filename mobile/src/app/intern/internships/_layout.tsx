import { Stack } from 'expo-router';

/**
 * Groups internships/index.tsx (the Internships tab's list) and internships/[id].tsx (detail)
 * into one nested stack, so the Internships tab can push a detail screen without leaving the
 * tab navigator — the standard Expo Router "stack inside a tab" pattern.
 */
export default function InternInternshipsStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
