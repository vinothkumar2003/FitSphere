package com.fitsphere.controller;

import com.fitsphere.model.GymEquipment;
import com.fitsphere.service.GymEquipmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/gym-equipment")
public class GymEquipmentController {
    @Autowired
    private GymEquipmentService gymEquipmentService;

    @GetMapping
    public List<GymEquipment> getAllEquipment() {
        return gymEquipmentService.getAllEquipment();
    }

    @GetMapping("/{id}")
    public ResponseEntity<GymEquipment> getEquipmentById(@PathVariable Long id) {
        return gymEquipmentService.getEquipmentById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> addEquipment(
            @RequestHeader("Authorization") String authorizationHeader,
            @RequestBody GymEquipment equipment
    ) {
        try {
            String token = extractBearerToken(authorizationHeader);
            return ResponseEntity.ok(gymEquipmentService.addEquipment(equipment, token));
        } catch (RuntimeException e) {
            return buildErrorResponse(e);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateEquipment(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable Long id,
            @RequestBody GymEquipment equipment
    ) {
        try {
            String token = extractBearerToken(authorizationHeader);
            GymEquipment updated = gymEquipmentService.updateEquipment(id, equipment, token);
            if (updated != null) {
                return ResponseEntity.ok(updated);
            }
            return ResponseEntity.notFound().build();
        } catch (RuntimeException e) {
            return buildErrorResponse(e);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteEquipment(
            @RequestHeader("Authorization") String authorizationHeader,
            @PathVariable Long id
    ) {
        try {
            String token = extractBearerToken(authorizationHeader);
            gymEquipmentService.deleteEquipment(id, token);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return buildErrorResponse(e);
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

    private ResponseEntity<String> buildErrorResponse(RuntimeException e) {
        String message = e.getMessage() == null ? "Request failed" : e.getMessage();
        if (message.contains("Authorization token")
                || message.contains("Authorization header must use Bearer token")
                || message.contains("Invalid or expired JWT token")
                || message.contains("Failed to extract user details from token")
                || message.contains("Invalid token purpose")) {
            return ResponseEntity.status(401).body(message);
        }
        if (message.contains("Only ADMIN")) {
            return ResponseEntity.status(403).body(message);
        }
        return ResponseEntity.badRequest().body(message);
    }
}
