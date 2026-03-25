package com.fitsphere.repository;

import com.fitsphere.model.PlanBooking;
import com.fitsphere.model.BookingStatus;
import com.fitsphere.model.FitnessPlan;
import com.fitsphere.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlanBookingRepository extends JpaRepository<PlanBooking, Long> {
    List<PlanBooking> findByUser(User user);
    List<PlanBooking> findByTrainer(User trainer);
    List<PlanBooking> findByStatus(BookingStatus status);
    List<PlanBooking> findByUserAndStatus(User user, BookingStatus status);
    List<PlanBooking> findByPlanAndStatus(FitnessPlan plan, BookingStatus status);
    List<PlanBooking> findByPlanAndStatusAndTrainer(FitnessPlan plan, BookingStatus status, User trainer);
    Optional<PlanBooking> findFirstByUserAndPlanAndStatusNot(User user, FitnessPlan plan, BookingStatus status);
}
