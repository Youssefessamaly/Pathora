package com.internplatform.companyprofile;

import java.util.List;

public record OnboardingValidationErrorResponse(
        List<String> missingFields
) {
}
