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

    /** Company-facing applicant list for one internship, newest first — mirrors the intern's
     *  own appliedAt-desc ordering above. */
    List<InternshipApplication> findAllByInternshipIdOrderByAppliedAtDesc(UUID internshipId);

    /**
     * Ownership-scoped lookup for the company side: resolving by id AND the owning internship
     * together means an application belonging to a different internship (another company's, or
     * even the same company's other internship) simply doesn't match, collapsing to 404 — same
     * pattern as findByIdAndInternProfileId above.
     */
    Optional<InternshipApplication> findByIdAndInternshipId(UUID id, UUID internshipId);
}
