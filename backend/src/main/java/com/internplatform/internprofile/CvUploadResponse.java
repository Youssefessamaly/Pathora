package com.internplatform.internprofile;

import java.time.OffsetDateTime;
import java.util.List;

public record CvUploadResponse(
        String fileName,
        String contentType,
        Integer sizeBytes,
        OffsetDateTime uploadedAt,
        List<SkillResponse> detectedSkills
) {
}
