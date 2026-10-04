package com.internplatform.companyprofile;

/** Admin review status for a company account. See CompanyApprovalGuard for where this is
 *  enforced and AdminCompanyRequestService for where an admin changes it. */
public enum ApprovalStatus {
    PENDING,
    APPROVED,
    REJECTED
}
