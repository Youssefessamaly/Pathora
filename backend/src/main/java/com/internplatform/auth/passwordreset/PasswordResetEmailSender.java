package com.internplatform.auth.passwordreset;

public interface PasswordResetEmailSender {

    void sendOtp(
            String recipientEmail,
            String otp
    );
}