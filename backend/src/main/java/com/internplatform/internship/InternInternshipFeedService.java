package com.internplatform.internship;

import com.internplatform.companyprofile.CompanyProfile;
import com.internplatform.companyprofile.CompanyProfileRepository;
import com.internplatform.internprofile.InternProfile;
import com.internplatform.internprofile.InternProfileRepository;
import com.internplatform.internprofile.Skill;
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

    public InternInternshipFeedService(
            InternshipRepository internshipRepository,
            InternProfileRepository internProfileRepository,
            CompanyProfileRepository companyProfileRepository
    ) {
        this.internshipRepository = internshipRepository;
        this.internProfileRepository = internProfileRepository;
        this.companyProfileRepository = companyProfileRepository;
    }

    @Transactional(readOnly = true)
    public List<InternInternshipResponse> getPersonalizedFeed(UUID userId) {
        InternProfile profile = requireCompletedInternProfile(userId);

        List<Internship> eligible = internshipRepository.findAllByStatusAndApplicationDeadlineGreaterThanEqual(
                        InternshipStatus.OPEN, LocalDate.now(ZoneOffset.UTC))
                .stream()
                .filter(internship -> AcademicYearEligibility.satisfies(internship, profile))
                .toList();

        Map<UUID, String> companyNames = loadCompanyNames(eligible);

        return eligible.stream()
                .map(internship -> score(internship, profile))
                .sorted(FEED_ORDER)
                .map(scored -> toResponse(scored, companyNames.get(scored.internship().getCompanyProfileId())))
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

        String companyName = companyProfileRepository.findById(internship.getCompanyProfileId())
                .map(CompanyProfile::getCompanyName)
                .orElse(null);

        return toResponse(score(internship, profile), companyName);
    }

    private Map<UUID, String> loadCompanyNames(List<Internship> internships) {
        Set<UUID> companyProfileIds = internships.stream()
                .map(Internship::getCompanyProfileId)
                .collect(Collectors.toSet());

        if (companyProfileIds.isEmpty()) {
            return Map.of();
        }

        Map<UUID, String> names = new HashMap<>();
        for (CompanyProfile profile : companyProfileRepository.findAllById(companyProfileIds)) {
            names.put(profile.getId(), profile.getCompanyName());
        }
        return names;
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

    private InternInternshipResponse toResponse(ScoredInternship scored, String companyName) {
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
