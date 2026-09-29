ALTER TABLE company_profiles
    ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE company_profiles
    SET onboarding_completed = TRUE
    WHERE onboarding_completed_at IS NOT NULL;
