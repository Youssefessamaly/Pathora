package com.internplatform.admin;

import com.internplatform.companyprofile.ApprovalStatus;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * One company's approval request, as the admin needs to see it to decide. Used for both the
 * list and detail endpoints — there is no additional sensitive data to hold back between the
 * two (never the password hash; nothing beyond the company's own existing profile fields plus
 * its account email). requestedAt is the profile's own createdAt — a company's request is
 * considered to begin the moment its (always-PENDING) CompanyProfile row is created at
 * registration, not when it later finishes onboarding.
 */
public record AdminCompanyRequestResponse(
        UUID companyProfileId,
        UUID userId,
        String companyName,
        String email,
        String industry,
        String companySize,
        String location,
        String website,
        String description,
        String contactName,
        String contactPhone,
        boolean onboardingCompleted,
        ApprovalStatus approvalStatus,
        OffsetDateTime requestedAt,
        OffsetDateTime reviewedAt
) {
}
