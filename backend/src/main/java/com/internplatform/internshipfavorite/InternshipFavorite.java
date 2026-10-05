package com.internplatform.internshipfavorite;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(
        name = "internship_favorites",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_internship_favorites_profile_internship",
                columnNames = {"intern_profile_id", "internship_id"}
        )
)
public class InternshipFavorite {

    @Id
    private UUID id;

    @Column(name = "intern_profile_id", nullable = false)
    private UUID internProfileId;

    @Column(name = "internship_id", nullable = false)
    private UUID internshipId;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected InternshipFavorite() {
    }

    public InternshipFavorite(UUID internProfileId, UUID internshipId) {
        this.internProfileId = internProfileId;
        this.internshipId = internshipId;
    }

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        createdAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    public UUID getId() {
        return id;
    }

    public UUID getInternProfileId() {
        return internProfileId;
    }

    public UUID getInternshipId() {
        return internshipId;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
