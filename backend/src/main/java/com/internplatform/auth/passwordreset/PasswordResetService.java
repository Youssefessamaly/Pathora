package com.internplatform.auth.passwordreset;

import com.internplatform.user.User;
import com.internplatform.user.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
public class PasswordResetService {

    private static final int OTP_BOUND = 1_000_000;
    private static final long OTP_EXPIRATION_MINUTES = 5;

    private final PasswordResetOtpRepository passwordResetOtpRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom;

    public PasswordResetService(
            PasswordResetOtpRepository passwordResetOtpRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.passwordResetOtpRepository = passwordResetOtpRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.secureRandom = new SecureRandom();
    }

    @Transactional
    public Optional<IssuedOtp> requestPasswordReset(String email) {
        String normalizedEmail = email
                .trim()
                .toLowerCase(Locale.ROOT);

        Optional<User> userOptional =
                userRepository.findByEmailIgnoreCase(normalizedEmail);

        if (userOptional.isEmpty()) {
            return Optional.empty();
        }

        User user = userOptional.get();

        if (!user.isEnabled()) {
            return Optional.empty();
        }

        return Optional.of(issueOtp(user));
    }

    private IssuedOtp issueOtp(User user) {
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

        return String.format("%06d", value);
    }

    public record IssuedOtp(
            String code,
            OffsetDateTime expiresAt
    ) {
    }
}