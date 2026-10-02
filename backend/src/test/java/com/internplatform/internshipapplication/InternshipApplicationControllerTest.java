package com.internplatform.internshipapplication;

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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class InternshipApplicationControllerTest {

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
    private InternshipApplicationQuestionRepository questionRepository;

    @Autowired
    private InternshipApplicationAnswerRepository answerRepository;

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

    private InternProfile createCompletedInternProfileWithAcademicYear(User user, Short academicYear) {
        InternProfile profile = createCompletedInternProfile(user);
        profile.setAcademicYear(academicYear);
        return internProfileRepository.saveAndFlush(profile);
    }

    /** Stores real bytes under a real storage key and sets the same metadata fields
     *  InternProfileService.uploadCv would — deleting whatever CV preceded it, exactly like
     *  a real re-upload, so snapshot tests can prove independence from that deletion. */
    private void attachCv(InternProfile profile, byte[] bytes, String fileName) {
        String previousStorageKey = profile.getCvStorageKey();
        String storageKey = cvStorageService.store(profile.getId(), bytes);

        profile.setCvOriginalFilename(fileName);
        profile.setCvStorageKey(storageKey);
        profile.setCvContentType("application/pdf");
        profile.setCvSizeBytes(bytes.length);
        profile.setCvUploadedAt(OffsetDateTime.now(ZoneOffset.UTC));
        internProfileRepository.saveAndFlush(profile);

        if (previousStorageKey != null) {
            cvStorageService.delete(previousStorageKey);
        }
    }

    private byte[] pdfBytes(String marker) {
        return ("%PDF-1.4 " + marker).getBytes(StandardCharsets.US_ASCII);
    }

    private Internship createInternship(
            ApplicationMethod applicationMethod,
            String externalApplicationUrl,
            InternshipStatus status,
            LocalDate applicationDeadline,
            Integer minimumAcademicYear
    ) {
        Internship internship = new Internship(companyProfile.getId());
        internship.setTitle("Backend Engineering Intern");
        internship.setDescription("Work on our core platform.");
        internship.setLocation("Cairo, Egypt");
        internship.setWorkMode(WorkMode.HYBRID);
        internship.setApplicationDeadline(applicationDeadline);
        internship.setStatus(status);
        internship.setSkills(new HashSet<>(Set.of(firstSkill())));
        internship.setTargetMajors(Set.of());
        internship.setMinimumAcademicYear(minimumAcademicYear);
        internship.setApplicationMethod(applicationMethod);
        internship.setExternalApplicationUrl(externalApplicationUrl);
        return internshipRepository.saveAndFlush(internship);
    }

    private Internship createOpenInternalInternship() {
        return createInternship(ApplicationMethod.INTERNAL, null, InternshipStatus.OPEN, LocalDate.now().plusDays(30), null);
    }

    private InternshipApplicationQuestion createQuestion(
            Internship internship, String text, ApplicationQuestionType type, boolean required, int order
    ) {
        InternshipApplicationQuestion question = new InternshipApplicationQuestion(internship.getId());
        question.setQuestionText(text);
        question.setQuestionType(type);
        question.setRequired(required);
        question.setDisplayOrder(order);
        return questionRepository.saveAndFlush(question);
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

    /** No fields are required at the top level any more — coverLetter/linkedinUrl/
     *  portfolioUrl/answers are all optional; individual tests add "answers" as needed. */
    private Map<String, Object> validApplicationBody() {
        return new HashMap<>();
    }

    private Map<String, Object> answersBody(Map<UUID, String> answersByQuestionId) {
        Map<String, Object> body = new HashMap<>();
        List<Map<String, Object>> answers = new ArrayList<>();
        for (Map.Entry<UUID, String> entry : answersByQuestionId.entrySet()) {
            Map<String, Object> answer = new HashMap<>();
            answer.put("questionId", entry.getKey().toString());
            answer.put("answer", entry.getValue());
            answers.add(answer);
        }
        body.put("answers", answers);
        return body;
    }

    private Map<String, Object> questionBody(String text, ApplicationQuestionType type, boolean required, int order) {
        Map<String, Object> body = new HashMap<>();
        body.put("questionText", text);
        body.put("questionType", type.name());
        body.put("required", required);
        body.put("displayOrder", order);
        return body;
    }

    private String applyUrl(UUID internshipId) {
        return "/api/v1/intern/internships/" + internshipId + "/applications";
    }

    private String internQuestionsUrl(UUID internshipId) {
        return "/api/v1/intern/internships/" + internshipId + "/application-questions";
    }

    private String companyQuestionsUrl(UUID internshipId) {
        return "/api/v1/company/internships/" + internshipId + "/application-questions";
    }

    private String companyQuestionUrl(UUID internshipId, UUID questionId) {
        return companyQuestionsUrl(internshipId) + "/" + questionId;
    }

    // ===== SUCCESS =====

    // 1. eligible completed intern, INTERNAL, OPEN, not expired, CV exists, zero questions -> 201
    @Test
    void eligibleInternSuccessfullyAppliesToInternalInternship() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        attachCv(profile, pdfBytes("resume-a"), "resume.pdf");
        Internship internship = createOpenInternalInternship();

        mockMvc.perform(post(applyUrl(internship.getId()))
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(validApplicationBody())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("APPLIED"))
                .andExpect(jsonPath("$.internshipId").value(internship.getId().toString()))
                .andExpect(jsonPath("$.companyName").value("Pathora Technologies"))
                .andExpect(jsonPath("$.cvFileName").value("resume.pdf"))
                .andExpect(jsonPath("$.answers").isEmpty());

        List<InternshipApplication> all = applicationRepository.findAll();
        assertThat(all).hasSize(1);
        assertThat(all.get(0).getInternshipId()).isEqualTo(internship.getId());
        assertThat(all.get(0).getInternProfileId()).isEqualTo(profile.getId());
        assertThat(all.get(0).getStatus()).isEqualTo(ApplicationStatus.APPLIED);
        assertThat(all.get(0).getCvFileName()).isEqualTo("resume.pdf");
        assertThat(all.get(0).getCvStorageKey()).isNotEqualTo(profile.getCvStorageKey());
    }

    // ===== OPTIONAL FIELDS =====

    // 2. cover letter absent succeeds
    @Test
    void applicationSucceedsWithoutCoverLetter() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        attachCv(profile, pdfBytes("resume-a"), "resume.pdf");
        Internship internship = createOpenInternalInternship();

        Map<String, Object> body = validApplicationBody();
        body.remove("coverLetter");

        mockMvc.perform(post(applyUrl(internship.getId()))
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.coverLetter").doesNotExist());
    }

    // 3. LinkedIn absent succeeds
    @Test
    void applicationSucceedsWithoutLinkedinUrl() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        attachCv(profile, pdfBytes("resume-a"), "resume.pdf");
        Internship internship = createOpenInternalInternship();

        mockMvc.perform(post(applyUrl(internship.getId()))
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(validApplicationBody())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.linkedinUrl").doesNotExist());
    }

    // 4. portfolio absent succeeds
    @Test
    void applicationSucceedsWithoutPortfolioUrl() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        attachCv(profile, pdfBytes("resume-a"), "resume.pdf");
        Internship internship = createOpenInternalInternship();

        mockMvc.perform(post(applyUrl(internship.getId()))
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(validApplicationBody())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.portfolioUrl").doesNotExist());
    }

    // ===== REJECTIONS =====

    // 5. EXTERNAL internship cannot create internal application; zero rows created (external regression)
    @Test
    void externalInternshipCannotReceiveInternalApplication() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        attachCv(profile, pdfBytes("resume-a"), "resume.pdf");
        Internship internship = createInternship(
                ApplicationMethod.EXTERNAL, "https://careers.example.com/apply",
                InternshipStatus.OPEN, LocalDate.now().plusDays(30), null);

        mockMvc.perform(post(applyUrl(internship.getId()))
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(validApplicationBody())))
                .andExpect(status().isBadRequest());

        assertThat(applicationRepository.count()).isZero();
    }

    // 6. no CV -> rejected
    @Test
    void noCvRejected() throws Exception {
        createCompletedInternProfile(internUser);
        Internship internship = createOpenInternalInternship();

        mockMvc.perform(post(applyUrl(internship.getId()))
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(validApplicationBody())))
                .andExpect(status().isBadRequest());

        assertThat(applicationRepository.count()).isZero();
    }

    // 7. incomplete intern profile -> rejected
    @Test
    void incompleteInternProfileRejected() throws Exception {
        InternProfile incomplete = new InternProfile(internUser.getId());
        incomplete.setFirstName("Amina");
        internProfileRepository.saveAndFlush(incomplete);

        Internship internship = createOpenInternalInternship();

        mockMvc.perform(post(applyUrl(internship.getId()))
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(validApplicationBody())))
                .andExpect(status().isForbidden());
    }

    // 8. CLOSED internship -> rejected
    @Test
    void closedInternshipRejected() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        attachCv(profile, pdfBytes("resume-a"), "resume.pdf");
        Internship internship = createInternship(
                ApplicationMethod.INTERNAL, null, InternshipStatus.CLOSED, LocalDate.now().plusDays(30), null);

        mockMvc.perform(post(applyUrl(internship.getId()))
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(validApplicationBody())))
                .andExpect(status().isNotFound());
    }

    // 9. expired internship -> rejected
    @Test
    void expiredInternshipRejected() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        attachCv(profile, pdfBytes("resume-a"), "resume.pdf");
        Internship internship = createInternship(
                ApplicationMethod.INTERNAL, null, InternshipStatus.OPEN, LocalDate.now().minusDays(1), null);

        mockMvc.perform(post(applyUrl(internship.getId()))
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(validApplicationBody())))
                .andExpect(status().isNotFound());
    }

    // 10. academically ineligible intern -> rejected
    @Test
    void academicallyIneligibleInternRejected() throws Exception {
        InternProfile profile = createCompletedInternProfileWithAcademicYear(internUser, (short) 2);
        attachCv(profile, pdfBytes("resume-a"), "resume.pdf");
        Internship internship = createInternship(
                ApplicationMethod.INTERNAL, null, InternshipStatus.OPEN, LocalDate.now().plusDays(30), 4);

        mockMvc.perform(post(applyUrl(internship.getId()))
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(validApplicationBody())))
                .andExpect(status().isNotFound());
    }

    // 12. invalid LinkedIn URL -> rejected
    @Test
    void invalidLinkedinUrlRejected() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        attachCv(profile, pdfBytes("resume-a"), "resume.pdf");
        Internship internship = createOpenInternalInternship();

        Map<String, Object> body = validApplicationBody();
        body.put("linkedinUrl", "javascript:alert(1)");

        mockMvc.perform(post(applyUrl(internship.getId()))
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(body)))
                .andExpect(status().isBadRequest());
    }

    // 13. invalid portfolio URL -> rejected
    @Test
    void invalidPortfolioUrlRejected() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        attachCv(profile, pdfBytes("resume-a"), "resume.pdf");
        Internship internship = createOpenInternalInternship();

        Map<String, Object> body = validApplicationBody();
        body.put("portfolioUrl", "data:text/html,<script>alert(1)</script>");

        mockMvc.perform(post(applyUrl(internship.getId()))
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(body)))
                .andExpect(status().isBadRequest());
    }

    // 14. duplicate application -> 409
    @Test
    void duplicateApplicationRejected() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        attachCv(profile, pdfBytes("resume-a"), "resume.pdf");
        Internship internship = createOpenInternalInternship();

        mockMvc.perform(post(applyUrl(internship.getId()))
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(validApplicationBody())))
                .andExpect(status().isCreated());

        mockMvc.perform(post(applyUrl(internship.getId()))
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(validApplicationBody())))
                .andExpect(status().isConflict());

        assertThat(applicationRepository.count()).isEqualTo(1);
    }

    // 15. internship not found
    @Test
    void internshipNotFoundRejected() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        attachCv(profile, pdfBytes("resume-a"), "resume.pdf");

        mockMvc.perform(post(applyUrl(UUID.randomUUID()))
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(validApplicationBody())))
                .andExpect(status().isNotFound());
    }

    // 16. COMPANY user cannot use intern endpoint
    @Test
    void companyUserCannotUseInternEndpoint() throws Exception {
        Internship internship = createOpenInternalInternship();
        User companyUser = createUser(Role.COMPANY);

        mockMvc.perform(post(applyUrl(internship.getId()))
                        .with(asUser(companyUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(validApplicationBody())))
                .andExpect(status().isForbidden());
    }

    // ===== SECURITY =====

    // 17. GET list only returns current intern's applications
    @Test
    void listOnlyReturnsOwnApplications() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        attachCv(profile, pdfBytes("resume-a"), "resume.pdf");
        Internship internship = createOpenInternalInternship();

        mockMvc.perform(post(applyUrl(internship.getId()))
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(validApplicationBody())))
                .andExpect(status().isCreated());

        User otherInternUser = createUser(Role.INTERN);
        InternProfile otherProfile = createCompletedInternProfile(otherInternUser);
        attachCv(otherProfile, pdfBytes("resume-other"), "other.pdf");
        Internship otherInternship = createOpenInternalInternship();
        mockMvc.perform(post(applyUrl(otherInternship.getId()))
                        .with(asUser(otherInternUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(validApplicationBody())))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/intern/applications").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].internshipId").value(internship.getId().toString()));
    }

    // 18. GET detail cannot expose another intern's application
    @Test
    void detailCannotExposeAnotherInternsApplication() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        attachCv(profile, pdfBytes("resume-a"), "resume.pdf");
        Internship internship = createOpenInternalInternship();

        String json = mockMvc.perform(post(applyUrl(internship.getId()))
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(validApplicationBody())))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        UUID applicationId = UUID.fromString(objectMapper.readTree(json).get("applicationId").asText());

        User otherInternUser = createUser(Role.INTERN);
        createCompletedInternProfile(otherInternUser);

        mockMvc.perform(get("/api/v1/intern/applications/" + applicationId).with(asUser(otherInternUser)))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/v1/intern/applications/" + applicationId).with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.applicationId").value(applicationId.toString()));
    }

    // ===== SNAPSHOT =====

    // 19. apply with CV A, later replace profile CV with CV B, application still represents CV A
    @Test
    void applicationRepresentsCvAtApplicationTimeNotLaterReplacement() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        attachCv(profile, pdfBytes("resume-a-content"), "cv-a.pdf");
        Internship internship = createOpenInternalInternship();

        String json = mockMvc.perform(post(applyUrl(internship.getId()))
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(validApplicationBody())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.cvFileName").value("cv-a.pdf"))
                .andReturn().getResponse().getContentAsString();
        UUID applicationId = UUID.fromString(objectMapper.readTree(json).get("applicationId").asText());

        InternshipApplication storedApplication = applicationRepository.findById(applicationId).orElseThrow();
        String snapshotStorageKey = storedApplication.getCvStorageKey();
        byte[] snapshotBytesBeforeReplacement = cvStorageService.read(snapshotStorageKey);

        // Replace the profile's live CV — this deletes the old physical file on disk.
        InternProfile reloaded = internProfileRepository.findById(profile.getId()).orElseThrow();
        attachCv(reloaded, pdfBytes("resume-b-content"), "cv-b.pdf");

        // The application must still report the CV as it stood at application time.
        mockMvc.perform(get("/api/v1/intern/applications/" + applicationId).with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cvFileName").value("cv-a.pdf"));

        // The snapshot's own physical file must still be intact (untouched by CV B's upload).
        byte[] snapshotBytesAfterReplacement = cvStorageService.read(snapshotStorageKey);
        assertThat(snapshotBytesAfterReplacement).isEqualTo(snapshotBytesBeforeReplacement);
        assertThat(new String(snapshotBytesAfterReplacement, StandardCharsets.US_ASCII)).contains("resume-a-content");
    }

    // ===== QUESTION MANAGEMENT (company CRUD) =====

    // owner creates a SHORT_TEXT question
    @Test
    void ownerCreatesShortTextQuestion() throws Exception {
        Internship internship = createOpenInternalInternship();

        mockMvc.perform(post(companyQuestionsUrl(internship.getId()))
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(questionBody("Why this internship?", ApplicationQuestionType.SHORT_TEXT, true, 0))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.questionText").value("Why this internship?"))
                .andExpect(jsonPath("$.questionType").value("SHORT_TEXT"))
                .andExpect(jsonPath("$.required").value(true))
                .andExpect(jsonPath("$.displayOrder").value(0))
                .andExpect(jsonPath("$.internshipId").value(internship.getId().toString()));
    }

    // owner creates a LONG_TEXT question
    @Test
    void ownerCreatesLongTextQuestion() throws Exception {
        Internship internship = createOpenInternalInternship();

        mockMvc.perform(post(companyQuestionsUrl(internship.getId()))
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(questionBody("Describe a project you're proud of.", ApplicationQuestionType.LONG_TEXT, false, 1))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.questionType").value("LONG_TEXT"))
                .andExpect(jsonPath("$.required").value(false));
    }

    // required/optional stored correctly
    @Test
    void requiredAndOptionalStoredCorrectly() throws Exception {
        Internship internship = createOpenInternalInternship();
        createQuestion(internship, "Required one", ApplicationQuestionType.SHORT_TEXT, true, 0);
        createQuestion(internship, "Optional one", ApplicationQuestionType.SHORT_TEXT, false, 1);

        mockMvc.perform(get(companyQuestionsUrl(internship.getId())).with(asCompany()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].required").value(true))
                .andExpect(jsonPath("$[1].required").value(false));
    }

    // questions returned in display order
    @Test
    void questionsReturnedInDisplayOrder() throws Exception {
        createCompletedInternProfile(internUser);
        Internship internship = createOpenInternalInternship();
        createQuestion(internship, "Third", ApplicationQuestionType.SHORT_TEXT, false, 2);
        createQuestion(internship, "First", ApplicationQuestionType.SHORT_TEXT, false, 0);
        createQuestion(internship, "Second", ApplicationQuestionType.SHORT_TEXT, false, 1);

        mockMvc.perform(get(companyQuestionsUrl(internship.getId())).with(asCompany()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].questionText").value("First"))
                .andExpect(jsonPath("$[1].questionText").value("Second"))
                .andExpect(jsonPath("$[2].questionText").value("Third"));

        mockMvc.perform(get(internQuestionsUrl(internship.getId())).with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].questionText").value("First"))
                .andExpect(jsonPath("$[1].questionText").value("Second"))
                .andExpect(jsonPath("$[2].questionText").value("Third"));
    }

    // edit succeeds before applications exist
    @Test
    void editSucceedsBeforeApplicationsExist() throws Exception {
        Internship internship = createOpenInternalInternship();
        InternshipApplicationQuestion question =
                createQuestion(internship, "Original", ApplicationQuestionType.SHORT_TEXT, false, 0);

        mockMvc.perform(patch(companyQuestionUrl(internship.getId(), question.getId()))
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("questionText", "Updated"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.questionText").value("Updated"));
    }

    // delete succeeds before applications exist
    @Test
    void deleteSucceedsBeforeApplicationsExist() throws Exception {
        Internship internship = createOpenInternalInternship();
        InternshipApplicationQuestion question =
                createQuestion(internship, "To delete", ApplicationQuestionType.SHORT_TEXT, false, 0);

        mockMvc.perform(delete(companyQuestionUrl(internship.getId(), question.getId())).with(asCompany()))
                .andExpect(status().isNoContent());

        assertThat(questionRepository.findById(question.getId())).isEmpty();
    }

    // other company cannot edit/delete
    @Test
    void otherCompanyCannotEditOrDeleteQuestion() throws Exception {
        Internship internship = createOpenInternalInternship();
        InternshipApplicationQuestion question =
                createQuestion(internship, "Owned by someone else", ApplicationQuestionType.SHORT_TEXT, false, 0);

        User otherCompanyUser = createUser(Role.COMPANY);
        createCompletedCompanyProfile(otherCompanyUser);

        mockMvc.perform(patch(companyQuestionUrl(internship.getId(), question.getId()))
                        .with(asUser(otherCompanyUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("questionText", "Hijacked"))))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete(companyQuestionUrl(internship.getId(), question.getId())).with(asUser(otherCompanyUser)))
                .andExpect(status().isNotFound());

        assertThat(questionRepository.findById(question.getId())).isPresent();
    }

    // EXTERNAL internship cannot receive questions
    @Test
    void externalInternshipCannotReceiveQuestions() throws Exception {
        Internship internship = createInternship(
                ApplicationMethod.EXTERNAL, "https://careers.example.com/apply",
                InternshipStatus.OPEN, LocalDate.now().plusDays(30), null);

        mockMvc.perform(post(companyQuestionsUrl(internship.getId()))
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(questionBody("Why?", ApplicationQuestionType.SHORT_TEXT, true, 0))))
                .andExpect(status().isBadRequest());

        assertThat(questionRepository.findAllByInternshipIdOrderByDisplayOrderAscCreatedAtAsc(internship.getId())).isEmpty();
    }

    // blank question rejected
    @Test
    void blankQuestionTextRejected() throws Exception {
        Internship internship = createOpenInternalInternship();

        mockMvc.perform(post(companyQuestionsUrl(internship.getId()))
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(questionBody("   ", ApplicationQuestionType.SHORT_TEXT, true, 0))))
                .andExpect(status().isBadRequest());
    }

    // invalid type rejected
    @Test
    void invalidQuestionTypeRejected() throws Exception {
        Internship internship = createOpenInternalInternship();

        Map<String, Object> body = new HashMap<>();
        body.put("questionText", "Why?");
        body.put("questionType", "MULTIPLE_CHOICE");
        body.put("required", true);
        body.put("displayOrder", 0);

        mockMvc.perform(post(companyQuestionsUrl(internship.getId()))
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(body)))
                .andExpect(status().isBadRequest());
    }

    // invalid displayOrder rejected
    @Test
    void invalidDisplayOrderRejected() throws Exception {
        Internship internship = createOpenInternalInternship();

        mockMvc.perform(post(companyQuestionsUrl(internship.getId()))
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(questionBody("Why?", ApplicationQuestionType.SHORT_TEXT, true, -1))))
                .andExpect(status().isBadRequest());
    }

    // ===== FREEZE (after first application exists) =====

    private void applyWithNoQuestions(Internship internship) throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        attachCv(profile, pdfBytes("resume-a"), "resume.pdf");

        mockMvc.perform(post(applyUrl(internship.getId()))
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(validApplicationBody())))
                .andExpect(status().isCreated());
    }

    // once an application exists: add question -> 409
    @Test
    void addQuestionAfterFirstApplicationRejected() throws Exception {
        Internship internship = createOpenInternalInternship();
        applyWithNoQuestions(internship);

        mockMvc.perform(post(companyQuestionsUrl(internship.getId()))
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(questionBody("Too late?", ApplicationQuestionType.SHORT_TEXT, true, 0))))
                .andExpect(status().isConflict());
    }

    // once an application exists: edit -> 409
    @Test
    void editQuestionAfterFirstApplicationRejected() throws Exception {
        Internship internship = createOpenInternalInternship();
        InternshipApplicationQuestion question =
                createQuestion(internship, "Original", ApplicationQuestionType.SHORT_TEXT, false, 0);
        applyWithNoQuestions(internship);

        mockMvc.perform(patch(companyQuestionUrl(internship.getId(), question.getId()))
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("questionText", "Too late edit"))))
                .andExpect(status().isConflict());
    }

    // once an application exists: delete -> 409
    @Test
    void deleteQuestionAfterFirstApplicationRejected() throws Exception {
        Internship internship = createOpenInternalInternship();
        InternshipApplicationQuestion question =
                createQuestion(internship, "Original", ApplicationQuestionType.SHORT_TEXT, false, 0);
        applyWithNoQuestions(internship);

        mockMvc.perform(delete(companyQuestionUrl(internship.getId(), question.getId())).with(asCompany()))
                .andExpect(status().isConflict());

        assertThat(questionRepository.findById(question.getId())).isPresent();
    }

    // ===== APPLICATION SUBMISSION (answers) =====

    // all required answers supplied succeeds
    @Test
    void allRequiredAnswersSuppliedSucceeds() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        attachCv(profile, pdfBytes("resume-a"), "resume.pdf");
        Internship internship = createOpenInternalInternship();
        InternshipApplicationQuestion required =
                createQuestion(internship, "Why this role?", ApplicationQuestionType.SHORT_TEXT, true, 0);

        mockMvc.perform(post(applyUrl(internship.getId()))
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(answersBody(Map.of(required.getId(), "Because I love backend engineering.")))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.answers.length()").value(1))
                .andExpect(jsonPath("$.answers[0].answer").value("Because I love backend engineering."));
    }

    // optional answer omitted succeeds
    @Test
    void optionalAnswerOmittedSucceeds() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        attachCv(profile, pdfBytes("resume-a"), "resume.pdf");
        Internship internship = createOpenInternalInternship();
        createQuestion(internship, "Optional extra", ApplicationQuestionType.SHORT_TEXT, false, 0);

        mockMvc.perform(post(applyUrl(internship.getId()))
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(validApplicationBody())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.answers").isEmpty());
    }

    // missing required answer -> 400
    @Test
    void missingRequiredAnswerRejected() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        attachCv(profile, pdfBytes("resume-a"), "resume.pdf");
        Internship internship = createOpenInternalInternship();
        createQuestion(internship, "Required question", ApplicationQuestionType.SHORT_TEXT, true, 0);

        mockMvc.perform(post(applyUrl(internship.getId()))
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(validApplicationBody())))
                .andExpect(status().isBadRequest());

        assertThat(applicationRepository.count()).isZero();
    }

    // blank required answer -> 400
    @Test
    void blankRequiredAnswerRejected() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        attachCv(profile, pdfBytes("resume-a"), "resume.pdf");
        Internship internship = createOpenInternalInternship();
        InternshipApplicationQuestion required =
                createQuestion(internship, "Required question", ApplicationQuestionType.SHORT_TEXT, true, 0);

        mockMvc.perform(post(applyUrl(internship.getId()))
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(answersBody(Map.of(required.getId(), "   ")))))
                .andExpect(status().isBadRequest());

        assertThat(applicationRepository.count()).isZero();
    }

    // unknown questionId -> 400
    @Test
    void unknownQuestionIdRejected() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        attachCv(profile, pdfBytes("resume-a"), "resume.pdf");
        Internship internship = createOpenInternalInternship();

        mockMvc.perform(post(applyUrl(internship.getId()))
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(answersBody(Map.of(UUID.randomUUID(), "An answer")))))
                .andExpect(status().isBadRequest());

        assertThat(applicationRepository.count()).isZero();
    }

    // another internship's question id -> 400
    @Test
    void anotherInternshipsQuestionIdRejected() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        attachCv(profile, pdfBytes("resume-a"), "resume.pdf");
        Internship internship = createOpenInternalInternship();
        Internship otherInternship = createOpenInternalInternship();
        InternshipApplicationQuestion otherQuestion =
                createQuestion(otherInternship, "Belongs elsewhere", ApplicationQuestionType.SHORT_TEXT, false, 0);

        mockMvc.perform(post(applyUrl(internship.getId()))
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(answersBody(Map.of(otherQuestion.getId(), "An answer")))))
                .andExpect(status().isBadRequest());

        assertThat(applicationRepository.count()).isZero();
    }

    // duplicate question id in request -> 400
    @Test
    void duplicateQuestionIdInRequestRejected() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        attachCv(profile, pdfBytes("resume-a"), "resume.pdf");
        Internship internship = createOpenInternalInternship();
        InternshipApplicationQuestion question =
                createQuestion(internship, "Question", ApplicationQuestionType.SHORT_TEXT, false, 0);

        Map<String, Object> body = new HashMap<>();
        List<Map<String, Object>> answers = new ArrayList<>();
        Map<String, Object> answer1 = new HashMap<>();
        answer1.put("questionId", question.getId().toString());
        answer1.put("answer", "First answer");
        Map<String, Object> answer2 = new HashMap<>();
        answer2.put("questionId", question.getId().toString());
        answer2.put("answer", "Second answer");
        answers.add(answer1);
        answers.add(answer2);
        body.put("answers", answers);

        mockMvc.perform(post(applyUrl(internship.getId()))
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(body)))
                .andExpect(status().isBadRequest());

        assertThat(applicationRepository.count()).isZero();
    }

    // SHORT_TEXT too long -> 400
    @Test
    void shortTextTooLongRejected() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        attachCv(profile, pdfBytes("resume-a"), "resume.pdf");
        Internship internship = createOpenInternalInternship();
        InternshipApplicationQuestion question =
                createQuestion(internship, "Short one", ApplicationQuestionType.SHORT_TEXT, false, 0);

        String tooLong = "x".repeat(501);

        mockMvc.perform(post(applyUrl(internship.getId()))
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(answersBody(Map.of(question.getId(), tooLong)))))
                .andExpect(status().isBadRequest());

        assertThat(applicationRepository.count()).isZero();
    }

    // LONG_TEXT too long -> 400
    @Test
    void longTextTooLongRejected() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        attachCv(profile, pdfBytes("resume-a"), "resume.pdf");
        Internship internship = createOpenInternalInternship();
        InternshipApplicationQuestion question =
                createQuestion(internship, "Long one", ApplicationQuestionType.LONG_TEXT, false, 0);

        String tooLong = "x".repeat(5001);

        mockMvc.perform(post(applyUrl(internship.getId()))
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(answersBody(Map.of(question.getId(), tooLong)))))
                .andExpect(status().isBadRequest());

        assertThat(applicationRepository.count()).isZero();
    }

    // zero configured questions still succeeds (duplicate-coverage of test 1's own assertion,
    // phrased explicitly per the zero-questions requirement)
    @Test
    void zeroConfiguredQuestionsSucceeds() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        attachCv(profile, pdfBytes("resume-a"), "resume.pdf");
        Internship internship = createOpenInternalInternship();

        mockMvc.perform(post(applyUrl(internship.getId()))
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(validApplicationBody())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.answers").isEmpty());
    }

    // ===== SNAPSHOT (questions/answers) =====

    // submitted response stores question text/type/order snapshot
    @Test
    void submittedResponseStoresQuestionSnapshot() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        attachCv(profile, pdfBytes("resume-a"), "resume.pdf");
        Internship internship = createOpenInternalInternship();
        InternshipApplicationQuestion question =
                createQuestion(internship, "Why are you interested?", ApplicationQuestionType.LONG_TEXT, true, 3);

        mockMvc.perform(post(applyUrl(internship.getId()))
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(answersBody(Map.of(question.getId(), "  Because it's a great fit.  ")))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.answers[0].questionId").value(question.getId().toString()))
                .andExpect(jsonPath("$.answers[0].questionText").value("Why are you interested?"))
                .andExpect(jsonPath("$.answers[0].questionType").value("LONG_TEXT"))
                .andExpect(jsonPath("$.answers[0].required").value(true))
                .andExpect(jsonPath("$.answers[0].displayOrder").value(3))
                // Trimmed before storage.
                .andExpect(jsonPath("$.answers[0].answer").value("Because it's a great fit."));
    }

    // application GET detail returns snapshots
    @Test
    void detailReturnsSnapshots() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        attachCv(profile, pdfBytes("resume-a"), "resume.pdf");
        Internship internship = createOpenInternalInternship();
        InternshipApplicationQuestion question =
                createQuestion(internship, "Tell us about yourself", ApplicationQuestionType.LONG_TEXT, true, 0);

        String json = mockMvc.perform(post(applyUrl(internship.getId()))
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(answersBody(Map.of(question.getId(), "I'm a CS student.")))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        UUID applicationId = UUID.fromString(objectMapper.readTree(json).get("applicationId").asText());

        mockMvc.perform(get("/api/v1/intern/applications/" + applicationId).with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answers.length()").value(1))
                .andExpect(jsonPath("$.answers[0].answer").value("I'm a CS student."));

        // The compact list view may omit answers.
        mockMvc.perform(get("/api/v1/intern/applications").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].answers").isEmpty());
    }

    // application does not depend on reading mutable live question definitions
    @Test
    void applicationDoesNotDependOnMutableLiveQuestionDefinition() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser);
        attachCv(profile, pdfBytes("resume-a"), "resume.pdf");
        Internship internship = createOpenInternalInternship();
        InternshipApplicationQuestion question =
                createQuestion(internship, "Original question text", ApplicationQuestionType.SHORT_TEXT, true, 0);

        String json = mockMvc.perform(post(applyUrl(internship.getId()))
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(answersBody(Map.of(question.getId(), "My answer")))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        UUID applicationId = UUID.fromString(objectMapper.readTree(json).get("applicationId").asText());

        // Directly mutate the live question row (bypassing the service-level freeze rule) to
        // prove the guarantee comes from the snapshot itself, not merely from the freeze rule.
        InternshipApplicationQuestion liveQuestion = questionRepository.findById(question.getId()).orElseThrow();
        liveQuestion.setQuestionText("Mutated question text");
        questionRepository.saveAndFlush(liveQuestion);

        mockMvc.perform(get("/api/v1/intern/applications/" + applicationId).with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answers[0].questionText").value("Original question text"));
    }
}
