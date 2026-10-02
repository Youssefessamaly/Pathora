ALTER TABLE internships
    ADD COLUMN application_method VARCHAR(20) NOT NULL DEFAULT 'INTERNAL';

ALTER TABLE internships
    ADD COLUMN external_application_url VARCHAR(2048);

ALTER TABLE internships
    ADD CONSTRAINT chk_internships_application_method
        CHECK (application_method IN ('INTERNAL', 'EXTERNAL'));

ALTER TABLE internships
    ADD CONSTRAINT chk_internships_application_method_url_pairing
        CHECK (
            (application_method = 'INTERNAL' AND external_application_url IS NULL)
            OR
            (application_method = 'EXTERNAL' AND external_application_url IS NOT NULL)
        );
