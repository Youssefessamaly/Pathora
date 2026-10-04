package com.internplatform.internship;

import com.internplatform.companyprofile.CompanyApprovalGuard;
import com.internplatform.companyprofile.CompanyProfile;
import com.internplatform.companyprofile.CompanyProfileRepository;
import com.internplatform.internprofile.Skill;
import com.internplatform.internprofile.SkillRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;

import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class InternshipService {

    private static final int MAX_TARGET_MAJOR_LENGTH = 150;
    private static final int MAX_TARGET_MAJORS = 10;
    private static final int MAX_EXTERNAL_APPLICATION_URL_LENGTH = 2048;

    // Deliberately mirrors CompanyProfileRequest's website pattern: case-insensitive,
    // http(s)-only (so javascript:, file:, data:, etc. can never match), host + TLD required.
    private static final Pattern EXTERNAL_APPLICATION_URL_PATTERN =
            Pattern.compile("(?i)^https?://[\\w.-]+\\.[a-z]{2,}(:\\d{1,5})?(/\\S*)?$");

    private final InternshipRepository internshipRepository;
    private final CompanyProfileRepository companyProfileRepository;
    private final SkillRepository skillRepository;
    private final CompanyApprovalGuard companyApprovalGuard;

    public InternshipService(
            InternshipRepository internshipRepository,
            CompanyProfileRepository companyProfileRepository,
            SkillRepository skillRepository,
            CompanyApprovalGuard companyApprovalGuard
    ) {
        this.internshipRepository = internshipRepository;
        this.companyProfileRepository = companyProfileRepository;
        this.skillRepository = skillRepository;
        this.companyApprovalGuard = companyApprovalGuard;
    }

    @Transactional
    public InternshipResponse createInternship(UUID userId, InternshipCreateRequest request) {
        CompanyProfile profile = requireCompletedCompanyProfile(userId);

        Internship internship = new Internship(profile.getId());
        internship.setTitle(request.title());
        internship.setDescription(request.description());
        internship.setLocation(request.location());
        internship.setWorkMode(request.workMode());
        internship.setApplicationDeadline(request.applicationDeadline());
        internship.setStartDate(request.startDate());
        internship.setDurationMonths(request.durationMonths());
        internship.setSkills(resolveSkills(request.skillIds()));
        internship.setTargetMajors(normalizeTargetMajors(
                request.targetMajors() != null ? request.targetMajors() : List.of()));
        internship.setMinimumAcademicYear(request.minimumAcademicYear());

        String validatedUrl = resolveFinalExternalApplicationUrl(
                request.applicationMethod(), normalizeExternalApplicationUrl(request.externalApplicationUrl()));
        internship.setApplicationMethod(request.applicationMethod());
        internship.setExternalApplicationUrl(validatedUrl);

        Internship saved = internshipRepository.saveAndFlush(internship);
        return toResponse(saved, profile);
    }

    @Transactional(readOnly = true)
    public List<InternshipResponse> listOwnInternships(UUID userId) {
        CompanyProfile profile = companyProfileRepository.findByUserId(userId).orElse(null);

        if (profile == null) {
            return List.of();
        }

        return internshipRepository.findAllByCompanyProfileIdOrderByCreatedAtDesc(profile.getId()).stream()
                .map(internship -> toResponse(internship, profile))
                .toList();
    }

    @Transactional(readOnly = true)
    public InternshipResponse getInternship(UUID userId, UUID internshipId) {
        CompanyProfile profile = findCompanyProfileOrInternshipNotFound(userId);
        Internship internship = findOwnedInternshipOrThrow(internshipId, profile);
        return toResponse(internship, profile);
    }

    @Transactional
    public InternshipResponse updateInternship(UUID userId, UUID internshipId, InternshipUpdateRequest request) {
        CompanyProfile profile = findCompanyProfileOrInternshipNotFound(userId);
        Internship internship = findOwnedInternshipOrThrow(internshipId, profile);
        companyApprovalGuard.requireApproved(profile);

        if (request.title() != null) {
            internship.setTitle(request.title());
        }

        if (request.description() != null) {
            internship.setDescription(request.description());
        }

        if (request.location() != null) {
            internship.setLocation(request.location());
        }

        if (request.workMode() != null) {
            internship.setWorkMode(request.workMode());
        }

        if (request.applicationDeadline() != null) {
            internship.setApplicationDeadline(request.applicationDeadline());
        }

        if (request.startDate() != null) {
            internship.setStartDate(request.startDate());
        }

        if (request.durationMonths() != null) {
            internship.setDurationMonths(request.durationMonths());
        }

        if (request.skillIds() != null) {
            if (request.skillIds().isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one skill is required");
            }
            internship.setSkills(resolveSkills(request.skillIds()));
        }

        if (request.targetMajors() != null) {
            internship.setTargetMajors(normalizeTargetMajors(request.targetMajors()));
        }

        if (request.minimumAcademicYear() != null) {
            internship.setMinimumAcademicYear(resolveMinimumAcademicYear(request.minimumAcademicYear()));
        }

        applyApplicationMethodAndUrl(internship, request.applicationMethod(), request.externalApplicationUrl());

        Internship saved = internshipRepository.saveAndFlush(internship);
        return toResponse(saved, profile);
    }

    @Transactional
    public InternshipResponse closeInternship(UUID userId, UUID internshipId) {
        CompanyProfile profile = findCompanyProfileOrInternshipNotFound(userId);
        Internship internship = findOwnedInternshipOrThrow(internshipId, profile);
        companyApprovalGuard.requireApproved(profile);

        if (internship.getStatus() != InternshipStatus.CLOSED) {
            internship.setStatus(InternshipStatus.CLOSED);
            internship = internshipRepository.saveAndFlush(internship);
        }

        return toResponse(internship, profile);
    }

    private CompanyProfile requireCompletedCompanyProfile(UUID userId) {
        CompanyProfile profile = companyProfileRepository.findByUserId(userId).orElse(null);

        if (profile == null || !profile.isOnboardingCompleted()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Company profile must be completed before creating an internship"
            );
        }

        companyApprovalGuard.requireApproved(profile);

        return profile;
    }

    /**
     * Resolves the company profile for reading/modifying an internship. A missing profile
     * cannot own any internship, so it collapses to the same 404 as an internship that
     * simply doesn't exist — this avoids leaking whether the ID belongs to another company.
     */
    private CompanyProfile findCompanyProfileOrInternshipNotFound(UUID userId) {
        return companyProfileRepository.findByUserId(userId)
                .orElseThrow(this::internshipNotFound);
    }

    private Internship findOwnedInternshipOrThrow(UUID internshipId, CompanyProfile profile) {
        return internshipRepository.findByIdAndCompanyProfileId(internshipId, profile.getId())
                .orElseThrow(this::internshipNotFound);
    }

    private ResponseStatusException internshipNotFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Internship not found");
    }

    private Set<Skill> resolveSkills(List<UUID> skillIds) {
        List<UUID> distinctIds = skillIds.stream().distinct().toList();

        List<Skill> found = skillRepository.findAllById(distinctIds);

        if (found.size() != distinctIds.size()) {
            Set<UUID> foundIds = found.stream().map(Skill::getId).collect(Collectors.toSet());

            List<UUID> unknown = distinctIds.stream()
                    .filter(id -> !foundIds.contains(id))
                    .toList();

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Unknown skill id(s): " + unknown
            );
        }

        return new HashSet<>(found);
    }

    /**
     * Trims, drops blanks, and deduplicates case-insensitively (keeping the first-seen
     * casing as the clean display value) — matching how the intern-facing scoring later
     * compares majors. Individual majors over the max length, or too many of them, are
     * rejected rather than silently truncated/dropped.
     */
    private Set<String> normalizeTargetMajors(List<String> rawMajors) {
        LinkedHashMap<String, String> byNormalizedKey = new LinkedHashMap<>();

        for (String raw : rawMajors) {
            if (raw == null) {
                continue;
            }

            String trimmed = raw.trim().replaceAll("\\s+", " ");
            if (trimmed.isEmpty()) {
                continue;
            }

            if (trimmed.length() > MAX_TARGET_MAJOR_LENGTH) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Target major must be at most " + MAX_TARGET_MAJOR_LENGTH + " characters: " + trimmed
                );
            }

            byNormalizedKey.putIfAbsent(trimmed.toLowerCase(Locale.ROOT), trimmed);
        }

        if (byNormalizedKey.size() > MAX_TARGET_MAJORS) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "At most " + MAX_TARGET_MAJORS + " target majors are allowed"
            );
        }

        return new LinkedHashSet<>(byNormalizedKey.values());
    }

    /**
     * Bean validation (@Min/@Max) can't reach inside a raw JsonNode, so an explicitly-supplied
     * minimumAcademicYear on PATCH is interpreted and range-checked here.
     * Caller only invokes this when the field was present in the request at all (see
     * updateInternship) — a JSON null node means "clear the restriction," any other
     * non-integral node (string, boolean, decimal, ...) is rejected outright.
     */
    private Integer resolveMinimumAcademicYear(JsonNode node) {
        if (node.isNull()) {
            return null;
        }

        if (!node.isIntegralNumber()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Minimum academic year must be a whole number between 1 and 6"
            );
        }

        int value = node.intValue();

        if (value < 1 || value > 6) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Minimum academic year must be between 1 and 6"
            );
        }

        return value;
    }

    /**
     * Computes and applies the FINAL applicationMethod + externalApplicationUrl pair for a
     * PATCH — never just the individually-supplied field in isolation, per the INTERNAL/
     * EXTERNAL pairing invariant also enforced by the V12 DB CHECK constraint.
     * applicationMethod is a plain enum: null means "omitted, keep current method" (there is
     * no "clear" state for a required field). externalApplicationUrl mirrors
     * minimumAcademicYear's JsonNode tri-state: a null reference means omitted (keep the
     * current URL, UNLESS the final method is INTERNAL, in which case it is safely cleared —
     * this is how "PATCH applicationMethod=INTERNAL" alone moves an EXTERNAL internship back
     * without the caller having to separately null out the URL), an explicit JSON null clears
     * it, and a string sets/replaces it (blank is treated the same as absent/null).
     */
    private void applyApplicationMethodAndUrl(Internship internship, ApplicationMethod requestedMethod, JsonNode urlNode) {
        ApplicationMethod finalMethod = requestedMethod != null ? requestedMethod : internship.getApplicationMethod();

        String finalUrl;
        if (urlNode == null) {
            finalUrl = finalMethod == ApplicationMethod.INTERNAL
                    ? null
                    : internship.getExternalApplicationUrl();
        } else if (urlNode.isNull()) {
            finalUrl = null;
        } else if (urlNode.isTextual()) {
            finalUrl = normalizeExternalApplicationUrl(urlNode.asText());
        } else {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "External application URL must be a string or null");
        }

        // Validate BEFORE mutating the managed entity: resolveFinalExternalApplicationUrl can
        // throw, and an entity mutation that happened first would stay dirty in the Hibernate
        // session (visible to later reads in the same transaction) even though the overall
        // request fails and nothing is actually persisted.
        String validatedUrl = resolveFinalExternalApplicationUrl(finalMethod, finalUrl);

        internship.setApplicationMethod(finalMethod);
        internship.setExternalApplicationUrl(validatedUrl);
    }

    /** Blank (including whitespace-only) is treated as "no URL provided", not a format error. */
    private String normalizeExternalApplicationUrl(String raw) {
        if (raw == null) {
            return null;
        }
        String trimmed = raw.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /**
     * Enforces the same INTERNAL/EXTERNAL pairing the V12 CHECK constraint enforces at the DB
     * level, returning the URL to actually persist (validated + trimmed for EXTERNAL, always
     * null for INTERNAL). {@code normalizedUrl} must already be blank-normalized to null.
     */
    private String resolveFinalExternalApplicationUrl(ApplicationMethod method, String normalizedUrl) {
        if (method == ApplicationMethod.EXTERNAL) {
            if (normalizedUrl == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "External application URL is required when application method is EXTERNAL");
            }
            return requireValidExternalApplicationUrl(normalizedUrl);
        }

        if (normalizedUrl != null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "External application URL must be empty when application method is INTERNAL");
        }

        return null;
    }

    /**
     * Format/length check for a non-blank external application URL. The http(s)-only pattern
     * (mirroring CompanyProfileRequest's website validation) rejects javascript:, file:,
     * data:, and any other non-http(s) scheme outright — they simply never match.
     */
    private String requireValidExternalApplicationUrl(String trimmedUrl) {
        if (trimmedUrl.length() > MAX_EXTERNAL_APPLICATION_URL_LENGTH) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "External application URL must be at most " + MAX_EXTERNAL_APPLICATION_URL_LENGTH + " characters");
        }

        if (!EXTERNAL_APPLICATION_URL_PATTERN.matcher(trimmedUrl).matches()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "External application URL must be a valid http(s) URL");
        }

        return trimmedUrl;
    }

    private InternshipResponse toResponse(Internship internship, CompanyProfile profile) {
        List<InternshipSkillResponse> skills = internship.getSkills().stream()
                .sorted(Comparator.comparing(Skill::getName))
                .map(skill -> new InternshipSkillResponse(skill.getId(), skill.getName()))
                .toList();

        List<String> targetMajors = internship.getTargetMajors().stream()
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .toList();

        return new InternshipResponse(
                internship.getId(),
                profile.getCompanyName(),
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
                internship.getCreatedAt(),
                internship.getUpdatedAt()
        );
    }
}
