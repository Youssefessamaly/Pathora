package com.internplatform.internshipapplication;

import com.internplatform.companyprofile.CompanyApprovalGuard;
import com.internplatform.companyprofile.CompanyProfile;
import com.internplatform.companyprofile.CompanyProfileRepository;
import com.internplatform.internship.ApplicationMethod;
import com.internplatform.internship.Internship;
import com.internplatform.internship.InternshipRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

/**
 * Company-owned CRUD for an INTERNAL internship's custom application questions. Questions are
 * freely editable until the internship receives its first application — after that, every
 * mutation is rejected with 409 so every applicant for one internship answers the same
 * question set (see requireNotFrozen).
 */
@Service
public class InternshipApplicationQuestionService {

    private final InternshipApplicationQuestionRepository questionRepository;
    private final InternshipRepository internshipRepository;
    private final CompanyProfileRepository companyProfileRepository;
    private final InternshipApplicationRepository applicationRepository;
    private final CompanyApprovalGuard companyApprovalGuard;

    public InternshipApplicationQuestionService(
            InternshipApplicationQuestionRepository questionRepository,
            InternshipRepository internshipRepository,
            CompanyProfileRepository companyProfileRepository,
            InternshipApplicationRepository applicationRepository,
            CompanyApprovalGuard companyApprovalGuard
    ) {
        this.questionRepository = questionRepository;
        this.internshipRepository = internshipRepository;
        this.companyProfileRepository = companyProfileRepository;
        this.applicationRepository = applicationRepository;
        this.companyApprovalGuard = companyApprovalGuard;
    }

    @Transactional
    public InternshipApplicationQuestionResponse createQuestion(
            UUID userId, UUID internshipId, InternshipApplicationQuestionCreateRequest request
    ) {
        CompanyProfile profile = findCompanyProfileOrInternshipNotFound(userId);
        Internship internship = findOwnedInternshipOrThrow(internshipId, profile);

        requireInternalApplicationMethod(internship);
        requireNotFrozen(internship.getId());

        InternshipApplicationQuestion question = new InternshipApplicationQuestion(internship.getId());
        question.setQuestionText(request.questionText().trim());
        question.setQuestionType(request.questionType());
        question.setRequired(request.required());
        question.setDisplayOrder(request.displayOrder());

        InternshipApplicationQuestion saved = questionRepository.saveAndFlush(question);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<InternshipApplicationQuestionResponse> listQuestionsForCompany(UUID userId, UUID internshipId) {
        CompanyProfile profile = findCompanyProfileOrInternshipNotFound(userId);
        Internship internship = findOwnedInternshipOrThrow(internshipId, profile);

        return questionRepository.findAllByInternshipIdOrderByDisplayOrderAscCreatedAtAsc(internship.getId()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public InternshipApplicationQuestionResponse updateQuestion(
            UUID userId, UUID internshipId, UUID questionId, InternshipApplicationQuestionUpdateRequest request
    ) {
        CompanyProfile profile = findCompanyProfileOrInternshipNotFound(userId);
        Internship internship = findOwnedInternshipOrThrow(internshipId, profile);
        InternshipApplicationQuestion question = findOwnedQuestionOrThrow(questionId, internship.getId());

        requireNotFrozen(internship.getId());

        if (request.questionText() != null) {
            String trimmed = request.questionText().trim();
            if (trimmed.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Question text cannot be blank");
            }
            question.setQuestionText(trimmed);
        }

        if (request.questionType() != null) {
            question.setQuestionType(request.questionType());
        }

        if (request.required() != null) {
            question.setRequired(request.required());
        }

        if (request.displayOrder() != null) {
            question.setDisplayOrder(request.displayOrder());
        }

        InternshipApplicationQuestion saved = questionRepository.saveAndFlush(question);
        return toResponse(saved);
    }

    @Transactional
    public void deleteQuestion(UUID userId, UUID internshipId, UUID questionId) {
        CompanyProfile profile = findCompanyProfileOrInternshipNotFound(userId);
        Internship internship = findOwnedInternshipOrThrow(internshipId, profile);
        InternshipApplicationQuestion question = findOwnedQuestionOrThrow(questionId, internship.getId());

        requireNotFrozen(internship.getId());

        questionRepository.delete(question);
    }

    /** Only INTERNAL internships use Pathora's own application flow, so only they may have
     *  Pathora-hosted application questions. Applies to create/update only — delete remains
     *  allowed regardless, as cleanup for a question left over from before an internship was
     *  switched to EXTERNAL. */
    private void requireInternalApplicationMethod(Internship internship) {
        if (internship.getApplicationMethod() != ApplicationMethod.INTERNAL) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Application questions are only available for internships using Pathora's internal application process"
            );
        }
    }

    private void requireNotFrozen(UUID internshipId) {
        if (applicationRepository.existsByInternshipId(internshipId)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Application questions can no longer be changed once this internship has received applications"
            );
        }
    }

    private CompanyProfile findCompanyProfileOrInternshipNotFound(UUID userId) {
        CompanyProfile profile = companyProfileRepository.findByUserId(userId)
                .orElseThrow(this::internshipNotFound);
        companyApprovalGuard.requireApproved(profile);
        return profile;
    }

    private Internship findOwnedInternshipOrThrow(UUID internshipId, CompanyProfile profile) {
        return internshipRepository.findByIdAndCompanyProfileId(internshipId, profile.getId())
                .orElseThrow(this::internshipNotFound);
    }

    private InternshipApplicationQuestion findOwnedQuestionOrThrow(UUID questionId, UUID internshipId) {
        return questionRepository.findByIdAndInternshipId(questionId, internshipId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));
    }

    private ResponseStatusException internshipNotFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Internship not found");
    }

    private InternshipApplicationQuestionResponse toResponse(InternshipApplicationQuestion question) {
        return new InternshipApplicationQuestionResponse(
                question.getId(),
                question.getInternshipId(),
                question.getQuestionText(),
                question.getQuestionType(),
                question.isRequired(),
                question.getDisplayOrder(),
                question.getCreatedAt(),
                question.getUpdatedAt()
        );
    }
}
