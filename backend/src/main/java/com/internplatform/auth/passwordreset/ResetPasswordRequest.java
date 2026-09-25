package com.internplatform.auth.passwordreset;

import jakarta.validation.constraints.NotBlank;

public record ResetPasswordRequest(

        @NotBlank(message = "Reset token is required")
        String resetToken,

        @NotBlank(message = "Password is required")
        String newPassword

) {
}