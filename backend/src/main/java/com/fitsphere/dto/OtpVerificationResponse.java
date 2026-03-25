package com.fitsphere.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for OTP verification response with authentication token
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OtpVerificationResponse {
    private String message;
    private String authToken; // Unencrypted JWT token for authenticated requests
    private String email;
    private long userId;
    private String username;
    private String role;
    private String expiresIn; // Token expiration time in minutes
}
