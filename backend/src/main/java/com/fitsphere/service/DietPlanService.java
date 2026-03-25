package com.fitsphere.service;

import com.fitsphere.model.DietPlan;
import com.fitsphere.model.FitnessPlan;
import com.fitsphere.model.PlanBooked;
import com.fitsphere.model.User;
import com.fitsphere.model.UserRole;
import com.fitsphere.repository.DietPlanRepository;
import com.fitsphere.repository.FitnessPlanRepository;
import com.fitsphere.repository.PlanBookedRepository;
import com.fitsphere.repository.UserRepository;
import com.fitsphere.util.JwtTokenProvider;
import io.jsonwebtoken.Claims;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@Slf4j
public class DietPlanService {

    @Autowired
    private DietPlanRepository dietPlanRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FitnessPlanRepository fitnessPlanRepository;

    @Autowired
    private PlanBookedRepository planBookedRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    /**
     * Get all active diet plans
     */
    public List<DietPlan> getAllDietPlans() {
        return dietPlanRepository.findByActive(true);
    }

    /**
     * Get diet plan by ID
     */
    public Optional<DietPlan> getDietPlanById(Long id) {
        return dietPlanRepository.findById(id);
    }

    /**
     * Create new diet plan
     */
    public DietPlan createDietPlan(String authToken, DietPlan dietPlan, Long trainerId, Long userId) {
        AuthenticatedUser actor = extractTrainerOrAdmin(authToken);

        if (userId == null) {
            throw new RuntimeException("User ID is required");
        }

        Optional<User> user = userRepository.findById(userId);
        if (user.isEmpty()) {
            throw new RuntimeException("User not found");
        }

        User resolvedTrainer;
        if (actor.role() == UserRole.TRAINER) {
            resolvedTrainer = actor.user();
        } else {
            if (trainerId == null) {
                throw new RuntimeException("Trainer ID is required for admin created diet plans");
            }
            resolvedTrainer = userRepository.findById(trainerId)
                    .orElseThrow(() -> new RuntimeException("Trainer not found"));
            if (resolvedTrainer.getRole() != UserRole.TRAINER) {
                throw new RuntimeException("Provided trainer is not a TRAINER user");
            }
        }

        dietPlan.setTrainer(resolvedTrainer);
        dietPlan.setUser(user.get());

        DietPlan savedDietPlan = dietPlanRepository.save(dietPlan);
        log.info("Diet plan created successfully: {}", savedDietPlan.getName());
        return savedDietPlan;
    }

    /**
     * Update diet plan
     */
    public DietPlan updateDietPlan(String authToken, Long id, DietPlan dietPlanDetails) {
        AuthenticatedUser actor = extractTrainerOrAdmin(authToken);
        Optional<DietPlan> dietPlanOptional = dietPlanRepository.findById(id);
        if (dietPlanOptional.isEmpty()) {
            throw new RuntimeException("Diet plan not found");
        }

        DietPlan dietPlan = dietPlanOptional.get();
        if (actor.role() == UserRole.TRAINER &&
                dietPlan.getTrainer() != null &&
                !actor.user().getId().equals(dietPlan.getTrainer().getId())) {
            throw new RuntimeException("Trainer is not assigned to this diet plan");
        }

        if (dietPlanDetails.getName() != null) dietPlan.setName(dietPlanDetails.getName());
        if (dietPlanDetails.getDescription() != null) dietPlan.setDescription(dietPlanDetails.getDescription());
        if (dietPlanDetails.getDailyCalories() != null) dietPlan.setDailyCalories(dietPlanDetails.getDailyCalories());
        if (dietPlanDetails.getDietType() != null) dietPlan.setDietType(dietPlanDetails.getDietType());
        if (dietPlanDetails.getBreakfastPlan() != null) dietPlan.setBreakfastPlan(dietPlanDetails.getBreakfastPlan());
        if (dietPlanDetails.getLunchPlan() != null) dietPlan.setLunchPlan(dietPlanDetails.getLunchPlan());
        if (dietPlanDetails.getDinnerPlan() != null) dietPlan.setDinnerPlan(dietPlanDetails.getDinnerPlan());
        if (dietPlanDetails.getSnacksPlan() != null) dietPlan.setSnacksPlan(dietPlanDetails.getSnacksPlan());
        if (dietPlanDetails.getRestrictions() != null) dietPlan.setRestrictions(dietPlanDetails.getRestrictions());

        DietPlan updatedDietPlan = dietPlanRepository.save(dietPlan);
        log.info("Diet plan updated successfully: {}", updatedDietPlan.getName());
        return updatedDietPlan;
    }

    /**
     * Delete diet plan
     */
    public void deleteDietPlan(String authToken, Long id) {
        AuthenticatedUser actor = extractTrainerOrAdmin(authToken);
        Optional<DietPlan> dietPlan = dietPlanRepository.findById(id);
        if (dietPlan.isEmpty()) {
            throw new RuntimeException("Diet plan not found");
        }

        if (actor.role() == UserRole.TRAINER &&
                dietPlan.get().getTrainer() != null &&
                !actor.user().getId().equals(dietPlan.get().getTrainer().getId())) {
            throw new RuntimeException("Trainer is not assigned to this diet plan");
        }

        dietPlanRepository.deleteById(id);
        log.info("Diet plan deleted successfully");
    }

    /**
     * Get diet plan for a user
     */
    public Optional<DietPlan> getUserDietPlan(Long userId) {
        Optional<User> user = userRepository.findById(userId);
        if (user.isEmpty()) {
            throw new RuntimeException("User not found");
        }

        return dietPlanRepository.findByUser(user.get());
    }

    /**
     * Get all diet plans created by a trainer
     */
    public List<DietPlan> getTrainerDietPlans(Long trainerId) {
        Optional<User> trainer = userRepository.findById(trainerId);
        if (trainer.isEmpty()) {
            throw new RuntimeException("Trainer not found");
        }

        return dietPlanRepository.findByTrainer(trainer.get());
    }

    /**
     * Get diet plans for clients who booked a specific fitness plan
     */
    public List<DietPlan> getDietPlansByPlanId(Long planId) {
        FitnessPlan plan = fitnessPlanRepository.findById(planId)
                .orElseThrow(() -> new RuntimeException("Plan not found"));

        PlanBooked planBooked = planBookedRepository.findByPlan(plan)
                .orElseThrow(() -> new RuntimeException("No approved bookings found for this plan"));

        List<Integer> clientIds = planBooked.getClientIds();
        if (clientIds == null || clientIds.isEmpty()) {
            return new ArrayList<>();
        }

        List<User> clients = userRepository.findAllById(
                clientIds.stream()
                        .map(Integer::longValue)
                        .toList()
        );

        if (clients.isEmpty()) {
            return new ArrayList<>();
        }

        return dietPlanRepository.findByUserIn(clients);
    }

    private AuthenticatedUser extractTrainerOrAdmin(String authToken) {
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
        UserRole role = roleValue != null ? UserRole.valueOf(roleValue.toUpperCase()) : null;
        if (role != UserRole.ADMIN && role != UserRole.TRAINER) {
            throw new RuntimeException("Only ADMIN or TRAINER can manage diet plans");
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

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return new AuthenticatedUser(user, role);
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

    private record AuthenticatedUser(User user, UserRole role) {
    }
}
