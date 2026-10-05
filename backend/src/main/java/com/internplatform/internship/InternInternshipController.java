package com.internplatform.internship;

import com.internplatform.internshipapplication.InternshipApplicationQuestionResponse;
import com.internplatform.internshipapplication.InternshipApplicationRequest;
import com.internplatform.internshipapplication.InternshipApplicationResponse;
import com.internplatform.internshipapplication.InternshipApplicationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/intern/internships")
public class InternInternshipController {

    private final InternInternshipFeedService internInternshipFeedService;
    private final InternshipApplicationService internshipApplicationService;

    public InternInternshipController(
            InternInternshipFeedService internInternshipFeedService,
            InternshipApplicationService internshipApplicationService
    ) {
        this.internInternshipFeedService = internInternshipFeedService;
        this.internshipApplicationService = internshipApplicationService;
    }

    @GetMapping
    public List<InternInternshipResponse> getFeed(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) String search
    ) {
        return internInternshipFeedService.getPersonalizedFeed(currentUserId(jwt), search);
    }

    @GetMapping("/{internshipId}")
    public InternInternshipResponse getInternshipDetail(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID internshipId
    ) {
        return internInternshipFeedService.getPersonalizedInternshipDetail(currentUserId(jwt), internshipId);
    }

    @PostMapping("/{internshipId}/applications")
    @ResponseStatus(HttpStatus.CREATED)
    public InternshipApplicationResponse submitApplication(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID internshipId,
            @Valid @RequestBody InternshipApplicationRequest request
    ) {
        return internshipApplicationService.submitApplication(currentUserId(jwt), internshipId, request);
    }

    @GetMapping("/{internshipId}/application-questions")
    public List<InternshipApplicationQuestionResponse> getApplicationQuestions(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID internshipId
    ) {
        return internshipApplicationService.getApplicationQuestions(currentUserId(jwt), internshipId);
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
