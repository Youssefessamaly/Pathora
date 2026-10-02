package com.internplatform.internshipapplication;

import java.util.UUID;

public record InternshipApplicationAnswerResponse(
        UUID questionId,
        String questionText,
        ApplicationQuestionType questionType,
        boolean required,
        int displayOrder,
        String answer
) {
}
