package com.fitsphere.service;

import com.fitsphere.model.UserRole;
import com.fitsphere.util.JwtTokenProvider;
import io.jsonwebtoken.Claims;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class AdminAuthorizationService {

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    public Long requireAdmin(String authToken, String actionDescription) {
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

        String role = claims.get("role", String.class);
        if (!UserRole.ADMIN.name().equalsIgnoreCase(role)) {
            throw new RuntimeException("Only ADMIN can " + actionDescription);
        }

        Long adminId = claims.get("id", Long.class);
        if (adminId == null) {
            Number adminIdNumber = claims.get("id", Number.class);
            if (adminIdNumber != null) {
                adminId = adminIdNumber.longValue();
            }
        }

        if (adminId == null) {
            throw new RuntimeException("Admin ID missing in token");
        }

        return adminId;
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
