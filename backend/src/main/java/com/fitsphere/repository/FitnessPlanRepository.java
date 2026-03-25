package com.fitsphere.repository;

import com.fitsphere.model.FitnessPlan;
import com.fitsphere.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FitnessPlanRepository extends JpaRepository<FitnessPlan, Long> {
    List<FitnessPlan> findByCreatedBy(User createdBy);
    List<FitnessPlan> findByTrainer(User trainer);
    List<FitnessPlan> findByActive(Boolean active);
    List<FitnessPlan> findByDifficulty(String difficulty);
    List<FitnessPlan> findByFocusArea(String focusArea);
}
