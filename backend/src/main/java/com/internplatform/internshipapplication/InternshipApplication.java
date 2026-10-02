package com.internplatform.internshipapplication;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(name = "internship_applications")
public class InternshipApplication {

    @Id
    private UUID id;

    @Column(name = "internship_id", nullable = false)
    private UUID internshipId;

    @Column(name = "intern_profile_id", nullable = false)
    private UUID internProfileId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ApplicationStatus status;

    @Column(name = "cover_letter")
    private String coverLetter;

    @Column(name = "linkedin_url", length = 300)
    private String linkedinUrl;

    @Column(name = "portfolio_url", length = 300)
    private String portfolioUrl;

    @Column(name = "interest_reason", nullable = false)
    private String interestReason;

    /**
     * Immutable snapshot of the intern's CV as it stood at application time — a physically
     * independent copy (see InternshipApplicationService), never a live pointer to the
     * profile's current CV. Replacing the profile's CV later must never change what this
     * application represents.
     */
    @Column(name = "cv_file_name", nullable = false, length = 255)
    private String cvFileName;

    @Column(name = "cv_storage_key", nullable = false, length = 255)
    private String cvStorageKey;

    @Column(name = "cv_content_type", nullable = false, length = 100)
    private String cvContentType;

    @Column(name = "cv_size_bytes", nullable = false)
    private Integer cvSizeBytes;

    @Column(name = "cv_uploaded_at", nullable = false)
    private OffsetDateTime cvUploadedAt;

    @Column(name = "applied_at", nullable = false)
    private OffsetDateTime appliedAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected InternshipApplication() {
    }

    public InternshipApplication(UUID internshipId, UUID internProfileId) {
        this.internshipId = internshipId;
        this.internProfileId = internProfileId;
        // A newly created application always starts APPLIED — the client can never choose
        // the initial status, and nothing in this class exposes a way to set it otherwise.
        this.status = ApplicationStatus.APPLIED;
    }

    @PrePersist
    protected void onCreate() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        if (id == null) {
            id = UUID.randomUUID();
        }

        appliedAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    public UUID getId() {
        return id;
    }

    public UUID getInternshipId() {
        return internshipId;
    }

    public UUID getInternProfileId() {
        return internProfileId;
    }

    public ApplicationStatus getStatus() {
        return status;
    }

    public void setStatus(ApplicationStatus status) {
        this.status = status;
    }

    public String getCoverLetter() {
        return coverLetter;
    }

    public void setCoverLetter(String coverLetter) {
        this.coverLetter = coverLetter;
    }

    public String getLinkedinUrl() {
        return linkedinUrl;
    }

    public void setLinkedinUrl(String linkedinUrl) {
        this.linkedinUrl = linkedinUrl;
    }

    public String getPortfolioUrl() {
        return portfolioUrl;
    }

    public void setPortfolioUrl(String portfolioUrl) {
        this.portfolioUrl = portfolioUrl;
    }

    public String getInterestReason() {
        return interestReason;
    }

    public void setInterestReason(String interestReason) {
        this.interestReason = interestReason;
    }

    public String getCvFileName() {
        return cvFileName;
    }

    public void setCvFileName(String cvFileName) {
        this.cvFileName = cvFileName;
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

    public OffsetDateTime getAppliedAt() {
        return appliedAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
