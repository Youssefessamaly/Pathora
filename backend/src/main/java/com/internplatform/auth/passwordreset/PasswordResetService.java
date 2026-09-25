package com.internplatform.auth.passwordreset;

import com.internplatform.user.User;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Service
public class PasswordResetService {

    private static final int OTP_BOUND = 1_000_000;
    private static final long OTP_EXPIRATION_MINUTES = 5;

    private final PasswordResetOtpRepository passwordResetOtpRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom;

    public PasswordResetService(
            PasswordResetOtpRepository passwordResetOtpRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.passwordResetOtpRepository = passwordResetOtpRepository;
        this.passwordEncoder = passwordEncoder;
        this.secureRandom = new SecureRandom();
    }

    @Transactional
    public IssuedOtp issueOtp(User user) {
        invalidateExistingOtps(user);

        String otp = generateOtp();
        String otpHash = passwordEncoder.encode(otp);

        OffsetDateTime expiresAt = OffsetDateTime
                .now(ZoneOffset.UTC)
                .plusMinutes(OTP_EXPIRATION_MINUTES);

        PasswordResetOtp passwordResetOtp =
                new PasswordResetOtp(
                        user.getId(),
                        otpHash,
                        expiresAt
                );

        passwordResetOtpRepository.save(passwordResetOtp);

        return new IssuedOtp(
                otp,
                expiresAt
        );
    }

    private void invalidateExistingOtps(User user) {
        List<PasswordResetOtp> activeOtps =
                passwordResetOtpRepository
                        .findAllByUserIdAndUsedAtIsNullAndInvalidatedAtIsNull(
                                user.getId()
                        );

        for (PasswordResetOtp otp : activeOtps) {
            otp.invalidate();
        }

        if (!activeOtps.isEmpty()) {
            passwordResetOtpRepository.saveAll(activeOtps);
        }
    }

    private String generateOtp() {
        int value = secureRandom.nextInt(OTP_BOUND);

        return String.format(
                "%06d",
                value
        );
    }

    public record IssuedOtp(
            String code,
            OffsetDateTime expiresAt
    ) {
    }
}