package com.internplatform.internshipapplication;

import com.internplatform.internprofile.AcademicLevel;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Lightweight row for the company's applicant list — deliberately omits anything beyond what
 *  a list view needs (no date of birth, phone, CV, cover letter, answers; see
 *  CompanyApplicationDetailResponse for the full single-application view). */
public record CompanyApplicationListItemResponse(
        UUID applicationId,
        UUID internshipId,
        String applicantName,
        ApplicationStatus status,
        OffsetDateTime appliedAt,
        String institutionName,
        AcademicLevel academicLevel,
        Integer academicYear,
        String major
) {
}
