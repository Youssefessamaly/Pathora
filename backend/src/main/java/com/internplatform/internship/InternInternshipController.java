package com.internplatform.internship;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/intern/internships")
public class InternInternshipController {

    private final InternInternshipFeedService internInternshipFeedService;

    public InternInternshipController(InternInternshipFeedService internInternshipFeedService) {
        this.internInternshipFeedService = internInternshipFeedService;
    }

    @GetMapping
    public List<InternInternshipResponse> getFeed(
            @AuthenticationPrincipal Jwt jwt
    ) {
        return internInternshipFeedService.getPersonalizedFeed(currentUserId(jwt));
    }

    @GetMapping("/{internshipId}")
    public InternInternshipResponse getInternshipDetail(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID internshipId
    ) {
        return internInternshipFeedService.getPersonalizedInternshipDetail(currentUserId(jwt), internshipId);
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
