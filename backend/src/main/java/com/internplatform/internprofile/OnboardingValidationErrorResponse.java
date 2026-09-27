package com.internplatform.internprofile;

import java.util.List;

public record OnboardingValidationErrorResponse(
        List<String> missingFields
) {
}
