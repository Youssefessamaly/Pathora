package com.internplatform.internship;

import com.internplatform.companyprofile.ApprovalStatus;
import com.internplatform.companyprofile.CompanyProfile;
import com.internplatform.companyprofile.CompanyProfileRepository;
import com.internplatform.internprofile.InternProfile;
import com.internplatform.internprofile.InternProfileRepository;
import com.internplatform.internprofile.Skill;
import com.internplatform.internshipfavorite.InternshipFavorite;
import com.internplatform.internshipfavorite.InternshipFavoriteRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Deterministic, explainable MVP relevance scoring for the intern-facing internship feed.
 * Deliberately not AI/ML-based: a single service-level pass comparing intern skills/major
 * against each eligible internship's required skills and target majors.
 */
@Service
public class InternInternshipFeedService {

    private static final int MAX_SKILL_POINTS = 70;
    private static final int MAX_MAJOR_POINTS = 30;

    private static final Comparator<ScoredInternship> FEED_ORDER = Comparator
            .comparingInt(ScoredInternship::relevancePercentage).reversed()
            .thenComparing(Comparator.comparingInt(ScoredInternship::matchedSkillCount).reversed())
            .thenComparing(Comparator.comparing((ScoredInternship scored) -> scored.internship().getCreatedAt()).reversed());

    private final InternshipRepository internshipRepository;
    private final InternProfileRepository internProfileRepository;
    private final CompanyProfileRepository companyProfileRepository;
    private final InternshipFavoriteRepository favoriteRepository;

    public InternInternshipFeedService(
            InternshipRepository internshipRepository,
            InternProfileRepository internProfileRepository,
            CompanyProfileRepository companyProfileRepository,
            InternshipFavoriteRepository favoriteRepository
    ) {
        this.internshipRepository = internshipRepository;
        this.internProfileRepository = internProfileRepository;
        this.companyProfileRepository = companyProfileRepository;
        this.favoriteRepository = favoriteRepository;
    }

    /**
     * search is optional free text matched against title, location, company name, and
     * required skill names (see matchesSearch) — case-insensitive, trimmed, substring/partial
     * match, applied in the same filter pass as the existing eligibility rules so a search
     * result can never surface anything the plain feed wouldn't already allow. A null/blank
     * search leaves the feed exactly as before.
     */
    @Transactional(readOnly = true)
    public List<InternInternshipResponse> getPersonalizedFeed(UUID userId, String search) {
        InternProfile profile = requireCompletedInternProfile(userId);
        String normalizedSearch = normalizeSearchTerm(search);

        List<Internship> openInternships = internshipRepository.findAllByStatusAndApplicationDeadlineGreaterThanEqual(
                InternshipStatus.OPEN, LocalDate.now(ZoneOffset.UTC));

        Map<UUID, CompanyProfile> companyProfiles = loadCompanyProfiles(openInternships);
        Set<UUID> favoriteInternshipIds = favoriteInternshipIds(profile.getId());

        List<Internship> eligible = openInternships.stream()
                .filter(internship -> AcademicYearEligibility.satisfies(internship, profile))
                .filter(internship -> isCompanyApproved(internship, companyProfiles))
                .filter(internship -> matchesSearch(internship, companyProfiles.get(internship.getCompanyProfileId()), normalizedSearch))
                .toList();

        return eligible.stream()
                .map(internship -> score(internship, profile))
                .sorted(FEED_ORDER)
                .map(scored -> toResponse(
                        scored,
                        companyNameOf(scored.internship(), companyProfiles),
                        favoriteInternshipIds.contains(scored.internship().getId())
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public InternInternshipResponse getPersonalizedInternshipDetail(UUID userId, UUID internshipId) {
        InternProfile profile = requireCompletedInternProfile(userId);

        Internship internship = internshipRepository
                .findByIdAndStatusAndApplicationDeadlineGreaterThanEqual(
                        internshipId, InternshipStatus.OPEN, LocalDate.now(ZoneOffset.UTC))
                .filter(found -> AcademicYearEligibility.satisfies(found, profile))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Internship not found"));

        CompanyProfile companyProfile = companyProfileRepository.findById(internship.getCompanyProfileId()).orElse(null);

        if (companyProfile == null || companyProfile.getApprovalStatus() != ApprovalStatus.APPROVED) {
            // Same 404 as "doesn't exist" / "not eligible" — an intern should never be able to
            // tell a non-approved company's internship apart from one that simply isn't there.
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Internship not found");
        }

        boolean favorited = favoriteRepository.existsByInternProfileIdAndInternshipId(profile.getId(), internship.getId());
        return toResponse(score(internship, profile), companyProfile.getCompanyName(), favorited);
    }

    /**
     * Returns the intern's saved internships newest-save first. Favorites persist in the DB,
     * but only internships that are still visible under the normal feed rules are returned.
     */
    @Transactional(readOnly = true)
    public List<InternInternshipResponse> getFavoriteInternships(UUID userId) {
        InternProfile profile = requireCompletedInternProfile(userId);
        List<InternshipFavorite> favorites = favoriteRepository.findAllByInternProfileIdOrderByCreatedAtDesc(profile.getId());

        if (favorites.isEmpty()) {
            return List.of();
        }

        List<UUID> internshipIds = favorites.stream()
                .map(InternshipFavorite::getInternshipId)
                .toList();

        Map<UUID, Internship> internshipsById = internshipRepository.findAllById(internshipIds).stream()
                .collect(Collectors.toMap(Internship::getId, internship -> internship));
        Map<UUID, CompanyProfile> companyProfiles = loadCompanyProfiles(internshipsById.values().stream().toList());
        LocalDate today = LocalDate.now(ZoneOffset.UTC);

        return favorites.stream()
                .map(favorite -> internshipsById.get(favorite.getInternshipId()))
                .filter(internship -> internship != null)
                .filter(internship -> internship.getStatus() == InternshipStatus.OPEN)
                .filter(internship -> !internship.getApplicationDeadline().isBefore(today))
                .filter(internship -> AcademicYearEligibility.satisfies(internship, profile))
                .filter(internship -> isCompanyApproved(internship, companyProfiles))
                .map(internship -> score(internship, profile))
                .map(scored -> toResponse(scored, companyNameOf(scored.internship(), companyProfiles), true))
                .toList();
    }

    private Set<UUID> favoriteInternshipIds(UUID internProfileId) {
        return new HashSet<>(favoriteRepository.findInternshipIdsByInternProfileId(internProfileId));
    }

    private Map<UUID, CompanyProfile> loadCompanyProfiles(List<Internship> internships) {
        Set<UUID> companyProfileIds = internships.stream()
                .map(Internship::getCompanyProfileId)
                .collect(Collectors.toSet());

        if (companyProfileIds.isEmpty()) {
            return Map.of();
        }

        Map<UUID, CompanyProfile> profiles = new HashMap<>();
        for (CompanyProfile profile : companyProfileRepository.findAllById(companyProfileIds)) {
            profiles.put(profile.getId(), profile);
        }
        return profiles;
    }

    private String companyNameOf(Internship internship, Map<UUID, CompanyProfile> companyProfiles) {
        CompanyProfile profile = companyProfiles.get(internship.getCompanyProfileId());
        return profile != null ? profile.getCompanyName() : null;
    }

    /**
     * Only an APPROVED company's internships are visible to interns at all — a defense-in-depth
     * mirror of CompanyApprovalGuard on the company side. In practice every internship's owning
     * company was APPROVED at creation time and approval decisions are one-way (never reversed),
     * so this should never actually exclude anything today; it exists so the feed can never
     * silently start showing a non-approved company's internships if that ever changes.
     */
    private boolean isCompanyApproved(Internship internship, Map<UUID, CompanyProfile> companyProfiles) {
        CompanyProfile profile = companyProfiles.get(internship.getCompanyProfileId());
        return profile != null && profile.getApprovalStatus() == ApprovalStatus.APPROVED;
    }

    /** null/blank -> null (no filtering); otherwise trimmed and lower-cased once, up front,
     *  rather than re-normalizing per internship. */
    private String normalizeSearchTerm(String rawSearch) {
        if (rawSearch == null) {
            return null;
        }
        String trimmed = rawSearch.trim();
        return trimmed.isEmpty() ? null : trimmed.toLowerCase(Locale.ROOT);
    }

    /**
     * Plain deterministic case-insensitive substring match — title, location, company name, or
     * any required skill's name. A null normalizedSearch (nothing/blank was searched) always
     * matches, so this is a no-op when search isn't used.
     */
    private boolean matchesSearch(Internship internship, CompanyProfile companyProfile, String normalizedSearch) {
        if (normalizedSearch == null) {
            return true;
        }

        if (containsIgnoreCase(internship.getTitle(), normalizedSearch)) {
            return true;
        }
        if (containsIgnoreCase(internship.getLocation(), normalizedSearch)) {
            return true;
        }
        if (companyProfile != null && containsIgnoreCase(companyProfile.getCompanyName(), normalizedSearch)) {
            return true;
        }
        return internship.getSkills().stream()
                .anyMatch(skill -> containsIgnoreCase(skill.getName(), normalizedSearch));
    }

    private boolean containsIgnoreCase(String value, String normalizedNeedle) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(normalizedNeedle);
    }

    private InternProfile requireCompletedInternProfile(UUID userId) {
        InternProfile profile = internProfileRepository.findByUserId(userId).orElse(null);

        if (profile == null || profile.getOnboardingCompletedAt() == null) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Intern profile must be completed before browsing internships"
            );
        }

        return profile;
    }

    private ScoredInternship score(Internship internship, InternProfile profile) {
        Set<UUID> internSkillIds = effectiveSkillIds(profile);

        List<Skill> requiredSkills = internship.getSkills().stream()
                .sorted(Comparator.comparing(Skill::getName))
                .toList();
        int totalRequired = requiredSkills.size();

        List<Skill> matchedSkills = requiredSkills.stream()
                .filter(skill -> internSkillIds.contains(skill.getId()))
                .toList();
        int matchedCount = matchedSkills.size();

        double skillScore = totalRequired == 0
                ? 0.0
                : MAX_SKILL_POINTS * (double) matchedCount / totalRequired;

        boolean majorMatch = matchesTargetMajor(profile.getMajor(), internship.getTargetMajors());
        double majorScore = majorMatch ? MAX_MAJOR_POINTS : 0.0;

        int relevancePercentage = clamp((int) Math.round(skillScore + majorScore));

        return new ScoredInternship(internship, relevancePercentage, matchedCount, totalRequired, matchedSkills, majorMatch);
    }

    /**
     * effectiveSkillIds = profile-selected skills UNION CV-detected skills, deduplicated by
     * Set semantics (a skill present in both counts once). This is the only change this
     * feature makes to recommendation scoring — major scoring, academic-year eligibility,
     * OPEN/deadline eligibility, and sort order are all untouched.
     */
    private Set<UUID> effectiveSkillIds(InternProfile profile) {
        Set<UUID> ids = profile.getSkills().stream()
                .map(Skill::getId)
                .collect(Collectors.toCollection(HashSet::new));

        profile.getCvDetectedSkills().forEach(skill -> ids.add(skill.getId()));

        return ids;
    }

    private boolean matchesTargetMajor(String internMajor, Set<String> targetMajors) {
        if (internMajor == null || targetMajors == null || targetMajors.isEmpty()) {
            return false;
        }

        String normalizedInternMajor = normalizeForComparison(internMajor);
        if (normalizedInternMajor.isEmpty()) {
            return false;
        }

        return targetMajors.stream()
                .map(this::normalizeForComparison)
                .anyMatch(normalizedInternMajor::equals);
    }

    private String normalizeForComparison(String value) {
        return value.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    private int clamp(int value) {
        return Math.max(0, Math.min(100, value));
    }

    private InternInternshipResponse toResponse(ScoredInternship scored, String companyName, boolean favorited) {
        Internship internship = scored.internship();

        List<InternshipSkillResponse> skills = internship.getSkills().stream()
                .sorted(Comparator.comparing(Skill::getName))
                .map(skill -> new InternshipSkillResponse(skill.getId(), skill.getName()))
                .toList();

        List<InternshipSkillResponse> matchedSkills = scored.matchedSkills().stream()
                .map(skill -> new InternshipSkillResponse(skill.getId(), skill.getName()))
                .toList();

        List<String> targetMajors = internship.getTargetMajors().stream()
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .toList();

        return new InternInternshipResponse(
                internship.getId(),
                companyName,
                internship.getTitle(),
                internship.getDescription(),
                internship.getLocation(),
                internship.getWorkMode(),
                internship.getApplicationDeadline(),
                internship.getStartDate(),
                internship.getDurationMonths(),
                internship.getStatus(),
                skills,
                targetMajors,
                internship.getMinimumAcademicYear(),
                internship.getApplicationMethod(),
                internship.getExternalApplicationUrl(),
                scored.relevancePercentage(),
                scored.matchedSkillCount(),
                scored.totalRequiredSkillCount(),
                matchedSkills,
                scored.majorMatch(),
                favorited,
                internship.getCreatedAt(),
                internship.getUpdatedAt()
        );
    }

    private record ScoredInternship(
            Internship internship,
            int relevancePercentage,
            int matchedSkillCount,
            int totalRequiredSkillCount,
            List<Skill> matchedSkills,
            boolean majorMatch
    ) {
    }
}
