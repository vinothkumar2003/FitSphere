package com.fitsphere.service;

import com.fitsphere.model.FitnessPlan;
import com.fitsphere.model.PlanBooked;
import com.fitsphere.repository.FitnessPlanRepository;
import com.fitsphere.repository.PlanBookedRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class PlanBookedService {

    @Autowired
    private PlanBookedRepository planBookedRepository;

    @Autowired
    private FitnessPlanRepository fitnessPlanRepository;

    public Optional<PlanBooked> getById(Long id) {
        return planBookedRepository.findById(id);
    }

    public Optional<PlanBooked> getByPlanId(Long planId) {
        FitnessPlan plan = fitnessPlanRepository.findById(planId)
                .orElseThrow(() -> new RuntimeException("Plan not found"));
        return planBookedRepository.findByPlan(plan);
    }
}
