package com.internplatform.admin;

import com.internplatform.companyprofile.ApprovalStatus;
import com.internplatform.companyprofile.CompanyProfile;
import com.internplatform.companyprofile.CompanyProfileRepository;
import com.internplatform.internprofile.SkillRepository;
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
import java.util.Map;
import java.util.UUID;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminCompanyRequestControllerTest {

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

    private CompanyProfile createPendingCompany(User user) {
        CompanyProfile profile = new CompanyProfile(user.getId());
        profile.setCompanyName("Nile Analytics");
        profile.setIndustry("Software");
        profile.setCompanySize("11-50");
        profile.setLocation("Cairo, Egypt");
        profile.setDescription("We build analytics tools.");
        profile.setContactName("Sara Ahmed");
        profile.setContactPhone("+201012345678");
        profile.markOnboardingCompleted(OffsetDateTime.now(ZoneOffset.UTC));
        return companyProfileRepository.saveAndFlush(profile);
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

    // ===== LIST =====

    @Test
    void adminListsPendingRequestsByDefault() throws Exception {
        User admin = createUser(Role.ADMIN);
        User companyUser = createUser(Role.COMPANY);
        CompanyProfile pending = createPendingCompany(companyUser);

        mockMvc.perform(get("/api/v1/admin/company-requests").with(asUser(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.companyProfileId=='" + pending.getId() + "')]").exists());
    }

    @Test
    void adminFiltersRequestsByStatus() throws Exception {
        User admin = createUser(Role.ADMIN);
        User companyUser = createUser(Role.COMPANY);
        CompanyProfile profile = createPendingCompany(companyUser);
        profile.recordApprovalDecision(ApprovalStatus.APPROVED, OffsetDateTime.now(ZoneOffset.UTC));
        companyProfileRepository.saveAndFlush(profile);

        mockMvc.perform(get("/api/v1/admin/company-requests").queryParam("status", "APPROVED").with(asUser(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.companyProfileId=='" + profile.getId() + "')]").exists());

        mockMvc.perform(get("/api/v1/admin/company-requests").queryParam("status", "PENDING").with(asUser(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.companyProfileId=='" + profile.getId() + "')]").doesNotExist());
    }

    @Test
    void invalidStatusFilterRejected() throws Exception {
        User admin = createUser(Role.ADMIN);

        mockMvc.perform(get("/api/v1/admin/company-requests").queryParam("status", "NOT_A_STATUS").with(asUser(admin)))
                .andExpect(status().isBadRequest());
    }

    // ===== DETAIL =====

    @Test
    void adminViewsRequestDetail() throws Exception {
        User admin = createUser(Role.ADMIN);
        User companyUser = createUser(Role.COMPANY);
        CompanyProfile pending = createPendingCompany(companyUser);

        mockMvc.perform(get("/api/v1/admin/company-requests/" + pending.getId()).with(asUser(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.companyName").value("Nile Analytics"))
                .andExpect(jsonPath("$.email").value(companyUser.getEmail()))
                .andExpect(jsonPath("$.approvalStatus").value("PENDING"))
                .andExpect(jsonPath("$.onboardingCompleted").value(true));
    }

    @Test
    void unknownRequestReturns404() throws Exception {
        User admin = createUser(Role.ADMIN);

        mockMvc.perform(get("/api/v1/admin/company-requests/" + UUID.randomUUID()).with(asUser(admin)))
                .andExpect(status().isNotFound());
    }

    // ===== APPROVE / REJECT =====

    @Test
    void adminApprovesRequest() throws Exception {
        User admin = createUser(Role.ADMIN);
        User companyUser = createUser(Role.COMPANY);
        CompanyProfile pending = createPendingCompany(companyUser);

        mockMvc.perform(patch("/api/v1/admin/company-requests/" + pending.getId() + "/status")
                        .with(asUser(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("status", "APPROVED"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.approvalStatus").value("APPROVED"));

        assertThat(companyProfileRepository.findById(pending.getId()).orElseThrow().getApprovalStatus())
                .isEqualTo(ApprovalStatus.APPROVED);
    }

    @Test
    void adminRejectsRequest() throws Exception {
        User admin = createUser(Role.ADMIN);
        User companyUser = createUser(Role.COMPANY);
        CompanyProfile pending = createPendingCompany(companyUser);

        mockMvc.perform(patch("/api/v1/admin/company-requests/" + pending.getId() + "/status")
                        .with(asUser(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("status", "REJECTED"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.approvalStatus").value("REJECTED"));
    }

    @Test
    void secondDecisionConflicts() throws Exception {
        User admin = createUser(Role.ADMIN);
        User companyUser = createUser(Role.COMPANY);
        CompanyProfile pending = createPendingCompany(companyUser);

        mockMvc.perform(patch("/api/v1/admin/company-requests/" + pending.getId() + "/status")
                        .with(asUser(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("status", "APPROVED"))))
                .andExpect(status().isOk());

        mockMvc.perform(patch("/api/v1/admin/company-requests/" + pending.getId() + "/status")
                        .with(asUser(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("status", "REJECTED"))))
                .andExpect(status().isConflict());

        assertThat(companyProfileRepository.findById(pending.getId()).orElseThrow().getApprovalStatus())
                .isEqualTo(ApprovalStatus.APPROVED);
    }

    @Test
    void pendingDecisionPayloadRejected() throws Exception {
        User admin = createUser(Role.ADMIN);
        User companyUser = createUser(Role.COMPANY);
        CompanyProfile pending = createPendingCompany(companyUser);

        mockMvc.perform(patch("/api/v1/admin/company-requests/" + pending.getId() + "/status")
                        .with(asUser(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("status", "PENDING"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void invalidDecisionStringRejected() throws Exception {
        User admin = createUser(Role.ADMIN);
        User companyUser = createUser(Role.COMPANY);
        CompanyProfile pending = createPendingCompany(companyUser);

        mockMvc.perform(patch("/api/v1/admin/company-requests/" + pending.getId() + "/status")
                        .with(asUser(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("status", "MAYBE"))))
                .andExpect(status().isBadRequest());
    }

    // ===== SECURITY =====

    @Test
    void internDeniedFromAdminEndpoints() throws Exception {
        User intern = createUser(Role.INTERN);

        mockMvc.perform(get("/api/v1/admin/company-requests").with(asUser(intern)))
                .andExpect(status().isForbidden());
    }

    @Test
    void companyDeniedFromAdminEndpoints() throws Exception {
        User companyUser = createUser(Role.COMPANY);
        createPendingCompany(companyUser);

        mockMvc.perform(get("/api/v1/admin/company-requests").with(asUser(companyUser)))
                .andExpect(status().isForbidden());
    }

    @Test
    void unauthenticatedDeniedFromAdminEndpoints() throws Exception {
        mockMvc.perform(get("/api/v1/admin/company-requests"))
                .andExpect(status().isUnauthorized());
    }

    // ===== SYNC: admin decision immediately affects marketplace access =====

    @Test
    void approvingCompanyUnlocksMarketplaceEndpointImmediately() throws Exception {
        User admin = createUser(Role.ADMIN);
        User companyUser = createUser(Role.COMPANY);
        CompanyProfile pending = createPendingCompany(companyUser);

        // A bean-valid body throughout, so the only thing that changes between the two
        // requests below is the approval decision — not request validity.
        Map<String, Object> createBody = Map.of(
                "title", "Backend Intern",
                "description", "Work on our platform.",
                "location", "Cairo, Egypt",
                "workMode", "HYBRID",
                "applicationDeadline", LocalDate.now().plusDays(30).toString(),
                "skillIds", java.util.List.of(skillRepository.findAllByOrderByNameAsc().get(0).getId().toString()),
                "applicationMethod", "INTERNAL"
        );

        // Still PENDING — blocked.
        mockMvc.perform(post("/api/v1/company/internships")
                        .with(asUser(companyUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(createBody)))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/api/v1/admin/company-requests/" + pending.getId() + "/status")
                        .with(asUser(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("status", "APPROVED"))))
                .andExpect(status().isOk());

        // Now APPROVED — the very next request (same body) succeeds.
        mockMvc.perform(post("/api/v1/company/internships")
                        .with(asUser(companyUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(createBody)))
                .andExpect(status().isCreated());
    }

    @Test
    void rejectingCompanyKeepsMarketplaceEndpointBlocked() throws Exception {
        User admin = createUser(Role.ADMIN);
        User companyUser = createUser(Role.COMPANY);
        CompanyProfile pending = createPendingCompany(companyUser);

        mockMvc.perform(patch("/api/v1/admin/company-requests/" + pending.getId() + "/status")
                        .with(asUser(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("status", "REJECTED"))))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/company/internships/" + UUID.randomUUID() + "/applications")
                        .with(asUser(companyUser)))
                .andExpect(status().isForbidden());
    }
}
