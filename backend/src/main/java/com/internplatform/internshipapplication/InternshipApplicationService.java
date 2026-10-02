package com.internplatform.internshipapplication;

import com.internplatform.companyprofile.CompanyProfile;
import com.internplatform.companyprofile.CompanyProfileRepository;
import com.internplatform.internprofile.CvStorageService;
import com.internplatform.internprofile.InternProfile;
import com.internplatform.internprofile.InternProfileRepository;
import com.internplatform.internship.AcademicYearEligibility;
import com.internplatform.internship.ApplicationMethod;
import com.internplatform.internship.Internship;
import com.internplatform.internship.InternshipRepository;
import com.internplatform.internship.InternshipStatus;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class InternshipApplicationService {

    private static final int MAX_SHORT_TEXT_ANSWER_LENGTH = 500;
    private static final int MAX_LONG_TEXT_ANSWER_LENGTH = 5000;

    private static final String EXTERNAL_APPLICATION_METHOD_MESSAGE =
            "This internship accepts applications on the company's website, not inside Pathora";

    private final InternshipApplicationRepository applicationRepository;
    private final InternshipApplicationQuestionRepository questionRepository;
    private final InternshipApplicationAnswerRepository answerRepository;
    private final InternProfileRepository internProfileRepository;
    private final InternshipRepository internshipRepository;
    private final CompanyProfileRepository companyProfileRepository;
    private final CvStorageService cvStorageService;

    public InternshipApplicationService(
            InternshipApplicationRepository applicationRepository,
            InternshipApplicationQuestionRepository questionRepository,
            InternshipApplicationAnswerRepository answerRepository,
            InternProfileRepository internProfileRepository,
            InternshipRepository internshipRepository,
            CompanyProfileRepository companyProfileRepository,
            CvStorageService cvStorageService
    ) {
        this.applicationRepository = applicationRepository;
        this.questionRepository = questionRepository;
        this.answerRepository = answerRepository;
        this.internProfileRepository = internProfileRepository;
        this.internshipRepository = internshipRepository;
        this.companyProfileRepository = companyProfileRepository;
        this.cvStorageService = cvStorageService;
    }

    @Transactional
    public InternshipApplicationResponse submitApplication(
            UUID userId, UUID internshipId, InternshipApplicationRequest request
    ) {
        InternProfile profile = requireCompletedInternProfile(userId);
        Internship internship = requireEligibleInternship(internshipId, profile);

        // EXTERNAL internships are real and visible (they already passed the eligibility
        // lookup above) — they get their own clear 400 rather than being folded into the
        // generic "not found" 404, since the client needs to tell the two cases apart to
        // decide whether to show this form at all or just open externalApplicationUrl.
        if (internship.getApplicationMethod() == ApplicationMethod.EXTERNAL) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, EXTERNAL_APPLICATION_METHOD_MESSAGE);
        }

        if (profile.getCvStorageKey() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Upload a CV to your profile before applying to this internship"
            );
        }

        if (applicationRepository.existsByInternshipIdAndInternProfileId(internship.getId(), profile.getId())) {
            throw duplicateApplication();
        }

        // 1-2. Validate the application and its answers BEFORE anything is mutated — a thrown
        // exception here leaves the CV untouched and creates no application/answer rows.
        List<InternshipApplicationQuestion> questions =
                questionRepository.findAllByInternshipIdOrderByDisplayOrderAscCreatedAtAsc(internship.getId());
        List<ValidatedAnswer> validatedAnswers = validateAnswers(questions, request.answers());

        // 3. Independent, physically separate copy of the CV bytes as they stand right now —
        // never the live storage key, so a later CV replacement on the profile (which deletes
        // its old file) can never affect what this application represents.
        byte[] cvSnapshotBytes = cvStorageService.read(profile.getCvStorageKey());
        String cvSnapshotStorageKey = cvStorageService.store(profile.getId(), cvSnapshotBytes);

        // 4. Create the application (always APPLIED).
        InternshipApplication application = new InternshipApplication(internship.getId(), profile.getId());
        application.setCoverLetter(request.coverLetter());
        application.setLinkedinUrl(request.linkedinUrl());
        application.setPortfolioUrl(request.portfolioUrl());
        application.setCvFileName(profile.getCvOriginalFilename());
        application.setCvStorageKey(cvSnapshotStorageKey);
        application.setCvContentType(profile.getCvContentType());
        application.setCvSizeBytes(profile.getCvSizeBytes());
        application.setCvUploadedAt(profile.getCvUploadedAt());

        InternshipApplication saved;
        try {
            saved = applicationRepository.saveAndFlush(application);
        } catch (DataIntegrityViolationException exception) {
            // The pre-check above lost a race to a concurrent request — the DB's
            // UNIQUE(internship_id, intern_profile_id) constraint is the final backstop.
            throw duplicateApplication();
        }

        // 5. Create the answer snapshot rows.
        List<InternshipApplicationAnswer> answerEntities = validatedAnswers.stream()
                .map(answer -> toAnswerEntity(saved.getId(), answer))
                .toList();
        answerRepository.saveAll(answerEntities);

        return toResponse(saved, internship.getTitle(), companyNameFor(internship), toAnswerResponses(answerEntities));
    }

    @Transactional(readOnly = true)
    public List<InternshipApplicationQuestionResponse> getApplicationQuestions(UUID userId, UUID internshipId) {
        InternProfile profile = requireCompletedInternProfile(userId);
        Internship internship = requireEligibleInternship(internshipId, profile);

        // Same explicit rejection as submission — consistent across the whole "can I apply
        // internally to this internship" question so the client never sees an ambiguous empty
        // list standing in for "this is actually an EXTERNAL internship."
        if (internship.getApplicationMethod() == ApplicationMethod.EXTERNAL) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, EXTERNAL_APPLICATION_METHOD_MESSAGE);
        }

        return questionRepository.findAllByInternshipIdOrderByDisplayOrderAscCreatedAtAsc(internship.getId()).stream()
                .map(this::toQuestionResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<InternshipApplicationResponse> listOwnApplications(UUID userId) {
        InternProfile profile = requireCompletedInternProfile(userId);

        return applicationRepository.findAllByInternProfileIdOrderByAppliedAtDesc(profile.getId()).stream()
                .map(this::toCompactResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public InternshipApplicationResponse getOwnApplication(UUID userId, UUID applicationId) {
        InternProfile profile = requireCompletedInternProfile(userId);

        InternshipApplication application = applicationRepository
                .findByIdAndInternProfileId(applicationId, profile.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));

        return toResponseWithAnswers(application);
    }

    /**
     * Validates submitted answers against the internship's currently configured questions and
     * returns the validated, trimmed set ready to snapshot. Rules (checked per submitted
     * answer, in order): the question must belong to this internship (an unknown id and an id
     * from another internship both simply aren't in the map, so both collapse to the same
     * "unknown question" 400); no question may be answered twice in one submission; an answer
     * may not exceed the max length for its question's type. After processing every submitted
     * answer, every REQUIRED question from the live set must have a non-blank answer, or the
     * whole submission is rejected — an optional question may be omitted entirely, and zero
     * configured questions always succeeds trivially.
     */
    private List<ValidatedAnswer> validateAnswers(
            List<InternshipApplicationQuestion> questions,
            List<InternshipApplicationAnswerRequest> submittedAnswers
    ) {
        Map<UUID, InternshipApplicationQuestion> questionsById = questions.stream()
                .collect(Collectors.toMap(InternshipApplicationQuestion::getId, question -> question));

        List<InternshipApplicationAnswerRequest> safeSubmitted =
                submittedAnswers != null ? submittedAnswers : List.of();

        Map<UUID, String> trimmedAnswersByQuestionId = new HashMap<>();
        Set<UUID> seenQuestionIds = new HashSet<>();

        for (InternshipApplicationAnswerRequest submitted : safeSubmitted) {
            UUID questionId = submitted.questionId();
            InternshipApplicationQuestion question = questionsById.get(questionId);

            if (question == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown question id: " + questionId);
            }

            if (!seenQuestionIds.add(questionId)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "Duplicate answer submitted for the same question");
            }

            String trimmed = submitted.answer() != null ? submitted.answer().trim() : "";
            int maxLength = question.getQuestionType() == ApplicationQuestionType.SHORT_TEXT
                    ? MAX_SHORT_TEXT_ANSWER_LENGTH
                    : MAX_LONG_TEXT_ANSWER_LENGTH;

            if (trimmed.length() > maxLength) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Answer to \"" + question.getQuestionText() + "\" must be at most " + maxLength + " characters"
                );
            }

            trimmedAnswersByQuestionId.put(questionId, trimmed);
        }

        List<ValidatedAnswer> validated = new ArrayList<>();

        for (InternshipApplicationQuestion question : questions) {
            String answerText = trimmedAnswersByQuestionId.get(question.getId());
            boolean answered = answerText != null && !answerText.isEmpty();

            if (question.isRequired() && !answered) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Please answer the required question: " + question.getQuestionText()
                );
            }

            if (answered) {
                validated.add(new ValidatedAnswer(
                        question.getId(),
                        question.getQuestionText(),
                        question.getQuestionType(),
                        question.isRequired(),
                        question.getDisplayOrder(),
                        answerText
                ));
            }
        }

        return validated;
    }

    private InternshipApplicationAnswer toAnswerEntity(UUID applicationId, ValidatedAnswer answer) {
        InternshipApplicationAnswer entity = new InternshipApplicationAnswer(applicationId, answer.questionId());
        entity.setQuestionTextSnapshot(answer.questionText());
        entity.setQuestionTypeSnapshot(answer.questionType());
        entity.setRequiredSnapshot(answer.required());
        entity.setDisplayOrderSnapshot(answer.displayOrder());
        entity.setAnswerText(answer.answerText());
        return entity;
    }

    private ResponseStatusException duplicateApplication() {
        return new ResponseStatusException(HttpStatus.CONFLICT, "You have already applied to this internship");
    }

    private InternProfile requireCompletedInternProfile(UUID userId) {
        InternProfile profile = internProfileRepository.findByUserId(userId).orElse(null);

        if (profile == null || profile.getOnboardingCompletedAt() == null) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Intern profile must be completed before applying to internships"
            );
        }

        return profile;
    }

    /**
     * Exists + OPEN + not expired + academic-year eligible, collapsed into one 404 — exactly
     * the same rule and the same collapsing behavior InternInternshipFeedService uses for
     * GET /intern/internships/{id}, via the shared AcademicYearEligibility helper, so the feed
     * and submission can never disagree about what an intern is allowed to see/apply to.
     */
    private Internship requireEligibleInternship(UUID internshipId, InternProfile profile) {
        return internshipRepository
                .findByIdAndStatusAndApplicationDeadlineGreaterThanEqual(
                        internshipId, InternshipStatus.OPEN, LocalDate.now(ZoneOffset.UTC))
                .filter(found -> AcademicYearEligibility.satisfies(found, profile))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Internship not found"));
    }

    private String companyNameFor(Internship internship) {
        return companyProfileRepository.findById(internship.getCompanyProfileId())
                .map(CompanyProfile::getCompanyName)
                .orElse(null);
    }

    private InternshipApplicationResponse toCompactResponse(InternshipApplication application) {
        Internship internship = internshipRepository.findById(application.getInternshipId()).orElse(null);
        String internshipTitle = internship != null ? internship.getTitle() : null;
        String companyName = internship != null ? companyNameFor(internship) : null;

        return toResponse(application, internshipTitle, companyName, List.of());
    }

    private InternshipApplicationResponse toResponseWithAnswers(InternshipApplication application) {
        Internship internship = internshipRepository.findById(application.getInternshipId()).orElse(null);
        String internshipTitle = internship != null ? internship.getTitle() : null;
        String companyName = internship != null ? companyNameFor(internship) : null;

        List<InternshipApplicationAnswerResponse> answers = toAnswerResponses(
                answerRepository.findAllByApplicationIdOrderByDisplayOrderSnapshotAsc(application.getId()));

        return toResponse(application, internshipTitle, companyName, answers);
    }

    private List<InternshipApplicationAnswerResponse> toAnswerResponses(List<InternshipApplicationAnswer> answers) {
        return answers.stream()
                .map(answer -> new InternshipApplicationAnswerResponse(
                        answer.getQuestionId(),
                        answer.getQuestionTextSnapshot(),
                        answer.getQuestionTypeSnapshot(),
                        answer.isRequiredSnapshot(),
                        answer.getDisplayOrderSnapshot(),
                        answer.getAnswerText()
                ))
                .toList();
    }

    private InternshipApplicationQuestionResponse toQuestionResponse(InternshipApplicationQuestion question) {
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

    private InternshipApplicationResponse toResponse(
            InternshipApplication application,
            String internshipTitle,
            String companyName,
            List<InternshipApplicationAnswerResponse> answers
    ) {
        return new InternshipApplicationResponse(
                application.getId(),
                application.getInternshipId(),
                internshipTitle,
                companyName,
                application.getStatus(),
                application.getCoverLetter(),
                application.getLinkedinUrl(),
                application.getPortfolioUrl(),
                application.getCvFileName(),
                application.getAppliedAt(),
                application.getUpdatedAt(),
                answers
        );
    }

    private record ValidatedAnswer(
            UUID questionId,
            String questionText,
            ApplicationQuestionType questionType,
            boolean required,
            int displayOrder,
            String answerText
    ) {
    }
}
