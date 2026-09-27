package com.internplatform.internprofile;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

/**
 * Local-filesystem storage for uploaded CVs. Files are addressed only by a
 * server-generated storage key — the client's original filename and any
 * client-supplied path segments are never used to build a filesystem path.
 */
@Service
public class CvStorageService {

    private final Path baseDirectory;

    public CvStorageService(@Value("${app.cv-storage.directory}") String directory) {
        this.baseDirectory = Path.of(directory).toAbsolutePath().normalize();
        try {
            Files.createDirectories(baseDirectory);
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to create CV storage directory", exception);
        }
    }

    /**
     * Stores the given bytes under a fresh, server-generated key scoped to the profile.
     * Returns the storage key (relative to the base directory) — never an absolute path.
     */
    public String store(UUID internProfileId, byte[] content) {
        String storageKey = internProfileId + "/" + UUID.randomUUID() + ".pdf";
        Path target = resolveWithinBaseDirectory(storageKey);

        try {
            Files.createDirectories(target.getParent());
            Files.write(target, content);
        } catch (IOException exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Unable to store the uploaded file"
            );
        }

        return storageKey;
    }

    /** Best-effort delete of a previously stored file; never throws if it's already gone. */
    public void delete(String storageKey) {
        if (storageKey == null) {
            return;
        }
        try {
            Files.deleteIfExists(resolveWithinBaseDirectory(storageKey));
        } catch (IOException ignored) {
            // A stray orphaned file is not worth failing the request over.
        }
    }

    private Path resolveWithinBaseDirectory(String storageKey) {
        Path resolved = baseDirectory.resolve(storageKey).normalize();
        if (!resolved.startsWith(baseDirectory)) {
            throw new IllegalArgumentException("Invalid storage key");
        }
        return resolved;
    }
}
