import { Stack } from 'expo-router';

/**
 * Groups internships/index.tsx (the Internships tab's list) and its detail/edit/applicants
 * drill-down screens into one nested stack, so the Internships tab can push without leaving
 * the tab navigator — the same pattern already used by intern/internships/_layout.tsx.
 */
export default function CompanyInternshipsStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
