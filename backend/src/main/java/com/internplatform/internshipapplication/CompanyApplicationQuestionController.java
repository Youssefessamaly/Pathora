package com.internplatform.internshipapplication;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
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
@RequestMapping("/api/v1/company/internships/{internshipId}/application-questions")
public class CompanyApplicationQuestionController {

    private final InternshipApplicationQuestionService questionService;

    public CompanyApplicationQuestionController(InternshipApplicationQuestionService questionService) {
        this.questionService = questionService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public InternshipApplicationQuestionResponse createQuestion(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID internshipId,
            @Valid @RequestBody InternshipApplicationQuestionCreateRequest request
    ) {
        return questionService.createQuestion(currentUserId(jwt), internshipId, request);
    }

    @GetMapping
    public List<InternshipApplicationQuestionResponse> listQuestions(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID internshipId
    ) {
        return questionService.listQuestionsForCompany(currentUserId(jwt), internshipId);
    }

    @PatchMapping("/{questionId}")
    public InternshipApplicationQuestionResponse updateQuestion(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID internshipId,
            @PathVariable UUID questionId,
            @Valid @RequestBody InternshipApplicationQuestionUpdateRequest request
    ) {
        return questionService.updateQuestion(currentUserId(jwt), internshipId, questionId, request);
    }

    @DeleteMapping("/{questionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteQuestion(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID internshipId,
            @PathVariable UUID questionId
    ) {
        questionService.deleteQuestion(currentUserId(jwt), internshipId, questionId);
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
