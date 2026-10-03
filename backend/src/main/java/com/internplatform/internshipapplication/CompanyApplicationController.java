package com.internplatform.internshipapplication;

import jakarta.validation.Valid;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/company/internships/{internshipId}/applications")
public class CompanyApplicationController {

    private final CompanyApplicationService companyApplicationService;

    public CompanyApplicationController(CompanyApplicationService companyApplicationService) {
        this.companyApplicationService = companyApplicationService;
    }

    @GetMapping
    public List<CompanyApplicationListItemResponse> listApplications(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID internshipId
    ) {
        return companyApplicationService.listApplications(currentUserId(jwt), internshipId);
    }

    @GetMapping("/{applicationId}")
    public CompanyApplicationDetailResponse getApplication(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID internshipId,
            @PathVariable UUID applicationId
    ) {
        return companyApplicationService.getApplication(currentUserId(jwt), internshipId, applicationId);
    }

    @GetMapping("/{applicationId}/cv")
    public ResponseEntity<byte[]> downloadCv(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID internshipId,
            @PathVariable UUID applicationId
    ) {
        CompanyApplicationService.CvDownload cv =
                companyApplicationService.getCvSnapshot(currentUserId(jwt), internshipId, applicationId);

        MediaType contentType;
        try {
            contentType = MediaType.parseMediaType(cv.contentType());
        } catch (Exception exception) {
            contentType = MediaType.APPLICATION_OCTET_STREAM;
        }

        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(cv.fileName() != null ? cv.fileName() : "cv.pdf", StandardCharsets.UTF_8)
                .build();

        return ResponseEntity.ok()
                .contentType(contentType)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(cv.bytes());
    }

    @PatchMapping("/{applicationId}/status")
    public CompanyApplicationDetailResponse updateStatus(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID internshipId,
            @PathVariable UUID applicationId,
            @Valid @RequestBody CompanyApplicationStatusUpdateRequest request
    ) {
        return companyApplicationService.decideApplication(currentUserId(jwt), internshipId, applicationId, request);
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
