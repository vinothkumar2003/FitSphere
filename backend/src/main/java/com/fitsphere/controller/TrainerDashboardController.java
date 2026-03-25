package com.fitsphere.controller;

import com.fitsphere.dto.TrainerDashboardResponse;
import com.fitsphere.service.TrainerDashboardService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/trainer/dashboard")
@CrossOrigin(origins = "*", maxAge = 3600)
public class TrainerDashboardController {

    private final TrainerDashboardService trainerDashboardService;

    public TrainerDashboardController(TrainerDashboardService trainerDashboardService) {
        this.trainerDashboardService = trainerDashboardService;
    }

    @GetMapping("/overview")
    public ResponseEntity<?> getOverview(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader) {
        try {
            TrainerDashboardResponse dashboard = trainerDashboardService.getOverview(extractBearerToken(authorizationHeader));
            return ResponseEntity.ok(dashboard);
        } catch (Exception e) {
            return handleException(e);
        }
    }

    private ResponseEntity<?> handleException(Exception e) {
        Map<String, String> error = new HashMap<>();
        error.put("message", e.getMessage());

        if (e.getMessage().contains("Authorization token")
                || e.getMessage().contains("Authorization header must use Bearer token")
                || e.getMessage().contains("Invalid or expired JWT token")
                || e.getMessage().contains("Invalid token purpose")
                || e.getMessage().contains("User ID missing in token")
                || e.getMessage().contains("Failed to extract user details from token")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
        }
        if (e.getMessage().contains("Only TRAINER")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
        }

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    private String extractBearerToken(String authorizationHeader) {
        if (authorizationHeader == null || authorizationHeader.isBlank()) {
            throw new RuntimeException("Authorization token is required");
        }
        if (!authorizationHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Authorization header must use Bearer token");
        }

        String token = authorizationHeader.substring(7).trim();
        if (token.isEmpty()) {
            throw new RuntimeException("Authorization token is required");
        }
        return token;
    }
}
