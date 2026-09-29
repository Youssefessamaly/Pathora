package com.internplatform.internship;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Partial update payload for PATCH /company/internships/{id}.
 * Matching the backend's PATCH semantics: only include the fields you want to change.
 * Omitted fields are left untouched server-side. When supplied, skillIds replaces the
 * internship's entire skill set (it must still be non-empty — checked in the service,
 * since bean validation alone can't express "null is fine, empty is not").
 */
public record InternshipUpdateRequest(

        @Size(max = 200, message = "Title must be at most 200 characters")
        String title,

        @Size(max = 5000, message = "Description must be at most 5000 characters")
        String description,

        @Size(max = 200, message = "Location must be at most 200 characters")
        String location,

        WorkMode workMode,

        LocalDate applicationDeadline,

        LocalDate startDate,

        @Min(value = 1, message = "Duration must be between 1 and 24 months")
        @Max(value = 24, message = "Duration must be between 1 and 24 months")
        Integer durationMonths,

        List<UUID> skillIds

) {
}
