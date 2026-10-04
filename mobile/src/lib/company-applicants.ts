import {
  getCompanyInternshipApplications,
  type CompanyApplicationListItem,
  type CompanyInternship,
} from '@/lib/api';

/**
 * One applicant entry, with its internship's title attached for display. The backend has no
 * cross-internship "all my applicants" endpoint — only the per-internship
 * GET /company/internships/{id}/applications — so this is a mobile-only composition over that
 * existing endpoint, never a new backend contract.
 */
export type CompanyApplicantEntry = CompanyApplicationListItem & {
  internshipTitle: string;
};

/**
 * Fetches and merges applications across every given internship, newest first. One internship's
 * applications failing to load (e.g. a transient error) does not drop the others — it is simply
 * omitted, since this is always secondary/supporting data for a dashboard or summary list, never
 * the only way to reach an internship's own applicants (the per-internship applicants screen
 * remains the authoritative view for any single internship).
 */
export async function getAllCompanyApplications(
  token: string,
  internships: CompanyInternship[],
): Promise<CompanyApplicantEntry[]> {
  const titleById = new Map(internships.map((internship) => [internship.id, internship.title]));

  const results = await Promise.allSettled(
    internships.map((internship) => getCompanyInternshipApplications(token, internship.id)),
  );

  const merged: CompanyApplicantEntry[] = [];
  results.forEach((result, index) => {
    if (result.status !== 'fulfilled') {
      return;
    }
    const internship = internships[index];
    for (const application of result.value) {
      merged.push({ ...application, internshipTitle: titleById.get(internship.id) ?? internship.title });
    }
  });

  merged.sort((a, b) => (a.appliedAt === b.appliedAt ? 0 : a.appliedAt > b.appliedAt ? -1 : 1));
  return merged;
}
