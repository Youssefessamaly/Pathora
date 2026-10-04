package com.internplatform.companyprofile;

import com.internplatform.internprofile.InternProfile;
import com.internplatform.internprofile.InternProfileRepository;
import com.internplatform.internprofile.Skill;
import com.internplatform.internprofile.SkillRepository;
import com.internplatform.internship.ApplicationMethod;
import com.internplatform.internship.Internship;
import com.internplatform.internship.InternshipRepository;
import com.internplatform.internship.InternshipStatus;
import com.internplatform.internship.WorkMode;
import com.internplatform.internshipapplication.ApplicationQuestionType;
import com.internplatform.internshipapplication.InternshipApplication;
import com.internplatform.internshipapplication.InternshipApplicationQuestion;
import com.internplatform.internshipapplication.InternshipApplicationQuestionRepository;
import com.internplatform.internshipapplication.InternshipApplicationRepository;
import com.internplatform.user.Role;
import com.internplatform.user.User;
import com.internplatform.user.UserRepository;
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

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Consumer;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verifies CompanyApprovalGuard actually blocks marketplace endpoints for PENDING/REJECTED
 * companies, and leaves them open for APPROVED ones — the enforcement half of the company
 * approval milestone (PART 6). Onboarding/profile/approval-status endpoints are verified to
 * stay reachable regardless of approval status, since a PENDING or REJECTED company must still
 * be able to see its own status.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CompanyApprovalEnforcementTest {

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
    private InternshipRepository internshipRepository;

    @Autowired
    private InternshipApplicationQuestionRepository questionRepository;

    @Autowired
    private InternshipApplicationRepository applicationRepository;

    @Autowired
    private InternProfileRepository internProfileRepository;

    @Autowired
    private SkillRepository skillRepository;

    private User createUser(Role role) {
        return userRepository.saveAndFlush(
                new User(
                        role.name().toLowerCase() + "-" + UUID.randomUUID() + "@example.test",
                        passwordEncoder.encode("Password123!"),
                        role
                )
        );
    }

    private Skill firstSkill() {
        return skillRepository.findAllByOrderByNameAsc().get(0);
    }

    /** Onboarded (so onboarding-completeness is never the reason a request fails here) but
     *  with the given approval status — isolates the approval gate from the pre-existing
     *  onboarding-completeness gate. */
    private CompanyProfile createCompanyWithStatus(User user, ApprovalStatus status) {
        CompanyProfile profile = new CompanyProfile(user.getId());
        profile.setCompanyName("Pathora Technologies");
        profile.setIndustry("Software");
        profile.setCompanySize("11-50");
        profile.setLocation("Cairo, Egypt");
        profile.setDescription("We build tools that connect interns with great companies.");
        profile.setContactName("Sara Ahmed");
        profile.setContactPhone("+201012345678");
        profile.markOnboardingCompleted(OffsetDateTime.now(ZoneOffset.UTC));
        if (status != ApprovalStatus.PENDING) {
            profile.recordApprovalDecision(status, OffsetDateTime.now(ZoneOffset.UTC));
        }
        return companyProfileRepository.saveAndFlush(profile);
    }

    /** Created directly via the repository (bypassing the gated service) so a PENDING/REJECTED
     *  company can still have pre-existing internships/questions/applications to verify the
     *  guard blocks access to them too, not just blocks creating new ones. */
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

    private InternshipApplicationQuestion createQuestion(Internship internship) {
        InternshipApplicationQuestion question = new InternshipApplicationQuestion(internship.getId());
        question.setQuestionText("Why this role?");
        question.setQuestionType(ApplicationQuestionType.SHORT_TEXT);
        question.setRequired(true);
        question.setDisplayOrder(0);
        return questionRepository.saveAndFlush(question);
    }

    private InternProfile createInternProfile() {
        User internUser = createUser(Role.INTERN);
        InternProfile profile = new InternProfile(internUser.getId());
        profile.setFirstName("Amina");
        profile.setLastName("Hassan");
        return internProfileRepository.saveAndFlush(profile);
    }

    private InternshipApplication createApplication(Internship internship) {
        InternProfile internProfile = createInternProfile();
        InternshipApplication application = new InternshipApplication(internship.getId(), internProfile.getId());
        application.setCvFileName("resume.pdf");
        application.setCvStorageKey(UUID.randomUUID() + "/resume.pdf");
        application.setCvContentType("application/pdf");
        application.setCvSizeBytes(1024);
        application.setCvUploadedAt(OffsetDateTime.now(ZoneOffset.UTC));
        return applicationRepository.saveAndFlush(application);
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

    private String toJson(Object body) throws Exception {
        return objectMapper.writeValueAsString(body);
    }

    // ===== PENDING: onboarding/profile/approval-status remain reachable =====

    @Test
    void pendingCompanyCanReadAndUpdateProfile() throws Exception {
        User user = createUser(Role.COMPANY);
        createCompanyWithStatus(user, ApprovalStatus.PENDING);

        mockMvc.perform(get("/api/v1/company/profile").with(asUser(user)))
                .andExpect(status().isOk());

        mockMvc.perform(patch("/api/v1/company/profile")
                        .with(asUser(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("companyName", "Updated Name"))))
                .andExpect(status().isOk());
    }

    @Test
    void pendingCompanyCanCompleteOnboarding() throws Exception {
        User user = createUser(Role.COMPANY);
        createCompanyWithStatus(user, ApprovalStatus.PENDING);

        mockMvc.perform(post("/api/v1/company/profile/complete").with(asUser(user)))
                .andExpect(status().isOk());
    }

    @Test
    void pendingCompanyCanReadApprovalStatus() throws Exception {
        User user = createUser(Role.COMPANY);
        createCompanyWithStatus(user, ApprovalStatus.PENDING);

        mockMvc.perform(get("/api/v1/company/approval-status").with(asUser(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    // ===== PENDING: marketplace endpoints blocked =====

    @Test
    void pendingCompanyCannotCreateInternship() throws Exception {
        User user = createUser(Role.COMPANY);
        createCompanyWithStatus(user, ApprovalStatus.PENDING);

        Map<String, Object> body = Map.of(
                "title", "Backend Intern",
                "description", "Work on our platform.",
                "location", "Cairo, Egypt",
                "workMode", "HYBRID",
                "applicationDeadline", LocalDate.now().plusDays(30).toString(),
                "skillIds", java.util.List.of(firstSkill().getId().toString()),
                "applicationMethod", "INTERNAL"
        );

        mockMvc.perform(post("/api/v1/company/internships")
                        .with(asUser(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(body)))
                .andExpect(status().isForbidden());
    }

    @Test
    void pendingCompanyCannotUpdateInternship() throws Exception {
        User user = createUser(Role.COMPANY);
        CompanyProfile profile = createCompanyWithStatus(user, ApprovalStatus.PENDING);
        Internship internship = createInternship(profile);

        mockMvc.perform(patch("/api/v1/company/internships/" + internship.getId())
                        .with(asUser(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("title", "New title"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void pendingCompanyCannotCloseInternship() throws Exception {
        User user = createUser(Role.COMPANY);
        CompanyProfile profile = createCompanyWithStatus(user, ApprovalStatus.PENDING);
        Internship internship = createInternship(profile);

        mockMvc.perform(post("/api/v1/company/internships/" + internship.getId() + "/close").with(asUser(user)))
                .andExpect(status().isForbidden());
    }

    @Test
    void pendingCompanyCannotManageApplicationQuestions() throws Exception {
        User user = createUser(Role.COMPANY);
        CompanyProfile profile = createCompanyWithStatus(user, ApprovalStatus.PENDING);
        Internship internship = createInternship(profile);
        InternshipApplicationQuestion question = createQuestion(internship);

        String baseUrl = "/api/v1/company/internships/" + internship.getId() + "/application-questions";

        mockMvc.perform(post(baseUrl)
                        .with(asUser(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of(
                                "questionText", "Why?",
                                "questionType", "SHORT_TEXT",
                                "required", true,
                                "displayOrder", 0))))
                .andExpect(status().isForbidden());

        mockMvc.perform(get(baseUrl).with(asUser(user)))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch(baseUrl + "/" + question.getId())
                        .with(asUser(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("questionText", "Edited"))))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete(baseUrl + "/" + question.getId()).with(asUser(user)))
                .andExpect(status().isForbidden());
    }

    @Test
    void pendingCompanyCannotViewOrDecideApplicants() throws Exception {
        User user = createUser(Role.COMPANY);
        CompanyProfile profile = createCompanyWithStatus(user, ApprovalStatus.PENDING);
        Internship internship = createInternship(profile);
        InternshipApplication application = createApplication(internship);

        String baseUrl = "/api/v1/company/internships/" + internship.getId() + "/applications";

        mockMvc.perform(get(baseUrl).with(asUser(user)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get(baseUrl + "/" + application.getId()).with(asUser(user)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get(baseUrl + "/" + application.getId() + "/cv").with(asUser(user)))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch(baseUrl + "/" + application.getId() + "/status")
                        .with(asUser(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("status", "ACCEPTED"))))
                .andExpect(status().isForbidden());
    }

    // ===== REJECTED: same checks, lighter touch =====

    @Test
    void rejectedCompanyCanReadApprovalStatusButNotMarketplace() throws Exception {
        User user = createUser(Role.COMPANY);
        CompanyProfile profile = createCompanyWithStatus(user, ApprovalStatus.REJECTED);
        Internship internship = createInternship(profile);

        mockMvc.perform(get("/api/v1/company/approval-status").with(asUser(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));

        mockMvc.perform(post("/api/v1/company/internships/" + internship.getId() + "/close").with(asUser(user)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/company/internships/" + internship.getId() + "/applications").with(asUser(user)))
                .andExpect(status().isForbidden());
    }

    // ===== APPROVED: unaffected =====

    @Test
    void approvedCompanyCanCreateInternship() throws Exception {
        User user = createUser(Role.COMPANY);
        createCompanyWithStatus(user, ApprovalStatus.APPROVED);

        Map<String, Object> body = Map.of(
                "title", "Backend Intern",
                "description", "Work on our platform.",
                "location", "Cairo, Egypt",
                "workMode", "HYBRID",
                "applicationDeadline", LocalDate.now().plusDays(30).toString(),
                "skillIds", java.util.List.of(firstSkill().getId().toString()),
                "applicationMethod", "INTERNAL"
        );

        mockMvc.perform(post("/api/v1/company/internships")
                        .with(asUser(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(body)))
                .andExpect(status().isCreated());
    }
}
