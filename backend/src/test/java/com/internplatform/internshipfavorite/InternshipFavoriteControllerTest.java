package com.internplatform.internshipfavorite;

import com.internplatform.companyprofile.ApprovalStatus;
import com.internplatform.companyprofile.CompanyProfile;
import com.internplatform.companyprofile.CompanyProfileRepository;
import com.internplatform.internprofile.AcademicLevel;
import com.internplatform.internprofile.InternProfile;
import com.internplatform.internprofile.InternProfileRepository;
import com.internplatform.internship.Internship;
import com.internplatform.internship.InternshipRepository;
import com.internplatform.internship.InternshipStatus;
import com.internplatform.internship.WorkMode;
import com.internplatform.user.Role;
import com.internplatform.user.User;
import com.internplatform.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
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
import java.util.Set;
import java.util.UUID;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class InternshipFavoriteControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private InternProfileRepository internProfileRepository;

    @Autowired
    private CompanyProfileRepository companyProfileRepository;

    @Autowired
    private InternshipRepository internshipRepository;

    @Autowired
    private InternshipFavoriteRepository favoriteRepository;

    private User internUser;
    private InternProfile internProfile;
    private CompanyProfile companyProfile;

    @BeforeEach
    void setUp() {
        internUser = createUser(Role.INTERN);
        internProfile = createCompletedInternProfile(internUser);
        companyProfile = createApprovedCompanyProfile(createUser(Role.COMPANY));
    }

    @Test
    void internCanFavoriteAndSeeInternshipInFavorites() throws Exception {
        Internship internship = createOpenInternship();

        mockMvc.perform(post("/api/v1/intern/favorites/" + internship.getId()).with(asUser(internUser)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/intern/favorites").with(asUser(internUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(internship.getId().toString()))
                .andExpect(jsonPath("$[0].favorited").value(true));

        mockMvc.perform(get("/api/v1/intern/internships").with(asUser(internUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].favorited").value(true));
    }

    @Test
    void removingFavoriteIsIdempotentAndUpdatesFeedState() throws Exception {
        Internship internship = createOpenInternship();

        mockMvc.perform(post("/api/v1/intern/favorites/" + internship.getId()).with(asUser(internUser)))
                .andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/v1/intern/favorites/" + internship.getId()).with(asUser(internUser)))
                .andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/v1/intern/favorites/" + internship.getId()).with(asUser(internUser)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/intern/favorites").with(asUser(internUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(get("/api/v1/intern/internships/" + internship.getId()).with(asUser(internUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.favorited").value(false));
    }

    @Test
    void addingSameFavoriteTwiceDoesNotCreateDuplicate() throws Exception {
        Internship internship = createOpenInternship();

        mockMvc.perform(post("/api/v1/intern/favorites/" + internship.getId()).with(asUser(internUser)))
                .andExpect(status().isNoContent());
        mockMvc.perform(post("/api/v1/intern/favorites/" + internship.getId()).with(asUser(internUser)))
                .andExpect(status().isNoContent());

        assertThat(favoriteRepository.findAllByInternProfileIdOrderByCreatedAtDesc(internProfile.getId())).hasSize(1);
    }

    @Test
    void favoritesArePrivateToAuthenticatedIntern() throws Exception {
        Internship internship = createOpenInternship();
        User otherIntern = createUser(Role.INTERN);
        createCompletedInternProfile(otherIntern);

        mockMvc.perform(post("/api/v1/intern/favorites/" + internship.getId()).with(asUser(internUser)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/intern/favorites").with(asUser(otherIntern)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void internCannotFavoriteClosedInternship() throws Exception {
        Internship internship = createOpenInternship();
        internship.setStatus(InternshipStatus.CLOSED);
        internshipRepository.saveAndFlush(internship);

        mockMvc.perform(post("/api/v1/intern/favorites/" + internship.getId()).with(asUser(internUser)))
                .andExpect(status().isNotFound());
    }

    @Test
    void companyCannotAccessInternFavorites() throws Exception {
        User companyUser = createUser(Role.COMPANY);

        mockMvc.perform(get("/api/v1/intern/favorites").with(asUser(companyUser)))
                .andExpect(status().isForbidden());
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

    private InternProfile createCompletedInternProfile(User user) {
        InternProfile profile = new InternProfile(user.getId());
        profile.setFirstName("Amina");
        profile.setLastName("Hassan");
        profile.setDateOfBirth(LocalDate.of(2001, 5, 10));
        profile.setPhoneNumber("+201012345678");
        profile.setInstitutionName("Cairo University");
        profile.setAcademicLevel(AcademicLevel.UNIVERSITY);
        profile.setAcademicYear((short) 3);
        profile.setMajor("Computer Science");
        profile.setExpectedGraduationYear((short) (Year.now().getValue() + 1));
        profile.setCareerInterests("Software engineering");
        profile.setOnboardingCompletedAt(OffsetDateTime.now(ZoneOffset.UTC));
        return internProfileRepository.saveAndFlush(profile);
    }

    private CompanyProfile createApprovedCompanyProfile(User user) {
        CompanyProfile profile = new CompanyProfile(user.getId());
        profile.setCompanyName("Pathora Technologies");
        profile.setIndustry("Software");
        profile.setCompanySize("11-50");
        profile.setLocation("Cairo, Egypt");
        profile.setDescription("We build tools that connect interns with great companies.");
        profile.setContactName("Sara Ahmed");
        profile.setContactPhone("+201012345678");
        profile.markOnboardingCompleted(OffsetDateTime.now(ZoneOffset.UTC));
        profile.recordApprovalDecision(ApprovalStatus.APPROVED, OffsetDateTime.now(ZoneOffset.UTC));
        return companyProfileRepository.saveAndFlush(profile);
    }

    private Internship createOpenInternship() {
        Internship internship = new Internship(companyProfile.getId());
        internship.setTitle("Backend Engineering Intern");
        internship.setDescription("Work on our core platform.");
        internship.setLocation("Cairo, Egypt");
        internship.setWorkMode(WorkMode.HYBRID);
        internship.setApplicationDeadline(LocalDate.now(ZoneOffset.UTC).plusDays(30));
        internship.setStatus(InternshipStatus.OPEN);
        internship.setSkills(Set.of());
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
}
