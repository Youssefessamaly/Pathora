package com.internplatform.admin;

import com.internplatform.companyprofile.ApprovalStatus;
import jakarta.validation.constraints.NotNull;

/**
 * The admin's decision on a company's approval request. Binding straight to the ApprovalStatus
 * enum means an unknown string already fails deserialization with a 400 (same pattern used
 * throughout the app for client-supplied enum decisions — e.g.
 * CompanyApplicationStatusUpdateRequest). PENDING is a valid enum value but not a real admin
 * decision — AdminCompanyRequestService rejects it explicitly, since bean validation has no
 * "enum subset" annotation to express that declaratively.
 */
public record AdminCompanyRequestStatusUpdateRequest(

        @NotNull(message = "status is required")
        ApprovalStatus status

) {
}
