package com.fitsphere.model;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "work_done")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkDone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate date;

    @ManyToOne
    @JoinColumn(name = "plan_booked_id", nullable = false)
    private PlanBooked planBooked;

    @Column(nullable = false)
    private String topic;

    @ManyToOne
    @JoinColumn(name = "trainer_id", nullable = false)
    private User trainer;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "work_done_present_ids", joinColumns = @JoinColumn(name = "work_done_id"))
    @Column(name = "user_id", nullable = false)
    private List<Integer> presentIdList = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "work_done_absent_ids", joinColumns = @JoinColumn(name = "work_done_id"))
    @Column(name = "user_id", nullable = false)
    private List<Integer> absentIdList = new ArrayList<>();

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    @jakarta.persistence.PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
