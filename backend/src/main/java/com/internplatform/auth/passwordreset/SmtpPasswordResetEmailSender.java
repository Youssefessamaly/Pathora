package com.internplatform.auth.passwordreset;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
public class SmtpPasswordResetEmailSender
        implements PasswordResetEmailSender {

    private final JavaMailSender mailSender;

    public SmtpPasswordResetEmailSender(
            JavaMailSender mailSender
    ) {
        this.mailSender = mailSender;
    }

    @Override
    public void sendOtp(
            String recipientEmail,
            String otp
    ) {
        SimpleMailMessage message = new SimpleMailMessage();

        message.setFrom("no-reply@pathora.local");
        message.setTo(recipientEmail);
        message.setSubject("Pathora password reset code");

        message.setText(
                "Your Pathora password reset code is: "
                        + otp
                        + System.lineSeparator()
                        + System.lineSeparator()
                        + "This code expires in 5 minutes."
        );

        mailSender.send(message);
    }
}