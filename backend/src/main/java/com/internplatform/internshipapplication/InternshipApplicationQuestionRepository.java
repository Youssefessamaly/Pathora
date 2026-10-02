package com.internplatform.internshipapplication;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InternshipApplicationQuestionRepository extends JpaRepository<InternshipApplicationQuestion, UUID> {

    List<InternshipApplicationQuestion> findAllByInternshipIdOrderByDisplayOrderAscCreatedAtAsc(UUID internshipId);

    /** Ownership-scoped lookup — another internship's question simply doesn't match, so it
     *  collapses to 404 the same way InternshipRepository.findByIdAndCompanyProfileId does. */
    Optional<InternshipApplicationQuestion> findByIdAndInternshipId(UUID id, UUID internshipId);
}
