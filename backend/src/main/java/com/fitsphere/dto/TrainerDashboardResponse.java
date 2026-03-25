package com.fitsphere.dto;

import java.util.List;

public record TrainerDashboardResponse(
        Summary summary,
        List<MonthlySessionPoint> monthlySessions,
        List<PlanSnapshot> activePlans,
        List<ClientSnapshot> recentClients,
        List<SessionSnapshot> recentSessions) {

    public record Summary(
            long assignedClients,
            long activePlans,
            long totalBookings,
            long approvedBookings,
            long pendingBookings,
            long completedSessions,
            double totalRevenue) {
    }

    public record MonthlySessionPoint(
            String month,
            long sessions,
            long presentCount,
            long absentCount) {
    }

    public record PlanSnapshot(
            Long planId,
            String planName,
            long approvedClients,
            long pendingBookings,
            double revenue) {
    }

    public record ClientSnapshot(
            Long bookingId,
            Long clientId,
            String clientName,
            String planName,
            String status,
            Double amountPaid,
            String bookedAt) {
    }

    public record SessionSnapshot(
            Long sessionId,
            String date,
            String topic,
            String planName,
            int presentCount,
            int absentCount) {
    }
}
