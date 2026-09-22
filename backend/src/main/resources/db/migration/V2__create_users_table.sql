CREATE TABLE users (
                       id UUID PRIMARY KEY,

                       email VARCHAR(320) NOT NULL,
                       password_hash VARCHAR(255) NOT NULL,

                       role VARCHAR(20) NOT NULL,
                       enabled BOOLEAN NOT NULL DEFAULT TRUE,

                       created_at TIMESTAMP WITH TIME ZONE NOT NULL,
                       updated_at TIMESTAMP WITH TIME ZONE NOT NULL,

                       CONSTRAINT chk_users_role
                           CHECK (role IN ('INTERN', 'COMPANY', 'ADMIN'))
);

CREATE UNIQUE INDEX uk_users_email_lower
    ON users (LOWER(email));