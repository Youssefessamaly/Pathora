package com.internplatform.internprofile;

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

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/intern")
public class InternProfileController {

    private final InternProfileService internProfileService;

    public InternProfileController(InternProfileService internProfileService) {
        this.internProfileService = internProfileService;
    }

    @GetMapping("/profile")
    public InternProfileResponse getProfile(
            @AuthenticationPrincipal Jwt jwt
    ) {
        return internProfileService.getProfile(currentUserId(jwt));
    }

    @PatchMapping("/profile")
    public InternProfileResponse updateProfile(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody InternProfileRequest request
    ) {
        return internProfileService.upsertProfile(currentUserId(jwt), request);
    }

    @GetMapping("/skills")
    public List<SkillResponse> getSkills() {
        return internProfileService.getSkillCatalog();
    }

    @PostMapping("/profile/complete")
    public ResponseEntity<?> completeProfile(
            @AuthenticationPrincipal Jwt jwt
    ) {
        InternProfileService.CompletionResult result =
                internProfileService.completeOnboarding(currentUserId(jwt));

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
