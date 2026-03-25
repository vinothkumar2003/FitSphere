package com.fitsphere.util;

import com.fitsphere.model.User;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.io.Serializable;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * JWT Token Provider for generating, validating, and encrypting/decrypting JWT tokens
 */
@Component
@Slf4j
public class JwtTokenProvider implements Serializable {

    @Value("${jwt.secret:mySecretKeyForJWTTokenGenerationAndValidationWithMinimum256BitLength}")
    private String jwtSecret;

    @Value("${jwt.expiration:900000}") // 15 minutes in milliseconds
    private long jwtExpiration;

    @Value("${jwt.encryption.key:encryptionKeyWith32Chars1234567890}")
    private String encryptionKey;

    private static final String ALGORITHM = "AES";

    /**
     * Generate JWT token for user with OTP verification (unencrypted)
     */
    public String generateTokenForOtp(User user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("id", user.getId());
        claims.put("email", user.getEmail());
        claims.put("username", user.getUsername());
        claims.put("password", user.getPassword());
        claims.put("fullName", user.getFullName());
        claims.put("phone", user.getPhone());
        claims.put("role", user.getRole());
        claims.put("address", user.getAddress());
        claims.put("aadharNumber", user.getAadharNumber());
        claims.put("panNumber", user.getPanNumber());
        claims.put("purpose", "otp_verification");

        return createToken(claims, user.getEmail());
    }

    /**
     * Generate JWT token after successful OTP verification (unencrypted)
     */
    public String generateTokenAfterOtpVerification(User user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("id", user.getId());
        claims.put("email", user.getEmail());
        claims.put("username", user.getUsername());
        claims.put("role", user.getRole());
        claims.put("purpose", "authenticated");

        return createToken(claims, user.getEmail());
    }

    /**
     * Encrypt JWT token using AES encryption
     */
    public String encryptToken(String token) {
        try {
            SecretKeySpec secretKey = buildAesKey();

            // Initialize cipher for encryption
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey);

            // Encrypt and encode
            byte[] encryptedBytes = cipher.doFinal(token.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(encryptedBytes);
        } catch (Exception e) {
            log.error("Error encrypting token: {}", e.getMessage());
            throw new RuntimeException("Token encryption failed: " + e.getMessage());
        }
    }

    /**
     * Decrypt JWT token using AES decryption
     */
    public String decryptToken(String encryptedToken) {
        try {
            SecretKeySpec secretKey = buildAesKey();

            // Initialize cipher for decryption
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, secretKey);

            // Decrypt and decode
            byte[] decryptedBytes = cipher.doFinal(Base64.getDecoder().decode(encryptedToken));
            return new String(decryptedBytes, StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("Error decrypting token: {}", e.getMessage());
            throw new RuntimeException("Token decryption failed: " + e.getMessage());
        }
    }

    /**
     * Create JWT token with claims
     */
    private String createToken(Map<String, Object> claims, String subject) {
        long nowMillis = System.currentTimeMillis();
        Date now = new Date(nowMillis);
        Date expiryDate = new Date(nowMillis + jwtExpiration);

        return Jwts.builder()
                .claims(claims)
                .subject(subject)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8)), SignatureAlgorithm.HS512)
                .compact();
    }

    /**
     * Validate JWT token
     */
    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8)))
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (SecurityException e) {
            log.error("Invalid JWT signature: {}", e.getMessage());
        } catch (MalformedJwtException e) {
            log.error("Invalid JWT token: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            log.error("Expired JWT token: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            log.error("Unsupported JWT token: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            log.error("JWT claims string is empty: {}", e.getMessage());
        }
        return false;
    }

    /**
     * Get email from JWT token
     */
    public String getEmailFromToken(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8)))
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return claims.getSubject();
        } catch (Exception e) {
            log.error("Error extracting email from token: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Get all claims from JWT token
     */
    public Claims getClaimsFromToken(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8)))
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (Exception e) {
            log.error("Error extracting claims from token: {}", e.getMessage());
            return null;
        }
    }

    private SecretKeySpec buildAesKey() {
        try {
            MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
            byte[] keyBytes = sha256.digest(encryptionKey.getBytes(StandardCharsets.UTF_8));
            return new SecretKeySpec(keyBytes, ALGORITHM);
        } catch (Exception e) {
            log.error("Error preparing AES key: {}", e.getMessage());
            throw new RuntimeException("Token key preparation failed: " + e.getMessage());
        }
    }
}
