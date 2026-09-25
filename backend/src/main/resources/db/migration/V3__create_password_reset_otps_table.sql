CREATE TABLE password_reset_otps (
    id UUID PRIMARY KEY,

    user_id UUID NOT NULL,

    otp_hash VARCHAR(255) NOT NULL,

    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

    failed_attempts INTEGER NOT NULL DEFAULT 0,

    verified_at TIMESTAMP WITH TIME ZONE,

    reset_token_hash VARCHAR(255),

    reset_token_expires_at TIMESTAMP WITH TIME ZONE,

    used_at TIMESTAMP WITH TIME ZONE,

    invalidated_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT fk_password_reset_otps_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_password_reset_otps_failed_attempts
        CHECK (failed_attempts >= 0)
);

CREATE INDEX idx_password_reset_otps_user_id
    ON password_reset_otps (user_id);

CREATE INDEX idx_password_reset_otps_created_at
    ON password_reset_otps (created_at);