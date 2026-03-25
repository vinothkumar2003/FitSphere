package com.fitsphere.service;

import com.fitsphere.model.User;
import com.fitsphere.model.UserRole;
import com.fitsphere.repository.UserRepository;
import com.fitsphere.util.JwtTokenProvider;
import io.jsonwebtoken.Claims;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class DashboardAuthorizationService {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;

    public DashboardAuthorizationService(JwtTokenProvider jwtTokenProvider, UserRepository userRepository) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.userRepository = userRepository;
    }

    public User requireRole(String authToken, UserRole role, String actionDescription) {
        if (authToken == null || authToken.isBlank()) {
            throw new RuntimeException("Authorization token is required");
        }

        String resolvedToken = resolveAuthToken(authToken);
        Claims claims = jwtTokenProvider.getClaimsFromToken(resolvedToken);
        if (claims == null) {
            throw new RuntimeException("Failed to extract user details from token");
        }

        String purpose = claims.get("purpose", String.class);
        if (!"authenticated".equalsIgnoreCase(purpose)) {
            throw new RuntimeException("Invalid token purpose");
        }

        String roleValue = claims.get("role", String.class);
        if (roleValue == null || !role.name().equalsIgnoreCase(roleValue)) {
            throw new RuntimeException("Only " + role.name() + " can " + actionDescription);
        }

        Long userId = claims.get("id", Long.class);
        if (userId == null) {
            Number userIdNumber = claims.get("id", Number.class);
            if (userIdNumber != null) {
                userId = userIdNumber.longValue();
            }
        }

        if (userId == null) {
            throw new RuntimeException("User ID missing in token");
        }

        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private String resolveAuthToken(String authToken) {
        if (jwtTokenProvider.validateToken(authToken)) {
            return authToken;
        }

        try {
            String decryptedToken = jwtTokenProvider.decryptToken(authToken);
            if (jwtTokenProvider.validateToken(decryptedToken)) {
                return decryptedToken;
            }
        } catch (Exception ex) {
            log.debug("Authorization token is not encrypted JWT format", ex);
        }

        throw new RuntimeException("Invalid or expired JWT token");
    }
}
