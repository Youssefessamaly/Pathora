package com.internplatform.internship;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record InternshipCreateRequest(

        @NotBlank(message = "Title is required")
        @Size(max = 200, message = "Title must be at most 200 characters")
        String title,

        @NotBlank(message = "Description is required")
        @Size(max = 5000, message = "Description must be at most 5000 characters")
        String description,

        @NotBlank(message = "Location is required")
        @Size(max = 200, message = "Location must be at most 200 characters")
        String location,

        @NotNull(message = "Work mode is required")
        WorkMode workMode,

        @NotNull(message = "Application deadline is required")
        @FutureOrPresent(message = "Application deadline must not be in the past")
        LocalDate applicationDeadline,

        LocalDate startDate,

        @Min(value = 1, message = "Duration must be between 1 and 24 months")
        @Max(value = 24, message = "Duration must be between 1 and 24 months")
        Integer durationMonths,

        @NotEmpty(message = "At least one skill is required")
        List<UUID> skillIds

) {
}
