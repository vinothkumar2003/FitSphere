package com.fitsphere.dto;

import java.util.List;

public record AdminDashboardResponse(
        SummaryCards summary,
        List<StatusCount> bookingStatus,
        List<MonthlyTrendPoint> monthlyTrends,
        List<PlanPerformance> topPlans,
        List<TrainerPerformance> trainerWorkload) {

    public record SummaryCards(
            long totalClients,
            long activeClients,
            long totalTrainers,
            long activeTrainers,
            long totalPlans,
            long activePlans,
            long totalBookings,
            long approvedBookings,
            long pendingBookings,
            long rejectedBookings,
            double totalRevenue) {
    }

    public record StatusCount(
            String status,
            long count) {
    }

    public record MonthlyTrendPoint(
            String month,
            long clients,
            long trainers,
            long plans,
            long bookings,
            double revenue) {
    }

    public record PlanPerformance(
            Long planId,
            String planName,
            String trainerName,
            long totalBookings,
            long approvedBookings,
            double revenue) {
    }

    public record TrainerPerformance(
            Long trainerId,
            String trainerName,
            long assignedBookings,
            long approvedBookings,
            long activePlans,
            double revenue) {
    }
}
