package com.internplatform.admin;

import com.internplatform.companyprofile.ApprovalStatus;
import com.internplatform.companyprofile.CompanyProfile;
import com.internplatform.companyprofile.CompanyProfileRepository;
import com.internplatform.user.User;
import com.internplatform.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Admin-only review of company approval requests. "Company request" and CompanyProfile are the
 * same row — every COMPANY user gets one immediately at registration (see
 * AuthService.registerCompany), always starting PENDING, so this never needs to reach for
 * anything beyond the existing CompanyProfile/User data already on file.
 */
@Service
public class AdminCompanyRequestService {

    private final CompanyProfileRepository companyProfileRepository;
    private final UserRepository userRepository;

    public AdminCompanyRequestService(
            CompanyProfileRepository companyProfileRepository,
            UserRepository userRepository
    ) {
        this.companyProfileRepository = companyProfileRepository;
        this.userRepository = userRepository;
    }

    /** No ?status filter defaults to PENDING — the admin's primary job is working the review
     *  queue, not browsing every company ever registered. */
    @Transactional(readOnly = true)
    public List<AdminCompanyRequestResponse> listRequests(String statusParam) {
        ApprovalStatus status = statusParam == null ? ApprovalStatus.PENDING : parseStatus(statusParam);

        return companyProfileRepository.findAllByApprovalStatusOrderByCreatedAtAsc(status).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public AdminCompanyRequestResponse getRequest(UUID companyProfileId) {
        return toResponse(findProfileOrThrow(companyProfileId));
    }

    /**
     * Applies the admin's APPROVED/REJECTED decision. PENDING -> APPROVED and PENDING ->
     * REJECTED are the only allowed transitions; a request that has already been decided
     * returns 409 rather than silently being overwritten (no reversal/reconsideration in this
     * MVP). Every validation — the decision value, the request's existence, its current
     * status — runs before the entity is touched.
     */
    @Transactional
    public AdminCompanyRequestResponse decide(UUID companyProfileId, ApprovalStatus decision) {
        if (decision != ApprovalStatus.APPROVED && decision != ApprovalStatus.REJECTED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status must be APPROVED or REJECTED");
        }

        CompanyProfile profile = findProfileOrThrow(companyProfileId);

        if (profile.getApprovalStatus() != ApprovalStatus.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "This company request has already been decided");
        }

        profile.recordApprovalDecision(decision, OffsetDateTime.now(ZoneOffset.UTC));
        CompanyProfile saved = companyProfileRepository.saveAndFlush(profile);

        return toResponse(saved);
    }

    private CompanyProfile findProfileOrThrow(UUID companyProfileId) {
        return companyProfileRepository.findById(companyProfileId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Company request not found"));
    }

    private ApprovalStatus parseStatus(String raw) {
        try {
            return ApprovalStatus.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown status: " + raw);
        }
    }

    private AdminCompanyRequestResponse toResponse(CompanyProfile profile) {
        String email = userRepository.findById(profile.getUserId())
                .map(User::getEmail)
                .orElse(null);

        return new AdminCompanyRequestResponse(
                profile.getId(),
                profile.getUserId(),
                profile.getCompanyName(),
                email,
                profile.getIndustry(),
                profile.getCompanySize(),
                profile.getLocation(),
                profile.getWebsite(),
                profile.getDescription(),
                profile.getContactName(),
                profile.getContactPhone(),
                profile.isOnboardingCompleted(),
                profile.getApprovalStatus(),
                profile.getCreatedAt(),
                profile.getApprovalReviewedAt()
        );
    }
}
