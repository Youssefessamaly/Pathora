package com.internplatform.internshipapplication;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

/**
 * Partial update payload for PATCH .../application-questions/{questionId}. Matching the
 * project's established PATCH semantics: omitted fields are left untouched. questionText
 * deliberately has no @NotBlank here (null must mean "omitted", not "blank text") — a
 * non-null-but-blank value is instead rejected in InternshipApplicationQuestionService, the
 * same way externalApplicationUrl's blank-vs-omitted distinction is handled in
 * InternshipService.
 */
public record InternshipApplicationQuestionUpdateRequest(

        @Size(max = 500, message = "Question text must be at most 500 characters")
        String questionText,

        ApplicationQuestionType questionType,

        Boolean required,

        @Min(value = 0, message = "Display order must be zero or greater")
        Integer displayOrder

) {
}
