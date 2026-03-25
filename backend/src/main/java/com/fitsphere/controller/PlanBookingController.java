package com.fitsphere.controller;

import com.fitsphere.model.PlanBooking;
import com.fitsphere.model.BookingStatus;
import com.fitsphere.service.PlanBookingService;
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
@RequestMapping("/bookings")
@CrossOrigin(origins = "*", maxAge = 3600)
public class PlanBookingController {

    @Autowired
    private PlanBookingService planBookingService;

    /**
     * GET /bookings - Get all bookings
     */
    @GetMapping
    public ResponseEntity<?> getAllBookings() {
        try {
            List<PlanBooking> bookings = planBookingService.getAllBookings();
            return ResponseEntity.ok(bookings);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * GET /bookings/{id} - Get booking by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getBookingById(@PathVariable Long id) {
        try {
            Optional<PlanBooking> booking = planBookingService.getBookingById(id);
            if (booking.isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("message", "Booking not found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
            }
            return ResponseEntity.ok(booking.get());
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * GET /bookings/status/{status} - Get bookings filtered by status (Admin only)
     */
    @GetMapping("/status/{status}")
    public ResponseEntity<?> getBookingsByStatus(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @PathVariable String status) {
        try {
            String token = extractBearerToken(authorizationHeader);
            BookingStatus bookingStatus = BookingStatus.valueOf(status.toUpperCase());
            List<PlanBooking> bookings = planBookingService.getBookingsByStatusForAdmin(token, bookingStatus);
            return ResponseEntity.ok(bookings);
        } catch (IllegalArgumentException ex) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Invalid booking status: " + status);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            if (e.getMessage().contains("Authorization token")
                    || e.getMessage().contains("Authorization header must use Bearer token")
                    || e.getMessage().contains("Invalid or expired JWT token")
                    || e.getMessage().contains("Invalid token purpose")
                    || e.getMessage().contains("Admin ID missing in token")
                    || e.getMessage().contains("Failed to extract user details from token")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
            }
            if (e.getMessage().contains("Only ADMIN")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    /**
     * POST /bookings - Book a fitness plan
     */
    @PostMapping
    public ResponseEntity<?> bookPlan(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @RequestParam Long planId,
            @RequestParam(required = false) Long trainerId,
            @RequestBody(required = false) PlanBooking bookingDetails) {
        try {
            String token = extractBearerToken(authorizationHeader);
            PlanBooking booking = planBookingService.bookPlanForAuthenticatedUser(token, planId, trainerId, bookingDetails);
            return ResponseEntity.status(HttpStatus.CREATED).body(booking);
        } catch (Exception e) {
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
     * PUT /bookings/{id} - Update booking
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateBooking(@PathVariable Long id, @RequestBody PlanBooking bookingDetails) {
        try {
            PlanBooking updatedBooking = planBookingService.updateBooking(id, bookingDetails);
            return ResponseEntity.ok(updatedBooking);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    /**
     * PUT /bookings/{id}/approve - Approve booking (Admin only)
     */
    @PutMapping("/{id}/approve")
    public ResponseEntity<?> approveBooking(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @PathVariable Long id) {
        try {
            String token = extractBearerToken(authorizationHeader);
            PlanBooking updatedBooking = planBookingService.updateBookingStatusByAdmin(token, id, BookingStatus.APPROVED);
            return ResponseEntity.ok(updatedBooking);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            if (e.getMessage().contains("Authorization token")
                    || e.getMessage().contains("Authorization header must use Bearer token")
                    || e.getMessage().contains("Invalid or expired JWT token")
                    || e.getMessage().contains("Invalid token purpose")
                    || e.getMessage().contains("Admin ID missing in token")
                    || e.getMessage().contains("Failed to extract user details from token")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
            }
            if (e.getMessage().contains("Only ADMIN")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
            }
            if (e.getMessage().contains("Booking not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    /**
     * PUT /bookings/{id}/reject - Reject booking (Admin only)
     */
    @PutMapping("/{id}/reject")
    public ResponseEntity<?> rejectBooking(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @PathVariable Long id) {
        try {
            String token = extractBearerToken(authorizationHeader);
            PlanBooking updatedBooking = planBookingService.updateBookingStatusByAdmin(token, id, BookingStatus.REJECTED);
            return ResponseEntity.ok(updatedBooking);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            if (e.getMessage().contains("Authorization token")
                    || e.getMessage().contains("Authorization header must use Bearer token")
                    || e.getMessage().contains("Invalid or expired JWT token")
                    || e.getMessage().contains("Invalid token purpose")
                    || e.getMessage().contains("Admin ID missing in token")
                    || e.getMessage().contains("Failed to extract user details from token")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
            }
            if (e.getMessage().contains("Only ADMIN")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
            }
            if (e.getMessage().contains("Booking not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    /**
     * DELETE /bookings/{id} - Cancel booking
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> cancelBooking(@PathVariable Long id) {
        try {
            planBookingService.cancelBooking(id);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Booking cancelled successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }
    }

    /**
     * GET /bookings/user/{userId} - Get all bookings for a user
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserBookings(@PathVariable Long userId) {
        try {
            List<PlanBooking> bookings = planBookingService.getUserBookings(userId);
            return ResponseEntity.ok(bookings);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * GET /bookings/trainer/{trainerId} - Get all bookings assigned to a trainer
     */
    @GetMapping("/trainer/{trainerId}")
    public ResponseEntity<?> getTrainerBookings(@PathVariable Long trainerId) {
        try {
            List<PlanBooking> bookings = planBookingService.getTrainerBookings(trainerId);
            return ResponseEntity.ok(bookings);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
}
