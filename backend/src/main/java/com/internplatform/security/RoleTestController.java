package com.internplatform.security;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class RoleTestController {

    @GetMapping("/intern/test")
    public Map<String, String> internOnly() {
        return Map.of(
                "message",
                "INTERN access granted"
        );
    }

    @GetMapping("/company/test")
    public Map<String, String> companyOnly() {
        return Map.of(
                "message",
                "COMPANY access granted"
        );
    }

    @GetMapping("/admin/test")
    public Map<String, String> adminOnly() {
        return Map.of(
                "message",
                "ADMIN access granted"
        );
    }
}