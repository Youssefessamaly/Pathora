package com.internplatform.companyprofile;

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
@Table(name = "company_profiles")
public class CompanyProfile {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    @Column(name = "company_name", length = 200)
    private String companyName;

    @Column(name = "industry", length = 100)
    private String industry;

    @Column(name = "company_size", length = 50)
    private String companySize;

    @Column(name = "location", length = 200)
    private String location;

    @Column(name = "website", length = 300)
    private String website;

    @Column(name = "description")
    private String description;

    @Column(name = "contact_name", length = 150)
    private String contactName;

    @Column(name = "contact_phone", length = 30)
    private String contactPhone;

    @Column(name = "onboarding_completed", nullable = false)
    private boolean onboardingCompleted;

    @Column(name = "onboarding_completed_at")
    private OffsetDateTime onboardingCompletedAt;

    /**
     * Admin review status for marketplace access (see CompanyApprovalGuard) — entirely
     * independent of onboarding completeness. A brand-new company always starts PENDING: the
     * client never gets to choose otherwise, mirroring how InternshipApplication always starts
     * APPLIED. V15 backfilled every company that existed before this workflow to APPROVED so
     * existing, already-trusted accounts are never locked out by its introduction.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status", nullable = false, length = 20)
    private ApprovalStatus approvalStatus = ApprovalStatus.PENDING;

    @Column(name = "approval_reviewed_at")
    private OffsetDateTime approvalReviewedAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected CompanyProfile() {
    }

    public CompanyProfile(UUID userId) {
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

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public String getIndustry() {
        return industry;
    }

    public void setIndustry(String industry) {
        this.industry = industry;
    }

    public String getCompanySize() {
        return companySize;
    }

    public void setCompanySize(String companySize) {
        this.companySize = companySize;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getWebsite() {
        return website;
    }

    public void setWebsite(String website) {
        this.website = website;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getContactName() {
        return contactName;
    }

    public void setContactName(String contactName) {
        this.contactName = contactName;
    }

    public String getContactPhone() {
        return contactPhone;
    }

    public void setContactPhone(String contactPhone) {
        this.contactPhone = contactPhone;
    }

    public boolean isOnboardingCompleted() {
        return onboardingCompleted;
    }

    public OffsetDateTime getOnboardingCompletedAt() {
        return onboardingCompletedAt;
    }

    /**
     * Marks onboarding complete, keeping the boolean flag and completion timestamp in lockstep
     * so they can never diverge. There is deliberately no way to set either one independently.
     */
    public void markOnboardingCompleted(OffsetDateTime completedAt) {
        this.onboardingCompleted = true;
        this.onboardingCompletedAt = completedAt;
    }

    public ApprovalStatus getApprovalStatus() {
        return approvalStatus;
    }

    public OffsetDateTime getApprovalReviewedAt() {
        return approvalReviewedAt;
    }

    /**
     * Records an admin's approve/reject decision, keeping the status and review timestamp in
     * lockstep — same pattern as markOnboardingCompleted, so the two can never diverge.
     */
    public void recordApprovalDecision(ApprovalStatus status, OffsetDateTime reviewedAt) {
        this.approvalStatus = status;
        this.approvalReviewedAt = reviewedAt;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
