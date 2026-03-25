package com.fitsphere.service;

import com.fitsphere.dto.FitnessPlanRequest;
import com.fitsphere.model.FitnessPlan;
import com.fitsphere.model.User;
import com.fitsphere.model.UserRole;
import com.fitsphere.repository.FitnessPlanRepository;
import com.fitsphere.repository.UserRepository;
import com.fitsphere.util.JwtTokenProvider;
import io.jsonwebtoken.Claims;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
@Slf4j
public class FitnessPlanService {

    @Autowired
    private FitnessPlanRepository fitnessPlanRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    /**
     * Get all fitness plans with optional filters
     */
    public List<FitnessPlan> getAllPlans(String difficulty, String focusArea) {
        if (difficulty != null && !difficulty.isEmpty()) {
            return fitnessPlanRepository.findByDifficulty(difficulty);
        } else if (focusArea != null && !focusArea.isEmpty()) {
            return fitnessPlanRepository.findByFocusArea(focusArea);
        } else {
            return fitnessPlanRepository.findByActive(true);
        }
    }

    /**
     * Get fitness plan by ID
     */
    public Optional<FitnessPlan> getPlanById(Long id) {
        return fitnessPlanRepository.findById(id);
    }

    /**
     * Create new fitness plan
     */
    public FitnessPlan createPlan(FitnessPlanRequest planRequest, Long creatorId) {
        validateCreatePlanRequest(planRequest);

        User createdBy = userRepository.findById(creatorId)
                .orElseThrow(() -> new RuntimeException("Created by user not found"));

        if (createdBy.getRole() != UserRole.ADMIN) {
            throw new RuntimeException("Only ADMIN can create fitness plans");
        }

        User trainer = resolveTrainer(planRequest.getTrainerId());

        FitnessPlan fitnessPlan = FitnessPlan.create(
                planRequest.getName(),
                planRequest.getDescription(),
                planRequest.getPrice(),
                planRequest.getDurationWeeks(),
                planRequest.getSessionsPerWeek(),
                planRequest.getDifficulty(),
                planRequest.getActive(),
                createdBy,
                trainer,
                planRequest.getFocusArea());

        FitnessPlan savedPlan = fitnessPlanRepository.save(fitnessPlan);
        log.info("Fitness plan created successfully by admin {}: {}", creatorId, savedPlan.getName());
        return savedPlan;
    }

    public FitnessPlan createPlan(FitnessPlan plan, Long creatorId) {
        validateCreatePlanRequest(plan);

        User createdBy = userRepository.findById(creatorId)
                .orElseThrow(() -> new RuntimeException("Created by user not found"));

        if (createdBy.getRole() != UserRole.ADMIN) {
            throw new RuntimeException("Only ADMIN can create fitness plans");
        }

        User trainer = resolveTrainer(plan);

        FitnessPlan fitnessPlan = FitnessPlan.create(
                plan.getName(),
                plan.getDescription(),
                plan.getPrice(),
                plan.getDurationWeeks(),
                plan.getSessionsPerWeek(),
                plan.getDifficulty(),
                plan.getActive(),
                createdBy,
                trainer,
                plan.getFocusArea());

        FitnessPlan savedPlan = fitnessPlanRepository.save(fitnessPlan);
        log.info("Fitness plan created successfully: {}", savedPlan.getName());
        return savedPlan;
    }

    /**
     * Create new fitness plan using authenticated admin token
     */
    public FitnessPlan createPlan(FitnessPlan plan, String authToken) {
        Long creatorId = extractAdminIdFromToken(authToken);
        return createPlan(plan, creatorId);
    }

    /**
     * Create new fitness plan using authenticated admin token
     */
    public FitnessPlan createPlan(FitnessPlanRequest planRequest, String authToken) {
        Long creatorId = extractAdminIdFromToken(authToken);
        return createPlan(planRequest, creatorId);
    }

    /**
     * Update fitness plan
     */
    public FitnessPlan updatePlan(Long id, FitnessPlan planDetails, String authToken) {
        extractAdminIdFromToken(authToken);

        Optional<FitnessPlan> planOptional = fitnessPlanRepository.findById(id);
        if (planOptional.isEmpty()) {
            throw new RuntimeException("Plan not found");
        }

        FitnessPlan plan = planOptional.get();
        if (planDetails.getName() != null) plan.setName(planDetails.getName());
        if (planDetails.getDescription() != null) plan.setDescription(planDetails.getDescription());
        if (planDetails.getPrice() != null) plan.setPrice(planDetails.getPrice());
        if (planDetails.getDurationWeeks() != null) plan.setDurationWeeks(planDetails.getDurationWeeks());
        if (planDetails.getFocusArea() != null) plan.setFocusArea(planDetails.getFocusArea());
        if (planDetails.getSessionsPerWeek() != null) plan.setSessionsPerWeek(planDetails.getSessionsPerWeek());
        if (planDetails.getDifficulty() != null) plan.setDifficulty(planDetails.getDifficulty());
        User trainer = resolveTrainer(planDetails);
        if (trainer != null) plan.setTrainer(trainer);

        FitnessPlan updatedPlan = fitnessPlanRepository.save(plan);
        log.info("Fitness plan updated successfully: {}", updatedPlan.getName());
        return updatedPlan;
    }

    /**
     * Delete fitness plan
     */
    public void deletePlan(Long id, String authToken) {
        extractAdminIdFromToken(authToken);

        Optional<FitnessPlan> plan = fitnessPlanRepository.findById(id);
        if (plan.isEmpty()) {
            throw new RuntimeException("Plan not found");
        }

        fitnessPlanRepository.deleteById(id);
        log.info("Fitness plan deleted successfully");
    }

    private Long extractAdminIdFromToken(String authToken) {
        if (authToken == null || authToken.isBlank()) {
            throw new RuntimeException("Authorization token is required");
        }

        String resolvedToken = resolveAuthToken(authToken);

        if (!jwtTokenProvider.validateToken(resolvedToken)) {
            throw new RuntimeException("Invalid or expired JWT token");
        }

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
            throw new RuntimeException("Only ADMIN can modify fitness plans");
        }

        Long creatorId = claims.get("id", Long.class);
        if (creatorId == null) {
            Number creatorIdNumber = claims.get("id", Number.class);
            if (creatorIdNumber != null) {
                creatorId = creatorIdNumber.longValue();
            }
        }

        if (creatorId == null) {
            throw new RuntimeException("Creator ID missing in token");
        }

        return creatorId;
    }

    private Long extractTrainerIdFromToken(String authToken) {
        if (authToken == null || authToken.isBlank()) {
            throw new RuntimeException("Authorization token is required");
        }

        String resolvedToken = resolveAuthToken(authToken);

        if (!jwtTokenProvider.validateToken(resolvedToken)) {
            throw new RuntimeException("Invalid or expired JWT token");
        }

        Claims claims = jwtTokenProvider.getClaimsFromToken(resolvedToken);
        if (claims == null) {
            throw new RuntimeException("Failed to extract user details from token");
        }

        String purpose = claims.get("purpose", String.class);
        if (!"authenticated".equalsIgnoreCase(purpose)) {
            throw new RuntimeException("Invalid token purpose");
        }

        String role = claims.get("role", String.class);
        if (!UserRole.TRAINER.name().equalsIgnoreCase(role)) {
            throw new RuntimeException("Only TRAINER can view trainer plans");
        }

        Long trainerId = claims.get("id", Long.class);
        if (trainerId == null) {
            Number trainerIdNumber = claims.get("id", Number.class);
            if (trainerIdNumber != null) {
                trainerId = trainerIdNumber.longValue();
            }
        }

        if (trainerId == null) {
            throw new RuntimeException("Trainer ID missing in token");
        }

        return trainerId;
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

    private User resolveTrainer(FitnessPlan plan) {
        Long trainerId = plan.getTrainerId();
        if (trainerId == null && plan.getTrainer() != null) {
            trainerId = plan.getTrainer().getId();
        }

        return resolveTrainer(trainerId);
    }

    private User resolveTrainer(Long trainerId) {
        if (trainerId == null) {
            return null;
        }

        User trainer = userRepository.findById(trainerId)
                .orElseThrow(() -> new RuntimeException("Trainer not found"));

        if (trainer.getRole() != UserRole.TRAINER) {
            throw new RuntimeException("Assigned trainer must have TRAINER role");
        }

        return trainer;
    }

    private void validateCreatePlanRequest(FitnessPlan plan) {
        if (plan == null) {
            throw new RuntimeException("Plan details are required");
        }
        if (isBlank(plan.getName())) {
            throw new RuntimeException("Plan name is required");
        }
        if (isBlank(plan.getDescription())) {
            throw new RuntimeException("Plan description is required");
        }
        if (plan.getPrice() == null) {
            throw new RuntimeException("Plan price is required");
        }
        if (plan.getDurationWeeks() == null) {
            throw new RuntimeException("Plan durationWeeks is required");
        }
        if (isBlank(plan.getFocusArea())) {
            throw new RuntimeException("Plan focusArea is required");
        }
        if (plan.getSessionsPerWeek() == null) {
            throw new RuntimeException("Plan sessionsPerWeek is required");
        }
        if (isBlank(plan.getDifficulty())) {
            throw new RuntimeException("Plan difficulty is required");
        }
    }

    private void validateCreatePlanRequest(FitnessPlanRequest planRequest) {
        if (planRequest == null) {
            throw new RuntimeException("Plan details are required");
        }
        if (isBlank(planRequest.getName())) {
            throw new RuntimeException("Plan name is required");
        }
        if (isBlank(planRequest.getDescription())) {
            throw new RuntimeException("Plan description is required");
        }
        if (planRequest.getPrice() == null) {
            throw new RuntimeException("Plan price is required");
        }
        if (planRequest.getDurationWeeks() == null) {
            throw new RuntimeException("Plan durationWeeks is required");
        }
        if (isBlank(planRequest.getFocusArea())) {
            throw new RuntimeException("Plan focusArea is required");
        }
        if (planRequest.getSessionsPerWeek() == null) {
            throw new RuntimeException("Plan sessionsPerWeek is required");
        }
        if (isBlank(planRequest.getDifficulty())) {
            throw new RuntimeException("Plan difficulty is required");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    /**
     * Get all plans by trainer
     */
    public List<FitnessPlan> getPlansByTrainer(Long trainerId) {
        Optional<User> trainer = userRepository.findById(trainerId);
        if (trainer.isEmpty()) {
            throw new RuntimeException("Trainer not found");
        }

        return fitnessPlanRepository.findByTrainer(trainer.get());
    }

    /**
     * Get all plans created by the authenticated admin
     */
    public List<FitnessPlan> getPlansCreatedByAdmin(String authToken) {
        Long adminId = extractAdminIdFromToken(authToken);

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("Admin not found"));

        return fitnessPlanRepository.findByCreatedBy(admin);
    }

    /**
     * Get plans assigned to the authenticated trainer
     */
    public List<FitnessPlan> getPlansForTrainer(String authToken) {
        Long trainerId = extractTrainerIdFromToken(authToken);

        User trainer = userRepository.findById(trainerId)
                .orElseThrow(() -> new RuntimeException("Trainer not found"));

        return fitnessPlanRepository.findByTrainer(trainer);
    }
}
