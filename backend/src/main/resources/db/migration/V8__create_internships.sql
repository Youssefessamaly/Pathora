CREATE TABLE internships (
    id UUID PRIMARY KEY,

    company_profile_id UUID NOT NULL,

    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(200) NOT NULL,
    work_mode VARCHAR(20) NOT NULL,

    application_deadline DATE NOT NULL,
    start_date DATE,
    duration_months INTEGER,

    status VARCHAR(20) NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT fk_internships_company_profile
        FOREIGN KEY (company_profile_id)
        REFERENCES company_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_internships_work_mode
        CHECK (work_mode IN ('ONSITE', 'HYBRID', 'REMOTE')),

    CONSTRAINT chk_internships_status
        CHECK (status IN ('OPEN', 'CLOSED'))
);

CREATE INDEX idx_internships_company_profile_id
    ON internships (company_profile_id);

CREATE INDEX idx_internships_status
    ON internships (status);

CREATE INDEX idx_internships_application_deadline
    ON internships (application_deadline);

CREATE TABLE internship_skills (
    internship_id UUID NOT NULL,
    skill_id UUID NOT NULL,

    CONSTRAINT pk_internship_skills
        PRIMARY KEY (internship_id, skill_id),

    CONSTRAINT fk_internship_skills_internship
        FOREIGN KEY (internship_id)
        REFERENCES internships(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_internship_skills_skill
        FOREIGN KEY (skill_id)
        REFERENCES skills(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_internship_skills_skill_id
    ON internship_skills (skill_id);
