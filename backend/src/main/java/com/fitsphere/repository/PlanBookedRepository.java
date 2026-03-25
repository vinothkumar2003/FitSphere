package com.fitsphere.repository;

import com.fitsphere.model.FitnessPlan;
import com.fitsphere.model.PlanBooked;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PlanBookedRepository extends JpaRepository<PlanBooked, Long> {
    Optional<PlanBooked> findByPlan(FitnessPlan plan);
}
