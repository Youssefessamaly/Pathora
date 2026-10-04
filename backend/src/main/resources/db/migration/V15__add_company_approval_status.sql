-- Company approval workflow (admin review). Added nullable first so existing rows can be
-- backfilled explicitly before the NOT NULL constraint is enforced — existing companies
-- predate this workflow and already have working, tested access, so they must become
-- APPROVED rather than being locked out as PENDING.
ALTER TABLE company_profiles
    ADD COLUMN approval_status VARCHAR(20);

ALTER TABLE company_profiles
    ADD COLUMN approval_reviewed_at TIMESTAMP WITH TIME ZONE;

UPDATE company_profiles
    SET approval_status = 'APPROVED'
    WHERE approval_status IS NULL;

-- The DEFAULT only governs rows inserted from here on (every existing row above already has
-- an explicit value) — new company registrations start PENDING, enforced again at the
-- application layer (CompanyProfile's constructor), with this as a defense-in-depth backstop.
ALTER TABLE company_profiles
    ALTER COLUMN approval_status SET NOT NULL;

ALTER TABLE company_profiles
    ALTER COLUMN approval_status SET DEFAULT 'PENDING';

ALTER TABLE company_profiles
    ADD CONSTRAINT chk_company_profiles_approval_status
        CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED'));
