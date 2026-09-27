package com.internplatform.internprofile;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface InternProfileRepository extends JpaRepository<InternProfile, UUID> {

    Optional<InternProfile> findByUserId(UUID userId);
}
