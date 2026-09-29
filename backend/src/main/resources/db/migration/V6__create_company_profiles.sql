CREATE TABLE company_profiles (
    id UUID PRIMARY KEY,

    user_id UUID NOT NULL UNIQUE,

    company_name VARCHAR(200),
    industry VARCHAR(100),
    company_size VARCHAR(50),
    location VARCHAR(200),
    website VARCHAR(300),
    description TEXT,

    contact_name VARCHAR(150),
    contact_phone VARCHAR(30),

    onboarding_completed_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT fk_company_profiles_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_company_profiles_user_id
    ON company_profiles (user_id);
