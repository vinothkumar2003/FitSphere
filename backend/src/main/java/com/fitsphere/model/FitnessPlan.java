package com.fitsphere.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "fitness_plans")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FitnessPlan {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String name;
    
    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;
    
    @Column(nullable = false)
    private Double price;
    
    @Column(nullable = false)
    private Integer durationWeeks;
    
    @Column(nullable = false)
    private String focusArea; // Upper Body, Lower Body, Full Body, Cardio, etc.
    
    @Column(nullable = false)
    private Integer sessionsPerWeek;
    
    @Column(nullable = false)
    private String difficulty; // Beginner, Intermediate, Advanced
    
    @ManyToOne
    @JoinColumn(name = "creator_id", nullable = false)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private User createdBy; // User who created the plan

    @ManyToOne
    @JoinColumn(name = "trainer_id")
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private User trainer; // Trainer assigned to deliver the plan

    @Transient
    private Long trainerId; // Request-only field used to bind trainer_id directly
    
    @Column(nullable = false)
    private Boolean active = true;
    
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
    
    private LocalDateTime updatedAt;
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public static FitnessPlan create(
            String name,
            String description,
            Double price,
            Integer durationWeeks,
            Integer sessionsPack,
            String difficulty,
            Boolean action,
            User createdBy,
            User trainer,
            String focusArea) {
        FitnessPlan fitnessPlan = new FitnessPlan();
        fitnessPlan.setName(name);
        fitnessPlan.setDescription(description);
        fitnessPlan.setPrice(price);
        fitnessPlan.setDurationWeeks(durationWeeks);
        fitnessPlan.setSessionsPerWeek(sessionsPack);
        fitnessPlan.setDifficulty(difficulty);
        fitnessPlan.setActive(action != null ? action : true);
        fitnessPlan.setCreatedBy(createdBy);
        fitnessPlan.setTrainer(trainer);
        fitnessPlan.setFocusArea(focusArea);
        return fitnessPlan;
    }
}
