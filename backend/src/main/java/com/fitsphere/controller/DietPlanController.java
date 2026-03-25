package com.fitsphere.controller;

import com.fitsphere.model.DietPlan;
import com.fitsphere.service.DietPlanService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/diet")
@CrossOrigin(origins = "*", maxAge = 3600)
public class DietPlanController {

    @Autowired
    private DietPlanService dietPlanService;

    /**
     * GET /diet - Get all diet plans
     */
    @GetMapping
    public ResponseEntity<?> getAllDietPlans() {
        try {
            List<DietPlan> plans = dietPlanService.getAllDietPlans();
            return ResponseEntity.ok(plans);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * GET /diet/{id} - Get diet plan by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getDietPlanById(@PathVariable Long id) {
        try {
            Optional<DietPlan> dietPlan = dietPlanService.getDietPlanById(id);
            if (dietPlan.isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("message", "Diet plan not found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
            }
            return ResponseEntity.ok(dietPlan.get());
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * POST /diet - Create new diet plan (Trainer only)
     */
    @PostMapping
    public ResponseEntity<?> createDietPlan(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @RequestBody DietPlan dietPlan,
            @RequestParam Long trainerId,
            @RequestParam Long userId) {
        try {
            String token = extractBearerToken(authorizationHeader);
            DietPlan savedDietPlan = dietPlanService.createDietPlan(token, dietPlan, trainerId, userId);
            return ResponseEntity.status(HttpStatus.CREATED).body(savedDietPlan);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            if (e.getMessage().contains("Only ADMIN or TRAINER")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
            }
            if (e.getMessage().contains("Authorization token")
                    || e.getMessage().contains("Invalid or expired JWT token")
                    || e.getMessage().contains("Invalid token purpose")
                    || e.getMessage().contains("User ID missing")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
            }
            if (e.getMessage().contains("not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    /**
     * PUT /diet/{id} - Update diet plan
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateDietPlan(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @PathVariable Long id,
            @RequestBody DietPlan dietPlanDetails) {
        try {
            String token = extractBearerToken(authorizationHeader);
            DietPlan updatedDietPlan = dietPlanService.updateDietPlan(token, id, dietPlanDetails);
            return ResponseEntity.ok(updatedDietPlan);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            if (e.getMessage().contains("Only ADMIN or TRAINER") || e.getMessage().contains("not assigned")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
            }
            if (e.getMessage().contains("Authorization token")
                    || e.getMessage().contains("Invalid or expired JWT token")
                    || e.getMessage().contains("Invalid token purpose")
                    || e.getMessage().contains("User ID missing")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
            }
            if (e.getMessage().contains("not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    /**
     * DELETE /diet/{id} - Delete diet plan
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDietPlan(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @PathVariable Long id) {
        try {
            String token = extractBearerToken(authorizationHeader);
            dietPlanService.deleteDietPlan(token, id);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Diet plan deleted successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            if (e.getMessage().contains("Only ADMIN or TRAINER") || e.getMessage().contains("not assigned")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
            }
            if (e.getMessage().contains("Authorization token")
                    || e.getMessage().contains("Invalid or expired JWT token")
                    || e.getMessage().contains("Invalid token purpose")
                    || e.getMessage().contains("User ID missing")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
            }
            if (e.getMessage().contains("not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    /**
     * GET /diet/user/{userId} - Get diet plan for a user
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserDietPlan(@PathVariable Long userId) {
        try {
            Optional<DietPlan> dietPlan = dietPlanService.getUserDietPlan(userId);
            if (dietPlan.isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("message", "No diet plan assigned");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
            }
            return ResponseEntity.ok(dietPlan.get());
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * GET /diet/trainer/{trainerId} - Get all diet plans created by a trainer
     */
    @GetMapping("/trainer/{trainerId}")
    public ResponseEntity<?> getTrainerDietPlans(@PathVariable Long trainerId) {
        try {
            List<DietPlan> dietPlans = dietPlanService.getTrainerDietPlans(trainerId);
            return ResponseEntity.ok(dietPlans);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * GET /diet/plan/{planId} - Get diet plans for clients who booked a specific plan
     */
    @GetMapping("/plan/{planId}")
    public ResponseEntity<?> getDietPlansByPlanId(@PathVariable Long planId) {
        try {
            List<DietPlan> dietPlans = dietPlanService.getDietPlansByPlanId(planId);
            return ResponseEntity.ok(dietPlans);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            if (e.getMessage().contains("not found") || e.getMessage().contains("No approved bookings")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
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
}
