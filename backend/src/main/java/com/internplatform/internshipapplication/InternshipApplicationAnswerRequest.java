package com.internplatform.internshipapplication;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * One submitted answer. Deliberately carries no question text/type/required/order — those
 * always come from the server-side InternshipApplicationQuestion record, never the client,
 * and are validated/snapshotted in InternshipApplicationService.
 */
public record InternshipApplicationAnswerRequest(

        @NotNull(message = "questionId is required")
        UUID questionId,

        String answer

) {
}
