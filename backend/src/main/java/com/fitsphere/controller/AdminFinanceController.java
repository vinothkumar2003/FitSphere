package com.fitsphere.controller;

import com.fitsphere.dto.BookingAmountUpdateRequest;
import com.fitsphere.dto.BookingRenewalEmailRequest;
import com.fitsphere.model.PlanBooking;
import com.fitsphere.service.AdminFinanceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/finance")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AdminFinanceController {

    @Autowired
    private AdminFinanceService adminFinanceService;

    @GetMapping("/bookings")
    public ResponseEntity<?> getAllBookings(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader) {
        try {
            String token = extractBearerToken(authorizationHeader);
            List<PlanBooking> bookings = adminFinanceService.getAllBookingsForFinance(token);
            return ResponseEntity.ok(bookings);
        } catch (Exception e) {
            return handleException(e);
        }
    }

    @GetMapping("/bookings/{bookingId}")
    public ResponseEntity<?> getBooking(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @PathVariable Long bookingId) {
        try {
            String token = extractBearerToken(authorizationHeader);
            PlanBooking booking = adminFinanceService.getBookingForFinance(token, bookingId);
            return ResponseEntity.ok(booking);
        } catch (Exception e) {
            return handleException(e);
        }
    }

    @PutMapping("/bookings/{bookingId}/amount")
    public ResponseEntity<?> updateBookingAmount(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @PathVariable Long bookingId,
            @RequestBody BookingAmountUpdateRequest request) {
        try {
            String token = extractBearerToken(authorizationHeader);
            PlanBooking updatedBooking = adminFinanceService.updateBookingAmount(token, bookingId, request);
            return ResponseEntity.ok(updatedBooking);
        } catch (Exception e) {
            return handleException(e);
        }
    }

    @PostMapping("/bookings/{bookingId}/renewal-email")
    public ResponseEntity<?> sendRenewalEmail(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @PathVariable Long bookingId,
            @RequestBody(required = false) BookingRenewalEmailRequest request) {
        try {
            String token = extractBearerToken(authorizationHeader);
            adminFinanceService.sendRenewalReminder(token, bookingId, request);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Renewal reminder email sent successfully");
            return ResponseEntity.ok(response);
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
                || e.getMessage().contains("Admin ID missing in token")
                || e.getMessage().contains("Failed to extract user details from token")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
        }
        if (e.getMessage().contains("Only ADMIN")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
        }
        if (e.getMessage().contains("not found")) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
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
