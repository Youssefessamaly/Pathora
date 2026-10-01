ALTER TABLE internships
    ADD COLUMN minimum_academic_year INTEGER;

ALTER TABLE internships
    ADD CONSTRAINT chk_internships_minimum_academic_year
        CHECK (minimum_academic_year IS NULL OR minimum_academic_year BETWEEN 1 AND 6);
