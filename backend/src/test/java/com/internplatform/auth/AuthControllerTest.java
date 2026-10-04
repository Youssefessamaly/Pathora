package com.internplatform.auth;

import com.internplatform.companyprofile.ApprovalStatus;
import com.internplatform.companyprofile.CompanyProfile;
import com.internplatform.companyprofile.CompanyProfileRepository;
import com.internplatform.user.Role;
import com.internplatform.user.User;
import com.internplatform.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Registration and login behavior for the company-approval milestone.
 *
 * FROZEN PRODUCT FLOW: a COMPANY may authenticate regardless of approval status — onboarding
 * and profile completion happen after registration and require a token, and PENDING/REJECTED
 * companies still need to be able to read their own approval status (and the mobile app still
 * needs a token to route them to the right screen). Login therefore never implies marketplace
 * authorization for any role: that line is drawn entirely by CompanyApprovalGuard at the
 * marketplace endpoints themselves (see CompanyApprovalEnforcementTest and
 * AdminCompanyRequestControllerTest for that enforcement, which this file does not duplicate).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CompanyProfileRepository companyProfileRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String toJson(Object body) throws Exception {
        return objectMapper.writeValueAsString(body);
    }

    private String uniqueEmail(String prefix) {
        return prefix + "-" + UUID.randomUUID() + "@example.test";
    }

    private User createUser(Role role, String password) {
        return userRepository.saveAndFlush(
                new User(uniqueEmail(role.name().toLowerCase()), passwordEncoder.encode(password), role));
    }

    /** PENDING is the entity's own default — pass it explicitly only for readability at each
     *  call site; APPROVED/REJECTED record a real decision via the same mutator the admin
     *  endpoint itself uses. */
    private CompanyProfile createCompanyProfile(User user, ApprovalStatus status) {
        CompanyProfile profile = new CompanyProfile(user.getId());
        if (status != ApprovalStatus.PENDING) {
            profile.recordApprovalDecision(status, OffsetDateTime.now(ZoneOffset.UTC));
        }
        return companyProfileRepository.saveAndFlush(profile);
    }

    // ===== REGISTRATION =====

    @Test
    void newCompanyRegistrationStartsPending() throws Exception {
        String email = uniqueEmail("company");

        String response = mockMvc.perform(post("/api/v1/auth/register/company")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("email", email, "password", "Password123!"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("COMPANY"))
                .andReturn().getResponse().getContentAsString();

        UUID userId = UUID.fromString(objectMapper.readTree(response).get("id").asText());

        Optional<CompanyProfile> profile = companyProfileRepository.findByUserId(userId);
        assertThat(profile).isPresent();
        assertThat(profile.get().getApprovalStatus()).isEqualTo(ApprovalStatus.PENDING);
        assertThat(profile.get().getApprovalReviewedAt()).isNull();
    }

    @Test
    void newInternRegistrationUnaffectedAndHasNoCompanyProfile() throws Exception {
        String email = uniqueEmail("intern");

        String response = mockMvc.perform(post("/api/v1/auth/register/intern")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("email", email, "password", "Password123!"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("INTERN"))
                .andReturn().getResponse().getContentAsString();

        UUID userId = UUID.fromString(objectMapper.readTree(response).get("id").asText());

        assertThat(companyProfileRepository.findByUserId(userId)).isEmpty();
    }

    @Test
    void noPublicAdminRegistrationEndpointExists() throws Exception {
        // /auth/register/admin is not in SecurityConfig's permitAll list (only
        // register/intern, register/company, login, and password-reset are), so an
        // unauthenticated request is rejected by the security filter chain itself — 401 —
        // before Spring MVC ever gets a chance to report 404 for the unmapped route. Either
        // way, the outcome proves the same thing: there is no reachable public admin
        // registration endpoint.
        mockMvc.perform(post("/api/v1/auth/register/admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("email", uniqueEmail("admin"), "password", "Password123!"))))
                .andExpect(status().isUnauthorized());
    }

    // ===== COMPANY LOGIN BY APPROVAL STATUS — all three succeed =====

    @Test
    void pendingCompanyLoginSucceeds() throws Exception {
        User user = createUser(Role.COMPANY, "Password123!");
        createCompanyProfile(user, ApprovalStatus.PENDING);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("email", user.getEmail(), "password", "Password123!"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("COMPANY"))
                .andExpect(jsonPath("$.accessToken").exists());
    }

    @Test
    void rejectedCompanyLoginSucceeds() throws Exception {
        User user = createUser(Role.COMPANY, "Password123!");
        createCompanyProfile(user, ApprovalStatus.REJECTED);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("email", user.getEmail(), "password", "Password123!"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("COMPANY"))
                .andExpect(jsonPath("$.accessToken").exists());
    }

    @Test
    void approvedCompanyLoginSucceeds() throws Exception {
        User user = createUser(Role.COMPANY, "Password123!");
        createCompanyProfile(user, ApprovalStatus.APPROVED);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("email", user.getEmail(), "password", "Password123!"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("COMPANY"))
                .andExpect(jsonPath("$.accessToken").exists());
    }

    // ===== OTHER ROLES UNCHANGED =====

    @Test
    void internLoginUnaffected() throws Exception {
        User user = createUser(Role.INTERN, "Password123!");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("email", user.getEmail(), "password", "Password123!"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("INTERN"))
                .andExpect(jsonPath("$.accessToken").exists());
    }

    @Test
    void adminCanLogInThroughTheSameEndpoint() throws Exception {
        User admin = createUser(Role.ADMIN, "Password123!");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("email", admin.getEmail(), "password", "Password123!"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMIN"))
                .andExpect(jsonPath("$.accessToken").exists());
    }

    // ===== INVALID CREDENTIALS — unaffected by approval status =====

    @Test
    void wrongPasswordForPendingCompanyRejected() throws Exception {
        User user = createUser(Role.COMPANY, "CorrectPassword123!");
        createCompanyProfile(user, ApprovalStatus.PENDING);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("email", user.getEmail(), "password", "WrongPassword456!"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unknownEmailIsGenericInvalidCredentials() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("email", uniqueEmail("ghost"), "password", "Whatever123!"))))
                .andExpect(status().isUnauthorized());
    }
}
