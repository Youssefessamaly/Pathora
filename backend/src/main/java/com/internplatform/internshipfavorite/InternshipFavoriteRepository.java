package com.internplatform.internshipfavorite;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface InternshipFavoriteRepository extends JpaRepository<InternshipFavorite, UUID> {

    boolean existsByInternProfileIdAndInternshipId(UUID internProfileId, UUID internshipId);

    void deleteByInternProfileIdAndInternshipId(UUID internProfileId, UUID internshipId);

    List<InternshipFavorite> findAllByInternProfileIdOrderByCreatedAtDesc(UUID internProfileId);

    @Query("select favorite.internshipId from InternshipFavorite favorite where favorite.internProfileId = :internProfileId")
    List<UUID> findInternshipIdsByInternProfileId(@Param("internProfileId") UUID internProfileId);
}
