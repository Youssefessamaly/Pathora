package com.internplatform.auth.passwordreset;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class PasswordResetController {

    private static final String GENERIC_MESSAGE =
            "If an account exists for that email, a verification code will be sent.";

    private static final String PASSWORD_RESET_MESSAGE =
            "Password has been reset successfully.";

    private final PasswordResetService passwordResetService;

    public PasswordResetController(
            PasswordResetService passwordResetService
    ) {
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/forgot-password")
    public ForgotPasswordResponse forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request
    ) {
        passwordResetService.requestPasswordReset(
                request.email()
        );

        return new ForgotPasswordResponse(
                GENERIC_MESSAGE
        );
    }

    @PostMapping("/verify-otp")
    public VerifyOtpResponse verifyOtp(
            @Valid @RequestBody VerifyOtpRequest request
    ) {
        return passwordResetService.verifyOtp(
                request.email(),
                request.code()
        );
    }

    @PostMapping("/reset-password")
    public ResetPasswordResponse resetPassword(
            @Valid @RequestBody ResetPasswordRequest request
    ) {
        passwordResetService.resetPassword(
                request.resetToken(),
                request.newPassword()
        );

        return new ResetPasswordResponse(
                PASSWORD_RESET_MESSAGE
        );
    }
}