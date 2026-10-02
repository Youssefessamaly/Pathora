package com.internplatform.internshipapplication;

import java.time.OffsetDateTime;
import java.util.UUID;

public record InternshipApplicationQuestionResponse(
        UUID id,
        UUID internshipId,
        String questionText,
        ApplicationQuestionType questionType,
        boolean required,
        int displayOrder,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
