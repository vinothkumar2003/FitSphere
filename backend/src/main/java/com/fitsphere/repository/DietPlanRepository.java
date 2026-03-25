package com.fitsphere.repository;

import com.fitsphere.model.DietPlan;
import com.fitsphere.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DietPlanRepository extends JpaRepository<DietPlan, Long> {
    Optional<DietPlan> findByUser(User user);
    List<DietPlan> findByUserIn(List<User> users);
    List<DietPlan> findByTrainer(User trainer);
    List<DietPlan> findByActive(Boolean active);
}
