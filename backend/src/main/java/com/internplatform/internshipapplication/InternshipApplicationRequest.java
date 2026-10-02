package com.internplatform.internshipapplication;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * The internal Pathora application form submitted by an INTERN. Deliberately carries no
 * status/internProfileId/userId/internshipId/question required-flag/question type — status
 * always starts APPLIED (see InternshipApplication), identity/internship are derived from the
 * authenticated JWT and the path variable, and every answer's question text/type/required/
 * order always comes from the server-side question record, never the client (see
 * InternshipApplicationService). The fixed interestReason field from V13 is gone — a company
 * now expresses that as an ordinary custom question instead.
 */
public record InternshipApplicationRequest(

        @Size(max = 5000, message = "Cover letter must be at most 5000 characters")
        String coverLetter,

        // Same linkedin.com/in/... convention already used by InternProfileRequest.linkedinUrl.
        @Size(max = 300, message = "LinkedIn URL must be at most 300 characters")
        @Pattern(
                regexp = "(?i)^(https?://)?(www\\.)?linkedin\\.com/in/[\\w\\-%]+/?$",
                message = "LinkedIn URL must be a valid linkedin.com/in/... profile URL"
        )
        String linkedinUrl,

        // Same http(s)-only convention already used by CompanyProfileRequest.website and
        // InternshipService's externalApplicationUrl validation — javascript:/data:/file:
        // schemes simply never match.
        @Size(max = 300, message = "Portfolio URL must be at most 300 characters")
        @Pattern(
                regexp = "(?i)^https?://[\\w.-]+\\.[a-z]{2,}(:\\d{1,5})?(/\\S*)?$",
                message = "Portfolio URL must be a valid http(s) URL"
        )
        String portfolioUrl,

        /** Null/omitted is treated the same as an empty list — see
         *  InternshipApplicationService.validateAnswers. */
        @Valid
        List<InternshipApplicationAnswerRequest> answers

) {
}
