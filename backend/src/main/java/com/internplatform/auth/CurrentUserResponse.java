package com.internplatform.auth;

import com.internplatform.user.Role;

import java.util.UUID;

public record CurrentUserResponse(
        UUID userId,
        String email,
        Role role
) {
}