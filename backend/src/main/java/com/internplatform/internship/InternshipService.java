package com.internplatform.internship;

import com.internplatform.companyprofile.CompanyProfile;
import com.internplatform.companyprofile.CompanyProfileRepository;
import com.internplatform.internprofile.Skill;
import com.internplatform.internprofile.SkillRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class InternshipService {

    private final InternshipRepository internshipRepository;
    private final CompanyProfileRepository companyProfileRepository;
    private final SkillRepository skillRepository;

    public InternshipService(
            InternshipRepository internshipRepository,
            CompanyProfileRepository companyProfileRepository,
            SkillRepository skillRepository
    ) {
        this.internshipRepository = internshipRepository;
        this.companyProfileRepository = companyProfileRepository;
        this.skillRepository = skillRepository;
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

        Internship saved = internshipRepository.saveAndFlush(internship);
        return toResponse(saved, profile);
    }

    @Transactional
    public InternshipResponse closeInternship(UUID userId, UUID internshipId) {
        CompanyProfile profile = findCompanyProfileOrInternshipNotFound(userId);
        Internship internship = findOwnedInternshipOrThrow(internshipId, profile);

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

    private InternshipResponse toResponse(Internship internship, CompanyProfile profile) {
        List<InternshipSkillResponse> skills = internship.getSkills().stream()
                .sorted(Comparator.comparing(Skill::getName))
                .map(skill -> new InternshipSkillResponse(skill.getId(), skill.getName()))
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
                internship.getCreatedAt(),
                internship.getUpdatedAt()
        );
    }
}
