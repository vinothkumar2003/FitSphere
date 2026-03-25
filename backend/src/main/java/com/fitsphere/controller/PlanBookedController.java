package com.fitsphere.controller;

import com.fitsphere.model.PlanBooked;
import com.fitsphere.service.PlanBookedService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/plan-booked")
@CrossOrigin(origins = "*", maxAge = 3600)
public class PlanBookedController {

    @Autowired
    private PlanBookedService planBookedService;

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        try {
            Optional<PlanBooked> planBooked = planBookedService.getById(id);
            if (planBooked.isEmpty()) {
                return notFound("PlanBooked not found");
            }
            return ResponseEntity.ok(planBooked.get());
        } catch (Exception e) {
            return serverError(e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<?> getByPlanId(@RequestParam Long planId) {
        try {
            Optional<PlanBooked> planBooked = planBookedService.getByPlanId(planId);
            if (planBooked.isEmpty()) {
                return notFound("PlanBooked not found for this plan");
            }
            return ResponseEntity.ok(planBooked.get());
        } catch (Exception e) {
            if (e.getMessage().contains("Plan not found")) {
                return notFound(e.getMessage());
            }
            return serverError(e.getMessage());
        }
    }

    private ResponseEntity<Map<String, String>> notFound(String message) {
        Map<String, String> error = new HashMap<>();
        error.put("message", message);
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    private ResponseEntity<Map<String, String>> serverError(String message) {
        Map<String, String> error = new HashMap<>();
        error.put("message", message);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}
