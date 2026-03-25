package com.fitsphere.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PlanAttendanceRequest {

    private LocalDate date;
    private String topic;
    private List<Integer> presentIdList;
    private List<Integer> absentIdList;
}
