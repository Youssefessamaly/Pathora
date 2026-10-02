package com.internplatform.internshipapplication;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record InternshipApplicationResponse(
        UUID applicationId,
        UUID internshipId,
        String internshipTitle,
        String companyName,
        ApplicationStatus status,
        String coverLetter,
        String linkedinUrl,
        String portfolioUrl,
        String cvFileName,
        OffsetDateTime appliedAt,
        OffsetDateTime updatedAt,
        /** Empty for the compact list view; populated with the submitted snapshot (in display
         *  order) for a single application's detail — see InternshipApplicationService. */
        List<InternshipApplicationAnswerResponse> answers
) {
}
