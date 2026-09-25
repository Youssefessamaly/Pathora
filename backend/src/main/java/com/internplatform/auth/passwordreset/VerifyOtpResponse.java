package com.internplatform.auth.passwordreset;

import java.time.OffsetDateTime;

public record VerifyOtpResponse(
        String resetToken,
        OffsetDateTime expiresAt
) {
}