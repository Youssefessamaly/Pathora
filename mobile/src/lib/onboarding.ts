import {
  ApiError,
  getCompanyApprovalStatus,
  getCompanyProfileOrNull,
  getInternProfileOrNull,
  NetworkError,
  type CompanyProfile,
  type InternProfile,
} from '@/lib/api';

export type OnboardingRoute = '/onboarding/personal' | '/onboarding/education' | '/onboarding/skills';

export type CompanyOnboardingRoute =
  | '/company/onboarding/company'
  | '/company/onboarding/details'
  | '/company/onboarding/contact';

/** Where an authenticated COMPANY lands — resolved fresh every time (login, right after
 *  finishing onboarding, and as a defense-in-depth check on the dashboard itself) rather than
 *  cached, since approval status can change between visits. */
export type CompanyPostAuthRoute =
  | CompanyOnboardingRoute
  | '/company/approval-pending'
  | '/company/approval-rejected'
  | '/company';

function isStep1Incomplete(profile: InternProfile): boolean {
  return !profile.firstName || !profile.lastName || !profile.dateOfBirth || !profile.phoneNumber;
}

function isStep2Incomplete(profile: InternProfile): boolean {
  if (
    !profile.institutionName ||
    !profile.academicLevel ||
    !profile.major ||
    !profile.expectedGraduationYear
  ) {
    return true;
  }

  if (profile.academicLevel === 'UNIVERSITY') {
    return profile.academicYear === null || profile.academicYear === undefined;
  }

  return false;
}

function isStep3Incomplete(profile: InternProfile): boolean {
  const hasNoSkills = profile.skills.length === 0;
  const hasNoCareerInterests = !profile.careerInterests || profile.careerInterests.trim().length === 0;
  return hasNoSkills || hasNoCareerInterests;
}

/**
 * Given the current intern profile (or null if onboarding hasn't started), returns the
 * route for the first incomplete onboarding step, or null if onboarding is already complete.
 */
export function resolveFirstIncompleteOnboardingStep(profile: InternProfile | null): OnboardingRoute | null {
  if (!profile) {
    return '/onboarding/personal';
  }

  if (profile.onboardingCompleted) {
    return null;
  }

  if (isStep1Incomplete(profile)) {
    return '/onboarding/personal';
  }

  if (isStep2Incomplete(profile)) {
    return '/onboarding/education';
  }

  if (isStep3Incomplete(profile)) {
    return '/onboarding/skills';
  }

  // All individual step checks passed but the backend hasn't marked onboarding
  // complete yet (e.g. the user never pressed Finish) — land on the last step.
  return '/onboarding/skills';
}

/**
 * Resolves where an INTERN should land immediately after authenticating — login and
 * register-then-auto-login alike call this, so the two flows can never disagree about
 * onboarding state. Throws if the profile can't be fetched; callers should catch and show
 * their own "couldn't load profile" message rather than guessing where to send the user.
 */
export async function resolveInternPostAuthRoute(token: string): Promise<OnboardingRoute | '/intern'> {
  const profile = await getInternProfileOrNull(token);
  return resolveFirstIncompleteOnboardingStep(profile) ?? '/intern';
}

function isCompanyStep1Incomplete(profile: CompanyProfile): boolean {
  return !profile.companyName || !profile.industry || !profile.companySize;
}

function isCompanyStep2Incomplete(profile: CompanyProfile): boolean {
  return !profile.location || !profile.description;
}

function isCompanyStep3Incomplete(profile: CompanyProfile): boolean {
  return !profile.contactName || !profile.contactPhone;
}

/**
 * Given the current company profile (or null if onboarding hasn't started), returns the
 * route for the first incomplete onboarding step, or null if onboarding is already complete.
 */
export function resolveFirstIncompleteCompanyOnboardingStep(
  profile: CompanyProfile | null,
): CompanyOnboardingRoute | null {
  if (!profile) {
    return '/company/onboarding/company';
  }

  if (profile.onboardingCompleted) {
    return null;
  }

  if (isCompanyStep1Incomplete(profile)) {
    return '/company/onboarding/company';
  }

  if (isCompanyStep2Incomplete(profile)) {
    return '/company/onboarding/details';
  }

  if (isCompanyStep3Incomplete(profile)) {
    return '/company/onboarding/contact';
  }

  // All individual step checks passed but the backend hasn't marked onboarding
  // complete yet (e.g. the user never pressed Finish) — land on the last step.
  return '/company/onboarding/contact';
}

/**
 * Resolves where an authenticated COMPANY should land — the single source of truth used by
 * login, by the screen right after onboarding finishes, and by the dashboard's own
 * defense-in-depth guard (see /company/index.tsx), so all three can never disagree.
 *
 * Order matters: onboarding completeness is checked first and entirely independently of
 * approval status — a PENDING company must always be able to finish onboarding, never get
 * diverted to the approval screens first. Only once onboarding is complete does approval
 * status decide the destination. Throws if either fetch fails (network, 401, ...) — callers
 * should not guess a destination on failure, matching resolveInternPostAuthRoute's contract.
 */
export async function resolveCompanyPostAuthRoute(token: string): Promise<CompanyPostAuthRoute> {
  const profile = await getCompanyProfileOrNull(token);
  const nextOnboardingStep = resolveFirstIncompleteCompanyOnboardingStep(profile);

  if (nextOnboardingStep) {
    return nextOnboardingStep;
  }

  const approval = await getCompanyApprovalStatus(token);

  if (approval.status === 'PENDING') {
    return '/company/approval-pending';
  }

  if (approval.status === 'REJECTED') {
    return '/company/approval-rejected';
  }

  return '/company';
}

export function describeOnboardingError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return 'Please check your information and try again.';
    }
    if (error.status === 401 || error.status === 403) {
      return 'Your session has expired. Please log in again.';
    }
    return error.message;
  }

  if (error instanceof NetworkError) {
    return 'Unable to reach Pathora. Please try again.';
  }

  return 'Something went wrong. Please try again.';
}

export function getOnboardingMissingFields(error: unknown): string[] | null {
  if (
    error instanceof ApiError &&
    error.status === 400 &&
    typeof error.body === 'object' &&
    error.body !== null &&
    Array.isArray((error.body as { missingFields?: unknown }).missingFields)
  ) {
    return (error.body as { missingFields: string[] }).missingFields;
  }
  return null;
}
