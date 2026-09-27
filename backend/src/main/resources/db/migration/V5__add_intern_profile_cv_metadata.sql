ALTER TABLE intern_profiles
    ADD COLUMN cv_original_filename VARCHAR(255),
    ADD COLUMN cv_storage_key VARCHAR(255),
    ADD COLUMN cv_content_type VARCHAR(100),
    ADD COLUMN cv_size_bytes INTEGER,
    ADD COLUMN cv_uploaded_at TIMESTAMP WITH TIME ZONE;
