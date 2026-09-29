package com.internplatform.companyprofile;

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

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CompanyProfileControllerTest {

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

    private User companyUser;

    @BeforeEach
    void setUp() {
        companyUser = userRepository.saveAndFlush(
                new User(
                        "company-" + UUID.randomUUID() + "@example.test",
                        passwordEncoder.encode("Password123!"),
                        Role.COMPANY
                )
        );
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

    private RequestPostProcessor asCompany() {
        return asUser(companyUser);
    }

    private String toJson(Object body) throws Exception {
        return objectMapper.writeValueAsString(body);
    }

    private void patchProfile(Map<String, Object> body) throws Exception {
        mockMvc.perform(patch("/api/v1/company/profile")
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(body)))
                .andExpect(status().isOk());
    }

    private Map<String, Object> completeOnboardingFields() {
        Map<String, Object> fields = new HashMap<>();
        fields.put("companyName", "Pathora Technologies");
        fields.put("industry", "Software");
        fields.put("companySize", "11-50");
        fields.put("location", "Cairo, Egypt");
        fields.put("description", "We build tools that connect interns with great companies.");
        fields.put("contactName", "Sara Ahmed");
        fields.put("contactPhone", "01012345678");
        return fields;
    }

    @Test
    void getProfileBeforeCreationReturns404WithoutCreatingARow() throws Exception {
        mockMvc.perform(get("/api/v1/company/profile").with(asCompany()))
                .andExpect(status().isNotFound());

        assertThat(companyProfileRepository.findByUserId(companyUser.getId())).isEmpty();
    }

    @Test
    void patchCreatesProfileAndUserIdComesFromJwt() throws Exception {
        long initialCount = companyProfileRepository.count();

        Map<String, Object> createBody = Map.of(
                "companyName", "Pathora Technologies",
                "industry", "Software"
        );

        mockMvc.perform(patch("/api/v1/company/profile")
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(createBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(companyUser.getId().toString()))
                .andExpect(jsonPath("$.companyName").value("Pathora Technologies"))
                .andExpect(jsonPath("$.industry").value("Software"))
                .andExpect(jsonPath("$.onboardingCompleted").value(false));

        assertThat(companyProfileRepository.findByUserId(companyUser.getId())).isPresent();
        assertThat(companyProfileRepository.count()).isEqualTo(initialCount + 1);
    }

    @Test
    void patchUpdatesExistingProfileAndPreservesOmittedFields() throws Exception {
        patchProfile(Map.of(
                "companyName", "Pathora Technologies",
                "industry", "Software"
        ));

        mockMvc.perform(patch("/api/v1/company/profile")
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("industry", "Fintech"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.companyName").value("Pathora Technologies"))
                .andExpect(jsonPath("$.industry").value("Fintech"));

        assertThat(companyProfileRepository.count()).isEqualTo(1);
    }

    @Test
    void updatingAnExistingProfileChangesUpdatedAtButNotCreatedAt() throws Exception {
        String firstResponseJson = mockMvc.perform(patch("/api/v1/company/profile")
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("companyName", "Pathora Technologies"))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        CompanyProfileResponse firstResponse =
                objectMapper.readValue(firstResponseJson, CompanyProfileResponse.class);
        assertThat(firstResponse.updatedAt()).isEqualTo(firstResponse.createdAt());

        Thread.sleep(50);

        String secondResponseJson = mockMvc.perform(patch("/api/v1/company/profile")
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("location", "Cairo, Egypt"))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        CompanyProfileResponse secondResponse =
                objectMapper.readValue(secondResponseJson, CompanyProfileResponse.class);

        assertThat(secondResponse.createdAt()).isEqualTo(firstResponse.createdAt());
        assertThat(secondResponse.updatedAt()).isAfter(firstResponse.updatedAt());
    }

    @Test
    void companyCanAccessOwnProfile() throws Exception {
        patchProfile(Map.of("companyName", "Pathora Technologies"));

        mockMvc.perform(get("/api/v1/company/profile").with(asCompany()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(companyUser.getId().toString()))
                .andExpect(jsonPath("$.companyName").value("Pathora Technologies"));
    }

    @Test
    void internCannotAccessCompanyProfileEndpoints() throws Exception {
        User internUser = userRepository.saveAndFlush(
                new User(
                        "intern-" + UUID.randomUUID() + "@example.test",
                        passwordEncoder.encode("Password123!"),
                        Role.INTERN
                )
        );

        mockMvc.perform(get("/api/v1/company/profile").with(asUser(internUser)))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/api/v1/company/profile")
                        .with(asUser(internUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("companyName", "Should not work"))))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/company/profile/complete").with(asUser(internUser)))
                .andExpect(status().isForbidden());
    }

    @Test
    void completeFailsWhenRequiredDataMissing() throws Exception {
        patchProfile(Map.of("companyName", "Pathora Technologies"));

        mockMvc.perform(post("/api/v1/company/profile/complete").with(asCompany()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.missingFields", hasItem("industry")))
                .andExpect(jsonPath("$.missingFields", hasItem("companySize")))
                .andExpect(jsonPath("$.missingFields", hasItem("location")))
                .andExpect(jsonPath("$.missingFields", hasItem("description")))
                .andExpect(jsonPath("$.missingFields", hasItem("contactName")))
                .andExpect(jsonPath("$.missingFields", hasItem("contactPhone")));
    }

    @Test
    void completeSucceedsWhenRequiredDataPresent() throws Exception {
        patchProfile(completeOnboardingFields());

        mockMvc.perform(post("/api/v1/company/profile/complete").with(asCompany()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.onboardingCompleted").value(true))
                .andExpect(jsonPath("$.completedAt").exists());
    }

    @Test
    void completingTwiceIsIdempotentAndDoesNotChangeCompletionTimestamp() throws Exception {
        patchProfile(completeOnboardingFields());

        mockMvc.perform(post("/api/v1/company/profile/complete").with(asCompany()))
                .andExpect(status().isOk());

        long countAfterFirstComplete = companyProfileRepository.count();

        CompanyProfile firstProfile = companyProfileRepository
                .findByUserId(companyUser.getId())
                .orElseThrow();

        assertThat(firstProfile.isOnboardingCompleted()).isTrue();
        assertThat(firstProfile.getOnboardingCompletedAt()).isNotNull();

        mockMvc.perform(post("/api/v1/company/profile/complete").with(asCompany()))
                .andExpect(status().isOk());

        CompanyProfile secondProfile = companyProfileRepository
                .findByUserId(companyUser.getId())
                .orElseThrow();

        assertThat(secondProfile.isOnboardingCompleted()).isTrue();
        assertThat(secondProfile.getOnboardingCompletedAt()).isEqualTo(firstProfile.getOnboardingCompletedAt());
        assertThat(companyProfileRepository.count()).isEqualTo(countAfterFirstComplete);
    }

    @Test
    void newProfileHasOnboardingCompletedFalseAndNoCompletionTimestamp() throws Exception {
        patchProfile(Map.of("companyName", "Pathora Technologies"));

        CompanyProfile profile = companyProfileRepository
                .findByUserId(companyUser.getId())
                .orElseThrow();

        assertThat(profile.isOnboardingCompleted()).isFalse();
        assertThat(profile.getOnboardingCompletedAt()).isNull();
    }

    @Test
    void invalidWebsiteRejected() throws Exception {
        mockMvc.perform(patch("/api/v1/company/profile")
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("website", "not-a-url"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void validWebsiteAccepted() throws Exception {
        mockMvc.perform(patch("/api/v1/company/profile")
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("website", "https://pathora.example.com"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.website").value("https://pathora.example.com"));
    }

    @Test
    void invalidContactPhoneRejected() throws Exception {
        mockMvc.perform(patch("/api/v1/company/profile")
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("contactPhone", "12345"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void validContactPhoneIsNormalizedToInternationalFormat() throws Exception {
        mockMvc.perform(patch("/api/v1/company/profile")
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("contactPhone", "01012345678"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contactPhone").value("+201012345678"));
    }
}
