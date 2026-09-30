package com.internplatform.internship;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InternshipRepository extends JpaRepository<Internship, UUID> {

    List<Internship> findAllByCompanyProfileIdOrderByCreatedAtDesc(UUID companyProfileId);

    Optional<Internship> findByIdAndCompanyProfileId(UUID id, UUID companyProfileId);

    List<Internship> findAllByStatusAndApplicationDeadlineGreaterThanEqual(
            InternshipStatus status, LocalDate applicationDeadline);

    Optional<Internship> findByIdAndStatusAndApplicationDeadlineGreaterThanEqual(
            UUID id, InternshipStatus status, LocalDate applicationDeadline);
}
