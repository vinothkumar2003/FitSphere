package com.fitsphere.service;

import com.fitsphere.dto.BookingAmountUpdateRequest;
import com.fitsphere.dto.BookingRenewalEmailRequest;
import com.fitsphere.model.PlanBooking;
import com.fitsphere.repository.PlanBookingRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Slf4j
public class AdminFinanceService {

    @Autowired
    private PlanBookingRepository planBookingRepository;

    @Autowired
    private AdminAuthorizationService adminAuthorizationService;

    @Autowired
    private EmailService emailService;

    public List<PlanBooking> getAllBookingsForFinance(String authToken) {
        adminAuthorizationService.requireAdmin(authToken, "manage booking finance");
        return planBookingRepository.findAll();
    }

    public PlanBooking getBookingForFinance(String authToken, Long bookingId) {
        adminAuthorizationService.requireAdmin(authToken, "manage booking finance");
        return planBookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));
    }

    public PlanBooking updateBookingAmount(String authToken, Long bookingId, BookingAmountUpdateRequest request) {
        adminAuthorizationService.requireAdmin(authToken, "manage booking finance");

        if (request == null || request.getAmountPaid() == null) {
            throw new RuntimeException("amountPaid is required");
        }
        if (request.getAmountPaid() < 0) {
            throw new RuntimeException("amountPaid cannot be negative");
        }

        PlanBooking booking = planBookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        booking.setAmountPaid(request.getAmountPaid());
        PlanBooking savedBooking = planBookingRepository.save(booking);
        log.info("Booking {} amount updated to {}", bookingId, request.getAmountPaid());
        return savedBooking;
    }

    public void sendRenewalReminder(String authToken, Long bookingId, BookingRenewalEmailRequest request) {
        adminAuthorizationService.requireAdmin(authToken, "manage booking finance");

        PlanBooking booking = planBookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (booking.getUser() == null || booking.getUser().getEmail() == null || booking.getUser().getEmail().isBlank()) {
            throw new RuntimeException("Client email not found");
        }
        if (booking.getPlan() == null) {
            throw new RuntimeException("Plan not found for this booking");
        }

        String subject = request != null && request.getSubject() != null && !request.getSubject().isBlank()
                ? request.getSubject().trim()
                : "Your FitSphere plan will expire soon";

        String message = request != null && request.getMessage() != null && !request.getMessage().isBlank()
                ? request.getMessage().trim()
                : "Your plan will be expired soon, so please renew your membership to continue your fitness journey.";

        LocalDateTime expiryDate = booking.getStartDate();
        if (expiryDate != null && booking.getPlan().getDurationWeeks() != null) {
            expiryDate = expiryDate.plusWeeks(booking.getPlan().getDurationWeeks());
        }

        emailService.sendPlanRenewalReminder(
                booking.getUser().getEmail(),
                booking.getUser().getFullName(),
                booking.getPlan().getName(),
                expiryDate,
                message
        );
    }
}
