package com.fitsphere.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fitsphere.model.UserRole;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {
    private Long id;
    private String username;
    private String email;
    private String fullName;
    private String phone;
    private UserRole role;
    private String profileImage;
    private Double height;
    private Double weight;
    private String fitnessGoals;
    private String address;
    private String aadharNumber;
    private String panNumber;
}
