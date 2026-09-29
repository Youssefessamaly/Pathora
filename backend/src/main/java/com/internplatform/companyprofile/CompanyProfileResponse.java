package com.internplatform.companyprofile;

import java.time.OffsetDateTime;
import java.util.UUID;

public record CompanyProfileResponse(
        UUID id,
        UUID userId,
        String companyName,
        String industry,
        String companySize,
        String location,
        String website,
        String description,
        String contactName,
        String contactPhone,
        boolean onboardingCompleted,
        OffsetDateTime completedAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
