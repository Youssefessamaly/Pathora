CREATE TABLE intern_profiles (
    id UUID PRIMARY KEY,

    user_id UUID NOT NULL UNIQUE,

    first_name VARCHAR(100),
    last_name VARCHAR(100),
    date_of_birth DATE,
    phone_number VARCHAR(30),

    institution_name VARCHAR(200),
    academic_level VARCHAR(20),
    academic_year SMALLINT,
    major VARCHAR(150),
    expected_graduation_year SMALLINT,

    career_interests TEXT,
    linkedin_url VARCHAR(300),

    onboarding_completed_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT fk_intern_profiles_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_intern_profiles_academic_level
        CHECK (academic_level IN ('HIGH_SCHOOL', 'UNIVERSITY'))
);

CREATE INDEX idx_intern_profiles_user_id
    ON intern_profiles (user_id);

CREATE TABLE skills (
    id UUID PRIMARY KEY,

    name VARCHAR(100) NOT NULL
);

CREATE UNIQUE INDEX uk_skills_name
    ON skills (name);

CREATE TABLE intern_profile_skills (
    intern_profile_id UUID NOT NULL,
    skill_id UUID NOT NULL,

    CONSTRAINT pk_intern_profile_skills
        PRIMARY KEY (intern_profile_id, skill_id),

    CONSTRAINT fk_intern_profile_skills_profile
        FOREIGN KEY (intern_profile_id)
        REFERENCES intern_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_intern_profile_skills_skill
        FOREIGN KEY (skill_id)
        REFERENCES skills(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_intern_profile_skills_skill_id
    ON intern_profile_skills (skill_id);

INSERT INTO skills (id, name) VALUES
    (gen_random_uuid(), 'Excel'),
    (gen_random_uuid(), 'SQL'),
    (gen_random_uuid(), 'Python'),
    (gen_random_uuid(), 'Java'),
    (gen_random_uuid(), 'JavaScript'),
    (gen_random_uuid(), 'TypeScript'),
    (gen_random_uuid(), 'React'),
    (gen_random_uuid(), 'Spring Boot'),
    (gen_random_uuid(), 'Power BI'),
    (gen_random_uuid(), 'Figma'),
    (gen_random_uuid(), 'Communication'),
    (gen_random_uuid(), 'Project Management');
