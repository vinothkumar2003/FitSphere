package com.fitsphere.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SignupRequest {
    private String username;
    private String email;
    private String password;
    private String fullName;
    private String phone;
    private String role; // ADMIN, TRAINER, CLIENT
    private String address;
    private String aadharNumber;
    private String panNumber;
}
