ALTER TABLE internship_applications
    ALTER COLUMN interest_reason DROP NOT NULL;

CREATE TABLE internship_application_questions (
    id UUID PRIMARY KEY,

    internship_id UUID NOT NULL,

    question_text VARCHAR(500) NOT NULL,
    question_type VARCHAR(20) NOT NULL,
    required BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT fk_internship_application_questions_internship
        FOREIGN KEY (internship_id)
        REFERENCES internships(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_internship_application_questions_type
        CHECK (question_type IN ('SHORT_TEXT', 'LONG_TEXT'))
);

CREATE INDEX idx_internship_application_questions_internship_order
    ON internship_application_questions (internship_id, display_order);

CREATE TABLE internship_application_answers (
    id UUID PRIMARY KEY,

    application_id UUID NOT NULL,
    question_id UUID NOT NULL,

    -- Immutable snapshot of the question as it stood when the applicant answered it — an
    -- application's history must never depend on reading the (possibly since-changed, though
    -- in practice frozen once applications exist) live question row.
    question_text_snapshot VARCHAR(500) NOT NULL,
    question_type_snapshot VARCHAR(20) NOT NULL,
    required_snapshot BOOLEAN NOT NULL,
    display_order_snapshot INTEGER NOT NULL,

    answer_text TEXT NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT fk_internship_application_answers_application
        FOREIGN KEY (application_id)
        REFERENCES internship_applications(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_internship_application_answers_question
        FOREIGN KEY (question_id)
        REFERENCES internship_application_questions(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_internship_application_answers_type
        CHECK (question_type_snapshot IN ('SHORT_TEXT', 'LONG_TEXT')),

    CONSTRAINT uk_internship_application_answers_application_question
        UNIQUE (application_id, question_id)
);

CREATE INDEX idx_internship_application_answers_application_id
    ON internship_application_answers (application_id);
