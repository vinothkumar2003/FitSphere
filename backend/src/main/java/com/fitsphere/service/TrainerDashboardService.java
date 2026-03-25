package com.fitsphere.service;

import com.fitsphere.dto.TrainerDashboardResponse;
import com.fitsphere.model.BookingStatus;
import com.fitsphere.model.FitnessPlan;
import com.fitsphere.model.PlanBooking;
import com.fitsphere.model.User;
import com.fitsphere.model.UserRole;
import com.fitsphere.model.WorkDone;
import com.fitsphere.repository.FitnessPlanRepository;
import com.fitsphere.repository.PlanBookingRepository;
import com.fitsphere.repository.WorkDoneRepository;
import org.springframework.stereotype.Service;

import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class TrainerDashboardService {

    private static final int TREND_MONTHS = 6;
    private static final DateTimeFormatter MONTH_LABEL_FORMATTER = DateTimeFormatter.ofPattern("MMM yyyy", Locale.ENGLISH);

    private final DashboardAuthorizationService dashboardAuthorizationService;
    private final PlanBookingRepository planBookingRepository;
    private final FitnessPlanRepository fitnessPlanRepository;
    private final WorkDoneRepository workDoneRepository;

    public TrainerDashboardService(
            DashboardAuthorizationService dashboardAuthorizationService,
            PlanBookingRepository planBookingRepository,
            FitnessPlanRepository fitnessPlanRepository,
            WorkDoneRepository workDoneRepository) {
        this.dashboardAuthorizationService = dashboardAuthorizationService;
        this.planBookingRepository = planBookingRepository;
        this.fitnessPlanRepository = fitnessPlanRepository;
        this.workDoneRepository = workDoneRepository;
    }

    public TrainerDashboardResponse getOverview(String authToken) {
        User trainer = dashboardAuthorizationService.requireRole(authToken, UserRole.TRAINER, "view dashboard analytics");
        List<PlanBooking> trainerBookings = planBookingRepository.findByTrainer(trainer);
        List<FitnessPlan> trainerPlans = fitnessPlanRepository.findByTrainer(trainer);
        List<WorkDone> trainerSessions = workDoneRepository.findByTrainer(trainer);

        return new TrainerDashboardResponse(
                buildSummary(trainerBookings, trainerPlans, trainerSessions),
                buildMonthlySessions(trainerSessions),
                buildActivePlans(trainerPlans, trainerBookings),
                buildRecentClients(trainerBookings),
                buildRecentSessions(trainerSessions)
        );
    }

    private TrainerDashboardResponse.Summary buildSummary(
            List<PlanBooking> trainerBookings,
            List<FitnessPlan> trainerPlans,
            List<WorkDone> trainerSessions) {
        Set<Long> assignedClients = trainerBookings.stream()
                .map(PlanBooking::getUser)
                .filter(Objects::nonNull)
                .map(User::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        long approvedBookings = trainerBookings.stream().filter(booking -> booking.getStatus() == BookingStatus.APPROVED).count();
        long pendingBookings = trainerBookings.stream().filter(booking -> booking.getStatus() == BookingStatus.PENDING).count();
        double totalRevenue = trainerBookings.stream()
                .map(PlanBooking::getAmountPaid)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .sum();

        return new TrainerDashboardResponse.Summary(
                assignedClients.size(),
                trainerPlans.stream().filter(plan -> Boolean.TRUE.equals(plan.getActive())).count(),
                trainerBookings.size(),
                approvedBookings,
                pendingBookings,
                trainerSessions.size(),
                roundCurrency(totalRevenue)
        );
    }

    private List<TrainerDashboardResponse.MonthlySessionPoint> buildMonthlySessions(List<WorkDone> trainerSessions) {
        LinkedHashMap<YearMonth, SessionTrendAccumulator> trendMap = initializeTrendMap();

        for (WorkDone session : trainerSessions) {
            if (session.getDate() == null) {
                continue;
            }

            SessionTrendAccumulator bucket = trendMap.get(YearMonth.from(session.getDate()));
            if (bucket == null) {
                continue;
            }

            bucket.sessions++;
            bucket.presentCount += session.getPresentIdList() != null ? session.getPresentIdList().size() : 0;
            bucket.absentCount += session.getAbsentIdList() != null ? session.getAbsentIdList().size() : 0;
        }

        return trendMap.entrySet().stream()
                .map(entry -> new TrainerDashboardResponse.MonthlySessionPoint(
                        entry.getKey().format(MONTH_LABEL_FORMATTER),
                        entry.getValue().sessions,
                        entry.getValue().presentCount,
                        entry.getValue().absentCount
                ))
                .toList();
    }

    private List<TrainerDashboardResponse.PlanSnapshot> buildActivePlans(
            List<FitnessPlan> trainerPlans,
            List<PlanBooking> trainerBookings) {
        List<TrainerDashboardResponse.PlanSnapshot> snapshots = new ArrayList<>();

        for (FitnessPlan plan : trainerPlans) {
            long approvedClients = trainerBookings.stream()
                    .filter(booking -> booking.getPlan() != null && Objects.equals(booking.getPlan().getId(), plan.getId()))
                    .filter(booking -> booking.getStatus() == BookingStatus.APPROVED)
                    .count();

            long pendingBookings = trainerBookings.stream()
                    .filter(booking -> booking.getPlan() != null && Objects.equals(booking.getPlan().getId(), plan.getId()))
                    .filter(booking -> booking.getStatus() == BookingStatus.PENDING)
                    .count();

            double revenue = trainerBookings.stream()
                    .filter(booking -> booking.getPlan() != null && Objects.equals(booking.getPlan().getId(), plan.getId()))
                    .map(PlanBooking::getAmountPaid)
                    .filter(Objects::nonNull)
                    .mapToDouble(Double::doubleValue)
                    .sum();

            snapshots.add(new TrainerDashboardResponse.PlanSnapshot(
                    plan.getId(),
                    plan.getName(),
                    approvedClients,
                    pendingBookings,
                    roundCurrency(revenue)
            ));
        }

        return snapshots.stream()
                .sorted(Comparator.comparingLong(TrainerDashboardResponse.PlanSnapshot::approvedClients).reversed())
                .limit(5)
                .toList();
    }

    private List<TrainerDashboardResponse.ClientSnapshot> buildRecentClients(List<PlanBooking> trainerBookings) {
        return trainerBookings.stream()
                .sorted(Comparator.comparing(PlanBooking::getBookedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(5)
                .map(booking -> new TrainerDashboardResponse.ClientSnapshot(
                        booking.getId(),
                        booking.getUser() != null ? booking.getUser().getId() : null,
                        booking.getUser() != null ? booking.getUser().getFullName() : "Unknown client",
                        booking.getPlan() != null ? booking.getPlan().getName() : "Unknown plan",
                        booking.getStatus() != null ? booking.getStatus().name() : "UNKNOWN",
                        booking.getAmountPaid(),
                        booking.getBookedAt() != null ? booking.getBookedAt().toString() : null
                ))
                .toList();
    }

    private List<TrainerDashboardResponse.SessionSnapshot> buildRecentSessions(List<WorkDone> trainerSessions) {
        return trainerSessions.stream()
                .sorted(Comparator.comparing(WorkDone::getDate, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(5)
                .map(session -> new TrainerDashboardResponse.SessionSnapshot(
                        session.getId(),
                        session.getDate() != null ? session.getDate().toString() : null,
                        session.getTopic(),
                        session.getPlanBooked() != null && session.getPlanBooked().getPlan() != null
                                ? session.getPlanBooked().getPlan().getName()
                                : "Unknown plan",
                        session.getPresentIdList() != null ? session.getPresentIdList().size() : 0,
                        session.getAbsentIdList() != null ? session.getAbsentIdList().size() : 0
                ))
                .toList();
    }

    private LinkedHashMap<YearMonth, SessionTrendAccumulator> initializeTrendMap() {
        LinkedHashMap<YearMonth, SessionTrendAccumulator> trendMap = new LinkedHashMap<>();
        YearMonth currentMonth = YearMonth.now();
        YearMonth startMonth = currentMonth.minusMonths(TREND_MONTHS - 1L);
        for (int i = 0; i < TREND_MONTHS; i++) {
            trendMap.put(startMonth.plusMonths(i), new SessionTrendAccumulator());
        }
        return trendMap;
    }

    private double roundCurrency(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private static final class SessionTrendAccumulator {
        private long sessions;
        private long presentCount;
        private long absentCount;
    }
}
