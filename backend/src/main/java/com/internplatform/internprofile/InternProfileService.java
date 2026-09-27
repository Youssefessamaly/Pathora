package com.internplatform.internprofile;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.time.Year;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class InternProfileService {

    private static final Pattern LOCAL_EGYPT_PHONE = Pattern.compile("^01[0125]\\d{8}$");
    private static final Pattern INTERNATIONAL_EGYPT_PHONE = Pattern.compile("^\\+201[0125]\\d{8}$");

    private static final int MAX_GRADUATION_YEARS_AHEAD = 10;

    private final InternProfileRepository internProfileRepository;
    private final SkillRepository skillRepository;

    public InternProfileService(
            InternProfileRepository internProfileRepository,
            SkillRepository skillRepository
    ) {
        this.internProfileRepository = internProfileRepository;
        this.skillRepository = skillRepository;
    }

    public InternProfileResponse getProfile(UUID userId) {
        InternProfile profile = findProfileOrThrow(userId);
        return toResponse(profile);
    }

    public List<SkillResponse> getSkillCatalog() {
        return skillRepository.findAllByOrderByNameAsc().stream()
                .map(skill -> new SkillResponse(skill.getId(), skill.getName()))
                .toList();
    }

    @Transactional
    public InternProfileResponse upsertProfile(UUID userId, InternProfileRequest request) {
        InternProfile profile = internProfileRepository.findByUserId(userId)
                .orElseGet(() -> new InternProfile(userId));

        if (request.firstName() != null) {
            profile.setFirstName(request.firstName());
        }

        if (request.lastName() != null) {
            profile.setLastName(request.lastName());
        }

        if (request.dateOfBirth() != null) {
            profile.setDateOfBirth(request.dateOfBirth());
        }

        if (request.phoneNumber() != null) {
            profile.setPhoneNumber(normalizeEgyptianPhoneNumber(request.phoneNumber()));
        }

        if (request.institutionName() != null) {
            profile.setInstitutionName(request.institutionName());
        }

        if (request.academicLevel() != null) {
            profile.setAcademicLevel(request.academicLevel());
        }

        if (request.academicYear() != null) {
            profile.setAcademicYear(request.academicYear().shortValue());
        }

        if (request.major() != null) {
            profile.setMajor(request.major());
        }

        if (request.expectedGraduationYear() != null) {
            validateExpectedGraduationYear(request.expectedGraduationYear());
            profile.setExpectedGraduationYear(request.expectedGraduationYear().shortValue());
        }

        if (request.skillIds() != null) {
            profile.setSkills(resolveSkills(request.skillIds()));
        }

        if (request.careerInterests() != null) {
            profile.setCareerInterests(request.careerInterests());
        }

        if (request.linkedinUrl() != null) {
            profile.setLinkedinUrl(request.linkedinUrl());
        }

        InternProfile saved = internProfileRepository.saveAndFlush(profile);
        return toResponse(saved);
    }

    @Transactional
    public CompletionResult completeOnboarding(UUID userId) {
        InternProfile profile = findProfileOrThrow(userId);

        if (profile.getOnboardingCompletedAt() != null) {
            return new CompletionResult(toResponse(profile), List.of());
        }

        List<String> missingFields = findMissingRequiredFields(profile);

        if (!missingFields.isEmpty()) {
            return new CompletionResult(null, missingFields);
        }

        profile.setOnboardingCompletedAt(OffsetDateTime.now(ZoneOffset.UTC));
        InternProfile saved = internProfileRepository.saveAndFlush(profile);

        return new CompletionResult(toResponse(saved), List.of());
    }

    private InternProfile findProfileOrThrow(UUID userId) {
        return internProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Intern profile not found"
                ));
    }

    private List<String> findMissingRequiredFields(InternProfile profile) {
        List<String> missing = new ArrayList<>();

        if (isBlank(profile.getFirstName())) {
            missing.add("firstName");
        }
        if (isBlank(profile.getLastName())) {
            missing.add("lastName");
        }
        if (profile.getDateOfBirth() == null) {
            missing.add("dateOfBirth");
        }
        if (isBlank(profile.getPhoneNumber())) {
            missing.add("phoneNumber");
        }
        if (isBlank(profile.getInstitutionName())) {
            missing.add("institutionName");
        }
        if (profile.getAcademicLevel() == null) {
            missing.add("academicLevel");
        }
        if (isBlank(profile.getMajor())) {
            missing.add("major");
        }
        if (profile.getExpectedGraduationYear() == null) {
            missing.add("expectedGraduationYear");
        }
        if (profile.getSkills().isEmpty()) {
            missing.add("skills");
        }
        if (isBlank(profile.getCareerInterests())) {
            missing.add("careerInterests");
        }

        if (profile.getAcademicLevel() == AcademicLevel.UNIVERSITY) {
            Short academicYear = profile.getAcademicYear();
            if (academicYear == null || academicYear < 1 || academicYear > 6) {
                missing.add("academicYear");
            }
        }

        return missing;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String normalizeEgyptianPhoneNumber(String phoneNumber) {
        if (LOCAL_EGYPT_PHONE.matcher(phoneNumber).matches()) {
            return "+20" + phoneNumber.substring(1);
        }

        if (INTERNATIONAL_EGYPT_PHONE.matcher(phoneNumber).matches()) {
            return phoneNumber;
        }

        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Phone number must be a valid Egyptian mobile number"
        );
    }

    private void validateExpectedGraduationYear(int expectedGraduationYear) {
        int currentYear = Year.now(ZoneOffset.UTC).getValue();

        if (expectedGraduationYear < currentYear
                || expectedGraduationYear > currentYear + MAX_GRADUATION_YEARS_AHEAD) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Expected graduation year must be between "
                            + currentYear + " and " + (currentYear + MAX_GRADUATION_YEARS_AHEAD)
            );
        }
    }

    private Set<Skill> resolveSkills(List<UUID> skillIds) {
        if (skillIds.isEmpty()) {
            return new HashSet<>();
        }

        List<Skill> found = skillRepository.findAllById(skillIds);
        Set<UUID> requestedUnique = new HashSet<>(skillIds);

        if (found.size() != requestedUnique.size()) {
            Set<UUID> foundIds = found.stream()
                    .map(Skill::getId)
                    .collect(java.util.stream.Collectors.toSet());

            List<UUID> unknown = requestedUnique.stream()
                    .filter(id -> !foundIds.contains(id))
                    .toList();

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Unknown skill id(s): " + unknown
            );
        }

        return new HashSet<>(found);
    }

    private InternProfileResponse toResponse(InternProfile profile) {
        List<SkillResponse> skills = profile.getSkills().stream()
                .sorted(Comparator.comparing(Skill::getName))
                .map(skill -> new SkillResponse(skill.getId(), skill.getName()))
                .toList();

        return new InternProfileResponse(
                profile.getId(),
                profile.getUserId(),
                profile.getFirstName(),
                profile.getLastName(),
                profile.getDateOfBirth(),
                profile.getPhoneNumber(),
                profile.getInstitutionName(),
                profile.getAcademicLevel(),
                toInteger(profile.getAcademicYear()),
                profile.getMajor(),
                toInteger(profile.getExpectedGraduationYear()),
                skills,
                profile.getCareerInterests(),
                profile.getLinkedinUrl(),
                profile.getOnboardingCompletedAt() != null,
                profile.getCreatedAt(),
                profile.getUpdatedAt()
        );
    }

    private static Integer toInteger(Short value) {
        return value == null ? null : value.intValue();
    }

    public record CompletionResult(
            InternProfileResponse profile,
            List<String> missingFields
    ) {
    }
}
