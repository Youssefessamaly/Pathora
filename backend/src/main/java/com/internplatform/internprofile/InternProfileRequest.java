package com.internplatform.internprofile;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record InternProfileRequest(

        @Size(max = 100, message = "First name must be at most 100 characters")
        String firstName,

        @Size(max = 100, message = "Last name must be at most 100 characters")
        String lastName,

        @Past(message = "Date of birth must be in the past")
        LocalDate dateOfBirth,

        @Pattern(
                regexp = "^(01[0125]\\d{8}|\\+201[0125]\\d{8})$",
                message = "Phone number must be a valid Egyptian mobile number"
        )
        String phoneNumber,

        @Size(max = 200, message = "Institution name must be at most 200 characters")
        String institutionName,

        AcademicLevel academicLevel,

        @Min(value = 1, message = "Academic year must be between 1 and 6")
        @Max(value = 6, message = "Academic year must be between 1 and 6")
        Integer academicYear,

        @Size(max = 150, message = "Major must be at most 150 characters")
        String major,

        Integer expectedGraduationYear,

        List<UUID> skillIds,

        String careerInterests,

        @Size(max = 300, message = "LinkedIn URL must be at most 300 characters")
        @Pattern(
                regexp = "(?i)^(https?://)?(www\\.)?linkedin\\.com/in/[\\w\\-%]+/?$",
                message = "LinkedIn URL must be a valid linkedin.com/in/... profile URL"
        )
        String linkedinUrl

) {
}
