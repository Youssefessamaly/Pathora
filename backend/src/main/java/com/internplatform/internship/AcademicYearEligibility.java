package com.internplatform.internship;

import com.internplatform.internprofile.AcademicLevel;
import com.internplatform.internprofile.InternProfile;

/**
 * The single, shared academic-year eligibility rule — used by both the personalized intern
 * feed/detail (InternInternshipFeedService) and internal application submission
 * (InternshipApplicationService) so the two can never drift out of sync.
 */
public final class AcademicYearEligibility {

    private AcademicYearEligibility() {
    }

    /**
     * Pure eligibility gate — never contributes to relevancePercentage. A null
     * minimumAcademicYear means no restriction; otherwise the intern must be UNIVERSITY-level
     * with a known academic year at or above the requirement.
     */
    public static boolean satisfies(Internship internship, InternProfile profile) {
        Integer minimumYear = internship.getMinimumAcademicYear();

        if (minimumYear == null) {
            return true;
        }

        if (profile.getAcademicLevel() != AcademicLevel.UNIVERSITY) {
            return false;
        }

        Short academicYear = profile.getAcademicYear();
        return academicYear != null && academicYear >= minimumYear;
    }
}
