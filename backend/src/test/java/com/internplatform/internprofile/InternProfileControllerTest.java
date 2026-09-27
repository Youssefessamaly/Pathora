package com.internplatform.internprofile;

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

import java.time.OffsetDateTime;
import java.time.Year;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class InternProfileControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private SkillRepository skillRepository;

    @Autowired
    private InternProfileRepository internProfileRepository;

    private User internUser;

    @BeforeEach
    void setUp() {
        internUser = userRepository.saveAndFlush(
                new User(
                        "intern-" + UUID.randomUUID() + "@example.test",
                        passwordEncoder.encode("Password123!"),
                        Role.INTERN
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

    private RequestPostProcessor asIntern() {
        return asUser(internUser);
    }

    private String toJson(Object body) throws Exception {
        return objectMapper.writeValueAsString(body);
    }

    private void patchProfile(Map<String, Object> body) throws Exception {
        mockMvc.perform(patch("/api/v1/intern/profile")
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(body)))
                .andExpect(status().isOk());
    }

    private Map<String, Object> completeOnboardingFields(UUID skillId) {
        Map<String, Object> fields = new HashMap<>();
        fields.put("firstName", "Amina");
        fields.put("lastName", "Hassan");
        fields.put("dateOfBirth", "2001-05-10");
        fields.put("phoneNumber", "01012345678");
        fields.put("institutionName", "Cairo University");
        fields.put("academicLevel", "UNIVERSITY");
        fields.put("academicYear", 3);
        fields.put("major", "Computer Science");
        fields.put("expectedGraduationYear", Year.now().getValue() + 1);
        fields.put("skillIds", List.of(skillId.toString()));
        fields.put("careerInterests", "Data analytics and product management");
        return fields;
    }

    @Test
    void internCanCreateAndUpdateOwnProfileAndUserIdComesFromJwt() throws Exception {
        long initialProfileCount = internProfileRepository.count();

        Map<String, Object> createBody = Map.of(
                "firstName", "Amina",
                "lastName", "Hassan"
        );

        mockMvc.perform(patch("/api/v1/intern/profile")
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(createBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(internUser.getId().toString()))
                .andExpect(jsonPath("$.firstName").value("Amina"))
                .andExpect(jsonPath("$.lastName").value("Hassan"))
                .andExpect(jsonPath("$.onboardingCompleted").value(false));

        Map<String, Object> updateBody = Map.of("lastName", "Youssef");

        mockMvc.perform(patch("/api/v1/intern/profile")
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(updateBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("Amina"))
                .andExpect(jsonPath("$.lastName").value("Youssef"));

        assertThat(internProfileRepository.findByUserId(internUser.getId())).isPresent();
        assertThat(internProfileRepository.count()).isEqualTo(initialProfileCount + 1);

        // A second INTERN user gets their own, isolated profile row tied to their own JWT subject.
        User otherIntern = userRepository.saveAndFlush(
                new User(
                        "intern-" + UUID.randomUUID() + "@example.test",
                        passwordEncoder.encode("Password123!"),
                        Role.INTERN
                )
        );

        mockMvc.perform(patch("/api/v1/intern/profile")
                        .with(asUser(otherIntern))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("firstName", "Youssef"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(otherIntern.getId().toString()))
                .andExpect(jsonPath("$.firstName").value("Youssef"));

        assertThat(internProfileRepository.count()).isEqualTo(initialProfileCount + 2);
    }

    @Test
    void getProfileBeforeCreationReturns404WithoutCreatingARow() throws Exception {
        mockMvc.perform(get("/api/v1/intern/profile").with(asIntern()))
                .andExpect(status().isNotFound());

        assertThat(internProfileRepository.findByUserId(internUser.getId())).isEmpty();
    }

    @Test
    void skillsEndpointReturnsSeededCatalogSortedByName() throws Exception {
        mockMvc.perform(get("/api/v1/intern/skills").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(12)))
                .andExpect(jsonPath("$[*].name", hasItem("Java")))
                .andExpect(jsonPath("$[*].name", hasItem("SQL")))
                .andExpect(jsonPath("$[*].name", hasItem("Project Management")));

        List<Skill> seeded = skillRepository.findAllByOrderByNameAsc();
        List<String> names = seeded.stream().map(Skill::getName).toList();
        List<String> sortedNames = names.stream().sorted().toList();

        assertThat(names).isEqualTo(sortedNames);
    }

    @Test
    void patchWithUnknownSkillIdReturns400() throws Exception {
        Map<String, Object> body = Map.of("skillIds", List.of(UUID.randomUUID().toString()));

        mockMvc.perform(patch("/api/v1/intern/profile")
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void completeFailsWhenRequiredDataMissing() throws Exception {
        patchProfile(Map.of("firstName", "Amina"));

        mockMvc.perform(post("/api/v1/intern/profile/complete").with(asIntern()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.missingFields", hasItem("lastName")))
                .andExpect(jsonPath("$.missingFields", hasItem("skills")))
                .andExpect(jsonPath("$.missingFields", hasItem("careerInterests")));
    }

    @Test
    void completeSucceedsWhenRequiredDataPresent() throws Exception {
        UUID skillId = skillRepository.findAllByOrderByNameAsc().get(0).getId();
        patchProfile(completeOnboardingFields(skillId));

        mockMvc.perform(post("/api/v1/intern/profile/complete").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.onboardingCompleted").value(true));
    }

    @Test
    void companyCannotAccessInternProfileEndpoint() throws Exception {
        User companyUser = userRepository.saveAndFlush(
                new User(
                        "company-" + UUID.randomUUID() + "@example.test",
                        passwordEncoder.encode("Password123!"),
                        Role.COMPANY
                )
        );

        mockMvc.perform(get("/api/v1/intern/profile").with(asUser(companyUser)))
                .andExpect(status().isForbidden());
    }

    @Test
    void updatingAnExistingProfileChangesUpdatedAtButNotCreatedAt() throws Exception {
        String firstResponseJson = mockMvc.perform(patch("/api/v1/intern/profile")
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("firstName", "Amina"))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        InternProfileResponse firstResponse =
                objectMapper.readValue(firstResponseJson, InternProfileResponse.class);
        assertThat(firstResponse.updatedAt()).isEqualTo(firstResponse.createdAt());

        Thread.sleep(50);

        String secondResponseJson = mockMvc.perform(patch("/api/v1/intern/profile")
                        .with(asIntern())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("institutionName", "Cairo University"))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        InternProfileResponse secondResponse =
                objectMapper.readValue(secondResponseJson, InternProfileResponse.class);

        assertThat(secondResponse.createdAt()).isEqualTo(firstResponse.createdAt());
        assertThat(secondResponse.updatedAt()).isAfter(firstResponse.updatedAt());
    }

    @Test
    void completingTwiceDoesNotChangeCompletionTimestamp() throws Exception {
        UUID skillId = skillRepository.findAllByOrderByNameAsc().get(0).getId();
        patchProfile(completeOnboardingFields(skillId));

        mockMvc.perform(post("/api/v1/intern/profile/complete").with(asIntern()))
                .andExpect(status().isOk());

        OffsetDateTime firstCompletedAt = internProfileRepository
                .findByUserId(internUser.getId())
                .orElseThrow()
                .getOnboardingCompletedAt();

        assertThat(firstCompletedAt).isNotNull();

        mockMvc.perform(post("/api/v1/intern/profile/complete").with(asIntern()))
                .andExpect(status().isOk());

        OffsetDateTime secondCompletedAt = internProfileRepository
                .findByUserId(internUser.getId())
                .orElseThrow()
                .getOnboardingCompletedAt();

        assertThat(secondCompletedAt).isEqualTo(firstCompletedAt);
    }
}
