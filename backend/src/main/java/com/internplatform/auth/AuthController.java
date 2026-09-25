package com.internplatform.auth;

import com.internplatform.user.Role;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register/intern")
    @ResponseStatus(HttpStatus.CREATED)
    public RegisterResponse registerIntern(
            @Valid @RequestBody RegisterRequest request
    ) {
        return authService.registerIntern(request);
    }

    @PostMapping("/register/company")
    @ResponseStatus(HttpStatus.CREATED)
    public RegisterResponse registerCompany(
            @Valid @RequestBody RegisterRequest request
    ) {
        return authService.registerCompany(request);
    }

    @PostMapping("/login")
    public LoginResponse login(
            @Valid @RequestBody LoginRequest request
    ) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public CurrentUserResponse currentUser(
            @AuthenticationPrincipal Jwt jwt
    ) {
        return new CurrentUserResponse(
                UUID.fromString(jwt.getSubject()),
                jwt.getClaimAsString("email"),
                Role.valueOf(jwt.getClaimAsString("role"))
        );
    }
}