package com.internplatform.internshipfavorite;

import com.internplatform.companyprofile.ApprovalStatus;
import com.internplatform.companyprofile.CompanyProfile;
import com.internplatform.companyprofile.CompanyProfileRepository;
import com.internplatform.internprofile.InternProfile;
import com.internplatform.internprofile.InternProfileRepository;
import com.internplatform.internship.AcademicYearEligibility;
import com.internplatform.internship.Internship;
import com.internplatform.internship.InternshipRepository;
import com.internplatform.internship.InternshipStatus;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;

@Service
public class InternshipFavoriteService {

    private final InternshipFavoriteRepository favoriteRepository;
    private final InternshipRepository internshipRepository;
    private final InternProfileRepository internProfileRepository;
    private final CompanyProfileRepository companyProfileRepository;

    public InternshipFavoriteService(
            InternshipFavoriteRepository favoriteRepository,
            InternshipRepository internshipRepository,
            InternProfileRepository internProfileRepository,
            CompanyProfileRepository companyProfileRepository
    ) {
        this.favoriteRepository = favoriteRepository;
        this.internshipRepository = internshipRepository;
        this.internProfileRepository = internProfileRepository;
        this.companyProfileRepository = companyProfileRepository;
    }

    /**
     * Adds a favorite idempotently. An intern may only favorite an internship they are
     * currently allowed to see in the normal intern feed/detail flow.
     */
    @Transactional
    public void addFavorite(UUID userId, UUID internshipId) {
        InternProfile profile = requireCompletedInternProfile(userId);
        Internship internship = requireVisibleInternship(profile, internshipId);

        if (!favoriteRepository.existsByInternProfileIdAndInternshipId(profile.getId(), internship.getId())) {
            favoriteRepository.save(new InternshipFavorite(profile.getId(), internship.getId()));
        }
    }

    /**
     * Removes a favorite idempotently. The internship itself does not need to still be open;
     * this lets a stale persisted favorite be cleaned up safely if its internship later closes.
     */
    @Transactional
    public void removeFavorite(UUID userId, UUID internshipId) {
        InternProfile profile = requireCompletedInternProfile(userId);
        favoriteRepository.deleteByInternProfileIdAndInternshipId(profile.getId(), internshipId);
    }

    private InternProfile requireCompletedInternProfile(UUID userId) {
        InternProfile profile = internProfileRepository.findByUserId(userId).orElse(null);

        if (profile == null || profile.getOnboardingCompletedAt() == null) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Intern profile must be completed before saving internships"
            );
        }

        return profile;
    }

    private Internship requireVisibleInternship(InternProfile profile, UUID internshipId) {
        Internship internship = internshipRepository
                .findByIdAndStatusAndApplicationDeadlineGreaterThanEqual(
                        internshipId,
                        InternshipStatus.OPEN,
                        LocalDate.now(ZoneOffset.UTC)
                )
                .filter(found -> AcademicYearEligibility.satisfies(found, profile))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Internship not found"));

        CompanyProfile companyProfile = companyProfileRepository.findById(internship.getCompanyProfileId()).orElse(null);
        if (companyProfile == null || companyProfile.getApprovalStatus() != ApprovalStatus.APPROVED) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Internship not found");
        }

        return internship;
    }
}
