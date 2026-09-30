package com.internplatform.internship;

import com.internplatform.companyprofile.CompanyProfile;
import com.internplatform.companyprofile.CompanyProfileRepository;
import com.internplatform.internprofile.Skill;
import com.internplatform.internprofile.SkillRepository;
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

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
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
class InternshipControllerTest {

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
    private SkillRepository skillRepository;

    private User companyUser;
    private CompanyProfile companyProfile;
    private UUID skillId1;
    private UUID skillId2;

    @BeforeEach
    void setUp() {
        companyUser = createUser(Role.COMPANY);
        companyProfile = createCompletedCompanyProfile(companyUser);

        List<Skill> skills = skillRepository.findAllByOrderByNameAsc();
        skillId1 = skills.get(0).getId();
        skillId2 = skills.get(1).getId();
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

    private CompanyProfile createIncompleteCompanyProfile(User user) {
        CompanyProfile profile = new CompanyProfile(user.getId());
        profile.setCompanyName("Incomplete Co");
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

    private RequestPostProcessor asCompany() {
        return asUser(companyUser);
    }

    private String toJson(Object body) throws Exception {
        return objectMapper.writeValueAsString(body);
    }

    private Map<String, Object> validCreateBody() {
        Map<String, Object> body = new HashMap<>();
        body.put("title", "Backend Engineering Intern");
        body.put("description", "Work on our core Spring Boot platform.");
        body.put("location", "Cairo, Egypt");
        body.put("workMode", "HYBRID");
        body.put("applicationDeadline", LocalDate.now().plusDays(30).toString());
        body.put("startDate", LocalDate.now().plusMonths(2).toString());
        body.put("durationMonths", 3);
        body.put("skillIds", List.of(skillId1.toString()));
        return body;
    }

    private UUID createInternship(User owner) throws Exception {
        String json = mockMvc.perform(post("/api/v1/company/internships")
                        .with(asUser(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(validCreateBody())))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        return UUID.fromString(objectMapper.readTree(json).get("id").asText());
    }

    // 1. INTERN cannot create internship
    @Test
    void internCannotCreateInternship() throws Exception {
        User internUser = createUser(Role.INTERN);

        mockMvc.perform(post("/api/v1/company/internships")
                        .with(asUser(internUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(validCreateBody())))
                .andExpect(status().isForbidden());
    }

    // 2. COMPANY without CompanyProfile cannot create internship
    @Test
    void companyWithoutProfileCannotCreateInternship() throws Exception {
        User newCompanyUser = createUser(Role.COMPANY);

        mockMvc.perform(post("/api/v1/company/internships")
                        .with(asUser(newCompanyUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(validCreateBody())))
                .andExpect(status().isForbidden());
    }

    // 3. COMPANY with incomplete profile cannot create internship
    @Test
    void companyWithIncompleteProfileCannotCreateInternship() throws Exception {
        User newCompanyUser = createUser(Role.COMPANY);
        createIncompleteCompanyProfile(newCompanyUser);

        mockMvc.perform(post("/api/v1/company/internships")
                        .with(asUser(newCompanyUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(validCreateBody())))
                .andExpect(status().isForbidden());
    }

    // 4. completed COMPANY can create internship
    // 5. created internship belongs to authenticated company
    // 6. status starts as OPEN
    // 7. createdAt and updatedAt are set
    @Test
    void completedCompanyCanCreateInternshipOwnedByItselfWithOpenStatusAndTimestamps() throws Exception {
        String json = mockMvc.perform(post("/api/v1/company/internships")
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(validCreateBody())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.companyName").value("Pathora Technologies"))
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.createdAt").exists())
                .andExpect(jsonPath("$.updatedAt").exists())
                .andReturn().getResponse().getContentAsString();

        UUID internshipId = UUID.fromString(objectMapper.readTree(json).get("id").asText());

        Internship saved = internshipRepository.findById(internshipId).orElseThrow();
        assertThat(saved.getCompanyProfileId()).isEqualTo(companyProfile.getId());
        assertThat(saved.getStatus()).isEqualTo(InternshipStatus.OPEN);
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getUpdatedAt()).isNotNull();
    }

    // 8. unknown skill ID rejected
    @Test
    void unknownSkillIdRejected() throws Exception {
        Map<String, Object> body = new HashMap<>(validCreateBody());
        body.put("skillIds", List.of(UUID.randomUUID().toString()));

        mockMvc.perform(post("/api/v1/company/internships")
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(body)))
                .andExpect(status().isBadRequest());
    }

    // 9. empty skill list rejected
    @Test
    void emptySkillListRejected() throws Exception {
        Map<String, Object> body = new HashMap<>(validCreateBody());
        body.put("skillIds", List.of());

        mockMvc.perform(post("/api/v1/company/internships")
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(body)))
                .andExpect(status().isBadRequest());
    }

    // 10. invalid workMode rejected
    @Test
    void invalidWorkModeRejected() throws Exception {
        Map<String, Object> body = new HashMap<>(validCreateBody());
        body.put("workMode", "FROM_MARS");

        mockMvc.perform(post("/api/v1/company/internships")
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(body)))
                .andExpect(status().isBadRequest());
    }

    // 11. past applicationDeadline rejected
    @Test
    void pastApplicationDeadlineRejected() throws Exception {
        Map<String, Object> body = new HashMap<>(validCreateBody());
        body.put("applicationDeadline", LocalDate.now().minusDays(1).toString());

        mockMvc.perform(post("/api/v1/company/internships")
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(body)))
                .andExpect(status().isBadRequest());
    }

    // 12. GET list returns only current company's internships
    @Test
    void getListReturnsOnlyCurrentCompanysInternships() throws Exception {
        createInternship(companyUser);

        User otherCompanyUser = createUser(Role.COMPANY);
        createCompletedCompanyProfile(otherCompanyUser);
        createInternship(otherCompanyUser);

        mockMvc.perform(get("/api/v1/company/internships").with(asCompany()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].companyName").value("Pathora Technologies"));
    }

    // 13. GET by ID works for owner
    @Test
    void getByIdWorksForOwner() throws Exception {
        UUID internshipId = createInternship(companyUser);

        mockMvc.perform(get("/api/v1/company/internships/" + internshipId).with(asCompany()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(internshipId.toString()));
    }

    // 14. GET by ID does not expose another company's internship
    @Test
    void getByIdDoesNotExposeAnotherCompanysInternship() throws Exception {
        UUID internshipId = createInternship(companyUser);

        User otherCompanyUser = createUser(Role.COMPANY);
        createCompletedCompanyProfile(otherCompanyUser);

        mockMvc.perform(get("/api/v1/company/internships/" + internshipId).with(asUser(otherCompanyUser)))
                .andExpect(status().isNotFound());
    }

    // 15. PATCH updates supplied fields
    // 16. PATCH preserves omitted fields
    @Test
    void patchUpdatesSuppliedFieldsAndPreservesOmittedFields() throws Exception {
        UUID internshipId = createInternship(companyUser);

        mockMvc.perform(patch("/api/v1/company/internships/" + internshipId)
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("title", "Updated Title"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Updated Title"))
                .andExpect(jsonPath("$.location").value("Cairo, Egypt"))
                .andExpect(jsonPath("$.workMode").value("HYBRID"));
    }

    // 17. PATCH skillIds replaces skill set
    @Test
    void patchSkillIdsReplacesSkillSet() throws Exception {
        UUID internshipId = createInternship(companyUser);

        mockMvc.perform(patch("/api/v1/company/internships/" + internshipId)
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("skillIds", List.of(skillId2.toString())))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.skills.length()").value(1))
                .andExpect(jsonPath("$.skills[0].id").value(skillId2.toString()));
    }

    // 18. another company cannot PATCH internship
    @Test
    void anotherCompanyCannotPatchInternship() throws Exception {
        UUID internshipId = createInternship(companyUser);

        User otherCompanyUser = createUser(Role.COMPANY);
        createCompletedCompanyProfile(otherCompanyUser);

        mockMvc.perform(patch("/api/v1/company/internships/" + internshipId)
                        .with(asUser(otherCompanyUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("title", "Hijacked"))))
                .andExpect(status().isNotFound());
    }

    // 19. close changes OPEN -> CLOSED
    @Test
    void closeChangesOpenToClosed() throws Exception {
        UUID internshipId = createInternship(companyUser);

        mockMvc.perform(post("/api/v1/company/internships/" + internshipId + "/close").with(asCompany()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"));
    }

    // 20. close is idempotent
    @Test
    void closeIsIdempotent() throws Exception {
        UUID internshipId = createInternship(companyUser);

        mockMvc.perform(post("/api/v1/company/internships/" + internshipId + "/close").with(asCompany()))
                .andExpect(status().isOk());

        OffsetDateTime firstUpdatedAt = internshipRepository.findById(internshipId).orElseThrow().getUpdatedAt();

        Thread.sleep(50);

        mockMvc.perform(post("/api/v1/company/internships/" + internshipId + "/close").with(asCompany()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"));

        OffsetDateTime secondUpdatedAt = internshipRepository.findById(internshipId).orElseThrow().getUpdatedAt();
        assertThat(secondUpdatedAt).isEqualTo(firstUpdatedAt);
    }

    // 21. another company cannot close internship
    @Test
    void anotherCompanyCannotCloseInternship() throws Exception {
        UUID internshipId = createInternship(companyUser);

        User otherCompanyUser = createUser(Role.COMPANY);
        createCompletedCompanyProfile(otherCompanyUser);

        mockMvc.perform(post("/api/v1/company/internships/" + internshipId + "/close").with(asUser(otherCompanyUser)))
                .andExpect(status().isNotFound());

        Internship stillOpen = internshipRepository.findById(internshipId).orElseThrow();
        assertThat(stillOpen.getStatus()).isEqualTo(InternshipStatus.OPEN);
    }

    // 22. create accepts targetMajors
    @Test
    void createAcceptsTargetMajors() throws Exception {
        Map<String, Object> body = new HashMap<>(validCreateBody());
        body.put("targetMajors", List.of("Computer Science", "Computer Engineering"));

        mockMvc.perform(post("/api/v1/company/internships")
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.targetMajors.length()").value(2))
                .andExpect(jsonPath("$.targetMajors[0]").value("Computer Engineering"))
                .andExpect(jsonPath("$.targetMajors[1]").value("Computer Science"));
    }

    // 23. duplicate target majors normalized/deduplicated
    @Test
    void duplicateTargetMajorsNormalizedAndDeduplicated() throws Exception {
        Map<String, Object> body = new HashMap<>(validCreateBody());
        body.put("targetMajors", List.of("Computer Science", " computer science ", "Computer  Science", "  "));

        mockMvc.perform(post("/api/v1/company/internships")
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.targetMajors.length()").value(1))
                .andExpect(jsonPath("$.targetMajors[0]").value("Computer Science"));
    }

    // 24. PATCH omitted targetMajors preserves existing values
    @Test
    void patchOmittedTargetMajorsPreservesExistingValues() throws Exception {
        Map<String, Object> createBody = new HashMap<>(validCreateBody());
        createBody.put("targetMajors", List.of("Computer Science"));

        String createJson = mockMvc.perform(post("/api/v1/company/internships")
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(createBody)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        UUID internshipId = UUID.fromString(objectMapper.readTree(createJson).get("id").asText());

        mockMvc.perform(patch("/api/v1/company/internships/" + internshipId)
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("title", "Updated Title"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.targetMajors.length()").value(1))
                .andExpect(jsonPath("$.targetMajors[0]").value("Computer Science"));
    }

    // 25. PATCH supplied targetMajors replaces them
    @Test
    void patchSuppliedTargetMajorsReplacesExistingValues() throws Exception {
        Map<String, Object> createBody = new HashMap<>(validCreateBody());
        createBody.put("targetMajors", List.of("Computer Science", "Computer Engineering"));

        String createJson = mockMvc.perform(post("/api/v1/company/internships")
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(createBody)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        UUID internshipId = UUID.fromString(objectMapper.readTree(createJson).get("id").asText());

        mockMvc.perform(patch("/api/v1/company/internships/" + internshipId)
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("targetMajors", List.of("Software Engineering")))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.targetMajors.length()").value(1))
                .andExpect(jsonPath("$.targetMajors[0]").value("Software Engineering"));
    }
}
