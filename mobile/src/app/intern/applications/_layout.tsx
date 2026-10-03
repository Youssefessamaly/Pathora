import { Stack } from 'expo-router';

/**
 * Groups applications/index.tsx (the Applications tab's list) and applications/[id].tsx
 * (detail) into one nested stack — the same "stack inside a tab" pattern already used by
 * internships/_layout.tsx.
 */
export default function InternApplicationsStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
