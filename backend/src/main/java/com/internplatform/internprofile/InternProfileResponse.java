package com.internplatform.internprofile;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record InternProfileResponse(
        UUID id,
        UUID userId,
        String firstName,
        String lastName,
        LocalDate dateOfBirth,
        String phoneNumber,
        String institutionName,
        AcademicLevel academicLevel,
        Integer academicYear,
        String major,
        Integer expectedGraduationYear,
        List<SkillResponse> skills,
        String careerInterests,
        String linkedinUrl,
        boolean onboardingCompleted,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
