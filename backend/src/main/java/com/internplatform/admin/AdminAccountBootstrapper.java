package com.internplatform.admin;

import com.internplatform.user.Role;
import com.internplatform.user.User;
import com.internplatform.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Locale;

/**
 * Provisions exactly one ADMIN account from environment-controlled credentials
 * (PATHORA_ADMIN_EMAIL / PATHORA_ADMIN_PASSWORD — see application.yml) on startup. This is the
 * ONLY way an ADMIN account is ever created: there is deliberately no public HTTP registration
 * endpoint for the ADMIN role.
 *
 * Safe-by-construction:
 * - a no-op if either variable is unset/blank — nothing to provision, nothing happens;
 * - a no-op if a user with that email already exists — an existing admin's password is never
 *   reset just because the app restarted;
 * - the password is BCrypt-hashed (the same PasswordEncoder bean every login check uses)
 *   before it ever reaches the database — no plaintext password is persisted;
 * - neither the email nor the password is ever logged, only the outcome.
 */
@Component
public class AdminAccountBootstrapper implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminAccountBootstrapper.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String bootstrapEmail;
    private final String bootstrapPassword;

    public AdminAccountBootstrapper(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.admin.bootstrap-email:}") String bootstrapEmail,
            @Value("${app.admin.bootstrap-password:}") String bootstrapPassword
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.bootstrapEmail = bootstrapEmail;
        this.bootstrapPassword = bootstrapPassword;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (bootstrapEmail.isBlank() || bootstrapPassword.isBlank()) {
            return;
        }

        String normalizedEmail = bootstrapEmail.trim().toLowerCase(Locale.ROOT);

        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            log.info("Admin bootstrap: an account for the configured admin email already exists — skipping.");
            return;
        }

        User admin = new User(normalizedEmail, passwordEncoder.encode(bootstrapPassword), Role.ADMIN);
        userRepository.saveAndFlush(admin);
        log.info("Admin bootstrap: created a new ADMIN account.");
    }
}
