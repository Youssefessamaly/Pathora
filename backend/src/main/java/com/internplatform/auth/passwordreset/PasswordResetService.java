package com.internplatform.auth.passwordreset;

import com.internplatform.user.User;
import com.internplatform.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
public class PasswordResetService {

    private static final int OTP_BOUND = 1_000_000;
    private static final long OTP_EXPIRATION_MINUTES = 5;

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int RESET_TOKEN_BYTES = 32;
    private static final long RESET_TOKEN_EXPIRATION_MINUTES = 10;

    private final PasswordResetOtpRepository passwordResetOtpRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordResetEmailSender emailSender;
    private final SecureRandom secureRandom;

    public PasswordResetService(
            PasswordResetOtpRepository passwordResetOtpRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            PasswordResetEmailSender emailSender
    ) {
        this.passwordResetOtpRepository = passwordResetOtpRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailSender = emailSender;
        this.secureRandom = new SecureRandom();
    }

    @Transactional
    public void requestPasswordReset(String email) {
        String normalizedEmail = normalizeEmail(email);

        Optional<User> userOptional =
                userRepository.findByEmailIgnoreCase(normalizedEmail);

        if (userOptional.isEmpty()) {
            return;
        }

        User user = userOptional.get();

        if (!user.isEnabled()) {
            return;
        }

        IssuedOtp issuedOtp = issueOtp(user);

        emailSender.sendOtp(
                user.getEmail(),
                issuedOtp.code()
        );
    }

    @Transactional(noRollbackFor = ResponseStatusException.class)
    public VerifyOtpResponse verifyOtp(
            String email,
            String code
    ) {
        String normalizedEmail = normalizeEmail(email);

        User user = userRepository
                .findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(this::invalidOrExpiredCode);

        PasswordResetOtp otp = passwordResetOtpRepository
                .findFirstByUserIdAndUsedAtIsNullAndInvalidatedAtIsNullOrderByCreatedAtDesc(
                        user.getId()
                )
                .orElseThrow(this::invalidOrExpiredCode);

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        if (otp.getVerifiedAt() != null) {
            throw invalidOrExpiredCode();
        }

        if (otp.getExpiresAt().isBefore(now)) {
            otp.invalidate();
            passwordResetOtpRepository.save(otp);

            throw invalidOrExpiredCode();
        }

        if (otp.getFailedAttempts() >= MAX_FAILED_ATTEMPTS) {
            otp.invalidate();
            passwordResetOtpRepository.save(otp);

            throw invalidOrExpiredCode();
        }

        if (!passwordEncoder.matches(code, otp.getOtpHash())) {
            otp.incrementFailedAttempts();

            if (otp.getFailedAttempts() >= MAX_FAILED_ATTEMPTS) {
                otp.invalidate();
            }

            passwordResetOtpRepository.save(otp);

            throw invalidOrExpiredCode();
        }

        otp.markVerified();

        String resetToken = generateResetToken();
        String resetTokenHash = hashResetToken(resetToken);

        OffsetDateTime resetTokenExpiresAt =
                now.plusMinutes(RESET_TOKEN_EXPIRATION_MINUTES);

        otp.setResetToken(
                resetTokenHash,
                resetTokenExpiresAt
        );

        passwordResetOtpRepository.save(otp);

        return new VerifyOtpResponse(
                resetToken,
                resetTokenExpiresAt
        );
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

    private String generateResetToken() {
        byte[] tokenBytes = new byte[RESET_TOKEN_BYTES];
        secureRandom.nextBytes(tokenBytes);

        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(tokenBytes);
    }

    private String hashResetToken(String resetToken) {
        try {
            MessageDigest digest =
                    MessageDigest.getInstance("SHA-256");

            byte[] hash = digest.digest(
                    resetToken.getBytes(StandardCharsets.UTF_8)
            );

            return HexFormat.of().formatHex(hash);

        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(
                    "SHA-256 is not available",
                    exception
            );
        }
    }

    private String normalizeEmail(String email) {
        return email
                .trim()
                .toLowerCase(Locale.ROOT);
    }

    private ResponseStatusException invalidOrExpiredCode() {
        return new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Invalid or expired verification code"
        );
    }

    private record IssuedOtp(
            String code,
            OffsetDateTime expiresAt
    ) {
    }
}