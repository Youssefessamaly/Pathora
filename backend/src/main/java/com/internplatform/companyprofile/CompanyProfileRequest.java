package com.internplatform.companyprofile;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CompanyProfileRequest(

        @Size(max = 200, message = "Company name must be at most 200 characters")
        String companyName,

        @Size(max = 100, message = "Industry must be at most 100 characters")
        String industry,

        @Size(max = 50, message = "Company size must be at most 50 characters")
        String companySize,

        @Size(max = 200, message = "Location must be at most 200 characters")
        String location,

        @Size(max = 300, message = "Website must be at most 300 characters")
        @Pattern(
                regexp = "(?i)^https?://[\\w.-]+\\.[a-z]{2,}(:\\d{1,5})?(/\\S*)?$",
                message = "Website must be a valid http(s) URL"
        )
        String website,

        @Size(max = 2000, message = "Description must be at most 2000 characters")
        String description,

        @Size(max = 150, message = "Contact name must be at most 150 characters")
        String contactName,

        @Pattern(
                regexp = "^(01[0125]\\d{8}|\\+201[0125]\\d{8})$",
                message = "Contact phone must be a valid Egyptian mobile number"
        )
        String contactPhone

) {
}
