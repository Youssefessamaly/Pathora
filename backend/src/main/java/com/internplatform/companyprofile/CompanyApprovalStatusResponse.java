package com.internplatform.companyprofile;

import java.time.OffsetDateTime;

/** Deliberately minimal — no internal admin information (who reviewed it, any notes) is
 *  exposed, only the status itself and when it was decided. */
public record CompanyApprovalStatusResponse(
        ApprovalStatus status,
        OffsetDateTime reviewedAt
) {
}
