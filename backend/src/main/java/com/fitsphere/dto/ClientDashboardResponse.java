package com.fitsphere.dto;

import java.util.List;

public record ClientDashboardResponse(
        Summary summary,
        List<MonthlyActivityPoint> monthlyActivity,
        List<BookingSnapshot> bookings,
        List<SessionSnapshot> recentSessions) {

    public record Summary(
            long totalBookings,
            long approvedBookings,
            long pendingBookings,
            long rejectedBookings,
            long activePlans,
            long sessionsAttended,
            long sessionsMissed,
            double totalSpent) {
    }

    public record MonthlyActivityPoint(
            String month,
            long bookings,
            long attendedSessions,
            long missedSessions,
            double spent) {
    }

    public record BookingSnapshot(
            Long bookingId,
            String planName,
            String trainerName,
            String status,
            Double amountPaid,
            String startDate,
            String endDate) {
    }

    public record SessionSnapshot(
            Long sessionId,
            String date,
            String topic,
            String planName,
            String trainerName,
            String attendanceStatus) {
    }
}
