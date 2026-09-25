  package com.internplatform.auth.passwordreset;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PasswordResetOtpRepository
        extends JpaRepository<PasswordResetOtp, UUID> {

    Optional<PasswordResetOtp>
    findFirstByUserIdAndUsedAtIsNullAndInvalidatedAtIsNullOrderByCreatedAtDesc(
            UUID userId
    );

    Optional<PasswordResetOtp>
    findByResetTokenHashAndUsedAtIsNullAndInvalidatedAtIsNull(
            String resetTokenHash
    );
}