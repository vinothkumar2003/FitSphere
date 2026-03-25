package com.fitsphere.controller;

import com.fitsphere.dto.WorkDoneRequest;
import com.fitsphere.model.WorkDone;
import com.fitsphere.service.WorkDoneService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/workdone")
@CrossOrigin(origins = "*", maxAge = 3600)
public class WorkDoneController {

    @Autowired
    private WorkDoneService workDoneService;

    @PostMapping
    public ResponseEntity<?> createWorkDone(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @RequestBody WorkDoneRequest request) {
        try {
            String token = extractBearerToken(authorizationHeader);
            WorkDone workDone = workDoneService.createWorkDone(token, request);
            return ResponseEntity.status(HttpStatus.CREATED).body(workDone);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            if (e.getMessage().contains("Authorization token")
                    || e.getMessage().contains("Authorization header must use Bearer token")
                    || e.getMessage().contains("Invalid or expired JWT token")
                    || e.getMessage().contains("Invalid token purpose")
                    || e.getMessage().contains("User ID missing in token")
                    || e.getMessage().contains("Failed to extract user details from token")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
            }
            if (e.getMessage().contains("Only TRAINER or ADMIN")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
            }
            if (e.getMessage().contains("not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getWorkDoneById(@PathVariable Long id) {
        try {
            Optional<WorkDone> workDone = workDoneService.getWorkDoneById(id);
            if (workDone.isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("message", "WorkDone not found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
            }
            return ResponseEntity.ok(workDone.get());
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @GetMapping
    public ResponseEntity<?> getWorkDoneByPlanBooked(@RequestParam Long planBookedId) {
        try {
            List<WorkDone> workDoneList = workDoneService.getWorkDoneByPlanBooked(planBookedId);
            return ResponseEntity.ok(workDoneList);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            if (e.getMessage().contains("not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    private String extractBearerToken(String authorizationHeader) {
        if (authorizationHeader == null || authorizationHeader.isBlank()) {
            throw new RuntimeException("Authorization token is required");
        }

        if (!authorizationHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Authorization header must use Bearer token");
        }

        String token = authorizationHeader.substring(7).trim();
        if (token.isEmpty()) {
            throw new RuntimeException("Authorization token is required");
        }

        return token;
    }
}
