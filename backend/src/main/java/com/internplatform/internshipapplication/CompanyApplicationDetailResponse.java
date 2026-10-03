package com.internplatform.internshipapplication;

import com.internplatform.internprofile.AcademicLevel;
import com.internplatform.internprofile.SkillResponse;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/** Full single-application view for the company reviewing an applicant. Deliberately omits
 *  date of birth and phone number — not needed by the MVP UI (see PART 2 of the milestone
 *  spec) — and never exposes the CV's storageKey, only its metadata (see CvSnapshot). */
public record CompanyApplicationDetailResponse(
        UUID applicationId,
        UUID internshipId,
        String internshipTitle,
        ApplicationStatus status,
        OffsetDateTime appliedAt,
        OffsetDateTime updatedAt,
        Applicant applicant,
        String coverLetter,
        String linkedinUrl,
        String portfolioUrl,
        CvSnapshot cv,
        List<InternshipApplicationAnswerResponse> answers
) {

    public record Applicant(
            UUID internProfileId,
            String firstName,
            String lastName,
            String institutionName,
            AcademicLevel academicLevel,
            Integer academicYear,
            String major,
            Integer expectedGraduationYear,
            List<SkillResponse> skills,
            List<SkillResponse> cvDetectedSkills
    ) {
    }

    /** CV snapshot metadata only — never the underlying storageKey. The bytes themselves are
     *  served separately by the dedicated CV download endpoint. */
    public record CvSnapshot(
            String fileName,
            String contentType,
            Integer sizeBytes,
            OffsetDateTime uploadedAt
    ) {
    }
}
