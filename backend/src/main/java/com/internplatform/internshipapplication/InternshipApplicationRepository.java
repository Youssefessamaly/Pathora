package com.internplatform.internshipapplication;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InternshipApplicationRepository extends JpaRepository<InternshipApplication, UUID> {

    boolean existsByInternshipIdAndInternProfileId(UUID internshipId, UUID internProfileId);

    /** Used to freeze an internship's application questions once it has received any
     *  application at all — see InternshipApplicationQuestionService. */
    boolean existsByInternshipId(UUID internshipId);

    List<InternshipApplication> findAllByInternProfileIdOrderByAppliedAtDesc(UUID internProfileId);

    /**
     * Ownership-scoped lookup: resolving by id AND the owning intern profile together means
     * another intern's application simply doesn't match, collapsing to 404 — the same
     * not-found-not-forbidden pattern InternshipRepository.findByIdAndCompanyProfileId uses
     * for company-owned internships, so an application's existence is never leaked to a
     * non-owner.
     */
    Optional<InternshipApplication> findByIdAndInternProfileId(UUID id, UUID internProfileId);
}
