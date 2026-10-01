package com.internplatform.internship;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record InternInternshipResponse(
        UUID id,
        String companyName,
        String title,
        String description,
        String location,
        WorkMode workMode,
        LocalDate applicationDeadline,
        LocalDate startDate,
        Integer durationMonths,
        InternshipStatus status,
        List<InternshipSkillResponse> skills,
        List<String> targetMajors,
        Integer minimumAcademicYear,
        int relevancePercentage,
        int matchedSkillCount,
        int totalRequiredSkillCount,
        List<InternshipSkillResponse> matchedSkills,
        boolean majorMatch,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
