package com.internplatform.internprofile;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "intern_profiles")
public class InternProfile {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    @Column(name = "first_name", length = 100)
    private String firstName;

    @Column(name = "last_name", length = 100)
    private String lastName;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(name = "phone_number", length = 30)
    private String phoneNumber;

    @Column(name = "institution_name", length = 200)
    private String institutionName;

    @Enumerated(EnumType.STRING)
    @Column(name = "academic_level", length = 20)
    private AcademicLevel academicLevel;

    @Column(name = "academic_year")
    private Short academicYear;

    @Column(name = "major", length = 150)
    private String major;

    @Column(name = "expected_graduation_year")
    private Short expectedGraduationYear;

    @Column(name = "career_interests")
    private String careerInterests;

    @Column(name = "linkedin_url", length = 300)
    private String linkedinUrl;

    @Column(name = "onboarding_completed_at")
    private OffsetDateTime onboardingCompletedAt;

    @Column(name = "cv_original_filename", length = 255)
    private String cvOriginalFilename;

    @Column(name = "cv_storage_key", length = 255)
    private String cvStorageKey;

    @Column(name = "cv_content_type", length = 100)
    private String cvContentType;

    @Column(name = "cv_size_bytes")
    private Integer cvSizeBytes;

    @Column(name = "cv_uploaded_at")
    private OffsetDateTime cvUploadedAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @ManyToMany
    @JoinTable(
            name = "intern_profile_skills",
            joinColumns = @JoinColumn(name = "intern_profile_id"),
            inverseJoinColumns = @JoinColumn(name = "skill_id")
    )
    private Set<Skill> skills = new HashSet<>();

    /**
     * Pathora catalog skills detected in the intern's most recently uploaded CV. Fully
     * replaced (not merged) on every CV upload so a replaced CV never leaves stale skills
     * behind. Kept separate from the explicit, intern-selected `skills` set — the union of
     * the two is computed only where needed (recommendation scoring), never persisted.
     */
    @ManyToMany
    @JoinTable(
            name = "intern_cv_skills",
            joinColumns = @JoinColumn(name = "intern_profile_id"),
            inverseJoinColumns = @JoinColumn(name = "skill_id")
    )
    private Set<Skill> cvDetectedSkills = new HashSet<>();

    protected InternProfile() {
    }

    public InternProfile(UUID userId) {
        this.userId = userId;
    }

    @PrePersist
    protected void onCreate() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        if (id == null) {
            id = UUID.randomUUID();
        }

        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public LocalDate getDateOfBirth() {
        return dateOfBirth;
    }

    public void setDateOfBirth(LocalDate dateOfBirth) {
        this.dateOfBirth = dateOfBirth;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getInstitutionName() {
        return institutionName;
    }

    public void setInstitutionName(String institutionName) {
        this.institutionName = institutionName;
    }

    public AcademicLevel getAcademicLevel() {
        return academicLevel;
    }

    public void setAcademicLevel(AcademicLevel academicLevel) {
        this.academicLevel = academicLevel;
    }

    public Short getAcademicYear() {
        return academicYear;
    }

    public void setAcademicYear(Short academicYear) {
        this.academicYear = academicYear;
    }

    public String getMajor() {
        return major;
    }

    public void setMajor(String major) {
        this.major = major;
    }

    public Short getExpectedGraduationYear() {
        return expectedGraduationYear;
    }

    public void setExpectedGraduationYear(Short expectedGraduationYear) {
        this.expectedGraduationYear = expectedGraduationYear;
    }

    public String getCareerInterests() {
        return careerInterests;
    }

    public void setCareerInterests(String careerInterests) {
        this.careerInterests = careerInterests;
    }

    public String getLinkedinUrl() {
        return linkedinUrl;
    }

    public void setLinkedinUrl(String linkedinUrl) {
        this.linkedinUrl = linkedinUrl;
    }

    public OffsetDateTime getOnboardingCompletedAt() {
        return onboardingCompletedAt;
    }

    public void setOnboardingCompletedAt(OffsetDateTime onboardingCompletedAt) {
        this.onboardingCompletedAt = onboardingCompletedAt;
    }

    public String getCvOriginalFilename() {
        return cvOriginalFilename;
    }

    public void setCvOriginalFilename(String cvOriginalFilename) {
        this.cvOriginalFilename = cvOriginalFilename;
    }

    public String getCvStorageKey() {
        return cvStorageKey;
    }

    public void setCvStorageKey(String cvStorageKey) {
        this.cvStorageKey = cvStorageKey;
    }

    public String getCvContentType() {
        return cvContentType;
    }

    public void setCvContentType(String cvContentType) {
        this.cvContentType = cvContentType;
    }

    public Integer getCvSizeBytes() {
        return cvSizeBytes;
    }

    public void setCvSizeBytes(Integer cvSizeBytes) {
        this.cvSizeBytes = cvSizeBytes;
    }

    public OffsetDateTime getCvUploadedAt() {
        return cvUploadedAt;
    }

    public void setCvUploadedAt(OffsetDateTime cvUploadedAt) {
        this.cvUploadedAt = cvUploadedAt;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public Set<Skill> getSkills() {
        return skills;
    }

    public void setSkills(Set<Skill> skills) {
        this.skills = skills;
    }

    public Set<Skill> getCvDetectedSkills() {
        return cvDetectedSkills;
    }

    public void setCvDetectedSkills(Set<Skill> cvDetectedSkills) {
        this.cvDetectedSkills = cvDetectedSkills;
    }
}
