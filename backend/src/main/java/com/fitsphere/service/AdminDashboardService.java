package com.fitsphere.service;

import com.fitsphere.dto.AdminDashboardResponse;
import com.fitsphere.model.BookingStatus;
import com.fitsphere.model.FitnessPlan;
import com.fitsphere.model.PlanBooking;
import com.fitsphere.model.User;
import com.fitsphere.model.UserRole;
import com.fitsphere.repository.FitnessPlanRepository;
import com.fitsphere.repository.PlanBookingRepository;
import com.fitsphere.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

@Service
public class AdminDashboardService {

    private static final int TREND_MONTHS = 6;
    private static final DateTimeFormatter MONTH_LABEL_FORMATTER = DateTimeFormatter.ofPattern("MMM yyyy", Locale.ENGLISH);

    private final UserRepository userRepository;
    private final FitnessPlanRepository fitnessPlanRepository;
    private final PlanBookingRepository planBookingRepository;
    private final AdminAuthorizationService adminAuthorizationService;

    public AdminDashboardService(
            UserRepository userRepository,
            FitnessPlanRepository fitnessPlanRepository,
            PlanBookingRepository planBookingRepository,
            AdminAuthorizationService adminAuthorizationService) {
        this.userRepository = userRepository;
        this.fitnessPlanRepository = fitnessPlanRepository;
        this.planBookingRepository = planBookingRepository;
        this.adminAuthorizationService = adminAuthorizationService;
    }

    public AdminDashboardResponse getOverview(String authToken) {
        adminAuthorizationService.requireAdmin(authToken, "view dashboard analytics");

        List<User> users = userRepository.findAll();
        List<FitnessPlan> plans = fitnessPlanRepository.findAll();
        List<PlanBooking> bookings = planBookingRepository.findAll();

        return new AdminDashboardResponse(
                buildSummary(users, plans, bookings),
                buildBookingStatus(bookings),
                buildMonthlyTrends(users, plans, bookings),
                buildTopPlans(bookings),
                buildTrainerWorkload(users, plans, bookings)
        );
    }

    private AdminDashboardResponse.SummaryCards buildSummary(
            List<User> users,
            List<FitnessPlan> plans,
            List<PlanBooking> bookings) {
        long totalClients = users.stream().filter(user -> user.getRole() == UserRole.CLIENT).count();
        long activeClients = users.stream().filter(user -> user.getRole() == UserRole.CLIENT && Boolean.TRUE.equals(user.getActive())).count();
        long totalTrainers = users.stream().filter(user -> user.getRole() == UserRole.TRAINER).count();
        long activeTrainers = users.stream().filter(user -> user.getRole() == UserRole.TRAINER && Boolean.TRUE.equals(user.getActive())).count();
        long totalPlans = plans.size();
        long activePlans = plans.stream().filter(plan -> Boolean.TRUE.equals(plan.getActive())).count();
        long totalBookings = bookings.size();
        long approvedBookings = bookings.stream().filter(booking -> booking.getStatus() == BookingStatus.APPROVED).count();
        long pendingBookings = bookings.stream().filter(booking -> booking.getStatus() == BookingStatus.PENDING).count();
        long rejectedBookings = bookings.stream().filter(booking -> booking.getStatus() == BookingStatus.REJECTED).count();
        double totalRevenue = roundCurrency(bookings.stream()
                .map(PlanBooking::getAmountPaid)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .sum());

        return new AdminDashboardResponse.SummaryCards(
                totalClients,
                activeClients,
                totalTrainers,
                activeTrainers,
                totalPlans,
                activePlans,
                totalBookings,
                approvedBookings,
                pendingBookings,
                rejectedBookings,
                totalRevenue
        );
    }

    private List<AdminDashboardResponse.StatusCount> buildBookingStatus(List<PlanBooking> bookings) {
        Map<BookingStatus, Long> counts = new EnumMap<>(BookingStatus.class);
        for (BookingStatus status : BookingStatus.values()) {
            counts.put(status, 0L);
        }

        for (PlanBooking booking : bookings) {
            if (booking.getStatus() != null) {
                counts.computeIfPresent(booking.getStatus(), (status, count) -> count + 1);
            }
        }

        List<AdminDashboardResponse.StatusCount> statusCounts = new ArrayList<>();
        for (BookingStatus status : BookingStatus.values()) {
            statusCounts.add(new AdminDashboardResponse.StatusCount(status.name(), counts.getOrDefault(status, 0L)));
        }
        return statusCounts;
    }

    private List<AdminDashboardResponse.MonthlyTrendPoint> buildMonthlyTrends(
            List<User> users,
            List<FitnessPlan> plans,
            List<PlanBooking> bookings) {
        LinkedHashMap<YearMonth, MonthlyAccumulator> trendMap = initializeTrendMap();

        for (User user : users) {
            incrementUserTrend(trendMap, user);
        }
        for (FitnessPlan plan : plans) {
            incrementPlanTrend(trendMap, plan);
        }
        for (PlanBooking booking : bookings) {
            incrementBookingTrend(trendMap, booking);
        }

        return trendMap.entrySet().stream()
                .map(entry -> {
                    MonthlyAccumulator value = entry.getValue();
                    return new AdminDashboardResponse.MonthlyTrendPoint(
                            entry.getKey().format(MONTH_LABEL_FORMATTER),
                            value.clients,
                            value.trainers,
                            value.plans,
                            value.bookings,
                            roundCurrency(value.revenue)
                    );
                })
                .toList();
    }

    private LinkedHashMap<YearMonth, MonthlyAccumulator> initializeTrendMap() {
        LinkedHashMap<YearMonth, MonthlyAccumulator> trendMap = new LinkedHashMap<>();
        YearMonth currentMonth = YearMonth.now();
        YearMonth startMonth = currentMonth.minusMonths(TREND_MONTHS - 1L);
        for (int i = 0; i < TREND_MONTHS; i++) {
            trendMap.put(startMonth.plusMonths(i), new MonthlyAccumulator());
        }
        return trendMap;
    }

    private void incrementUserTrend(Map<YearMonth, MonthlyAccumulator> trendMap, User user) {
        if (user == null || user.getCreatedAt() == null || user.getRole() == null) {
            return;
        }

        MonthlyAccumulator bucket = trendMap.get(YearMonth.from(user.getCreatedAt()));
        if (bucket == null) {
            return;
        }

        if (user.getRole() == UserRole.CLIENT) {
            bucket.clients++;
        } else if (user.getRole() == UserRole.TRAINER) {
            bucket.trainers++;
        }
    }

    private void incrementPlanTrend(Map<YearMonth, MonthlyAccumulator> trendMap, FitnessPlan plan) {
        if (plan == null || plan.getCreatedAt() == null) {
            return;
        }

        MonthlyAccumulator bucket = trendMap.get(YearMonth.from(plan.getCreatedAt()));
        if (bucket != null) {
            bucket.plans++;
        }
    }

    private void incrementBookingTrend(Map<YearMonth, MonthlyAccumulator> trendMap, PlanBooking booking) {
        if (booking == null || booking.getBookedAt() == null) {
            return;
        }

        MonthlyAccumulator bucket = trendMap.get(YearMonth.from(booking.getBookedAt()));
        if (bucket != null) {
            bucket.bookings++;
            bucket.revenue += safeAmount(booking.getAmountPaid());
        }
    }

    private List<AdminDashboardResponse.PlanPerformance> buildTopPlans(List<PlanBooking> bookings) {
        Map<Long, PlanPerformanceAccumulator> plans = new HashMap<>();

        for (PlanBooking booking : bookings) {
            FitnessPlan plan = booking.getPlan();
            if (plan == null || plan.getId() == null) {
                continue;
            }

            PlanPerformanceAccumulator accumulator = plans.computeIfAbsent(
                    plan.getId(),
                    planId -> new PlanPerformanceAccumulator(
                            planId,
                            plan.getName(),
                            plan.getTrainer() != null ? plan.getTrainer().getFullName() : "Unassigned"
                    )
            );

            accumulator.totalBookings++;
            if (booking.getStatus() == BookingStatus.APPROVED) {
                accumulator.approvedBookings++;
            }
            accumulator.revenue += safeAmount(booking.getAmountPaid());
        }

        return plans.values().stream()
                .sorted(Comparator
                        .comparingLong(PlanPerformanceAccumulator::totalBookings).reversed()
                        .thenComparingDouble(PlanPerformanceAccumulator::revenue).reversed()
                        .thenComparing(PlanPerformanceAccumulator::planName, String.CASE_INSENSITIVE_ORDER))
                .limit(5)
                .map(accumulator -> new AdminDashboardResponse.PlanPerformance(
                        accumulator.planId,
                        accumulator.planName,
                        accumulator.trainerName,
                        accumulator.totalBookings,
                        accumulator.approvedBookings,
                        roundCurrency(accumulator.revenue)
                ))
                .toList();
    }

    private List<AdminDashboardResponse.TrainerPerformance> buildTrainerWorkload(
            List<User> users,
            List<FitnessPlan> plans,
            List<PlanBooking> bookings) {
        Map<Long, TrainerPerformanceAccumulator> trainers = new HashMap<>();

        for (User user : users) {
            if (user.getRole() == UserRole.TRAINER && user.getId() != null) {
                trainers.put(user.getId(), new TrainerPerformanceAccumulator(user.getId(), user.getFullName()));
            }
        }

        for (FitnessPlan plan : plans) {
            if (plan.getTrainer() == null || plan.getTrainer().getId() == null) {
                continue;
            }

            TrainerPerformanceAccumulator accumulator = trainers.computeIfAbsent(
                    plan.getTrainer().getId(),
                    trainerId -> new TrainerPerformanceAccumulator(trainerId, plan.getTrainer().getFullName())
            );
            if (Boolean.TRUE.equals(plan.getActive())) {
                accumulator.activePlans++;
            }
        }

        for (PlanBooking booking : bookings) {
            if (booking.getTrainer() == null || booking.getTrainer().getId() == null) {
                continue;
            }

            TrainerPerformanceAccumulator accumulator = trainers.computeIfAbsent(
                    booking.getTrainer().getId(),
                    trainerId -> new TrainerPerformanceAccumulator(trainerId, booking.getTrainer().getFullName())
            );
            accumulator.assignedBookings++;
            if (booking.getStatus() == BookingStatus.APPROVED) {
                accumulator.approvedBookings++;
            }
            accumulator.revenue += safeAmount(booking.getAmountPaid());
        }

        return trainers.values().stream()
                .sorted(Comparator
                        .comparingLong(TrainerPerformanceAccumulator::assignedBookings).reversed()
                        .thenComparingDouble(TrainerPerformanceAccumulator::revenue).reversed()
                        .thenComparing(TrainerPerformanceAccumulator::trainerName, String.CASE_INSENSITIVE_ORDER))
                .limit(5)
                .map(accumulator -> new AdminDashboardResponse.TrainerPerformance(
                        accumulator.trainerId,
                        accumulator.trainerName,
                        accumulator.assignedBookings,
                        accumulator.approvedBookings,
                        accumulator.activePlans,
                        roundCurrency(accumulator.revenue)
                ))
                .toList();
    }

    private double safeAmount(Double amount) {
        return amount == null ? 0.0 : amount;
    }

    private double roundCurrency(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private static final class MonthlyAccumulator {
        private long clients;
        private long trainers;
        private long plans;
        private long bookings;
        private double revenue;
    }

    private static final class PlanPerformanceAccumulator {
        private final Long planId;
        private final String planName;
        private final String trainerName;
        private long totalBookings;
        private long approvedBookings;
        private double revenue;

        private PlanPerformanceAccumulator(Long planId, String planName, String trainerName) {
            this.planId = planId;
            this.planName = planName;
            this.trainerName = trainerName;
        }

        private long totalBookings() {
            return totalBookings;
        }

        private double revenue() {
            return revenue;
        }

        private String planName() {
            return planName;
        }
    }

    private static final class TrainerPerformanceAccumulator {
        private final Long trainerId;
        private final String trainerName;
        private long assignedBookings;
        private long approvedBookings;
        private long activePlans;
        private double revenue;

        private TrainerPerformanceAccumulator(Long trainerId, String trainerName) {
            this.trainerId = trainerId;
            this.trainerName = trainerName;
        }

        private long assignedBookings() {
            return assignedBookings;
        }

        private double revenue() {
            return revenue;
        }

        private String trainerName() {
            return trainerName;
        }
    }
}
