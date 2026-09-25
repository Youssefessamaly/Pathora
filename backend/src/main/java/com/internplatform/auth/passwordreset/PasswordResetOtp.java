 package com.internplatform.auth.passwordreset;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(name = "password_reset_otps")
public class PasswordResetOtp {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "otp_hash", nullable = false, length = 255)
    private String otpHash;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(name = "failed_attempts", nullable = false)
    private int failedAttempts;

    @Column(name = "verified_at")
    private OffsetDateTime verifiedAt;

    @Column(name = "reset_token_hash", length = 255)
    private String resetTokenHash;

    @Column(name = "reset_token_expires_at")
    private OffsetDateTime resetTokenExpiresAt;

    @Column(name = "used_at")
    private OffsetDateTime usedAt;

    @Column(name = "invalidated_at")
    private OffsetDateTime invalidatedAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected PasswordResetOtp() {
    }

    public PasswordResetOtp(
            UUID userId,
            String otpHash,
            OffsetDateTime expiresAt
    ) {
        this.userId = userId;
        this.otpHash = otpHash;
        this.expiresAt = expiresAt;
        this.failedAttempts = 0;
    }

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }

        if (createdAt == null) {
            createdAt = OffsetDateTime.now(ZoneOffset.UTC);
        }
    }

    public void incrementFailedAttempts() {
        failedAttempts++;
    }

    public void markVerified() {
        verifiedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    public void setResetToken(
            String resetTokenHash,
            OffsetDateTime resetTokenExpiresAt
    ) {
        this.resetTokenHash = resetTokenHash;
        this.resetTokenExpiresAt = resetTokenExpiresAt;
    }

    public void markUsed() {
        usedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    public void invalidate() {
        invalidatedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getOtpHash() {
        return otpHash;
    }

    public OffsetDateTime getExpiresAt() {
        return expiresAt;
    }

    public int getFailedAttempts() {
        return failedAttempts;
    }

    public OffsetDateTime getVerifiedAt() {
        return verifiedAt;
    }

    public String getResetTokenHash() {
        return resetTokenHash;
    }

    public OffsetDateTime getResetTokenExpiresAt() {
        return resetTokenExpiresAt;
    }

    public OffsetDateTime getUsedAt() {
        return usedAt;
    }

    public OffsetDateTime getInvalidatedAt() {
        return invalidatedAt;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}