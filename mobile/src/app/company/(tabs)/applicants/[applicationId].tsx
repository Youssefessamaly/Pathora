import { useLocalSearchParams } from 'expo-router';

import { CompanyApplicantDetailContent } from '@/components/company-applicant-detail-content';
import { OnboardingGuard } from '@/components/onboarding/onboarding-guard';

/** The tab highlighted is determined by which stack contains this route. */
export default function CompanyApplicantDetailRoute() {
  const { id, applicationId } = useLocalSearchParams<{ id: string; applicationId: string }>();
  return (
    <OnboardingGuard role="COMPANY">
      {id && applicationId ? (
        <CompanyApplicantDetailContent internshipId={id} applicationId={applicationId} />
      ) : null}
    </OnboardingGuard>
  );
}
