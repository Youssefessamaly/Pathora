package com.internplatform.internshipapplication;

import com.internplatform.companyprofile.CompanyApprovalGuard;
import com.internplatform.companyprofile.CompanyProfile;
import com.internplatform.companyprofile.CompanyProfileRepository;
import com.internplatform.internprofile.CvStorageService;
import com.internplatform.internprofile.InternProfile;
import com.internplatform.internprofile.InternProfileRepository;
import com.internplatform.internprofile.Skill;
import com.internplatform.internprofile.SkillResponse;
import com.internplatform.internship.Internship;
import com.internplatform.internship.InternshipRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Company-owned read/decision access to the applications submitted against one of that
 * company's internships. An internship is resolved via InternshipRepository.findByIdAndCompanyProfileId
 * (see InternshipApplicationQuestionService for the same pattern) so another company's
 * internship — and therefore its applications — simply doesn't match and collapses to 404.
 */
@Service
public class CompanyApplicationService {

    private static final Set<ApplicationStatus> ALLOWED_DECISIONS =
            Set.of(ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED);

    private final InternshipApplicationRepository applicationRepository;
    private final InternshipApplicationAnswerRepository answerRepository;
    private final InternshipRepository internshipRepository;
    private final CompanyProfileRepository companyProfileRepository;
    private final InternProfileRepository internProfileRepository;
    private final CvStorageService cvStorageService;
    private final CompanyApprovalGuard companyApprovalGuard;

    public CompanyApplicationService(
            InternshipApplicationRepository applicationRepository,
            InternshipApplicationAnswerRepository answerRepository,
            InternshipRepository internshipRepository,
            CompanyProfileRepository companyProfileRepository,
            InternProfileRepository internProfileRepository,
            CvStorageService cvStorageService,
            CompanyApprovalGuard companyApprovalGuard
    ) {
        this.applicationRepository = applicationRepository;
        this.answerRepository = answerRepository;
        this.internshipRepository = internshipRepository;
        this.companyProfileRepository = companyProfileRepository;
        this.internProfileRepository = internProfileRepository;
        this.cvStorageService = cvStorageService;
        this.companyApprovalGuard = companyApprovalGuard;
    }

    @Transactional(readOnly = true)
    public List<CompanyApplicationListItemResponse> listApplications(UUID userId, UUID internshipId) {
        Internship internship = findOwnedInternshipOrThrow(internshipId, findCompanyProfileOrNotFound(userId));

        return applicationRepository.findAllByInternshipIdOrderByAppliedAtDesc(internship.getId()).stream()
                .map(this::toListItem)
                .toList();
    }

    @Transactional(readOnly = true)
    public CompanyApplicationDetailResponse getApplication(UUID userId, UUID internshipId, UUID applicationId) {
        Internship internship = findOwnedInternshipOrThrow(internshipId, findCompanyProfileOrNotFound(userId));
        InternshipApplication application = findOwnedApplicationOrThrow(applicationId, internship.getId());

        return toDetailResponse(application, internship);
    }

    @Transactional(readOnly = true)
    public CvDownload getCvSnapshot(UUID userId, UUID internshipId, UUID applicationId) {
        Internship internship = findOwnedInternshipOrThrow(internshipId, findCompanyProfileOrNotFound(userId));
        InternshipApplication application = findOwnedApplicationOrThrow(applicationId, internship.getId());

        byte[] bytes = cvStorageService.read(application.getCvStorageKey());
        return new CvDownload(bytes, application.getCvFileName(), application.getCvContentType());
    }

    /**
     * Applies the company's ACCEPTED/REJECTED decision. Every validation — the decision value
     * itself, ownership of the internship, the application's membership in that internship, and
     * the application's current status — runs before the entity is touched, so a rejected
     * request never leaves a dirty managed entity behind (PART 9 of the milestone spec).
     */
    @Transactional
    public CompanyApplicationDetailResponse decideApplication(
            UUID userId, UUID internshipId, UUID applicationId, CompanyApplicationStatusUpdateRequest request
    ) {
        if (!ALLOWED_DECISIONS.contains(request.status())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status must be ACCEPTED or REJECTED");
        }

        Internship internship = findOwnedInternshipOrThrow(internshipId, findCompanyProfileOrNotFound(userId));
        InternshipApplication application = findOwnedApplicationOrThrow(applicationId, internship.getId());

        if (application.getStatus() != ApplicationStatus.APPLIED) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "This application has already been decided and cannot be changed");
        }

        application.setStatus(request.status());
        InternshipApplication saved = applicationRepository.saveAndFlush(application);

        return toDetailResponse(saved, internship);
    }

    /**
     * Resolves the company profile for reading/deciding an application. A missing profile
     * cannot own any internship, so it collapses to the same 404 as an internship that simply
     * doesn't exist — avoids leaking whether the internship id belongs to another company.
     */
    private CompanyProfile findCompanyProfileOrNotFound(UUID userId) {
        CompanyProfile profile = companyProfileRepository.findByUserId(userId)
                .orElseThrow(this::internshipNotFound);
        companyApprovalGuard.requireApproved(profile);
        return profile;
    }

    private Internship findOwnedInternshipOrThrow(UUID internshipId, CompanyProfile profile) {
        return internshipRepository.findByIdAndCompanyProfileId(internshipId, profile.getId())
                .orElseThrow(this::internshipNotFound);
    }

    private InternshipApplication findOwnedApplicationOrThrow(UUID applicationId, UUID internshipId) {
        return applicationRepository.findByIdAndInternshipId(applicationId, internshipId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));
    }

    private ResponseStatusException internshipNotFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Internship not found");
    }

    private CompanyApplicationListItemResponse toListItem(InternshipApplication application) {
        InternProfile profile = internProfileRepository.findById(application.getInternProfileId()).orElse(null);

        return new CompanyApplicationListItemResponse(
                application.getId(),
                application.getInternshipId(),
                applicantName(profile),
                application.getStatus(),
                application.getAppliedAt(),
                profile != null ? profile.getInstitutionName() : null,
                profile != null ? profile.getAcademicLevel() : null,
                profile != null && profile.getAcademicYear() != null ? profile.getAcademicYear().intValue() : null,
                profile != null ? profile.getMajor() : null
        );
    }

    private CompanyApplicationDetailResponse toDetailResponse(InternshipApplication application, Internship internship) {
        InternProfile profile = internProfileRepository.findById(application.getInternProfileId()).orElse(null);

        List<InternshipApplicationAnswerResponse> answers =
                answerRepository.findAllByApplicationIdOrderByDisplayOrderSnapshotAsc(application.getId()).stream()
                        .map(answer -> new InternshipApplicationAnswerResponse(
                                answer.getQuestionId(),
                                answer.getQuestionTextSnapshot(),
                                answer.getQuestionTypeSnapshot(),
                                answer.isRequiredSnapshot(),
                                answer.getDisplayOrderSnapshot(),
                                answer.getAnswerText()
                        ))
                        .toList();

        return new CompanyApplicationDetailResponse(
                application.getId(),
                application.getInternshipId(),
                internship.getTitle(),
                application.getStatus(),
                application.getAppliedAt(),
                application.getUpdatedAt(),
                toApplicant(profile),
                application.getCoverLetter(),
                application.getLinkedinUrl(),
                application.getPortfolioUrl(),
                new CompanyApplicationDetailResponse.CvSnapshot(
                        application.getCvFileName(),
                        application.getCvContentType(),
                        application.getCvSizeBytes(),
                        application.getCvUploadedAt()
                ),
                answers
        );
    }

    private CompanyApplicationDetailResponse.Applicant toApplicant(InternProfile profile) {
        if (profile == null) {
            return null;
        }

        return new CompanyApplicationDetailResponse.Applicant(
                profile.getId(),
                profile.getFirstName(),
                profile.getLastName(),
                profile.getInstitutionName(),
                profile.getAcademicLevel(),
                profile.getAcademicYear() != null ? profile.getAcademicYear().intValue() : null,
                profile.getMajor(),
                profile.getExpectedGraduationYear() != null ? profile.getExpectedGraduationYear().intValue() : null,
                toSkillResponses(profile.getSkills()),
                toSkillResponses(profile.getCvDetectedSkills())
        );
    }

    private List<SkillResponse> toSkillResponses(Set<Skill> skills) {
        return skills.stream()
                .sorted(Comparator.comparing(Skill::getName))
                .map(skill -> new SkillResponse(skill.getId(), skill.getName()))
                .toList();
    }

    private String applicantName(InternProfile profile) {
        if (profile == null) {
            return null;
        }

        String firstName = profile.getFirstName() != null ? profile.getFirstName() : "";
        String lastName = profile.getLastName() != null ? profile.getLastName() : "";
        String fullName = (firstName + " " + lastName).trim();
        return fullName.isEmpty() ? null : fullName;
    }

    public record CvDownload(byte[] bytes, String fileName, String contentType) {
    }
}
