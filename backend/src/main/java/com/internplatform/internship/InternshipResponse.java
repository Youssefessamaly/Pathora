package com.internplatform.internship;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record InternshipResponse(
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
        ApplicationMethod applicationMethod,
        String externalApplicationUrl,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
