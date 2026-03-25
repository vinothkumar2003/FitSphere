package com.fitsphere.service;

import com.fitsphere.model.PlanBooking;
import com.fitsphere.model.BookingStatus;
import com.fitsphere.model.User;
import com.fitsphere.model.FitnessPlan;
import com.fitsphere.model.PlanBooked;
import com.fitsphere.model.UserRole;
import com.fitsphere.repository.PlanBookingRepository;
import com.fitsphere.repository.PlanBookedRepository;
import com.fitsphere.repository.UserRepository;
import com.fitsphere.repository.FitnessPlanRepository;
import com.fitsphere.util.JwtTokenProvider;
import io.jsonwebtoken.Claims;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@Slf4j
public class PlanBookingService {

    @Autowired
    private PlanBookingRepository bookingRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FitnessPlanRepository planRepository;

    @Autowired
    private PlanBookedRepository planBookedRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    /**
     * Get all bookings
     */
    public List<PlanBooking> getAllBookings() {
        return bookingRepository.findAll();
    }

    /**
     * Get booking by ID
     */
    public Optional<PlanBooking> getBookingById(Long id) {
        return bookingRepository.findById(id);
    }

    /**
     * Book a fitness plan
     */
    public PlanBooking bookPlan(Long userId, Long planId, Long trainerId, PlanBooking bookingDetails) {
        Optional<User> user = userRepository.findById(userId);
        Optional<FitnessPlan> plan = planRepository.findById(planId);

        if (user.isEmpty() || plan.isEmpty()) {
            throw new RuntimeException("User or Plan not found");
        }

        User bookingUser = user.get();
        FitnessPlan selectedPlan = plan.get();
        validateBookingDoesNotAlreadyExist(bookingUser, selectedPlan);
        mergeMissingUserDetails(bookingUser, bookingDetails);
        validateRequiredBookingProfileFields(bookingUser);

        PlanBooking booking = new PlanBooking();
        booking.setUser(bookingUser);
        booking.setPlan(selectedPlan);
        booking.setStatus(BookingStatus.PENDING);
        booking.setStartDate(LocalDateTime.now());
        booking.setAmountPaid(resolveBookingAmount(bookingDetails, selectedPlan));

        if (trainerId != null) {
            Optional<User> trainer = userRepository.findById(trainerId);
            if (trainer.isPresent()) {
                booking.setTrainer(trainer.get());
            }
        } else if (plan.get().getTrainer() != null) {
            booking.setTrainer(plan.get().getTrainer());
        }

        if (bookingDetails != null && bookingDetails.getNotes() != null) {
            booking.setNotes(bookingDetails.getNotes());
        }

        PlanBooking savedBooking = bookingRepository.save(booking);
        log.info("Plan booking created successfully for user: {}", user.get().getUsername());

        // Send booking confirmation email
        try {
            emailService.sendBookingConfirmation(
                bookingUser.getEmail(),
                bookingUser.getFullName(),
                plan.get().getName(),
                booking.getTrainer() != null ? booking.getTrainer().getFullName() : "To be assigned",
                booking.getStartDate().toString(),
                booking.getAmountPaid() != null ? booking.getAmountPaid() : plan.get().getPrice()
            );
        } catch (Exception e) {
            log.error("Failed to send booking confirmation email", e);
        }

        return savedBooking;
    }

    public PlanBooking bookPlanForAuthenticatedUser(String authToken, Long planId, Long trainerId, PlanBooking bookingDetails) {
        Long userId = extractAuthenticatedUserIdFromToken(authToken);
        return bookPlan(userId, planId, trainerId, bookingDetails);
    }

    /**
     * Update booking
     */
    public PlanBooking updateBooking(Long id, PlanBooking bookingDetails) {
        Optional<PlanBooking> bookingOptional = bookingRepository.findById(id);
        if (bookingOptional.isEmpty()) {
            throw new RuntimeException("Booking not found");
        }

        PlanBooking booking = bookingOptional.get();
        if (bookingDetails.getStatus() != null) booking.setStatus(bookingDetails.getStatus());
        if (bookingDetails.getNotes() != null) booking.setNotes(bookingDetails.getNotes());
        if (bookingDetails.getAmountPaid() != null) booking.setAmountPaid(bookingDetails.getAmountPaid());
        if (bookingDetails.getTrainer() != null && bookingDetails.getTrainer().getId() != null) {
            User trainer = userRepository.findById(bookingDetails.getTrainer().getId())
                    .orElseThrow(() -> new RuntimeException("Trainer not found"));
            booking.setTrainer(trainer);
        }

        PlanBooking updatedBooking = bookingRepository.save(booking);
        log.info("Plan booking updated successfully");
        return updatedBooking;
    }

    public PlanBooking updateBookingStatusByAdmin(String authToken, Long bookingId, BookingStatus status) {
        extractAdminIdFromToken(authToken);

        PlanBooking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        booking.setStatus(status);
        if (status == BookingStatus.REJECTED) {
            booking.setEndDate(LocalDateTime.now());
        } else {
            booking.setEndDate(null);
        }

        PlanBooking updatedBooking = bookingRepository.save(booking);
        syncPlanBookedClients(updatedBooking);
        log.info("Booking {} updated to status {}", bookingId, status);
        return updatedBooking;
    }

    /**
     * Cancel booking
     */
    public void cancelBooking(Long id) {
        Optional<PlanBooking> booking = bookingRepository.findById(id);
        if (booking.isEmpty()) {
            throw new RuntimeException("Booking not found");
        }

        PlanBooking b = booking.get();
        b.setStatus(BookingStatus.REJECTED);
        b.setEndDate(LocalDateTime.now());
        PlanBooking updatedBooking = bookingRepository.save(b);
        syncPlanBookedClients(updatedBooking);
        log.info("Plan booking cancelled successfully");
    }

    /**
     * Get all bookings for a user
     */
    public List<PlanBooking> getUserBookings(Long userId) {
        Optional<User> user = userRepository.findById(userId);
        if (user.isEmpty()) {
            throw new RuntimeException("User not found");
        }

        return bookingRepository.findByUser(user.get());
    }

    /**
     * Get all bookings assigned to a trainer
     */
    public List<PlanBooking> getTrainerBookings(Long trainerId) {
        Optional<User> trainer = userRepository.findById(trainerId);
        if (trainer.isEmpty()) {
            throw new RuntimeException("Trainer not found");
        }

        return bookingRepository.findByTrainer(trainer.get());
    }

    /**
     * Get active bookings by status
     */
    public List<PlanBooking> getBookingsByStatus(BookingStatus status) {
        return bookingRepository.findByStatus(status);
    }

    /**
     * Get bookings by status (admin only)
     */
    public List<PlanBooking> getBookingsByStatusForAdmin(String authToken, BookingStatus status) {
        extractAdminIdFromToken(authToken);
        if (status == null) {
            return bookingRepository.findAll();
        }
        return bookingRepository.findByStatus(status);
    }

    private void mergeMissingUserDetails(User user, PlanBooking bookingDetails) {
        if (bookingDetails == null || bookingDetails.getUser() == null) {
            return;
        }

        User requestUser = bookingDetails.getUser();
        validateIdentityFieldsAreAvailableForUser(user, requestUser);
        boolean updated = false;

        if (isBlank(user.getProfileImage()) && !isBlank(requestUser.getProfileImage())) {
            user.setProfileImage(requestUser.getProfileImage());
            updated = true;
        }
        if (user.getHeight() == null && requestUser.getHeight() != null) {
            user.setHeight(requestUser.getHeight());
            updated = true;
        }
        if (user.getWeight() == null && requestUser.getWeight() != null) {
            user.setWeight(requestUser.getWeight());
            updated = true;
        }
        if (isBlank(user.getFitnessGoals()) && !isBlank(requestUser.getFitnessGoals())) {
            user.setFitnessGoals(requestUser.getFitnessGoals());
            updated = true;
        }
        if (isBlank(user.getAddress()) && !isBlank(requestUser.getAddress())) {
            user.setAddress(requestUser.getAddress());
            updated = true;
        }
        if (isBlank(user.getAadharNumber()) && !isBlank(requestUser.getAadharNumber())) {
            user.setAadharNumber(requestUser.getAadharNumber());
            updated = true;
        }
        if (isBlank(user.getPanNumber()) && !isBlank(requestUser.getPanNumber())) {
            user.setPanNumber(requestUser.getPanNumber());
            updated = true;
        }

        if (updated) {
            userRepository.save(user);
        }
    }

    private void validateIdentityFieldsAreAvailableForUser(User user, User requestUser) {
        if (isBlank(user.getAadharNumber()) && !isBlank(requestUser.getAadharNumber())) {
            Optional<User> existingAadharUser = userRepository.findByAadharNumber(requestUser.getAadharNumber());
            if (existingAadharUser.isPresent() && !existingAadharUser.get().getId().equals(user.getId())) {
                throw new RuntimeException("Aadhar number already registered with another user");
            }
        }

        if (isBlank(user.getPanNumber()) && !isBlank(requestUser.getPanNumber())) {
            Optional<User> existingPanUser = userRepository.findByPanNumber(requestUser.getPanNumber());
            if (existingPanUser.isPresent() && !existingPanUser.get().getId().equals(user.getId())) {
                throw new RuntimeException("PAN number already registered with another user");
            }
        }
    }

    private void validateRequiredBookingProfileFields(User user) {
        List<String> missingFields = new ArrayList<>();

        if (isBlank(user.getAddress())) {
            missingFields.add("address");
        }
        if (isBlank(user.getAadharNumber())) {
            missingFields.add("aadharNumber");
        }
        if (isBlank(user.getPanNumber())) {
            missingFields.add("panNumber");
        }

        if (!missingFields.isEmpty()) {
            throw new RuntimeException("Complete user details before booking plan. Missing fields: " + String.join(", ", missingFields));
        }
    }

    private void validateBookingDoesNotAlreadyExist(User user, FitnessPlan plan) {
        boolean bookingAlreadyExists = bookingRepository
                .findFirstByUserAndPlanAndStatusNot(user, plan, BookingStatus.REJECTED)
                .isPresent();

        if (bookingAlreadyExists) {
            throw new RuntimeException("Plan already booked for this user");
        }
    }

    private Long extractAuthenticatedUserIdFromToken(String authToken) {
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

        return userId;
    }

    private Long extractAdminIdFromToken(String authToken) {
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
            throw new RuntimeException("Only ADMIN can approve or reject bookings");
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

    private void syncPlanBookedClients(PlanBooking booking) {
        FitnessPlan plan = booking.getPlan();
        if (plan == null) {
            return;
        }

        PlanBooked planBooked = planBookedRepository.findByPlan(plan)
                .orElseGet(() -> {
                    PlanBooked newPlanBooked = new PlanBooked();
                    newPlanBooked.setPlan(plan);
                    return newPlanBooked;
                });

        List<Integer> clientIds = planBooked.getClientIds();
        if (clientIds == null) {
            clientIds = new ArrayList<>();
            planBooked.setClientIds(clientIds);
        }

        Integer clientId = booking.getUser() != null && booking.getUser().getId() != null
                ? booking.getUser().getId().intValue()
                : null;

        if (clientId == null) {
            return;
        }

        if (booking.getStatus() == BookingStatus.APPROVED) {
            if (!clientIds.contains(clientId)) {
                clientIds.add(clientId);
            }
            planBookedRepository.save(planBooked);
            return;
        }

        if (clientIds.remove(clientId)) {
            if (clientIds.isEmpty() && planBooked.getId() != null) {
                planBookedRepository.delete(planBooked);
            } else {
                planBookedRepository.save(planBooked);
            }
        }
    }

    private Double resolveBookingAmount(PlanBooking bookingDetails, FitnessPlan plan) {
        if (bookingDetails != null && bookingDetails.getAmountPaid() != null) {
            return bookingDetails.getAmountPaid();
        }

        if (plan.getPrice() == null) {
            throw new RuntimeException("Plan price is required to complete booking");
        }

        return plan.getPrice();
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
