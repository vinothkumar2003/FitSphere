package com.fitsphere.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for signup request that initiates OTP flow
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SignupWithOtpRequest {
    private String username;
    private String email;
    private String password;
    private String confirmPassword;
    private String fullName;
    private String phone;
    private String role; // CONSUMER, TRAINER
    private String address;
    private String aadharNumber;
    private String panNumber;
}
