CREATE TABLE intern_cv_skills (
    intern_profile_id UUID NOT NULL,
    skill_id UUID NOT NULL,

    CONSTRAINT pk_intern_cv_skills
        PRIMARY KEY (intern_profile_id, skill_id),

    CONSTRAINT fk_intern_cv_skills_profile
        FOREIGN KEY (intern_profile_id)
        REFERENCES intern_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_intern_cv_skills_skill
        FOREIGN KEY (skill_id)
        REFERENCES skills(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_intern_cv_skills_skill_id
    ON intern_cv_skills (skill_id);
