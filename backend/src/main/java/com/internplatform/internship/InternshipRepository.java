package com.internplatform.internship;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InternshipRepository extends JpaRepository<Internship, UUID> {

    List<Internship> findAllByCompanyProfileIdOrderByCreatedAtDesc(UUID companyProfileId);

    Optional<Internship> findByIdAndCompanyProfileId(UUID id, UUID companyProfileId);
}
