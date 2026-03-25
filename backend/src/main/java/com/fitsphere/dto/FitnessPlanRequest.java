package com.fitsphere.dto;

import lombok.Data;

@Data
public class FitnessPlanRequest {
    private String name;
    private String description;
    private Double price;
    private Integer durationWeeks;
    private String focusArea;
    private Integer sessionsPerWeek;
    private String difficulty;
    private Long trainerId;
    private Boolean active;
}
