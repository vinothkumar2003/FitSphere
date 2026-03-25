package com.fitsphere.controller;

import com.fitsphere.dto.FitnessPlanRequest;
import com.fitsphere.model.FitnessPlan;
import com.fitsphere.service.FitnessPlanService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping({"/plans", "/gymplans"})
@CrossOrigin(origins = "*", maxAge = 3600)
public class FitnessPlanController {

    @Autowired
    private FitnessPlanService fitnessPlanService;

    /**
     * GET /plans - Get all fitness plans
     */
    @GetMapping
    public ResponseEntity<?> getAllPlans(
            @RequestParam(required = false) String difficulty,
            @RequestParam(required = false) String focusArea) {
        try {
            List<FitnessPlan> plans = fitnessPlanService.getAllPlans(difficulty, focusArea);
            return ResponseEntity.ok(plans);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * GET /plans/{id} - Get plan by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getPlanById(@PathVariable Long id) {
        try {
            Optional<FitnessPlan> plan = fitnessPlanService.getPlanById(id);
            if (plan.isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("message", "Plan not found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
            }
            return ResponseEntity.ok(plan.get());
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * POST /plans - Create new fitness plan (Admin only)
     */
    @PostMapping
    public ResponseEntity<?> createPlan(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @RequestBody FitnessPlanRequest planRequest) {
        try {
            String token = extractBearerToken(authorizationHeader);
            FitnessPlan savedPlan = fitnessPlanService.createPlan(planRequest, token);
            return ResponseEntity.status(HttpStatus.CREATED).body(savedPlan);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            if (e.getMessage().contains("Only ADMIN")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
            }
            if (e.getMessage().contains("Authorization token")
                    || e.getMessage().contains("Authorization header must use Bearer token")
                    || e.getMessage().contains("Invalid or expired JWT token")
                    || e.getMessage().contains("Invalid token purpose")
                    || e.getMessage().contains("Creator ID missing in token")
                    || e.getMessage().contains("Failed to extract user details from token")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
            }
            if (e.getMessage().contains("Trainer not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
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

    /**
     * PUT /plans/{id} - Update fitness plan
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updatePlan(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @PathVariable Long id,
            @RequestBody FitnessPlan planDetails) {
        try {
            String token = extractBearerToken(authorizationHeader);
            FitnessPlan updatedPlan = fitnessPlanService.updatePlan(id, planDetails, token);
            return ResponseEntity.ok(updatedPlan);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            if (e.getMessage().contains("Only ADMIN")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
            }
            if (e.getMessage().contains("Authorization token")
                    || e.getMessage().contains("Authorization header must use Bearer token")
                    || e.getMessage().contains("Invalid or expired JWT token")
                    || e.getMessage().contains("Invalid token purpose")
                    || e.getMessage().contains("Creator ID missing in token")
                    || e.getMessage().contains("Failed to extract user details from token")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
            }
            if (e.getMessage().contains("not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * DELETE /plans/{id} - Delete fitness plan
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePlan(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @PathVariable Long id) {
        try {
            String token = extractBearerToken(authorizationHeader);
            fitnessPlanService.deletePlan(id, token);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Plan deleted successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            if (e.getMessage().contains("Only ADMIN")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
            }
            if (e.getMessage().contains("Authorization token")
                    || e.getMessage().contains("Authorization header must use Bearer token")
                    || e.getMessage().contains("Invalid or expired JWT token")
                    || e.getMessage().contains("Invalid token purpose")
                    || e.getMessage().contains("Creator ID missing in token")
                    || e.getMessage().contains("Failed to extract user details from token")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
            }
            if (e.getMessage().contains("not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * GET /plans/trainer/my - Get plans assigned to the authenticated trainer
     */
    @GetMapping("/trainer/my")
    public ResponseEntity<?> getTrainerPlans(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader) {
        try {
            String token = extractBearerToken(authorizationHeader);
            List<FitnessPlan> plans = fitnessPlanService.getPlansForTrainer(token);
            return ResponseEntity.ok(plans);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            if (e.getMessage().contains("Authorization token")
                    || e.getMessage().contains("Authorization header must use Bearer token")
                    || e.getMessage().contains("Invalid or expired JWT token")
                    || e.getMessage().contains("Invalid token purpose")
                    || e.getMessage().contains("Creator ID missing in token")
                    || e.getMessage().contains("Failed to extract user details from token")
                    || e.getMessage().contains("Trainer ID missing in token")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
            }
            if (e.getMessage().contains("Only TRAINER")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
            }
            if (e.getMessage().contains("Trainer not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * GET /plans/trainer/{trainerId} - Get all plans by trainer
     */
    @GetMapping("/trainer/{trainerId}")
    public ResponseEntity<?> getPlansByTrainer(@PathVariable Long trainerId) {
        try {
            List<FitnessPlan> plans = fitnessPlanService.getPlansByTrainer(trainerId);
            return ResponseEntity.ok(plans);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            if (e.getMessage().contains("not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * GET /plans/admin/my - Get plans created by the authenticated admin
     */
    @GetMapping("/admin/my")
    public ResponseEntity<?> getAdminPlans(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader) {
        try {
            String token = extractBearerToken(authorizationHeader);
            List<FitnessPlan> plans = fitnessPlanService.getPlansCreatedByAdmin(token);
            return ResponseEntity.ok(plans);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            if (e.getMessage().contains("Authorization token")
                    || e.getMessage().contains("Authorization header must use Bearer token")
                    || e.getMessage().contains("Invalid or expired JWT token")
                    || e.getMessage().contains("Invalid token purpose")
                    || e.getMessage().contains("Creator ID missing in token")
                    || e.getMessage().contains("Failed to extract user details from token")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
            }
            if (e.getMessage().contains("Only ADMIN")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
            }
            if (e.getMessage().contains("Admin not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
}
