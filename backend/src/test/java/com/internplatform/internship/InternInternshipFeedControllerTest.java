package com.internplatform.internship;

import com.internplatform.companyprofile.ApprovalStatus;
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
        // This fixture represents an already-working, previously-trusted company (the pre-V15
        // state every existing account was backfilled to) — not a brand-new PENDING signup.
        profile.recordApprovalDecision(ApprovalStatus.APPROVED, OffsetDateTime.now(ZoneOffset.UTC));
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
        return createInternship(requiredSkillNames, targetMajors, applicationDeadline, status, null);
    }

    private Internship createInternship(
            List<String> requiredSkillNames,
            Set<String> targetMajors,
            LocalDate applicationDeadline,
            InternshipStatus status,
            Integer minimumAcademicYear
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
        internship.setMinimumAcademicYear(minimumAcademicYear);
        return internshipRepository.saveAndFlush(internship);
    }

    private Internship createExternalInternship(
            List<String> requiredSkillNames,
            Set<String> targetMajors,
            LocalDate applicationDeadline,
            InternshipStatus status,
            String externalApplicationUrl
    ) {
        Internship internship = createInternship(requiredSkillNames, targetMajors, applicationDeadline, status, null);
        internship.setApplicationMethod(ApplicationMethod.EXTERNAL);
        internship.setExternalApplicationUrl(externalApplicationUrl);
        return internshipRepository.saveAndFlush(internship);
    }

    private InternProfile createInternProfileWithAcademicStanding(
            User user,
            AcademicLevel academicLevel,
            Short academicYear,
            String major
    ) {
        InternProfile profile = new InternProfile(user.getId());
        profile.setFirstName("Amina");
        profile.setLastName("Hassan");
        profile.setDateOfBirth(LocalDate.of(2001, 5, 10));
        profile.setPhoneNumber("+201012345678");
        profile.setInstitutionName("Cairo University");
        profile.setAcademicLevel(academicLevel);
        profile.setAcademicYear(academicYear);
        profile.setMajor(major);
        profile.setExpectedGraduationYear((short) (Year.now().getValue() + 1));
        profile.setCareerInterests("Software engineering");
        profile.setSkills(skillsByNames(List.of("Java")));
        profile.setOnboardingCompletedAt(OffsetDateTime.now(ZoneOffset.UTC));
        return internProfileRepository.saveAndFlush(profile);
    }

    private CompanyProfile createApprovedCompanyProfile(User user, String companyName) {
        CompanyProfile profile = new CompanyProfile(user.getId());
        profile.setCompanyName(companyName);
        profile.setIndustry("Telecom");
        profile.setCompanySize("501-1000");
        profile.setLocation("Cairo, Egypt");
        profile.setDescription("A great place to intern.");
        profile.setContactName("Hiring Team");
        profile.setContactPhone("+201012345678");
        profile.markOnboardingCompleted(OffsetDateTime.now(ZoneOffset.UTC));
        profile.recordApprovalDecision(ApprovalStatus.APPROVED, OffsetDateTime.now(ZoneOffset.UTC));
        return companyProfileRepository.saveAndFlush(profile);
    }

    private Internship createInternshipFor(CompanyProfile owner, List<String> requiredSkillNames, LocalDate applicationDeadline) {
        Internship internship = new Internship(owner.getId());
        internship.setTitle("Backend Engineering Intern");
        internship.setDescription("Work on our core platform.");
        internship.setLocation("Cairo, Egypt");
        internship.setWorkMode(WorkMode.HYBRID);
        internship.setApplicationDeadline(applicationDeadline);
        internship.setStatus(InternshipStatus.OPEN);
        internship.setSkills(skillsByNames(requiredSkillNames));
        internship.setTargetMajors(Set.of());
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
        createInternship(List.of("Java", "SQL"), Set.of("Computer Science"), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN);

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
        createInternship(List.of("Java"), Set.of(), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.CLOSED);

        mockMvc.perform(get("/api/v1/intern/internships").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // 6. expired internships excluded
    @Test
    void expiredInternshipsExcluded() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of("Java"));
        createInternship(List.of("Java"), Set.of(), LocalDate.now(ZoneOffset.UTC).minusDays(1), InternshipStatus.OPEN);

        mockMvc.perform(get("/api/v1/intern/internships").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // 7. OPEN future-deadline internships included
    @Test
    void openFutureDeadlineIncluded() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of("Java"));
        createInternship(List.of("Java"), Set.of(), LocalDate.now(ZoneOffset.UTC).plusDays(1), InternshipStatus.OPEN);
        createInternship(List.of("Java"), Set.of(), LocalDate.now(ZoneOffset.UTC), InternshipStatus.OPEN);

        mockMvc.perform(get("/api/v1/intern/internships").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    // 8. all required skills + major match = 100
    @Test
    void allSkillsAndMajorMatchGivesFullScore() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of("Java", "SQL"));
        createInternship(List.of("Java", "SQL"), Set.of("Computer Science"), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN);

        mockMvc.perform(get("/api/v1/intern/internships").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].relevancePercentage").value(100))
                .andExpect(jsonPath("$[0].majorMatch").value(true));
    }

    // 9. no skills + major match = 30
    @Test
    void noSkillsButMajorMatchGivesThirty() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of());
        createInternship(List.of("Java", "SQL"), Set.of("Computer Science"), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN);

        mockMvc.perform(get("/api/v1/intern/internships").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].relevancePercentage").value(30))
                .andExpect(jsonPath("$[0].matchedSkillCount").value(0));
    }

    // 10. all skills + no major match = 70
    @Test
    void allSkillsButNoMajorMatchGivesSeventy() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of("Java", "SQL"));
        createInternship(List.of("Java", "SQL"), Set.of("Business Administration"), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN);

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
                LocalDate.now(ZoneOffset.UTC).plusDays(30),
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
        createInternship(List.of("Java", "SQL"), Set.of("Business Administration"), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN);

        mockMvc.perform(get("/api/v1/intern/internships").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].relevancePercentage").value(0));
    }

    // 13. internship with no targetMajors handles safely
    @Test
    void internshipWithNoTargetMajorsHandlesSafely() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of("Java"));
        createInternship(List.of("Java"), Set.of(), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN);

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
        Internship lowMatch = createInternship(List.of("Java", "SQL", "Python", "Figma"), Set.of(), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN);
        Internship highMatch = createInternship(List.of("Java", "SQL"), Set.of("Computer Science"), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN);

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
                List.of("Java", "Python"), Set.of("Computer Science"), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN);
        // 2/4 matched, major matches: skillScore=35 + majorScore=30 = 65, matchedSkillCount=2
        Internship moreMatches = createInternship(
                List.of("Java", "SQL", "Python", "Figma"), Set.of("Computer Science"), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN);

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

        Internship older = createInternship(List.of("Java"), Set.of(), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN);
        Thread.sleep(20);
        Internship newer = createInternship(List.of("Java"), Set.of(), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN);

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
                List.of("Java", "SQL"), Set.of("Computer Science"), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN);

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
        Internship internship = createInternship(List.of("Java"), Set.of(), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.CLOSED);

        mockMvc.perform(get("/api/v1/intern/internships/" + internship.getId()).with(asIntern()))
                .andExpect(status().isNotFound());
    }

    // 19. expired internship detail returns 404
    @Test
    void expiredInternshipDetailReturns404() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of("Java"));
        Internship internship = createInternship(List.of("Java"), Set.of(), LocalDate.now(ZoneOffset.UTC).minusDays(1), InternshipStatus.OPEN);

        mockMvc.perform(get("/api/v1/intern/internships/" + internship.getId()).with(asIntern()))
                .andExpect(status().isNotFound());
    }

    // 20. unrestricted internship appears for university intern
    @Test
    void unrestrictedInternshipAppearsForUniversityIntern() throws Exception {
        createInternProfileWithAcademicStanding(internUser, AcademicLevel.UNIVERSITY, (short) 2, "Computer Science");
        createInternship(List.of("Java"), Set.of(), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN, null);

        mockMvc.perform(get("/api/v1/intern/internships").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    // 21. minimum year 4 appears for year-4 intern
    @Test
    void minimumYearFourAppearsForYearFourIntern() throws Exception {
        createInternProfileWithAcademicStanding(internUser, AcademicLevel.UNIVERSITY, (short) 4, "Computer Science");
        createInternship(List.of("Java"), Set.of(), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN, 4);

        mockMvc.perform(get("/api/v1/intern/internships").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].minimumAcademicYear").value(4));
    }

    // 22. minimum year 4 appears for year-5 intern
    @Test
    void minimumYearFourAppearsForYearFiveIntern() throws Exception {
        createInternProfileWithAcademicStanding(internUser, AcademicLevel.UNIVERSITY, (short) 5, "Computer Science");
        createInternship(List.of("Java"), Set.of(), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN, 4);

        mockMvc.perform(get("/api/v1/intern/internships").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    // 23. minimum year 4 excluded for year-3 intern
    @Test
    void minimumYearFourExcludedForYearThreeIntern() throws Exception {
        createInternProfileWithAcademicStanding(internUser, AcademicLevel.UNIVERSITY, (short) 3, "Computer Science");
        createInternship(List.of("Java"), Set.of(), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN, 4);

        mockMvc.perform(get("/api/v1/intern/internships").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // 24. minimum year restriction excluded for HIGH_SCHOOL intern
    @Test
    void minimumYearRestrictionExcludesHighSchoolIntern() throws Exception {
        createInternProfileWithAcademicStanding(internUser, AcademicLevel.HIGH_SCHOOL, null, "N/A");
        createInternship(List.of("Java"), Set.of(), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN, 1);

        mockMvc.perform(get("/api/v1/intern/internships").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // 25. restricted internship detail unavailable for ineligible intern
    @Test
    void restrictedInternshipDetailUnavailableForIneligibleIntern() throws Exception {
        createInternProfileWithAcademicStanding(internUser, AcademicLevel.UNIVERSITY, (short) 2, "Computer Science");
        Internship internship = createInternship(
                List.of("Java"), Set.of(), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN, 4);

        mockMvc.perform(get("/api/v1/intern/internships/" + internship.getId()).with(asIntern()))
                .andExpect(status().isNotFound());
    }

    // 26. unrestricted detail still works
    @Test
    void unrestrictedInternshipDetailStillWorks() throws Exception {
        createInternProfileWithAcademicStanding(internUser, AcademicLevel.UNIVERSITY, (short) 1, "Computer Science");
        Internship internship = createInternship(
                List.of("Java"), Set.of(), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN, null);

        mockMvc.perform(get("/api/v1/intern/internships/" + internship.getId()).with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(internship.getId().toString()));
    }

    // 27. relevance score remains unchanged by academic-year requirement
    @Test
    void relevanceScoreUnchangedByAcademicYearRequirement() throws Exception {
        createInternProfileWithAcademicStanding(internUser, AcademicLevel.UNIVERSITY, (short) 4, "Computer Science");
        Internship restricted = createInternship(
                List.of("Java"), Set.of("Computer Science"), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN, 4);

        mockMvc.perform(get("/api/v1/intern/internships/" + restricted.getId()).with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.relevancePercentage").value(100))
                .andExpect(jsonPath("$.matchedSkillCount").value(1))
                .andExpect(jsonPath("$.majorMatch").value(true));
    }

    // 28. profile-selected skill + CV skill are unioned for ranking
    // 10. major score (the 30-point component) is correctly unaffected when combined with
    //     CV-sourced skills — still adds exactly 30 on top of the union-based skillScore.
    @Test
    void profileAndCvSkillsAreUnionedForMatching() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser, "Computer Science", List.of("Java"));
        profile.setCvDetectedSkills(skillsByNames(List.of("SQL")));
        internProfileRepository.saveAndFlush(profile);

        Internship internship = createInternship(
                List.of("Java", "SQL"), Set.of("Computer Science"), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN);

        mockMvc.perform(get("/api/v1/intern/internships/" + internship.getId()).with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.matchedSkillCount").value(2))
                .andExpect(jsonPath("$.majorMatch").value(true))
                .andExpect(jsonPath("$.relevancePercentage").value(100));
    }

    // 29. duplicate skill in profile and CV counts once
    @Test
    void duplicateSkillInProfileAndCvCountsOnce() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser, "Computer Science", List.of("Java"));
        // Same skill explicitly selected AND detected from the CV — must not double-count.
        profile.setCvDetectedSkills(skillsByNames(List.of("Java")));
        internProfileRepository.saveAndFlush(profile);

        Internship internship = createInternship(
                List.of("Java"), Set.of(), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN);

        mockMvc.perform(get("/api/v1/intern/internships/" + internship.getId()).with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.matchedSkillCount").value(1))
                .andExpect(jsonPath("$.totalRequiredSkillCount").value(1))
                .andExpect(jsonPath("$.relevancePercentage").value(70));
    }

    // 9. CV-only skill can increase matchedSkillCount/relevance (feed-level view)
    @Test
    void cvOnlySkillIncreasesMatchedCountAndRelevance() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser, "Computer Science", List.of());
        profile.setCvDetectedSkills(skillsByNames(List.of("Java")));
        internProfileRepository.saveAndFlush(profile);

        createInternship(List.of("Java"), Set.of(), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN);

        mockMvc.perform(get("/api/v1/intern/internships").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].matchedSkillCount").value(1))
                .andExpect(jsonPath("$[0].relevancePercentage").value(70));
    }

    // 10 & 11. major score and academic-year eligibility remain unchanged by CV skills
    @Test
    void majorScoreAndAcademicYearEligibilityUnaffectedByCvSkills() throws Exception {
        InternProfile profile = createInternProfileWithAcademicStanding(
                internUser, AcademicLevel.UNIVERSITY, (short) 3, "Computer Science");
        profile.setCvDetectedSkills(skillsByNames(List.of("SQL")));
        internProfileRepository.saveAndFlush(profile);

        // Restricted to year 4+: a year-3 intern must still be excluded regardless of CV skills.
        createInternship(List.of("Java", "SQL"), Set.of("Computer Science"), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN, 4);

        mockMvc.perform(get("/api/v1/intern/internships").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // 13. another intern cannot affect/access these CV-derived skills
    @Test
    void anotherInternCvSkillsDoNotLeakToOtherInterns() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of());

        User otherInternUser = createUser(Role.INTERN);
        InternProfile otherProfile = createCompletedInternProfile(otherInternUser, "Computer Science", List.of());
        otherProfile.setCvDetectedSkills(skillsByNames(List.of("Java")));
        internProfileRepository.saveAndFlush(otherProfile);

        Internship internship = createInternship(
                List.of("Java"), Set.of(), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN);

        // The authenticated intern (no CV skills of their own) must not see the other
        // intern's CV-detected "Java" reflected in their own match.
        mockMvc.perform(get("/api/v1/intern/internships/" + internship.getId()).with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.matchedSkillCount").value(0))
                .andExpect(jsonPath("$.relevancePercentage").value(0));

        mockMvc.perform(get("/api/v1/intern/internships/" + internship.getId()).with(asUser(otherInternUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.matchedSkillCount").value(1))
                .andExpect(jsonPath("$.relevancePercentage").value(70));
    }

    // 12. ranking order legitimately changes where the effective skill match changes it
    @Test
    void cvSkillLegitimatelyChangesRankOrder() throws Exception {
        InternProfile profile = createCompletedInternProfile(internUser, "Computer Science", List.of("Java"));
        profile.setCvDetectedSkills(skillsByNames(List.of("SQL", "Python")));
        internProfileRepository.saveAndFlush(profile);

        // 1/1 profile-only match -> 70% without CV skills.
        Internship profileOnlyMatch = createInternship(
                List.of("Java"), Set.of(), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN);
        // 3/3 matched once CV skills are unioned in -> 70% as well, but with a higher
        // matchedSkillCount, so it must now rank first on the tiebreak.
        Internship cvBoostedMatch = createInternship(
                List.of("Java", "SQL", "Python"), Set.of(), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN);

        mockMvc.perform(get("/api/v1/intern/internships").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(cvBoostedMatch.getId().toString()))
                .andExpect(jsonPath("$[0].matchedSkillCount").value(3))
                .andExpect(jsonPath("$[1].id").value(profileOnlyMatch.getId().toString()))
                .andExpect(jsonPath("$[1].matchedSkillCount").value(1));
    }

    // 30. intern feed exposes applicationMethod/externalApplicationUrl for INTERNAL internships
    @Test
    void internFeedExposesInternalApplicationMethod() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of("Java"));
        createInternship(List.of("Java"), Set.of(), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN);

        mockMvc.perform(get("/api/v1/intern/internships").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].applicationMethod").value("INTERNAL"))
                .andExpect(jsonPath("$[0].externalApplicationUrl").doesNotExist());
    }

    // 31. intern feed/detail expose applicationMethod/externalApplicationUrl for EXTERNAL internships
    @Test
    void internFeedAndDetailExposeExternalApplicationMethodAndUrl() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of("Java"));
        Internship internship = createExternalInternship(
                List.of("Java"), Set.of(), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN,
                "https://careers.example.com/apply");

        mockMvc.perform(get("/api/v1/intern/internships").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].applicationMethod").value("EXTERNAL"))
                .andExpect(jsonPath("$[0].externalApplicationUrl").value("https://careers.example.com/apply"));

        mockMvc.perform(get("/api/v1/intern/internships/" + internship.getId()).with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.applicationMethod").value("EXTERNAL"))
                .andExpect(jsonPath("$.externalApplicationUrl").value("https://careers.example.com/apply"));
    }

    // 32. applicationMethod/externalApplicationUrl never influence relevance scoring
    @Test
    void applicationMethodNeverAffectsRelevanceScoring() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of("Java", "SQL"));
        Internship external = createExternalInternship(
                List.of("Java", "SQL"), Set.of("Computer Science"), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN,
                "https://careers.example.com/apply");

        mockMvc.perform(get("/api/v1/intern/internships/" + external.getId()).with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.relevancePercentage").value(100))
                .andExpect(jsonPath("$.matchedSkillCount").value(2))
                .andExpect(jsonPath("$.majorMatch").value(true));
    }

    // ===== SEARCH =====

    // 33. no search query preserves existing behavior
    @Test
    void noSearchQueryPreservesExistingBehavior() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of("Java"));
        createInternship(List.of("Java"), Set.of(), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN);

        mockMvc.perform(get("/api/v1/intern/internships").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    // 34. blank search query (?search=) preserves existing behavior
    @Test
    void blankSearchQueryPreservesExistingBehavior() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of("Java"));
        createInternship(List.of("Java"), Set.of(), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN);

        mockMvc.perform(get("/api/v1/intern/internships").queryParam("search", "").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    // 35. title search matches
    @Test
    void titleSearchMatches() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of("Java"));

        Internship javaInternship = createInternship(
                List.of("Java"), Set.of(), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN);
        javaInternship.setTitle("Java Backend Intern");
        internshipRepository.saveAndFlush(javaInternship);

        // Deliberately a skill with no "java" in its name anywhere — otherwise this would also
        // match via skill search (correctly) and defeat the point of this title-only case.
        Internship marketingInternship = createInternship(
                List.of("Communication"), Set.of(), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN);
        marketingInternship.setTitle("Marketing Intern");
        internshipRepository.saveAndFlush(marketingInternship);

        mockMvc.perform(get("/api/v1/intern/internships").queryParam("search", "java").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(javaInternship.getId().toString()))
                .andExpect(jsonPath("$[0].title").value("Java Backend Intern"));
    }

    // 36. company name search
    @Test
    void companyNameSearchMatches() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of("Java"));

        User vodafoneUser = createUser(Role.COMPANY);
        CompanyProfile vodafone = createApprovedCompanyProfile(vodafoneUser, "Vodafone Egypt");
        Internship vodafoneInternship =
                createInternshipFor(vodafone, List.of("Java"), LocalDate.now(ZoneOffset.UTC).plusDays(30));

        // A second, unrelated internship from the default "Pathora Technologies" company.
        createInternship(List.of("Java"), Set.of(), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN);

        mockMvc.perform(get("/api/v1/intern/internships").queryParam("search", "vodafone").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(vodafoneInternship.getId().toString()))
                .andExpect(jsonPath("$[0].companyName").value("Vodafone Egypt"));
    }

    // 37. location search
    @Test
    void locationSearchMatches() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of("Java"));

        // Default location is "Cairo, Egypt" (see createInternship).
        Internship cairoInternship = createInternship(
                List.of("Java"), Set.of(), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN);

        Internship alexandriaInternship = createInternship(
                List.of("Java"), Set.of(), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN);
        alexandriaInternship.setLocation("Alexandria, Egypt");
        internshipRepository.saveAndFlush(alexandriaInternship);

        mockMvc.perform(get("/api/v1/intern/internships").queryParam("search", "cairo").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(cairoInternship.getId().toString()));
    }

    // 38. skill search
    @Test
    void skillSearchMatches() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of("Java", "Spring Boot"));

        Internship springInternship = createInternship(
                List.of("Spring Boot"), Set.of(), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN);
        createInternship(List.of("Java"), Set.of(), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN);

        mockMvc.perform(get("/api/v1/intern/internships").queryParam("search", "spring").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(springInternship.getId().toString()));
    }

    // 39. case-insensitive search
    @Test
    void searchIsCaseInsensitive() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of("Java"));

        Internship internship = createInternship(
                List.of("Java"), Set.of(), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN);
        internship.setTitle("Java Backend Intern");
        internshipRepository.saveAndFlush(internship);

        mockMvc.perform(get("/api/v1/intern/internships").queryParam("search", "JAVA").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    // 40. leading/trailing whitespace is trimmed
    @Test
    void searchTrimsWhitespace() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of("Java"));

        Internship internship = createInternship(
                List.of("Java"), Set.of(), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN);
        internship.setTitle("Java Backend Intern");
        internshipRepository.saveAndFlush(internship);

        mockMvc.perform(get("/api/v1/intern/internships").queryParam("search", "  java  ").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    // 41. no match returns an empty list, not an error
    @Test
    void noMatchReturnsEmptyList() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of("Java"));
        createInternship(List.of("Java"), Set.of(), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN);

        mockMvc.perform(get("/api/v1/intern/internships").queryParam("search", "nonexistentxyz").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // 42. ineligible internships remain hidden even when their text matches the search
    @Test
    void ineligibleInternshipsRemainHiddenFromSearch() throws Exception {
        createInternProfileWithAcademicStanding(internUser, AcademicLevel.UNIVERSITY, (short) 2, "Computer Science");

        Internship internship = createInternship(
                List.of("Java"), Set.of(), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.OPEN, 4);
        internship.setTitle("Java Backend Intern");
        internshipRepository.saveAndFlush(internship);

        mockMvc.perform(get("/api/v1/intern/internships").queryParam("search", "java").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // 43. internships belonging to unapproved companies remain hidden — from the plain feed,
    //     from search, and from the detail endpoint — exactly like a nonexistent internship.
    @Test
    void unapprovedCompanyInternshipsRemainHidden() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of("Java"));

        User pendingCompanyUser = createUser(Role.COMPANY);
        CompanyProfile pendingCompany = new CompanyProfile(pendingCompanyUser.getId());
        pendingCompany.setCompanyName("Shady Startup");
        companyProfileRepository.saveAndFlush(pendingCompany); // PENDING by default — never approved.

        Internship internship = new Internship(pendingCompany.getId());
        internship.setTitle("Java Backend Intern");
        internship.setDescription("Work on our core platform.");
        internship.setLocation("Cairo, Egypt");
        internship.setWorkMode(WorkMode.HYBRID);
        internship.setApplicationDeadline(LocalDate.now(ZoneOffset.UTC).plusDays(30));
        internship.setStatus(InternshipStatus.OPEN);
        internship.setSkills(skillsByNames(List.of("Java")));
        internship.setTargetMajors(Set.of());
        internshipRepository.saveAndFlush(internship);

        mockMvc.perform(get("/api/v1/intern/internships").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(get("/api/v1/intern/internships").queryParam("search", "java").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(get("/api/v1/intern/internships/" + internship.getId()).with(asIntern()))
                .andExpect(status().isNotFound());
    }

    // 44. CLOSED/expired internships follow the same visibility rules under search as the
    //     normal listing — excluded regardless of whether their text matches the search.
    @Test
    void closedAndExpiredInternshipsRemainHiddenFromSearch() throws Exception {
        createCompletedInternProfile(internUser, "Computer Science", List.of("Java"));

        Internship closed = createInternship(
                List.of("Java"), Set.of(), LocalDate.now(ZoneOffset.UTC).plusDays(30), InternshipStatus.CLOSED);
        closed.setTitle("Java Backend Intern (Closed)");
        internshipRepository.saveAndFlush(closed);

        Internship expired = createInternship(
                List.of("Java"), Set.of(), LocalDate.now(ZoneOffset.UTC).minusDays(1), InternshipStatus.OPEN);
        expired.setTitle("Java Backend Intern (Expired)");
        internshipRepository.saveAndFlush(expired);

        mockMvc.perform(get("/api/v1/intern/internships").queryParam("search", "java").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }
}
