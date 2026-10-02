package com.internplatform.internshipapplication;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/intern/applications")
public class InternApplicationController {

    private final InternshipApplicationService internshipApplicationService;

    public InternApplicationController(InternshipApplicationService internshipApplicationService) {
        this.internshipApplicationService = internshipApplicationService;
    }

    @GetMapping
    public List<InternshipApplicationResponse> listOwnApplications(
            @AuthenticationPrincipal Jwt jwt
    ) {
        return internshipApplicationService.listOwnApplications(currentUserId(jwt));
    }

    @GetMapping("/{applicationId}")
    public InternshipApplicationResponse getOwnApplication(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID applicationId
    ) {
        return internshipApplicationService.getOwnApplication(currentUserId(jwt), applicationId);
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
