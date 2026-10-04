package com.internplatform.admin;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * ADMIN-only company approval review. Access is enforced entirely by SecurityConfig
 * (.requestMatchers("/api/v1/admin/**").hasRole("ADMIN")) — nothing here re-checks the role,
 * matching the rest of the app's convention of enforcing authorization at the security filter
 * chain rather than per-controller.
 */
@RestController
@RequestMapping("/api/v1/admin/company-requests")
public class AdminCompanyRequestController {

    private final AdminCompanyRequestService adminCompanyRequestService;

    public AdminCompanyRequestController(AdminCompanyRequestService adminCompanyRequestService) {
        this.adminCompanyRequestService = adminCompanyRequestService;
    }

    @GetMapping
    public List<AdminCompanyRequestResponse> listRequests(
            @RequestParam(required = false) String status
    ) {
        return adminCompanyRequestService.listRequests(status);
    }

    @GetMapping("/{companyId}")
    public AdminCompanyRequestResponse getRequest(
            @PathVariable UUID companyId
    ) {
        return adminCompanyRequestService.getRequest(companyId);
    }

    @PatchMapping("/{companyId}/status")
    public AdminCompanyRequestResponse updateStatus(
            @PathVariable UUID companyId,
            @Valid @RequestBody AdminCompanyRequestStatusUpdateRequest request
    ) {
        return adminCompanyRequestService.decide(companyId, request.status());
    }
}
