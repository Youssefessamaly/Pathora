CREATE TABLE internship_applications (
    id UUID PRIMARY KEY,

    internship_id UUID NOT NULL,
    intern_profile_id UUID NOT NULL,

    status VARCHAR(20) NOT NULL,

    cover_letter TEXT,
    linkedin_url VARCHAR(300),
    portfolio_url VARCHAR(300),
    interest_reason TEXT NOT NULL,

    -- Immutable snapshot of the intern's CV as it stood at application time (see
    -- InternshipApplicationService) — never a live pointer to the profile's current CV, so a
    -- later CV replacement on the profile can never change what this application represents.
    cv_file_name VARCHAR(255) NOT NULL,
    cv_storage_key VARCHAR(255) NOT NULL,
    cv_content_type VARCHAR(100) NOT NULL,
    cv_size_bytes INTEGER NOT NULL,
    cv_uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL,

    applied_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT fk_internship_applications_internship
        FOREIGN KEY (internship_id)
        REFERENCES internships(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_internship_applications_intern_profile
        FOREIGN KEY (intern_profile_id)
        REFERENCES intern_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_internship_applications_status
        CHECK (status IN ('APPLIED', 'ACCEPTED', 'REJECTED')),

    CONSTRAINT uk_internship_applications_internship_intern_profile
        UNIQUE (internship_id, intern_profile_id)
);

CREATE INDEX idx_internship_applications_internship_id
    ON internship_applications (internship_id);

CREATE INDEX idx_internship_applications_intern_profile_id
    ON internship_applications (intern_profile_id);

CREATE INDEX idx_internship_applications_status
    ON internship_applications (status);
