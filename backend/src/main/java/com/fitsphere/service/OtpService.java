package com.fitsphere.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * OTP Service for generating and validating OTP
 */
@Service
@Slf4j
public class OtpService {

    private static final Map<String, OtpEntry> OTP_CACHE = new ConcurrentHashMap<>();

    @Autowired
    private RedisTemplate<String, String> redisTemplate;

    @Autowired
    private EmailService emailService;

    private static final Random random = new Random();
    private static final long OTP_EXPIRY_TIME = 10; // 10 minutes
    private static final int OTP_LENGTH = 6; // 6-digit OTP

    /**
     * Generate OTP and send to email
     */
    public OtpDispatchResult generateAndSendOtp(String email, String fullName) {
        String otp = generateOtp(OTP_LENGTH);
        String redisKey = "otp:" + email;

        storeOtp(redisKey, otp);
        log.info("OTP generated and stored for email: {}", email);

        // Send OTP to email
        try {
            System.out.println("Sending OTP to email: " + email + " OTP: " + otp); // For testing purposes
            emailService.sendOtpEmail(email, fullName, otp);
            log.info("OTP email sent to: {}", email);
            return new OtpDispatchResult(otp, true, null);
        } catch (Exception e) {
            log.error("Failed to send OTP email to: {}", email, e);
            return new OtpDispatchResult(otp, false, e.getMessage());
        }
    }

    /**
     * Verify OTP
     */
    public boolean verifyOtp(String email, String otp) {
        String redisKey = "otp:" + email;
        String storedOtp = getOtp(redisKey);

        if (storedOtp == null) {
            log.warn("OTP not found or expired for email: {}", email);
            return false;
        }

        if (!storedOtp.equals(otp)) {
            log.warn("Invalid OTP for email: {}", email);
            return false;
        }

        // Delete OTP after successful verification
        removeOtp(redisKey);
        log.info("OTP verified successfully for email: {}", email);
        return true;
    }

    /**
     * Generate random OTP of specified length
     */
    private String generateOtp(int length) {
        StringBuilder otp = new StringBuilder();
        for (int i = 0; i < length; i++) {
            otp.append(random.nextInt(10));
        }
        return otp.toString();
    }

    /**
     * Check if OTP exists for email (for resend functionality)
     */
    public boolean otpExists(String email) {
        String redisKey = "otp:" + email;
        return getOtp(redisKey) != null;
    }

    /**
     * Clear OTP for email (for cleanup)
     */
    public void clearOtp(String email) {
        removeOtp("otp:" + email);
        log.info("OTP cleared for email: {}", email);
    }

    private void storeOtp(String redisKey, String otp) {
        try {
            redisTemplate.opsForValue().set(redisKey, otp, OTP_EXPIRY_TIME, TimeUnit.MINUTES);
        } catch (Exception ex) {
            OTP_CACHE.put(redisKey, new OtpEntry(otp, LocalDateTime.now().plusMinutes(OTP_EXPIRY_TIME)));
            log.warn("Redis unavailable. OTP stored in memory for key: {}", redisKey, ex);
        }
    }

    private String getOtp(String redisKey) {
        try {
            return redisTemplate.opsForValue().get(redisKey);
        } catch (Exception ex) {
            OtpEntry entry = OTP_CACHE.get(redisKey);
            if (entry == null) {
                log.warn("Redis unavailable and no in-memory OTP found for key: {}", redisKey, ex);
                return null;
            }

            if (entry.isExpired()) {
                OTP_CACHE.remove(redisKey);
                log.warn("In-memory OTP expired for key: {}", redisKey);
                return null;
            }

            log.warn("Redis unavailable. Using in-memory OTP for key: {}", redisKey, ex);
            return entry.otp();
        }
    }

    private void removeOtp(String redisKey) {
        try {
            redisTemplate.delete(redisKey);
        } catch (Exception ex) {
            log.warn("Redis unavailable while deleting OTP for key: {}", redisKey, ex);
        } finally {
            OTP_CACHE.remove(redisKey);
        }
    }

    private record OtpEntry(String otp, LocalDateTime expiresAt) {
        private boolean isExpired() {
            return LocalDateTime.now().isAfter(expiresAt);
        }
    }

    public record OtpDispatchResult(String otp, boolean emailSent, String errorMessage) {
    }
}
