package com.internplatform.internshipapplication;

import jakarta.validation.constraints.NotNull;

/** The company's accept/reject decision on an APPLIED application. Binding straight to the
 *  ApplicationStatus enum means an unknown string (e.g. "MULTIPLE_CHOICE") already fails
 *  deserialization with a 400, matching the pattern InternshipApplicationQuestionCreateRequest
 *  uses for questionType. APPLIED itself is a valid enum value but not an allowed client
 *  decision — that is rejected explicitly in CompanyApplicationService, not here, since bean
 *  validation has no "enum subset" annotation to express it declaratively. */
public record CompanyApplicationStatusUpdateRequest(

        @NotNull(message = "status is required")
        ApplicationStatus status

) {
}
