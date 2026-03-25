package com.fitsphere.service;

import com.fitsphere.dto.ClientDashboardResponse;
import com.fitsphere.model.BookingStatus;
import com.fitsphere.model.PlanBooking;
import com.fitsphere.model.User;
import com.fitsphere.model.UserRole;
import com.fitsphere.model.WorkDone;
import com.fitsphere.repository.PlanBookingRepository;
import com.fitsphere.repository.WorkDoneRepository;
import org.springframework.stereotype.Service;

import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

@Service
public class ClientDashboardService {

    private static final int TREND_MONTHS = 6;
    private static final DateTimeFormatter MONTH_LABEL_FORMATTER = DateTimeFormatter.ofPattern("MMM yyyy", Locale.ENGLISH);

    private final DashboardAuthorizationService dashboardAuthorizationService;
    private final PlanBookingRepository planBookingRepository;
    private final WorkDoneRepository workDoneRepository;

    public ClientDashboardService(
            DashboardAuthorizationService dashboardAuthorizationService,
            PlanBookingRepository planBookingRepository,
            WorkDoneRepository workDoneRepository) {
        this.dashboardAuthorizationService = dashboardAuthorizationService;
        this.planBookingRepository = planBookingRepository;
        this.workDoneRepository = workDoneRepository;
    }

    public ClientDashboardResponse getOverview(String authToken) {
        User client = dashboardAuthorizationService.requireRole(authToken, UserRole.CLIENT, "view dashboard analytics");
        List<PlanBooking> clientBookings = planBookingRepository.findByUser(client);
        List<WorkDone> relatedSessions = workDoneRepository.findAll().stream()
                .filter(session -> isClientRelatedSession(session, client.getId()))
                .toList();

        return new ClientDashboardResponse(
                buildSummary(clientBookings, relatedSessions, client.getId()),
                buildMonthlyActivity(clientBookings, relatedSessions, client.getId()),
                buildBookings(clientBookings),
                buildRecentSessions(relatedSessions, client.getId())
        );
    }

    private ClientDashboardResponse.Summary buildSummary(
            List<PlanBooking> clientBookings,
            List<WorkDone> relatedSessions,
            Long clientId) {
        long approvedBookings = clientBookings.stream().filter(booking -> booking.getStatus() == BookingStatus.APPROVED).count();
        long pendingBookings = clientBookings.stream().filter(booking -> booking.getStatus() == BookingStatus.PENDING).count();
        long rejectedBookings = clientBookings.stream().filter(booking -> booking.getStatus() == BookingStatus.REJECTED).count();
        long sessionsAttended = relatedSessions.stream().filter(session -> containsId(session.getPresentIdList(), clientId)).count();
        long sessionsMissed = relatedSessions.stream().filter(session -> containsId(session.getAbsentIdList(), clientId)).count();
        double totalSpent = clientBookings.stream()
                .map(PlanBooking::getAmountPaid)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .sum();

        return new ClientDashboardResponse.Summary(
                clientBookings.size(),
                approvedBookings,
                pendingBookings,
                rejectedBookings,
                approvedBookings,
                sessionsAttended,
                sessionsMissed,
                roundCurrency(totalSpent)
        );
    }

    private List<ClientDashboardResponse.MonthlyActivityPoint> buildMonthlyActivity(
            List<PlanBooking> clientBookings,
            List<WorkDone> relatedSessions,
            Long clientId) {
        LinkedHashMap<YearMonth, MonthlyActivityAccumulator> trendMap = initializeTrendMap();

        for (PlanBooking booking : clientBookings) {
            if (booking.getBookedAt() == null) {
                continue;
            }

            MonthlyActivityAccumulator bucket = trendMap.get(YearMonth.from(booking.getBookedAt()));
            if (bucket == null) {
                continue;
            }

            bucket.bookings++;
            if (booking.getAmountPaid() != null) {
                bucket.spent += booking.getAmountPaid();
            }
        }

        for (WorkDone session : relatedSessions) {
            if (session.getDate() == null) {
                continue;
            }

            MonthlyActivityAccumulator bucket = trendMap.get(YearMonth.from(session.getDate()));
            if (bucket == null) {
                continue;
            }

            if (containsId(session.getPresentIdList(), clientId)) {
                bucket.attendedSessions++;
            }
            if (containsId(session.getAbsentIdList(), clientId)) {
                bucket.missedSessions++;
            }
        }

        return trendMap.entrySet().stream()
                .map(entry -> new ClientDashboardResponse.MonthlyActivityPoint(
                        entry.getKey().format(MONTH_LABEL_FORMATTER),
                        entry.getValue().bookings,
                        entry.getValue().attendedSessions,
                        entry.getValue().missedSessions,
                        roundCurrency(entry.getValue().spent)
                ))
                .toList();
    }

    private List<ClientDashboardResponse.BookingSnapshot> buildBookings(List<PlanBooking> clientBookings) {
        return clientBookings.stream()
                .sorted(Comparator.comparing(PlanBooking::getBookedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(booking -> new ClientDashboardResponse.BookingSnapshot(
                        booking.getId(),
                        booking.getPlan() != null ? booking.getPlan().getName() : "Unknown plan",
                        booking.getTrainer() != null ? booking.getTrainer().getFullName() : "Trainer not assigned",
                        booking.getStatus() != null ? booking.getStatus().name() : "UNKNOWN",
                        booking.getAmountPaid(),
                        booking.getStartDate() != null ? booking.getStartDate().toString() : null,
                        booking.getEndDate() != null ? booking.getEndDate().toString() : null
                ))
                .toList();
    }

    private List<ClientDashboardResponse.SessionSnapshot> buildRecentSessions(List<WorkDone> relatedSessions, Long clientId) {
        return relatedSessions.stream()
                .sorted(Comparator.comparing(WorkDone::getDate, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(5)
                .map(session -> new ClientDashboardResponse.SessionSnapshot(
                        session.getId(),
                        session.getDate() != null ? session.getDate().toString() : null,
                        session.getTopic(),
                        session.getPlanBooked() != null && session.getPlanBooked().getPlan() != null
                                ? session.getPlanBooked().getPlan().getName()
                                : "Unknown plan",
                        session.getTrainer() != null ? session.getTrainer().getFullName() : "Unknown trainer",
                        containsId(session.getPresentIdList(), clientId) ? "PRESENT" : "ABSENT"
                ))
                .toList();
    }

    private boolean isClientRelatedSession(WorkDone session, Long clientId) {
        return containsId(session.getPresentIdList(), clientId) || containsId(session.getAbsentIdList(), clientId);
    }

    private boolean containsId(List<Integer> ids, Long clientId) {
        return ids != null && clientId != null && ids.contains(clientId.intValue());
    }

    private LinkedHashMap<YearMonth, MonthlyActivityAccumulator> initializeTrendMap() {
        LinkedHashMap<YearMonth, MonthlyActivityAccumulator> trendMap = new LinkedHashMap<>();
        YearMonth currentMonth = YearMonth.now();
        YearMonth startMonth = currentMonth.minusMonths(TREND_MONTHS - 1L);
        for (int i = 0; i < TREND_MONTHS; i++) {
            trendMap.put(startMonth.plusMonths(i), new MonthlyActivityAccumulator());
        }
        return trendMap;
    }

    private double roundCurrency(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private static final class MonthlyActivityAccumulator {
        private long bookings;
        private long attendedSessions;
        private long missedSessions;
        private double spent;
    }
}
