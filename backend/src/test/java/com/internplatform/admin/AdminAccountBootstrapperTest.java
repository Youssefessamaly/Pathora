package com.internplatform.admin;

import com.internplatform.user.Role;
import com.internplatform.user.User;
import com.internplatform.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Exercises AdminAccountBootstrapper's logic directly — constructed with explicit
 * email/password arguments rather than through @Value-injected environment variables — so this
 * test never depends on (or risks permanently polluting the test database via) the actual
 * process environment or the shared Spring context's own ApplicationRunner startup timing.
 */
@SpringBootTest
@Transactional
class AdminAccountBootstrapperTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String uniqueEmail() {
        return "admin-bootstrap-" + UUID.randomUUID() + "@example.test";
    }

    @Test
    void createsAdminWithHashedPasswordWhenNoneExists() {
        String email = uniqueEmail();
        AdminAccountBootstrapper bootstrapper =
                new AdminAccountBootstrapper(userRepository, passwordEncoder, email, "SuperSecret123!");

        bootstrapper.run(null);

        Optional<User> admin = userRepository.findByEmailIgnoreCase(email);
        assertThat(admin).isPresent();
        assertThat(admin.get().getRole()).isEqualTo(Role.ADMIN);
        assertThat(admin.get().getPasswordHash()).isNotEqualTo("SuperSecret123!");
        assertThat(passwordEncoder.matches("SuperSecret123!", admin.get().getPasswordHash())).isTrue();
    }

    @Test
    void doesNotOverwriteExistingAdminOnRepeatedRun() {
        String email = uniqueEmail();
        AdminAccountBootstrapper firstRun =
                new AdminAccountBootstrapper(userRepository, passwordEncoder, email, "FirstPassword123!");
        firstRun.run(null);
        String originalHash = userRepository.findByEmailIgnoreCase(email).orElseThrow().getPasswordHash();

        // Simulates a second startup with a different configured password — must not reset it.
        AdminAccountBootstrapper secondRun =
                new AdminAccountBootstrapper(userRepository, passwordEncoder, email, "DifferentPassword456!");
        secondRun.run(null);

        User admin = userRepository.findByEmailIgnoreCase(email).orElseThrow();
        assertThat(admin.getPasswordHash()).isEqualTo(originalHash);
        assertThat(userRepository.findByEmailIgnoreCase(email)).isPresent();
    }

    @Test
    void blankCredentialsAreNoOp() {
        long before = userRepository.count();
        AdminAccountBootstrapper bootstrapper =
                new AdminAccountBootstrapper(userRepository, passwordEncoder, "", "");

        bootstrapper.run(null);

        assertThat(userRepository.count()).isEqualTo(before);
    }
}
