package com.fitsphere.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "diet_plans")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DietPlan {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user; // Client assigned to this diet
    
    @ManyToOne
    @JoinColumn(name = "trainer_id", nullable = false)
    private User trainer; // Trainer who created the plan
    
    @Column(nullable = false)
    private String name;
    
    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;
    
    @Column(nullable = false)
    private Integer dailyCalories;
    
    @Column(nullable = false)
    private String dietType; // Vegetarian, Non-Vegetarian, Vegan, etc.
    
    @Column(columnDefinition = "TEXT")
    private String breakfastPlan;
    
    @Column(columnDefinition = "TEXT")
    private String lunchPlan;
    
    @Column(columnDefinition = "TEXT")
    private String dinnerPlan;
    
    @Column(columnDefinition = "TEXT")
    private String snacksPlan;
    
    @Column(columnDefinition = "TEXT")
    private String restrictions;
    
    @Column(nullable = false)
    private Boolean active = true;
    
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
    
    private LocalDateTime updatedAt;
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
