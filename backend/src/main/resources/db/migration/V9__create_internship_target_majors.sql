CREATE TABLE internship_target_majors (
    internship_id UUID NOT NULL,
    major_name VARCHAR(150) NOT NULL,

    CONSTRAINT pk_internship_target_majors
        PRIMARY KEY (internship_id, major_name),

    CONSTRAINT fk_internship_target_majors_internship
        FOREIGN KEY (internship_id)
        REFERENCES internships(id)
        ON DELETE CASCADE
);
