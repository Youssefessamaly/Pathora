package com.internplatform.internship;

import com.internplatform.internprofile.Skill;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
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
@Table(name = "internships")
public class Internship {

    @Id
    private UUID id;

    @Column(name = "company_profile_id", nullable = false)
    private UUID companyProfileId;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", nullable = false)
    private String description;

    @Column(name = "location", nullable = false, length = 200)
    private String location;

    @Enumerated(EnumType.STRING)
    @Column(name = "work_mode", nullable = false, length = 20)
    private WorkMode workMode;

    @Column(name = "application_deadline", nullable = false)
    private LocalDate applicationDeadline;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "duration_months")
    private Integer durationMonths;

    /**
     * Minimum university academic year an intern must have reached to see this internship,
     * or null for no restriction. An eligibility gate only — never contributes to
     * relevancePercentage.
     */
    @Column(name = "minimum_academic_year")
    private Integer minimumAcademicYear;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private InternshipStatus status;

    /**
     * INTERNAL = applications are hosted/tracked inside Pathora (externalApplicationUrl is
     * always null). EXTERNAL = Apply sends the intern to the company's own application page
     * (externalApplicationUrl is always a validated http(s) URL). The DB CHECK constraint
     * (V12) enforces this pairing as a last line of defense; the service validates it first.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "application_method", nullable = false, length = 20)
    private ApplicationMethod applicationMethod;

    @Column(name = "external_application_url", length = 2048)
    private String externalApplicationUrl;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @ManyToMany
    @JoinTable(
            name = "internship_skills",
            joinColumns = @JoinColumn(name = "internship_id"),
            inverseJoinColumns = @JoinColumn(name = "skill_id")
    )
    private Set<Skill> skills = new HashSet<>();

    /**
     * Lightweight, non-catalog list of major names this internship targets — used only for
     * personalized intern feed scoring. Intentionally not a Major entity/catalog per the
     * MVP design; values are pre-normalized (trimmed, deduplicated case-insensitively) by
     * the service before ever reaching this collection.
     */
    @ElementCollection
    @CollectionTable(
            name = "internship_target_majors",
            joinColumns = @JoinColumn(name = "internship_id")
    )
    @Column(name = "major_name", length = 150)
    private Set<String> targetMajors = new HashSet<>();

    protected Internship() {
    }

    public Internship(UUID companyProfileId) {
        this.companyProfileId = companyProfileId;
        this.status = InternshipStatus.OPEN;
        // Safe default matching V12's backfill of pre-existing rows — callers that care
        // (InternshipService) overwrite this explicitly from the validated request.
        this.applicationMethod = ApplicationMethod.INTERNAL;
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

    public UUID getCompanyProfileId() {
        return companyProfileId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public WorkMode getWorkMode() {
        return workMode;
    }

    public void setWorkMode(WorkMode workMode) {
        this.workMode = workMode;
    }

    public LocalDate getApplicationDeadline() {
        return applicationDeadline;
    }

    public void setApplicationDeadline(LocalDate applicationDeadline) {
        this.applicationDeadline = applicationDeadline;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public Integer getDurationMonths() {
        return durationMonths;
    }

    public void setDurationMonths(Integer durationMonths) {
        this.durationMonths = durationMonths;
    }

    public Integer getMinimumAcademicYear() {
        return minimumAcademicYear;
    }

    public void setMinimumAcademicYear(Integer minimumAcademicYear) {
        this.minimumAcademicYear = minimumAcademicYear;
    }

    public InternshipStatus getStatus() {
        return status;
    }

    public void setStatus(InternshipStatus status) {
        this.status = status;
    }

    public ApplicationMethod getApplicationMethod() {
        return applicationMethod;
    }

    public void setApplicationMethod(ApplicationMethod applicationMethod) {
        this.applicationMethod = applicationMethod;
    }

    public String getExternalApplicationUrl() {
        return externalApplicationUrl;
    }

    public void setExternalApplicationUrl(String externalApplicationUrl) {
        this.externalApplicationUrl = externalApplicationUrl;
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

    public Set<String> getTargetMajors() {
        return targetMajors;
    }

    public void setTargetMajors(Set<String> targetMajors) {
        this.targetMajors = targetMajors;
    }
}
