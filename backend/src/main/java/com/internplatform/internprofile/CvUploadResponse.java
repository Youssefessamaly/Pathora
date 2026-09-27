package com.internplatform.internprofile;

import java.time.OffsetDateTime;

public record CvUploadResponse(
        String fileName,
        String contentType,
        Integer sizeBytes,
        OffsetDateTime uploadedAt
) {
}
