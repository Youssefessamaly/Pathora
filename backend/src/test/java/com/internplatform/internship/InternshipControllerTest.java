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
        body.put("applicationMethod", "INTERNAL");
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

    // 26. create persists minimumAcademicYear
    @Test
    void createPersistsMinimumAcademicYear() throws Exception {
        Map<String, Object> body = new HashMap<>(validCreateBody());
        body.put("minimumAcademicYear", 4);

        mockMvc.perform(post("/api/v1/company/internships")
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.minimumAcademicYear").value(4));
    }

    // 27. PATCH changes minimumAcademicYear
    // 28. PATCH omission preserves minimumAcademicYear
    @Test
    void patchChangesMinimumAcademicYearAndOmissionPreservesIt() throws Exception {
        Map<String, Object> createBody = new HashMap<>(validCreateBody());
        createBody.put("minimumAcademicYear", 3);

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
                        .content(toJson(Map.of("minimumAcademicYear", 5))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.minimumAcademicYear").value(5));

        // Omitting the field on a subsequent PATCH must leave the previously-set value unchanged.
        mockMvc.perform(patch("/api/v1/company/internships/" + internshipId)
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("title", "Updated Title Only"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Updated Title Only"))
                .andExpect(jsonPath("$.minimumAcademicYear").value(5));
    }

    // 29. PATCH explicit null removes restriction
    @Test
    void patchExplicitNullRemovesMinimumAcademicYearRestriction() throws Exception {
        Map<String, Object> createBody = new HashMap<>(validCreateBody());
        createBody.put("minimumAcademicYear", 4);

        String createJson = mockMvc.perform(post("/api/v1/company/internships")
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(createBody)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        UUID internshipId = UUID.fromString(objectMapper.readTree(createJson).get("id").asText());

        Map<String, Object> clearBody = new HashMap<>();
        clearBody.put("minimumAcademicYear", null);

        mockMvc.perform(patch("/api/v1/company/internships/" + internshipId)
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(clearBody)))
                .andExpect(status().isOk());

        Internship updated = internshipRepository.findById(internshipId).orElseThrow();
        assertThat(updated.getMinimumAcademicYear()).isNull();
    }

    // PATCH with a non-numeric minimumAcademicYear is rejected, and does not change the
    // previously-set value.
    @Test
    void patchNonNumericMinimumAcademicYearRejected() throws Exception {
        Map<String, Object> createBody = new HashMap<>(validCreateBody());
        createBody.put("minimumAcademicYear", 4);

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
                        .content(toJson(Map.of("minimumAcademicYear", "five"))))
                .andExpect(status().isBadRequest());

        Internship unchanged = internshipRepository.findById(internshipId).orElseThrow();
        assertThat(unchanged.getMinimumAcademicYear()).isEqualTo(4);
    }

    // PATCH with an out-of-range minimumAcademicYear (0 or 7) is rejected.
    @Test
    void patchOutOfRangeMinimumAcademicYearRejected() throws Exception {
        UUID internshipId = createInternship(companyUser);

        mockMvc.perform(patch("/api/v1/company/internships/" + internshipId)
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("minimumAcademicYear", 0))))
                .andExpect(status().isBadRequest());

        mockMvc.perform(patch("/api/v1/company/internships/" + internshipId)
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("minimumAcademicYear", 7))))
                .andExpect(status().isBadRequest());

        Internship unchanged = internshipRepository.findById(internshipId).orElseThrow();
        assertThat(unchanged.getMinimumAcademicYear()).isNull();
    }

    // 30. invalid create year 0 rejected
    @Test
    void invalidCreateMinimumAcademicYearZeroRejected() throws Exception {
        Map<String, Object> body = new HashMap<>(validCreateBody());
        body.put("minimumAcademicYear", 0);

        mockMvc.perform(post("/api/v1/company/internships")
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(body)))
                .andExpect(status().isBadRequest());
    }

    // 31. invalid create year 7 rejected
    @Test
    void invalidCreateMinimumAcademicYearSevenRejected() throws Exception {
        Map<String, Object> body = new HashMap<>(validCreateBody());
        body.put("minimumAcademicYear", 7);

        mockMvc.perform(post("/api/v1/company/internships")
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(body)))
                .andExpect(status().isBadRequest());
    }

    // ===== Application method (INTERNAL vs EXTERNAL) =====

    // 32. CREATE: INTERNAL without URL succeeds, and the response exposes both fields
    @Test
    void createInternalWithoutUrlSucceeds() throws Exception {
        mockMvc.perform(post("/api/v1/company/internships")
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(validCreateBody())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.applicationMethod").value("INTERNAL"))
                .andExpect(jsonPath("$.externalApplicationUrl").doesNotExist());
    }

    // 33. CREATE: INTERNAL with a URL supplied is rejected
    @Test
    void createInternalWithUrlRejected() throws Exception {
        Map<String, Object> body = new HashMap<>(validCreateBody());
        body.put("applicationMethod", "INTERNAL");
        body.put("externalApplicationUrl", "https://careers.example.com/apply");

        mockMvc.perform(post("/api/v1/company/internships")
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(body)))
                .andExpect(status().isBadRequest());
    }

    // 34. CREATE: EXTERNAL with a valid HTTPS URL succeeds, trimmed and exposed in the response
    @Test
    void createExternalWithValidHttpsUrlSucceeds() throws Exception {
        Map<String, Object> body = new HashMap<>(validCreateBody());
        body.put("applicationMethod", "EXTERNAL");
        body.put("externalApplicationUrl", "  https://careers.example.com/apply  ");

        mockMvc.perform(post("/api/v1/company/internships")
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.applicationMethod").value("EXTERNAL"))
                .andExpect(jsonPath("$.externalApplicationUrl").value("https://careers.example.com/apply"));
    }

    // 35. CREATE: EXTERNAL without a URL is rejected
    @Test
    void createExternalWithoutUrlRejected() throws Exception {
        Map<String, Object> body = new HashMap<>(validCreateBody());
        body.put("applicationMethod", "EXTERNAL");

        mockMvc.perform(post("/api/v1/company/internships")
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(body)))
                .andExpect(status().isBadRequest());
    }

    // 36. CREATE: EXTERNAL with a structurally invalid URL is rejected
    @Test
    void createExternalWithInvalidUrlRejected() throws Exception {
        Map<String, Object> body = new HashMap<>(validCreateBody());
        body.put("applicationMethod", "EXTERNAL");
        body.put("externalApplicationUrl", "not a url");

        mockMvc.perform(post("/api/v1/company/internships")
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(body)))
                .andExpect(status().isBadRequest());
    }

    // 37. CREATE: a dangerous/non-http(s) scheme is rejected
    @Test
    void createExternalWithJavascriptSchemeRejected() throws Exception {
        Map<String, Object> body = new HashMap<>(validCreateBody());
        body.put("applicationMethod", "EXTERNAL");
        body.put("externalApplicationUrl", "javascript:alert(1)");

        mockMvc.perform(post("/api/v1/company/internships")
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(body)))
                .andExpect(status().isBadRequest());
    }

    // 38. CREATE without an applicationMethod at all is rejected (now required)
    @Test
    void createWithoutApplicationMethodRejected() throws Exception {
        Map<String, Object> body = new HashMap<>(validCreateBody());
        body.remove("applicationMethod");

        mockMvc.perform(post("/api/v1/company/internships")
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(body)))
                .andExpect(status().isBadRequest());
    }

    private UUID createExternalInternship(String url) throws Exception {
        Map<String, Object> body = new HashMap<>(validCreateBody());
        body.put("applicationMethod", "EXTERNAL");
        body.put("externalApplicationUrl", url);

        String json = mockMvc.perform(post("/api/v1/company/internships")
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(body)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        return UUID.fromString(objectMapper.readTree(json).get("id").asText());
    }

    // 39. PATCH: INTERNAL -> EXTERNAL with a URL succeeds
    @Test
    void patchInternalToExternalWithUrlSucceeds() throws Exception {
        UUID internshipId = createInternship(companyUser);

        mockMvc.perform(patch("/api/v1/company/internships/" + internshipId)
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of(
                                "applicationMethod", "EXTERNAL",
                                "externalApplicationUrl", "https://careers.example.com/apply"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.applicationMethod").value("EXTERNAL"))
                .andExpect(jsonPath("$.externalApplicationUrl").value("https://careers.example.com/apply"));
    }

    // 40. PATCH: INTERNAL -> EXTERNAL without supplying a URL is rejected, and nothing changes
    @Test
    void patchInternalToExternalWithoutUrlRejected() throws Exception {
        UUID internshipId = createInternship(companyUser);

        mockMvc.perform(patch("/api/v1/company/internships/" + internshipId)
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("applicationMethod", "EXTERNAL"))))
                .andExpect(status().isBadRequest());

        Internship unchanged = internshipRepository.findById(internshipId).orElseThrow();
        assertThat(unchanged.getApplicationMethod()).isEqualTo(ApplicationMethod.INTERNAL);
        assertThat(unchanged.getExternalApplicationUrl()).isNull();
    }

    // 41. PATCH: replacing an EXTERNAL internship's URL succeeds
    @Test
    void patchExternalUrlReplacementSucceeds() throws Exception {
        UUID internshipId = createExternalInternship("https://careers.example.com/apply");

        mockMvc.perform(patch("/api/v1/company/internships/" + internshipId)
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("externalApplicationUrl", "https://jobs.example.com/new-role"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.applicationMethod").value("EXTERNAL"))
                .andExpect(jsonPath("$.externalApplicationUrl").value("https://jobs.example.com/new-role"));
    }

    // 42. PATCH: an invalid replacement URL is rejected, and the previous URL is preserved
    @Test
    void patchExternalUrlReplacementWithInvalidUrlRejected() throws Exception {
        UUID internshipId = createExternalInternship("https://careers.example.com/apply");

        mockMvc.perform(patch("/api/v1/company/internships/" + internshipId)
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("externalApplicationUrl", "ftp://example.com/apply"))))
                .andExpect(status().isBadRequest());

        Internship unchanged = internshipRepository.findById(internshipId).orElseThrow();
        assertThat(unchanged.getExternalApplicationUrl()).isEqualTo("https://careers.example.com/apply");
    }

    // 43. PATCH: EXTERNAL -> INTERNAL (method only) clears the URL safely
    @Test
    void patchExternalToInternalClearsUrl() throws Exception {
        UUID internshipId = createExternalInternship("https://careers.example.com/apply");

        mockMvc.perform(patch("/api/v1/company/internships/" + internshipId)
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("applicationMethod", "INTERNAL"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.applicationMethod").value("INTERNAL"))
                .andExpect(jsonPath("$.externalApplicationUrl").doesNotExist());

        Internship updated = internshipRepository.findById(internshipId).orElseThrow();
        assertThat(updated.getApplicationMethod()).isEqualTo(ApplicationMethod.INTERNAL);
        assertThat(updated.getExternalApplicationUrl()).isNull();
    }

    // 44. PATCH: an unrelated field change preserves the existing method + URL
    @Test
    void patchUnrelatedFieldPreservesApplicationMethodAndUrl() throws Exception {
        UUID internshipId = createExternalInternship("https://careers.example.com/apply");

        mockMvc.perform(patch("/api/v1/company/internships/" + internshipId)
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("title", "Updated Title Only"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Updated Title Only"))
                .andExpect(jsonPath("$.applicationMethod").value("EXTERNAL"))
                .andExpect(jsonPath("$.externalApplicationUrl").value("https://careers.example.com/apply"));
    }

    // 45. PATCH: INTERNAL + a non-blank URL supplied without changing method is rejected
    @Test
    void patchInternalWithSuppliedNonBlankUrlRejected() throws Exception {
        UUID internshipId = createInternship(companyUser);

        mockMvc.perform(patch("/api/v1/company/internships/" + internshipId)
                        .with(asCompany())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(Map.of("externalApplicationUrl", "https://careers.example.com/apply"))))
                .andExpect(status().isBadRequest());

        Internship unchanged = internshipRepository.findById(internshipId).orElseThrow();
        assertThat(unchanged.getExternalApplicationUrl()).isNull();
    }

    // 46. GET list/detail expose applicationMethod/externalApplicationUrl for the owning company
    @Test
    void companyGetExposesApplicationMethodAndUrl() throws Exception {
        UUID internshipId = createExternalInternship("https://careers.example.com/apply");

        mockMvc.perform(get("/api/v1/company/internships/" + internshipId).with(asCompany()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.applicationMethod").value("EXTERNAL"))
                .andExpect(jsonPath("$.externalApplicationUrl").value("https://careers.example.com/apply"));

        mockMvc.perform(get("/api/v1/company/internships").with(asCompany()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].applicationMethod").value("EXTERNAL"))
                .andExpect(jsonPath("$[0].externalApplicationUrl").value("https://careers.example.com/apply"));
    }
}
