package com.internplatform.internship;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import tools.jackson.databind.JsonNode;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Partial update payload for PATCH /company/internships/{id}.
 * Matching the backend's PATCH semantics: only include the fields you want to change.
 * Omitted fields are left untouched server-side. When supplied, skillIds replaces the
 * internship's entire skill set (it must still be non-empty — checked in the service,
 * since bean validation alone can't express "null is fine, empty is not").
 * minimumAcademicYear uses a raw {@link JsonNode} instead of a plain Integer because this
 * field needs a third state beyond "omitted"/"value": "explicitly cleared back to no
 * restriction". A custom Integer-wrapping deserializer was tried first, but Jackson 3's
 * record binding routes an absent constructor argument through getAbsentValue(), which by
 * default falls back to getNullValue() — collapsing "omitted" and "explicit null" into the
 * same result. JsonNode sidesteps that entirely: Jackson's built-in handling leaves the
 * component reference null when the key is absent, and produces a non-null NullNode (whose
 * isNull() is true) when the key is explicitly present with a JSON null value — see
 * InternshipService for how the three states are interpreted.
 * externalApplicationUrl uses the same JsonNode tri-state for the same reason: omitted means
 * "leave the URL as-is", an explicit JSON null means "clear it" (the only way to move an
 * EXTERNAL internship back to INTERNAL), and a string means "set/replace it". applicationMethod
 * itself is a plain enum (omitted = unchanged) since there is no "clear" state for a required
 * field. InternshipService computes the FINAL applicationMethod + externalApplicationUrl pair
 * together and validates that combination, not each field in isolation.
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

        List<UUID> skillIds,

        @Size(max = 10, message = "At most 10 target majors are allowed")
        List<String> targetMajors,

        JsonNode minimumAcademicYear,

        ApplicationMethod applicationMethod,

        JsonNode externalApplicationUrl

) {
}
