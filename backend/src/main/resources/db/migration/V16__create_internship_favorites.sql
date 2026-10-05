CREATE TABLE internship_favorites (
    id UUID PRIMARY KEY,

    intern_profile_id UUID NOT NULL,
    internship_id UUID NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT fk_internship_favorites_intern_profile
        FOREIGN KEY (intern_profile_id)
        REFERENCES intern_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_internship_favorites_internship
        FOREIGN KEY (internship_id)
        REFERENCES internships(id)
        ON DELETE CASCADE,

    CONSTRAINT uk_internship_favorites_profile_internship
        UNIQUE (intern_profile_id, internship_id)
);

CREATE INDEX idx_internship_favorites_intern_profile_id
    ON internship_favorites (intern_profile_id);

CREATE INDEX idx_internship_favorites_internship_id
    ON internship_favorites (internship_id);
