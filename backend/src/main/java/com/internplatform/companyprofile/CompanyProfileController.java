package com.internplatform.companyprofile;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/company")
public class CompanyProfileController {

    private final CompanyProfileService companyProfileService;

    public CompanyProfileController(CompanyProfileService companyProfileService) {
        this.companyProfileService = companyProfileService;
    }

    @GetMapping("/profile")
    public CompanyProfileResponse getProfile(
            @AuthenticationPrincipal Jwt jwt
    ) {
        return companyProfileService.getProfile(currentUserId(jwt));
    }

    @PatchMapping("/profile")
    public CompanyProfileResponse updateProfile(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CompanyProfileRequest request
    ) {
        return companyProfileService.upsertProfile(currentUserId(jwt), request);
    }

    @PostMapping("/profile/complete")
    public ResponseEntity<?> completeProfile(
            @AuthenticationPrincipal Jwt jwt
    ) {
        CompanyProfileService.CompletionResult result =
                companyProfileService.completeOnboarding(currentUserId(jwt));

        if (!result.missingFields().isEmpty()) {
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(new OnboardingValidationErrorResponse(result.missingFields()));
        }

        return ResponseEntity.ok(result.profile());
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
