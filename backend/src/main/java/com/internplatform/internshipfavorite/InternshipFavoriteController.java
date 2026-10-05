package com.internplatform.internshipfavorite;

import com.internplatform.internship.InternInternshipFeedService;
import com.internplatform.internship.InternInternshipResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/intern/favorites")
public class InternshipFavoriteController {

    private final InternshipFavoriteService favoriteService;
    private final InternInternshipFeedService internInternshipFeedService;

    public InternshipFavoriteController(
            InternshipFavoriteService favoriteService,
            InternInternshipFeedService internInternshipFeedService
    ) {
        this.favoriteService = favoriteService;
        this.internInternshipFeedService = internInternshipFeedService;
    }

    @GetMapping
    public List<InternInternshipResponse> getFavorites(@AuthenticationPrincipal Jwt jwt) {
        return internInternshipFeedService.getFavoriteInternships(currentUserId(jwt));
    }

    @PostMapping("/{internshipId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void addFavorite(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID internshipId
    ) {
        favoriteService.addFavorite(currentUserId(jwt), internshipId);
    }

    @DeleteMapping("/{internshipId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeFavorite(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID internshipId
    ) {
        favoriteService.removeFavorite(currentUserId(jwt), internshipId);
    }

    private UUID currentUserId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
