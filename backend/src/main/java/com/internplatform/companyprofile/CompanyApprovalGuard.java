package com.internplatform.companyprofile;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * Single checkpoint every marketplace-mutating or marketplace-data-exposing company endpoint
 * must pass through — internship create/update/close, application-question management, and
 * the whole company-side applicant surface (list/detail/CV/decision). A company that is not
 * yet APPROVED (still PENDING admin review, or REJECTED) gets the exact same 403 regardless
 * of which specific feature it tried to use, so enforcement is never a feature-by-feature
 * afterthought that a new endpoint could accidentally skip.
 *
 * Deliberately takes an already-resolved CompanyProfile rather than a userId: every call site
 * already needs to resolve the profile for its own purposes (ownership checks, ...), so this
 * never causes an extra database round trip.
 */
@Component
public class CompanyApprovalGuard {

    public void requireApproved(CompanyProfile profile) {
        if (profile.getApprovalStatus() != ApprovalStatus.APPROVED) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Your company is not approved to use this feature yet"
            );
        }
    }
}
