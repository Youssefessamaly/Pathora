package com.internplatform.internshipapplication;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record InternshipApplicationQuestionCreateRequest(

        @NotBlank(message = "Question text is required")
        @Size(max = 500, message = "Question text must be at most 500 characters")
        String questionText,

        @NotNull(message = "Question type is required")
        ApplicationQuestionType questionType,

        @NotNull(message = "Required must be specified")
        Boolean required,

        @NotNull(message = "Display order is required")
        @Min(value = 0, message = "Display order must be zero or greater")
        Integer displayOrder

) {
}
