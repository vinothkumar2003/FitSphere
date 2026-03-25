package com.fitsphere.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for signup response with encrypted JWT token
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SignupResponse {
    private String message;
    private String email;
    private String jwtToken; // Encrypted JWT token
    private String expiresIn; // Token expiration time in minutes
    private boolean emailSent;
    private String warning;
    private String debugOtp;
}
