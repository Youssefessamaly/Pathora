package com.internplatform.auth;

import com.internplatform.user.Role;

import java.time.OffsetDateTime;
import java.util.UUID;

public record RegisterResponse(
        UUID id,
        String email,
        Role role,
        boolean enabled,
        OffsetDateTime createdAt
) {
}