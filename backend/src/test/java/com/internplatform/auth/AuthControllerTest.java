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

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Registration and login behavior for the company-approval milestone: new companies start
 * PENDING, interns are entirely unaffected, and login itself never implies marketplace
 * authorization for any role (see CompanyApprovalEnforcementTest for the actual gate).
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
    void pendingCompanyCanStillLogIn() throws Exception {
        String email = uniqueEmail("company");

        mockMvc.perform(post("/api/v1/auth/register/company")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("email", email, "password", "Password123!"))))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("email", email, "password", "Password123!"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("COMPANY"))
                .andExpect(jsonPath("$.accessToken").exists());
    }

    @Test
    void rejectedCompanyCanStillLogIn() throws Exception {
        User user = userRepository.saveAndFlush(
                new User(uniqueEmail("company"), passwordEncoder.encode("Password123!"), Role.COMPANY));
        CompanyProfile profile = new CompanyProfile(user.getId());
        profile.recordApprovalDecision(ApprovalStatus.REJECTED, java.time.OffsetDateTime.now(java.time.ZoneOffset.UTC));
        companyProfileRepository.saveAndFlush(profile);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("email", user.getEmail(), "password", "Password123!"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("COMPANY"));
    }

    @Test
    void adminCanLogInThroughTheSameEndpoint() throws Exception {
        String email = uniqueEmail("admin");
        userRepository.saveAndFlush(new User(email, passwordEncoder.encode("Password123!"), Role.ADMIN));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("email", email, "password", "Password123!"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMIN"))
                .andExpect(jsonPath("$.accessToken").exists());
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
}
