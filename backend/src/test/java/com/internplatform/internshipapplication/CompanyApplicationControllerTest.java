package com.internplatform.internshipapplication;

import com.internplatform.companyprofile.ApprovalStatus;
import com.internplatform.companyprofile.CompanyProfile;
import com.internplatform.companyprofile.CompanyProfileRepository;
import com.internplatform.internprofile.AcademicLevel;
import com.internplatform.internprofile.CvStorageService;
import com.internplatform.internprofile.InternProfile;
import com.internplatform.internprofile.InternProfileRepository;
import com.internplatform.internprofile.Skill;
import com.internplatform.internprofile.SkillRepository;
import com.internplatform.internship.ApplicationMethod;
import com.internplatform.internship.Internship;
import com.internplatform.internship.InternshipRepository;
import com.internplatform.internship.InternshipStatus;
import com.internplatform.internship.WorkMode;
import com.internplatform.user.Role;
import com.internplatform.user.User;
import com.internplatform.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.Year;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CompanyApplicationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private CompanyProfileRepository companyProfileRepository;

    @Autowired
    private InternProfileRepository internProfileRepository;

    @Autowired
    private InternshipRepository internshipRepository;

    @Autowired
    private InternshipApplicationRepository applicationRepository;

    @Autowired
    private InternshipApplicationAnswerRepository answerRepository;

    @Autowired
    private InternshipApplicationQuestionRepository questionRepository;

    @Autowired
    private SkillRepository skillRepository;

    @Autowired
    private CvStorageService cvStorageService;

    private User internUser;
    private User companyUser;
    private CompanyProfile companyProfile;

    @BeforeEach
    void setUp() {
        internUser = createUser(Role.INTERN);

        companyUser = createUser(Role.COMPANY);
        companyProfile = createCompletedCompanyProfile(companyUser);
    }

    private User createUser(Role role) {
        return userRepository.saveAndFlush(
                new User(
                        role.name().toLowerCase() + "-" + UUID.randomUUID() + "@example.test",
                        passwordEncoder.encode("Password123!"),
                        role
                )
        );
    }

    private CompanyProfile createCompletedCompanyProfile(User user) {
        CompanyProfile profile = new CompanyProfile(user.getId());
        profile.setCompanyName("Pathora Technologies");
        profile.setIndustry("Software");
        profile.setCompanySize("11-50");
        profile.setLocation("Cairo, Egypt");
        profile.setDescription("We build tools that connect interns with great companies.");
        profile.setContactName("Sara Ahmed");
        profile.setContactPhone("+201012345678");
        profile.markOnboardingCompleted(OffsetDateTime.now(ZoneOffset.UTC));
        // This fixture represents an already-working, previously-trusted company (the pre-V15
        // state every existing account was backfilled to) — not a brand-new PENDING signup.
        profile.recordApprovalDecision(ApprovalStatus.APPROVED, OffsetDateTime.now(ZoneOffset.UTC));
        return companyProfileRepository.saveAndFlush(profile);
    }

    private Skill firstSkill() {
        return skillRepository.findAllByOrderByNameAsc().get(0);
    }

    private InternProfile createCompletedInternProfile(User user) {
        InternProfile profile = new InternProfile(user.getId());
        profile.setFirstName("Amina");
        profile.setLastName("Hassan");
        profile.setDateOfBirth(LocalDate.of(2001, 5, 10));
        profile.setPhoneNumber("+201012345678");
        profile.setInstitutionName("Cairo University");
        profile.setAcademicLevel(AcademicLevel.UNIVERSITY);
        profile.setAcademicYear((short) 3);
        profile.setMajor("Computer Science");
        profile.setExpectedGraduationYear((short) (Year.now().getValue() + 1));
        profile.setCareerInterests("Software engineering");
        profile.setSkills(Set.of(firstSkill()));
        profile.setOnboardingCompletedAt(OffsetDateTime.now(ZoneOffset.UTC));
        return internProfileRepository.saveAndFlush(profile);
    }

    private byte[] pdfBytes(String marker) {
        return ("%PDF-1.4 " + marker).getBytes(StandardCharsets.US_ASCII);
    }

    private Internship createInternship(CompanyProfile owner) {
        Internship internship = new Internship(owner.getId());
        internship.setTitle("Backend Engineering Intern");
        internship.setDescription("Work on our core platform.");
        internship.setLocation("Cairo, Egypt");
        internship.setWorkMode(WorkMode.HYBRID);
        internship.setApplicationDeadline(LocalDate.now().plusDays(30));
        internship.setStatus(InternshipStatus.OPEN);
        internship.setSkills(new HashSet<>(Set.of(firstSkill())));
        internship.setTargetMajors(Set.of());
        internship.setMinimumAcademicYear(null);
        internship.setApplicationMethod(ApplicationMethod.INTERNAL);
        internship.setExternalApplicationUrl(null);
        return internshipRepository.saveAndFlush(internship);
    }

    /** Builds a real, persisted APPLIED application with a real CV snapshot on disk — mirrors
     *  exactly what InternshipApplicationService.submitApplication would have produced, without
     *  going through the full intern-facing submission flow (which is already covered by
     *  InternshipApplicationControllerTest). */
    private InternshipApplication createApplication(Internship internship, InternProfile profile, byte[] cvBytes, String cvFileName) {
        String storageKey = cvStorageService.store(profile.getId(), cvBytes);

        InternshipApplication application = new InternshipApplication(internship.getId(), profile.getId());
        application.setCoverLetter("I would love to join your team.");
        application.setCvFileName(cvFileName);
        application.setCvStorageKey(storageKey);
        application.setCvContentType("application/pdf");
        application.setCvSizeBytes(cvBytes.length);
        application.setCvUploadedAt(OffsetDateTime.now(ZoneOffset.UTC));
        return applicationRepository.saveAndFlush(application);
    }

    /** The answer snapshot's question_id has a real FK to internship_application_questions, so
     *  a backing question row must exist even though the snapshot columns (not this live row)
     *  are what the company-facing response actually reads from. */
    private InternshipApplicationAnswer createAnswer(
            InternshipApplication application, String questionText, ApplicationQuestionType type,
            boolean required, int order, String answerText
    ) {
        InternshipApplicationQuestion question = new InternshipApplicationQuestion(application.getInternshipId());
        question.setQuestionText(questionText);
        question.setQuestionType(type);
        question.setRequired(required);
        question.setDisplayOrder(order);
        InternshipApplicationQuestion savedQuestion = questionRepository.saveAndFlush(question);

        InternshipApplicationAnswer answer = new InternshipApplicationAnswer(application.getId(), savedQuestion.getId());
        answer.setQuestionTextSnapshot(questionText);
        answer.setQuestionTypeSnapshot(type);
        answer.setRequiredSnapshot(required);
        answer.setDisplayOrderSnapshot(order);
        answer.setAnswerText(answerText);
        return answerRepository.saveAndFlush(answer);
    }

    private RequestPostProcessor asUser(User user) {
        Consumer<Jwt.Builder> claims = builder -> builder
                .subject(user.getId().toString())
                .claim("email", user.getEmail())
                .claim("role", user.getRole().name());

        return SecurityMockMvcRequestPostProcessors.jwt()
                .jwt(claims)
                .authorities(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
    }

    private RequestPostProcessor asIntern() {
        return asUser(internUser);
    }

    private RequestPostProcessor asCompany() {
        return asUser(companyUser);
    }

    private String toJson(Object body) throws Exception {
        return objectMapper.writeValueAsString(body);
    }

    private String listUrl(UUID internshipId) {
        return "/api/v1/company/internships/" + internshipId + "/applications";
    }

    private String detailUrl(UUID internshipId, UUID applicationId) {
        return listUrl(internshipId) + "/" + applicationId;
    }

    private String cvUrl(UUID internshipId, UUID applicationId) {
        return detailUrl(internshipId, applicationId) + "/cv";
    }

    private String statusUrl(UUID internshipId, UUID applicationId) {
        return detailUrl(internshipId, applicationId) + "/status";
    }

    // ===== LIST =====

    @Test
    void ownerListsApplicantsSuccessfully() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        Internship internship = createInternship(companyProfile);
        InternshipApplication application = createApplication(internship, profile, pdfBytes("resume"), "resume.pdf");

        mockMvc.perform(get(listUrl(internship.getId())).with(asCompany()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].applicationId").value(application.getId().toString()))
                .andExpect(jsonPath("$[0].internshipId").value(internship.getId().toString()))
                .andExpect(jsonPath("$[0].applicantName").value("Amina Hassan"))
                .andExpect(jsonPath("$[0].status").value("APPLIED"))
                .andExpect(jsonPath("$[0].institutionName").value("Cairo University"))
                .andExpect(jsonPath("$[0].academicLevel").value("UNIVERSITY"))
                .andExpect(jsonPath("$[0].major").value("Computer Science"))
                .andExpect(jsonPath("$[0].appliedAt").exists());
    }

    @Test
    void listOrdersNewestApplicationsFirst() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        Internship internship = createInternship(companyProfile);

        InternshipApplication first = createApplication(internship, profile, pdfBytes("a"), "a.pdf");
        Thread.sleep(5);
        User secondInternUser = createUser(Role.INTERN);
        InternProfile secondProfile = createCompletedInternProfile(secondInternUser);
        InternshipApplication second = createApplication(internship, secondProfile, pdfBytes("b"), "b.pdf");

        mockMvc.perform(get(listUrl(internship.getId())).with(asCompany()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].applicationId").value(second.getId().toString()))
                .andExpect(jsonPath("$[1].applicationId").value(first.getId().toString()));
    }

    @Test
    void otherCompanyCannotListApplicants() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        Internship internship = createInternship(companyProfile);
        createApplication(internship, profile, pdfBytes("resume"), "resume.pdf");

        User otherCompanyUser = createUser(Role.COMPANY);
        createCompletedCompanyProfile(otherCompanyUser);

        mockMvc.perform(get(listUrl(internship.getId())).with(asUser(otherCompanyUser)))
                .andExpect(status().isNotFound());
    }

    @Test
    void noApplicationsReturnsEmptyList() throws Exception {
        Internship internship = createInternship(companyProfile);

        mockMvc.perform(get(listUrl(internship.getId())).with(asCompany()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // ===== DETAIL =====

    @Test
    void ownerGetsApplicantAndApplicationData() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        Internship internship = createInternship(companyProfile);
        InternshipApplication application = createApplication(internship, profile, pdfBytes("resume"), "resume.pdf");

        mockMvc.perform(get(detailUrl(internship.getId(), application.getId())).with(asCompany()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.applicationId").value(application.getId().toString()))
                .andExpect(jsonPath("$.internshipId").value(internship.getId().toString()))
                .andExpect(jsonPath("$.internshipTitle").value("Backend Engineering Intern"))
                .andExpect(jsonPath("$.status").value("APPLIED"))
                .andExpect(jsonPath("$.coverLetter").value("I would love to join your team."))
                .andExpect(jsonPath("$.applicant.firstName").value("Amina"))
                .andExpect(jsonPath("$.applicant.lastName").value("Hassan"))
                .andExpect(jsonPath("$.applicant.institutionName").value("Cairo University"))
                .andExpect(jsonPath("$.applicant.academicLevel").value("UNIVERSITY"))
                .andExpect(jsonPath("$.applicant.major").value("Computer Science"))
                .andExpect(jsonPath("$.applicant.skills").isArray())
                .andExpect(jsonPath("$.cv.fileName").value("resume.pdf"))
                .andExpect(jsonPath("$.cv.contentType").value("application/pdf"))
                .andExpect(jsonPath("$.cv.sizeBytes").value(pdfBytes("resume").length))
                .andExpect(jsonPath("$.cv.storageKey").doesNotExist());
    }

    @Test
    void detailReturnsCustomAnswerSnapshotsCorrectly() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        Internship internship = createInternship(companyProfile);
        InternshipApplication application = createApplication(internship, profile, pdfBytes("resume"), "resume.pdf");
        createAnswer(application, "Why this role?", ApplicationQuestionType.SHORT_TEXT, true, 0, "Because I love backend work.");
        createAnswer(application, "Tell us more", ApplicationQuestionType.LONG_TEXT, false, 1, "I have built several projects.");

        mockMvc.perform(get(detailUrl(internship.getId(), application.getId())).with(asCompany()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answers.length()").value(2))
                .andExpect(jsonPath("$.answers[0].questionText").value("Why this role?"))
                .andExpect(jsonPath("$.answers[0].questionType").value("SHORT_TEXT"))
                .andExpect(jsonPath("$.answers[0].required").value(true))
                .andExpect(jsonPath("$.answers[0].displayOrder").value(0))
                .andExpect(jsonPath("$.answers[0].answer").value("Because I love backend work."))
                .andExpect(jsonPath("$.answers[1].questionText").value("Tell us more"))
                .andExpect(jsonPath("$.answers[1].answer").value("I have built several projects."));
    }

    @Test
    void otherCompanyCannotOpenApplication() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        Internship internship = createInternship(companyProfile);
        InternshipApplication application = createApplication(internship, profile, pdfBytes("resume"), "resume.pdf");

        User otherCompanyUser = createUser(Role.COMPANY);
        createCompletedCompanyProfile(otherCompanyUser);

        mockMvc.perform(get(detailUrl(internship.getId(), application.getId())).with(asUser(otherCompanyUser)))
                .andExpect(status().isNotFound());
    }

    @Test
    void wrongApplicationInternshipPairingDenied() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        Internship internship = createInternship(companyProfile);
        Internship otherInternship = createInternship(companyProfile);
        InternshipApplication application = createApplication(internship, profile, pdfBytes("resume"), "resume.pdf");

        mockMvc.perform(get(detailUrl(otherInternship.getId(), application.getId())).with(asCompany()))
                .andExpect(status().isNotFound());
    }

    // ===== CV SNAPSHOT =====

    @Test
    void ownerReceivesExactApplicationCvSnapshotBytes() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        Internship internship = createInternship(companyProfile);
        byte[] cvBytes = pdfBytes("snapshot-content");
        InternshipApplication application = createApplication(internship, profile, cvBytes, "resume.pdf");

        byte[] responseBytes = mockMvc.perform(get(cvUrl(internship.getId(), application.getId())).with(asCompany()))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "application/pdf"))
                .andExpect(header().string("Content-Disposition", containsString("resume.pdf")))
                .andReturn().getResponse().getContentAsByteArray();

        assertThat(responseBytes).isEqualTo(cvBytes);
    }

    @Test
    void replacingProfileCvLaterDoesNotAlterApplicationCv() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        Internship internship = createInternship(companyProfile);
        byte[] originalCvBytes = pdfBytes("original-application-cv");
        InternshipApplication application = createApplication(internship, profile, originalCvBytes, "original.pdf");

        // Simulate the intern replacing their profile CV after applying — a different storage
        // key entirely, never touching the application's own snapshot file.
        String newProfileStorageKey = cvStorageService.store(profile.getId(), pdfBytes("new-profile-cv"));
        profile.setCvStorageKey(newProfileStorageKey);
        profile.setCvOriginalFilename("new.pdf");
        internProfileRepository.saveAndFlush(profile);

        byte[] responseBytes = mockMvc.perform(get(cvUrl(internship.getId(), application.getId())).with(asCompany()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();

        assertThat(responseBytes).isEqualTo(originalCvBytes);
        assertThat(new String(responseBytes, StandardCharsets.US_ASCII)).contains("original-application-cv");
    }

    @Test
    void otherCompanyCannotAccessCv() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        Internship internship = createInternship(companyProfile);
        InternshipApplication application = createApplication(internship, profile, pdfBytes("resume"), "resume.pdf");

        User otherCompanyUser = createUser(Role.COMPANY);
        createCompletedCompanyProfile(otherCompanyUser);

        mockMvc.perform(get(cvUrl(internship.getId(), application.getId())).with(asUser(otherCompanyUser)))
                .andExpect(status().isNotFound());
    }

    // ===== STATUS DECISION =====

    @Test
    void appliedToAcceptedWorks() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        Internship internship = createInternship(companyProfile);
        InternshipApplication application = createApplication(internship, profile, pdfBytes("resume"), "resume.pdf");

        mockMvc.perform(patch(statusUrl(internship.getId(), application.getId()))
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("status", "ACCEPTED"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"));

        assertThat(applicationRepository.findById(application.getId()).orElseThrow().getStatus())
                .isEqualTo(ApplicationStatus.ACCEPTED);
    }

    @Test
    void appliedToRejectedWorks() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        Internship internship = createInternship(companyProfile);
        InternshipApplication application = createApplication(internship, profile, pdfBytes("resume"), "resume.pdf");

        mockMvc.perform(patch(statusUrl(internship.getId(), application.getId()))
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("status", "REJECTED"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));
    }

    @Test
    void studentGetImmediatelyReportsUpdatedStatus() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        Internship internship = createInternship(companyProfile);
        InternshipApplication application = createApplication(internship, profile, pdfBytes("resume"), "resume.pdf");

        mockMvc.perform(patch(statusUrl(internship.getId(), application.getId()))
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("status", "ACCEPTED"))))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/intern/applications/" + application.getId()).with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"));

        mockMvc.perform(get("/api/v1/intern/applications").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("ACCEPTED"));
    }

    @Test
    void acceptedToRejectedRejected() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        Internship internship = createInternship(companyProfile);
        InternshipApplication application = createApplication(internship, profile, pdfBytes("resume"), "resume.pdf");

        mockMvc.perform(patch(statusUrl(internship.getId(), application.getId()))
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("status", "ACCEPTED"))))
                .andExpect(status().isOk());

        mockMvc.perform(patch(statusUrl(internship.getId(), application.getId()))
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("status", "REJECTED"))))
                .andExpect(status().isConflict());

        assertThat(applicationRepository.findById(application.getId()).orElseThrow().getStatus())
                .isEqualTo(ApplicationStatus.ACCEPTED);
    }

    @Test
    void rejectedToAcceptedRejected() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        Internship internship = createInternship(companyProfile);
        InternshipApplication application = createApplication(internship, profile, pdfBytes("resume"), "resume.pdf");

        mockMvc.perform(patch(statusUrl(internship.getId(), application.getId()))
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("status", "REJECTED"))))
                .andExpect(status().isOk());

        mockMvc.perform(patch(statusUrl(internship.getId(), application.getId()))
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("status", "ACCEPTED"))))
                .andExpect(status().isConflict());

        assertThat(applicationRepository.findById(application.getId()).orElseThrow().getStatus())
                .isEqualTo(ApplicationStatus.REJECTED);
    }

    @Test
    void appliedDecisionFromCompanyRejected() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        Internship internship = createInternship(companyProfile);
        InternshipApplication application = createApplication(internship, profile, pdfBytes("resume"), "resume.pdf");

        mockMvc.perform(patch(statusUrl(internship.getId(), application.getId()))
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("status", "APPLIED"))))
                .andExpect(status().isBadRequest());

        assertThat(applicationRepository.findById(application.getId()).orElseThrow().getStatus())
                .isEqualTo(ApplicationStatus.APPLIED);
    }

    @Test
    void invalidStatusStringRejected() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        Internship internship = createInternship(companyProfile);
        InternshipApplication application = createApplication(internship, profile, pdfBytes("resume"), "resume.pdf");

        mockMvc.perform(patch(statusUrl(internship.getId(), application.getId()))
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("status", "SHORTLISTED"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void otherCompanyCannotMutateStatus() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        Internship internship = createInternship(companyProfile);
        InternshipApplication application = createApplication(internship, profile, pdfBytes("resume"), "resume.pdf");

        User otherCompanyUser = createUser(Role.COMPANY);
        createCompletedCompanyProfile(otherCompanyUser);

        mockMvc.perform(patch(statusUrl(internship.getId(), application.getId()))
                        .with(asUser(otherCompanyUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("status", "ACCEPTED"))))
                .andExpect(status().isNotFound());

        assertThat(applicationRepository.findById(application.getId()).orElseThrow().getStatus())
                .isEqualTo(ApplicationStatus.APPLIED);
    }

    @Test
    void wrongApplicationInternshipPairingRejectedForStatusUpdate() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        Internship internship = createInternship(companyProfile);
        Internship otherInternship = createInternship(companyProfile);
        InternshipApplication application = createApplication(internship, profile, pdfBytes("resume"), "resume.pdf");

        mockMvc.perform(patch(statusUrl(otherInternship.getId(), application.getId()))
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("status", "ACCEPTED"))))
                .andExpect(status().isNotFound());
    }

    // ===== CROSS-ROLE / AUTH =====

    @Test
    void internCannotCallCompanyListEndpoint() throws Exception {
        Internship internship = createInternship(companyProfile);

        mockMvc.perform(get(listUrl(internship.getId())).with(asIntern()))
                .andExpect(status().isForbidden());
    }

    @Test
    void unauthenticatedRequestRejected() throws Exception {
        Internship internship = createInternship(companyProfile);

        mockMvc.perform(get(listUrl(internship.getId())))
                .andExpect(status().isUnauthorized());
    }
}
