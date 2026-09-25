package com.internplatform.auth;

import com.internplatform.user.Role;

import java.util.UUID;

public record LoginResponse(
        String accessToken,
        String tokenType,
        UUID userId,
        String email,
        Role role
) {
}