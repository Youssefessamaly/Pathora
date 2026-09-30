package com.internplatform.internship;

import com.internplatform.companyprofile.CompanyProfile;
import com.internplatform.companyprofile.CompanyProfileRepository;
import com.internplatform.internprofile.AcademicLevel;
import com.internplatform.internprofile.InternProfile;
import com.internplatform.internprofile.InternProfileRepository;
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
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.Year;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class InternInternshipFeedControllerTest {

    @Autowired
    private MockMvc mockMvc;

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
    private SkillRepository skillRepository;

    private User internUser;
    private CompanyProfile companyProfile;

    @BeforeEach
    void setUp() {
        internUser = createUser(Role.INTERN);

        User companyUser = createUser(Role.COMPANY);
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

    private InternProfile createCompletedInternProfile(User user, String major, List<String> skillNames) {
        InternProfile profile = new InternProfile(user.getId());
        profile.setFirstName("Amina");
        profile.setLastName("Hassan");
        profile.setDateOfBirth(LocalDate.of(2001, 5, 10));
        profile.setPhoneNumber("+201012345678");
        profile.setInstitutionName("Cairo University");
        profile.setAcademicLevel(AcademicLevel.UNIVERSITY);
        profile.setAcademicYear((short) 3);
        profile.setMajor(major);
        profile.setExpectedGraduationYear((short) (Year.now().getValue() + 1));
        profile.setCareerInterests("Software engineering");
        profile.setSkills(skillsByNames(skillNames));
        profile.setOnboardingCompletedAt(OffsetDateTime.now(ZoneOffset.UTC));
        return internProfileRepository.saveAndFlush(profile);
    }

    private Set<Skill> skillsByNames(List<String> names) {
        Set<Skill> skills = new HashSet<>();
        for (String name : names) {
            skills.add(skillByName(name));
        }
        return skills;
    }

    private Skill skillByName(String name) {
        return skillRepository.findAllByOrderByNameAsc().stream()
                .filter(skill -> skill.getName().equals(name))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Seeded skill not found: " + name));
    }

    private Internship createInternship(
            List<String> requiredSkillNames,
            Set<String> targetMajors,
            LocalDate applicationDeadline,
            InternshipStatus status
    ) {
        Internship internship = new Internship(companyProfile.getId());
        internship.setTitle("Backend Engineering Intern");
        internship.setDescription("Work on our core platform.");
        internship.setLocation("Cairo, Egypt");
        internship.setWorkMode(WorkMode.HYBRID);
        internship.setApplicationDeadline(applicationDeadline);
        internship.setStatus(status);
        internship.setSkills(skillsByNames(requiredSkillNames));
        internship.setTargetMajors(targetMajors);
        return internshipRepository.saveAndFlush(internship);
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

    // 1. INTERN can access personalized internship feed
    @Test
    void internCanAccessPersonalizedFeed() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of("Java", "SQL"));
        createInternship(List.of("Java", "SQL"), Set.of("Computer Science"), LocalDate.now().plusDays(30), InternshipStatus.OPEN);

        mockMvc.perform(get("/api/v1/intern/internships").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].relevancePercentage").value(100));
    }

    // 2. COMPANY cannot access intern feed
    @Test
    void companyCannotAccessInternFeed() throws Exception {
        User companyUser = createUser(Role.COMPANY);

        mockMvc.perform(get("/api/v1/intern/internships").with(asUser(companyUser)))
                .andExpect(status().isForbidden());
    }

    // 3. intern without profile is rejected appropriately
    @Test
    void internWithoutProfileRejected() throws Exception {
        mockMvc.perform(get("/api/v1/intern/internships").with(asIntern()))
                .andExpect(status().isForbidden());
    }

    // 4. incomplete intern profile is rejected appropriately
    @Test
    void incompleteInternProfileRejected() throws Exception {
        InternProfile incomplete = new InternProfile(internUser.getId());
        incomplete.setFirstName("Amina");
        internProfileRepository.saveAndFlush(incomplete);

        mockMvc.perform(get("/api/v1/intern/internships").with(asIntern()))
                .andExpect(status().isForbidden());
    }

    // 5. CLOSED internships excluded
    @Test
    void closedInternshipsExcluded() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of("Java"));
        createInternship(List.of("Java"), Set.of(), LocalDate.now().plusDays(30), InternshipStatus.CLOSED);

        mockMvc.perform(get("/api/v1/intern/internships").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // 6. expired internships excluded
    @Test
    void expiredInternshipsExcluded() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of("Java"));
        createInternship(List.of("Java"), Set.of(), LocalDate.now().minusDays(1), InternshipStatus.OPEN);

        mockMvc.perform(get("/api/v1/intern/internships").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // 7. OPEN future-deadline internships included
    @Test
    void openFutureDeadlineIncluded() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of("Java"));
        createInternship(List.of("Java"), Set.of(), LocalDate.now().plusDays(1), InternshipStatus.OPEN);
        createInternship(List.of("Java"), Set.of(), LocalDate.now(), InternshipStatus.OPEN);

        mockMvc.perform(get("/api/v1/intern/internships").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    // 8. all required skills + major match = 100
    @Test
    void allSkillsAndMajorMatchGivesFullScore() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of("Java", "SQL"));
        createInternship(List.of("Java", "SQL"), Set.of("Computer Science"), LocalDate.now().plusDays(30), InternshipStatus.OPEN);

        mockMvc.perform(get("/api/v1/intern/internships").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].relevancePercentage").value(100))
                .andExpect(jsonPath("$[0].majorMatch").value(true));
    }

    // 9. no skills + major match = 30
    @Test
    void noSkillsButMajorMatchGivesThirty() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of());
        createInternship(List.of("Java", "SQL"), Set.of("Computer Science"), LocalDate.now().plusDays(30), InternshipStatus.OPEN);

        mockMvc.perform(get("/api/v1/intern/internships").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].relevancePercentage").value(30))
                .andExpect(jsonPath("$[0].matchedSkillCount").value(0));
    }

    // 10. all skills + no major match = 70
    @Test
    void allSkillsButNoMajorMatchGivesSeventy() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of("Java", "SQL"));
        createInternship(List.of("Java", "SQL"), Set.of("Business Administration"), LocalDate.now().plusDays(30), InternshipStatus.OPEN);

        mockMvc.perform(get("/api/v1/intern/internships").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].relevancePercentage").value(70))
                .andExpect(jsonPath("$[0].majorMatch").value(false));
    }

    // 11. partial skill match calculated correctly
    @Test
    void partialSkillMatchCalculatedCorrectly() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of("Java", "SQL", "Python"));
        createInternship(
                List.of("Java", "SQL", "Spring Boot", "Communication"),
                Set.of("Business Administration"),
                LocalDate.now().plusDays(30),
                InternshipStatus.OPEN
        );

        mockMvc.perform(get("/api/v1/intern/internships").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].relevancePercentage").value(35))
                .andExpect(jsonPath("$[0].matchedSkillCount").value(2))
                .andExpect(jsonPath("$[0].totalRequiredSkillCount").value(4));
    }

    // 12. no match = 0
    @Test
    void noMatchGivesZero() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of("Figma"));
        createInternship(List.of("Java", "SQL"), Set.of("Business Administration"), LocalDate.now().plusDays(30), InternshipStatus.OPEN);

        mockMvc.perform(get("/api/v1/intern/internships").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].relevancePercentage").value(0));
    }

    // 13. internship with no targetMajors handles safely
    @Test
    void internshipWithNoTargetMajorsHandlesSafely() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of("Java"));
        createInternship(List.of("Java"), Set.of(), LocalDate.now().plusDays(30), InternshipStatus.OPEN);

        mockMvc.perform(get("/api/v1/intern/internships").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].majorMatch").value(false))
                .andExpect(jsonPath("$[0].relevancePercentage").value(70))
                .andExpect(jsonPath("$[0].targetMajors").isEmpty());
    }

    // 14. higher relevance appears first
    @Test
    void higherRelevanceAppearsFirst() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of("Java", "SQL"));
        Internship lowMatch = createInternship(List.of("Java", "SQL", "Python", "Figma"), Set.of(), LocalDate.now().plusDays(30), InternshipStatus.OPEN);
        Internship highMatch = createInternship(List.of("Java", "SQL"), Set.of("Computer Science"), LocalDate.now().plusDays(30), InternshipStatus.OPEN);

        mockMvc.perform(get("/api/v1/intern/internships").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(highMatch.getId().toString()))
                .andExpect(jsonPath("$[1].id").value(lowMatch.getId().toString()));
    }

    // 15. equal relevance uses matched skill count
    @Test
    void equalRelevanceUsesMatchedSkillCountTiebreak() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of("Java", "SQL"));

        // 1/2 matched, major matches: skillScore=35 + majorScore=30 = 65, matchedSkillCount=1
        Internship fewerMatches = createInternship(
                List.of("Java", "Python"), Set.of("Computer Science"), LocalDate.now().plusDays(30), InternshipStatus.OPEN);
        // 2/4 matched, major matches: skillScore=35 + majorScore=30 = 65, matchedSkillCount=2
        Internship moreMatches = createInternship(
                List.of("Java", "SQL", "Python", "Figma"), Set.of("Computer Science"), LocalDate.now().plusDays(30), InternshipStatus.OPEN);

        mockMvc.perform(get("/api/v1/intern/internships").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(moreMatches.getId().toString()))
                .andExpect(jsonPath("$[0].relevancePercentage").value(65))
                .andExpect(jsonPath("$[1].id").value(fewerMatches.getId().toString()))
                .andExpect(jsonPath("$[1].relevancePercentage").value(65));
    }

    // 16. remaining tie uses newest createdAt first
    @Test
    void remainingTieUsesNewestCreatedAtFirst() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of("Java"));

        Internship older = createInternship(List.of("Java"), Set.of(), LocalDate.now().plusDays(30), InternshipStatus.OPEN);
        Thread.sleep(20);
        Internship newer = createInternship(List.of("Java"), Set.of(), LocalDate.now().plusDays(30), InternshipStatus.OPEN);

        mockMvc.perform(get("/api/v1/intern/internships").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(newer.getId().toString()))
                .andExpect(jsonPath("$[1].id").value(older.getId().toString()));
    }

    // 17. intern detail returns personalized relevance fields
    @Test
    void internDetailReturnsPersonalizedRelevanceFields() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of("Java", "SQL"));
        Internship internship = createInternship(
                List.of("Java", "SQL"), Set.of("Computer Science"), LocalDate.now().plusDays(30), InternshipStatus.OPEN);

        mockMvc.perform(get("/api/v1/intern/internships/" + internship.getId()).with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.relevancePercentage").value(100))
                .andExpect(jsonPath("$.matchedSkillCount").value(2))
                .andExpect(jsonPath("$.totalRequiredSkillCount").value(2))
                .andExpect(jsonPath("$.matchedSkills.length()").value(2))
                .andExpect(jsonPath("$.majorMatch").value(true))
                .andExpect(jsonPath("$.companyName").value("Pathora Technologies"));
    }

    // 18. unavailable CLOSED internship returns 404
    @Test
    void closedInternshipDetailReturns404() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of("Java"));
        Internship internship = createInternship(List.of("Java"), Set.of(), LocalDate.now().plusDays(30), InternshipStatus.CLOSED);

        mockMvc.perform(get("/api/v1/intern/internships/" + internship.getId()).with(asIntern()))
                .andExpect(status().isNotFound());
    }

    // 19. expired internship detail returns 404
    @Test
    void expiredInternshipDetailReturns404() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of("Java"));
        Internship internship = createInternship(List.of("Java"), Set.of(), LocalDate.now().minusDays(1), InternshipStatus.OPEN);

        mockMvc.perform(get("/api/v1/intern/internships/" + internship.getId()).with(asIntern()))
                .andExpect(status().isNotFound());
    }
}
