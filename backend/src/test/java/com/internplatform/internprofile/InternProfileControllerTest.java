package com.internplatform.internprofile;

import com.internplatform.user.Role;
import com.internplatform.user.User;
import com.internplatform.user.UserRepository;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class InternProfileControllerTest {

    @TempDir
    static Path cvStorageDir;

    @DynamicPropertySource
    static void overrideCvStorageDirectory(DynamicPropertyRegistry registry) {
        registry.add("app.cv-storage.directory", () -> cvStorageDir.toString());
    }

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

    /**
     * Regression test for a LazyInitializationException on GET /intern/profile: the class-level
     * {@code @Transactional} normally keeps one Hibernate session open for the whole test, which
     * would mask this bug (each mockMvc.perform() call would just join that same session). Running
     * this one test non-transactionally forces each request to open and close its own transaction,
     * exactly like real request handling, so the fetch-then-detach bug actually reproduces without
     * the fix in InternProfileService.getProfile(). The intern user this test creates is cleaned up
     * explicitly since it is not covered by the usual test-transaction rollback.
     */
    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void getProfileWithSkillsDoesNotThrowLazyInitializationException() throws Exception {
        try {
            Skill skill = skillRepository.findAllByOrderByNameAsc().get(0);

            mockMvc.perform(patch("/api/v1/intern/profile")
                            .with(asIntern())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(toJson(Map.of("skillIds", List.of(skill.getId().toString())))))
                    .andExpect(status().isOk());

            mockMvc.perform(get("/api/v1/intern/profile").with(asIntern()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.skills", hasSize(1)))
                    .andExpect(jsonPath("$.skills[0].id").value(skill.getId().toString()))
                    .andExpect(jsonPath("$.skills[0].name").value(skill.getName()));
        } finally {
            userRepository.delete(internUser);
        }
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
    void companyCanAlsoAccessSkillsEndpoint() throws Exception {
        User companyUser = userRepository.saveAndFlush(
                new User(
                        "company-" + UUID.randomUUID() + "@example.test",
                        passwordEncoder.encode("Password123!"),
                        Role.COMPANY
                )
        );

        mockMvc.perform(get("/api/v1/intern/skills").with(asUser(companyUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(12)));
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

    /**
     * Builds a genuinely loadable PDF (not just bytes with the right magic header) so tests
     * exercise the real PDFBox-based text extraction path. Each argument becomes its own
     * line in the content stream, letting tests simulate a skill name wrapping across lines
     * (e.g. "Spring" / "Boot") the way a real CV layout might.
     */
    private static byte[] createPdfWithLines(String... lines) throws IOException {
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage();
            document.addPage(page);

            try (PDPageContentStream stream = new PDPageContentStream(document, page)) {
                stream.beginText();
                stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                stream.newLineAtOffset(50, 700);
                for (int i = 0; i < lines.length; i++) {
                    if (i > 0) {
                        stream.newLineAtOffset(0, -14);
                    }
                    stream.showText(lines[i]);
                }
                stream.endText();
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            document.save(out);
            return out.toByteArray();
        }
    }

    private static byte[] validPdfBytes() throws IOException {
        return createPdfWithLines("Experienced software engineer.");
    }

    /** Has the correct "%PDF-" signature (passes the cheap header check) but is not a
     * structurally valid, parseable PDF — exercises the text-extraction failure path. */
    private static byte[] structurallyInvalidPdfBytes() {
        return "%PDF-1.4\nthis is not a real PDF body\n%%EOF".getBytes(StandardCharsets.US_ASCII);
    }

    @Test
    void internUploadsValidPdfSuccessfully() throws Exception {
        patchProfile(Map.of("firstName", "Amina"));

        byte[] pdf = validPdfBytes();

        mockMvc.perform(multipart(HttpMethod.POST, "/api/v1/intern/profile/cv")
                        .file(new MockMultipartFile("file", "resume.pdf", "application/pdf", pdf))
                        .with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fileName").value("resume.pdf"))
                .andExpect(jsonPath("$.contentType").value("application/pdf"))
                .andExpect(jsonPath("$.sizeBytes").value(pdf.length))
                .andExpect(jsonPath("$.uploadedAt").exists())
                .andExpect(jsonPath("$.storageKey").doesNotExist())
                .andExpect(jsonPath("$.filePath").doesNotExist());
    }

    @Test
    void profileReflectsUploadedCvMetadata() throws Exception {
        patchProfile(Map.of("firstName", "Amina"));

        mockMvc.perform(multipart(HttpMethod.POST, "/api/v1/intern/profile/cv")
                        .file(new MockMultipartFile("file", "resume.pdf", "application/pdf", validPdfBytes()))
                        .with(asIntern()))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/intern/profile").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cvFileName").value("resume.pdf"))
                .andExpect(jsonPath("$.cvUploadedAt").exists());
    }

    @Test
    void emptyCvFileRejected() throws Exception {
        patchProfile(Map.of("firstName", "Amina"));

        mockMvc.perform(multipart(HttpMethod.POST, "/api/v1/intern/profile/cv")
                        .file(new MockMultipartFile("file", "resume.pdf", "application/pdf", new byte[0]))
                        .with(asIntern()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void nonPdfContentTypeRejected() throws Exception {
        patchProfile(Map.of("firstName", "Amina"));

        mockMvc.perform(multipart(HttpMethod.POST, "/api/v1/intern/profile/cv")
                        .file(new MockMultipartFile(
                                "file", "resume.txt", "text/plain", "hello world".getBytes(StandardCharsets.UTF_8)))
                        .with(asIntern()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void fakePdfWithWrongSignatureRejected() throws Exception {
        patchProfile(Map.of("firstName", "Amina"));

        mockMvc.perform(multipart(HttpMethod.POST, "/api/v1/intern/profile/cv")
                        .file(new MockMultipartFile(
                                "file", "resume.pdf", "application/pdf", "not a real pdf".getBytes(StandardCharsets.UTF_8)))
                        .with(asIntern()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void fileOverSizeLimitRejected() throws Exception {
        patchProfile(Map.of("firstName", "Amina"));

        byte[] oversized = new byte[(5 * 1024 * 1024) + (512 * 1024)];
        byte[] signature = "%PDF-1.4".getBytes(StandardCharsets.US_ASCII);
        System.arraycopy(signature, 0, oversized, 0, signature.length);

        mockMvc.perform(multipart(HttpMethod.POST, "/api/v1/intern/profile/cv")
                        .file(new MockMultipartFile("file", "resume.pdf", "application/pdf", oversized))
                        .with(asIntern()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void companyForbiddenFromUploadingCv() throws Exception {
        User companyUser = userRepository.saveAndFlush(
                new User(
                        "company-" + UUID.randomUUID() + "@example.test",
                        passwordEncoder.encode("Password123!"),
                        Role.COMPANY
                )
        );

        mockMvc.perform(multipart(HttpMethod.POST, "/api/v1/intern/profile/cv")
                        .file(new MockMultipartFile("file", "resume.pdf", "application/pdf", validPdfBytes()))
                        .with(asUser(companyUser)))
                .andExpect(status().isForbidden());
    }

    @Test
    void uploadWithoutExistingProfileReturns404() throws Exception {
        mockMvc.perform(multipart(HttpMethod.POST, "/api/v1/intern/profile/cv")
                        .file(new MockMultipartFile("file", "resume.pdf", "application/pdf", validPdfBytes()))
                        .with(asIntern()))
                .andExpect(status().isNotFound());
    }

    @Test
    void replacingCvUpdatesMetadataSafely() throws Exception {
        patchProfile(Map.of("firstName", "Amina"));

        mockMvc.perform(multipart(HttpMethod.POST, "/api/v1/intern/profile/cv")
                        .file(new MockMultipartFile("file", "old-resume.pdf", "application/pdf", validPdfBytes()))
                        .with(asIntern()))
                .andExpect(status().isOk());

        String firstStorageKey = internProfileRepository
                .findByUserId(internUser.getId())
                .orElseThrow()
                .getCvStorageKey();
        assertThat(firstStorageKey).isNotNull();

        byte[] newPdf = createPdfWithLines("Different content");

        mockMvc.perform(multipart(HttpMethod.POST, "/api/v1/intern/profile/cv")
                        .file(new MockMultipartFile("file", "new-resume.pdf", "application/pdf", newPdf))
                        .with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fileName").value("new-resume.pdf"))
                .andExpect(jsonPath("$.sizeBytes").value(newPdf.length));

        InternProfile updated = internProfileRepository.findByUserId(internUser.getId()).orElseThrow();
        assertThat(updated.getCvOriginalFilename()).isEqualTo("new-resume.pdf");
        assertThat(updated.getCvStorageKey()).isNotNull().isNotEqualTo(firstStorageKey);
    }

    @Test
    void onboardingCompletesWithoutCv() throws Exception {
        UUID skillId = skillRepository.findAllByOrderByNameAsc().get(0).getId();
        patchProfile(completeOnboardingFields(skillId));

        mockMvc.perform(post("/api/v1/intern/profile/complete").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.onboardingCompleted").value(true));
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

    @Test
    void uploadingCvDetectsRecognizedSkills() throws Exception {
        patchProfile(Map.of("firstName", "Amina"));

        byte[] pdf = createPdfWithLines("Experienced with Java and SQL databases.");

        mockMvc.perform(multipart(HttpMethod.POST, "/api/v1/intern/profile/cv")
                        .file(new MockMultipartFile("file", "resume.pdf", "application/pdf", pdf))
                        .with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.detectedSkills[*].name", hasItem("Java")))
                .andExpect(jsonPath("$.detectedSkills[*].name", hasItem("SQL")));

        mockMvc.perform(get("/api/v1/intern/profile").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cvDetectedSkills[*].name", hasItem("Java")))
                .andExpect(jsonPath("$.cvDetectedSkills[*].name", hasItem("SQL")));
    }

    @Test
    void uploadingCvWithJavaScriptDoesNotFalselyDetectJava() throws Exception {
        patchProfile(Map.of("firstName", "Amina"));

        byte[] pdf = createPdfWithLines("Proficient in JavaScript development.");

        mockMvc.perform(multipart(HttpMethod.POST, "/api/v1/intern/profile/cv")
                        .file(new MockMultipartFile("file", "resume.pdf", "application/pdf", pdf))
                        .with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.detectedSkills[*].name", hasItem("JavaScript")))
                .andExpect(jsonPath("$.detectedSkills.length()").value(1));
    }

    @Test
    void uploadingCvWithNoRecognizedSkillsYieldsEmptySet() throws Exception {
        patchProfile(Map.of("firstName", "Amina"));

        byte[] pdf = createPdfWithLines("Looking forward to a great opportunity.");

        mockMvc.perform(multipart(HttpMethod.POST, "/api/v1/intern/profile/cv")
                        .file(new MockMultipartFile("file", "resume.pdf", "application/pdf", pdf))
                        .with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.detectedSkills.length()").value(0));
    }

    @Test
    void replacingCvReplacesDetectedSkillsRatherThanAccumulating() throws Exception {
        patchProfile(Map.of("firstName", "Amina"));

        byte[] firstPdf = createPdfWithLines("Skilled in Java and SQL.");

        mockMvc.perform(multipart(HttpMethod.POST, "/api/v1/intern/profile/cv")
                        .file(new MockMultipartFile("file", "old-resume.pdf", "application/pdf", firstPdf))
                        .with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.detectedSkills.length()").value(2));

        byte[] secondPdf = createPdfWithLines("Now focused on Python.");

        mockMvc.perform(multipart(HttpMethod.POST, "/api/v1/intern/profile/cv")
                        .file(new MockMultipartFile("file", "new-resume.pdf", "application/pdf", secondPdf))
                        .with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.detectedSkills.length()").value(1))
                .andExpect(jsonPath("$.detectedSkills[0].name").value("Python"));

        mockMvc.perform(get("/api/v1/intern/profile").with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cvDetectedSkills.length()").value(1))
                .andExpect(jsonPath("$.cvDetectedSkills[0].name").value("Python"));
    }

    @Test
    void multiWordSkillDetectedAcrossWrappedLines() throws Exception {
        patchProfile(Map.of("firstName", "Amina"));

        // Simulates a skill name wrapping across two lines of a real CV layout.
        byte[] pdf = createPdfWithLines("Built dashboards with Power", "BI and used Spring", "Boot for the backend.");

        mockMvc.perform(multipart(HttpMethod.POST, "/api/v1/intern/profile/cv")
                        .file(new MockMultipartFile("file", "resume.pdf", "application/pdf", pdf))
                        .with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.detectedSkills[*].name", hasItem("Power BI")))
                .andExpect(jsonPath("$.detectedSkills[*].name", hasItem("Spring Boot")));
    }

    @Test
    void skillDetectionIsCaseInsensitive() throws Exception {
        patchProfile(Map.of("firstName", "Amina"));

        byte[] pdf = createPdfWithLines("strong PYTHON and excel skills.");

        mockMvc.perform(multipart(HttpMethod.POST, "/api/v1/intern/profile/cv")
                        .file(new MockMultipartFile("file", "resume.pdf", "application/pdf", pdf))
                        .with(asIntern()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.detectedSkills[*].name", hasItem("Python")))
                .andExpect(jsonPath("$.detectedSkills[*].name", hasItem("Excel")));
    }

    @Test
    void structurallyInvalidPdfRejectedAndExistingCvUnchanged() throws Exception {
        patchProfile(Map.of("firstName", "Amina"));

        // Establish a baseline CV first.
        mockMvc.perform(multipart(HttpMethod.POST, "/api/v1/intern/profile/cv")
                        .file(new MockMultipartFile("file", "baseline.pdf", "application/pdf", createPdfWithLines("Java developer.")))
                        .with(asIntern()))
                .andExpect(status().isOk());

        // A file with a valid "%PDF-" signature but no real PDF structure must be rejected
        // outright — not silently treated as "zero skills detected" — and must not disturb
        // the already-uploaded baseline CV.
        mockMvc.perform(multipart(HttpMethod.POST, "/api/v1/intern/profile/cv")
                        .file(new MockMultipartFile(
                                "file", "broken.pdf", "application/pdf", structurallyInvalidPdfBytes()))
                        .with(asIntern()))
                .andExpect(status().isBadRequest());

        InternProfile unchanged = internProfileRepository.findByUserId(internUser.getId()).orElseThrow();
        assertThat(unchanged.getCvOriginalFilename()).isEqualTo("baseline.pdf");
        assertThat(unchanged.getCvDetectedSkills()).extracting(Skill::getName).containsExactly("Java");
    }
}
