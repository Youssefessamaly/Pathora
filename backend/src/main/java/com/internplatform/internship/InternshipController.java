package com.internplatform.internship;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/company/internships")
public class InternshipController {

    private final InternshipService internshipService;

    public InternshipController(InternshipService internshipService) {
        this.internshipService = internshipService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public InternshipResponse createInternship(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody InternshipCreateRequest request
    ) {
        return internshipService.createInternship(currentUserId(jwt), request);
    }

    @GetMapping
    public List<InternshipResponse> listInternships(
            @AuthenticationPrincipal Jwt jwt
    ) {
        return internshipService.listOwnInternships(currentUserId(jwt));
    }

    @GetMapping("/{internshipId}")
    public InternshipResponse getInternship(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID internshipId
    ) {
        return internshipService.getInternship(currentUserId(jwt), internshipId);
    }

    @PatchMapping("/{internshipId}")
    public InternshipResponse updateInternship(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID internshipId,
            @Valid @RequestBody InternshipUpdateRequest request
    ) {
        return internshipService.updateInternship(currentUserId(jwt), internshipId, request);
    }

    @PostMapping("/{internshipId}/close")
    public InternshipResponse closeInternship(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID internshipId
    ) {
        return internshipService.closeInternship(currentUserId(jwt), internshipId);
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
