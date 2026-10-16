import { Stack } from 'expo-router';

/** Candidate review remains inside the Applicants tab instead of switching to Internships. */
export default function CompanyApplicantsStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
