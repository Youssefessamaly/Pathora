package com.internplatform.companyprofile;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CompanyProfileRepository extends JpaRepository<CompanyProfile, UUID> {

    Optional<CompanyProfile> findByUserId(UUID userId);

    /** Oldest-first — a pending review queue should be worked in the order requests arrived. */
    List<CompanyProfile> findAllByApprovalStatusOrderByCreatedAtAsc(ApprovalStatus approvalStatus);
}
