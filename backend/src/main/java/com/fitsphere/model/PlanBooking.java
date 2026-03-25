package com.fitsphere.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "plan_bookings")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PlanBooking {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user; // Client who booked
    
    @ManyToOne
    @JoinColumn(name = "plan_id", nullable = false)
    private FitnessPlan plan;
    
    @ManyToOne
    @JoinColumn(name = "trainer_id", nullable = true)
    private User trainer; // Assigned trainer
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BookingStatus status; // PENDING, APPROVED, REJECTED
    
    @Column(nullable = false)
    private LocalDateTime startDate;
    
    private LocalDateTime endDate;
    
    @Column(nullable = true)
    private Double amountPaid;
    
    private String notes;
    
    @Column(nullable = false, updatable = false)
    private LocalDateTime bookedAt = LocalDateTime.now();
    
    private LocalDateTime updatedAt;
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
