package com.fitsphere.repository;

import com.fitsphere.model.PlanBooked;
import com.fitsphere.model.User;
import com.fitsphere.model.WorkDone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface WorkDoneRepository extends JpaRepository<WorkDone, Long> {
    List<WorkDone> findByPlanBooked(PlanBooked planBooked);
    List<WorkDone> findByTrainer(User trainer);
    List<WorkDone> findByPlanBookedAndDate(PlanBooked planBooked, LocalDate date);
}
