package com.fitsphere.service;

import com.fitsphere.dto.*;
import com.fitsphere.model.User;
import com.fitsphere.model.UserRole;
import com.fitsphere.repository.UserRepository;
import com.fitsphere.util.JwtTokenProvider;
import io.jsonwebtoken.Claims;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.Optional;

@Service
@Slf4j
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private OtpService otpService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Value("${app.otp.expose-in-response-on-email-failure:false}")
    private boolean exposeOtpOnEmailFailure;

    /**
     * Register a new user by sending OTP to the provided email.
     * The user record is created only after OTP verification succeeds.
     */
    public SignupResponse signup(SignupRequest signupRequest) {
        // Check if email already exists
        if (userRepository.existsByEmail(signupRequest.getEmail())) {
            throw new RuntimeException("Email already registered");
        }

        // Check if username already exists
        if (userRepository.existsByUsername(signupRequest.getUsername())) {
            throw new RuntimeException("Username already taken");
        }

        String aadharNumber = normalizeUniqueField(signupRequest.getAadharNumber());
        if (aadharNumber != null && userRepository.existsByAadharNumber(aadharNumber)) {
            throw new RuntimeException("Aadhar number already registered");
        }

        String panNumber = normalizeUniqueField(signupRequest.getPanNumber());
        if (panNumber != null && userRepository.existsByPanNumber(panNumber)) {
            throw new RuntimeException("PAN number already registered");
        }

        String phone = normalizeOptionalField(signupRequest.getPhone());

        User tempUser = new User();
        tempUser.setUsername(signupRequest.getUsername());
        tempUser.setEmail(signupRequest.getEmail());
        tempUser.setPassword(passwordEncoder.encode(signupRequest.getPassword()));
        tempUser.setFullName(signupRequest.getFullName());
        tempUser.setPhone(phone);
        tempUser.setRole(UserRole.valueOf(signupRequest.getRole().toUpperCase()));
        tempUser.setAddress(signupRequest.getAddress());
        tempUser.setAadharNumber(aadharNumber);
        tempUser.setPanNumber(panNumber);

        return initiateOtpSignup(tempUser);
    }

    /**
     * Get all users
     */
    public Iterable<User> getAllUsers() {
        return userRepository.findAll();
    }

    /**
     * Get user by ID
     */
    public Optional<User> getUserById(Long id) {
        return userRepository.findById(id);
    }

    /**
     * Login with email and password.
     */
    public LoginResponse login(LoginRequest loginRequest) {
        Optional<User> userOptional = userRepository.findByEmail(loginRequest.getEmail());
        if (userOptional.isEmpty()) {
            throw new RuntimeException("Invalid email or password");
        }

        User user = userOptional.get();
        if (!passwordMatches(loginRequest.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid email or password");
        }

        String authToken = jwtTokenProvider.generateTokenAfterOtpVerification(user);
        log.info("User logged in successfully: {}", user.getEmail());

        // Notify user on successful login (best-effort; does not block login)
        try {
            emailService.sendLoginSuccessEmail(user.getEmail(), user.getFullName());
        } catch (Exception ex) {
            log.warn("Login email notification failed for {}: {}", user.getEmail(), ex.getMessage());
        }

        return new LoginResponse(authToken, convertToDTO(user), "Login successful");
    }

    /**
     * Update user profile
     */
    public User updateUser(Long id, UserDTO userDTO) {
        Optional<User> userOptional = userRepository.findById(id);
        if (userOptional.isEmpty()) {
            throw new RuntimeException("User not found");
        }

        User user = userOptional.get();
        user.setFullName(userDTO.getFullName() != null ? userDTO.getFullName() : user.getFullName());
        user.setPhone(userDTO.getPhone() != null ? normalizeOptionalField(userDTO.getPhone()) : user.getPhone());
        user.setHeight(userDTO.getHeight() != null ? userDTO.getHeight() : user.getHeight());
        user.setWeight(userDTO.getWeight() != null ? userDTO.getWeight() : user.getWeight());
        user.setFitnessGoals(userDTO.getFitnessGoals() != null ? userDTO.getFitnessGoals() : user.getFitnessGoals());
        user.setAddress(userDTO.getAddress() != null ? userDTO.getAddress() : user.getAddress());

        // Optional unique fields: treat blank as null to avoid duplicate \"\" collisions
        user.setAadharNumber(userDTO.getAadharNumber() != null
                ? normalizeUniqueField(userDTO.getAadharNumber())
                : user.getAadharNumber());
        user.setPanNumber(userDTO.getPanNumber() != null
                ? normalizeUniqueField(userDTO.getPanNumber())
                : user.getPanNumber());

        User updatedUser = userRepository.save(user);
        log.info("User updated successfully: {}", updatedUser.getUsername());
        return updatedUser;
    }

    /**
     * Delete user
     */
    public void deleteUser(Long id) {
        Optional<User> user = userRepository.findById(id);
        if (user.isEmpty()) {
            throw new RuntimeException("User not found");
        }

        userRepository.deleteById(id);
        log.info("User deleted successfully: {}", user.get().getUsername());
    }

    /**
     * Convert User to UserDTO
     */
    public UserDTO convertToDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setFullName(user.getFullName());
        dto.setPhone(user.getPhone());
        dto.setRole(user.getRole());
        dto.setProfileImage(user.getProfileImage());
        dto.setHeight(user.getHeight());
        dto.setWeight(user.getWeight());
        dto.setFitnessGoals(user.getFitnessGoals());
        dto.setAddress(user.getAddress());
        dto.setAadharNumber(user.getAadharNumber());
        dto.setPanNumber(user.getPanNumber());
        return dto;
    }

    /**
     * Signup with OTP verification flow
     * Step 1: Generate JWT token with user details and send OTP to email
     */
    public SignupResponse signupWithOtp(SignupWithOtpRequest signupRequest) {
        // Validate input
        if (!signupRequest.getPassword().equals(signupRequest.getConfirmPassword())) {
            throw new RuntimeException("Passwords do not match");
        }

        // Check if email already exists
        if (userRepository.existsByEmail(signupRequest.getEmail())) {
            throw new RuntimeException("Email already registered");
        }

        // Check if username already exists
        if (userRepository.existsByUsername(signupRequest.getUsername())) {
            throw new RuntimeException("Username already taken");
        }

        String aadharNumber = normalizeUniqueField(signupRequest.getAadharNumber());
        if (aadharNumber != null && userRepository.existsByAadharNumber(aadharNumber)) {
            throw new RuntimeException("Aadhar number already registered");
        }

        String panNumber = normalizeUniqueField(signupRequest.getPanNumber());
        if (panNumber != null && userRepository.existsByPanNumber(panNumber)) {
            throw new RuntimeException("PAN number already registered");
        }

        String phone = normalizeOptionalField(signupRequest.getPhone());

        User tempUser = new User();
        tempUser.setUsername(signupRequest.getUsername());
        tempUser.setEmail(signupRequest.getEmail());
        tempUser.setPassword(passwordEncoder.encode(signupRequest.getPassword()));
        tempUser.setFullName(signupRequest.getFullName());
        tempUser.setPhone(phone);
        tempUser.setRole(UserRole.valueOf(signupRequest.getRole().toUpperCase()));
        tempUser.setAddress(signupRequest.getAddress());
        tempUser.setAadharNumber(aadharNumber);
        tempUser.setPanNumber(panNumber);

        return initiateOtpSignup(tempUser);
    }

    /**
     * Verify OTP and create user
     * Step 2: Verify OTP, decrypt JWT token, create user, and return authentication token
     */
    public OtpVerificationResponse verifyOtpAndCreateUser(OtpVerificationRequest otpRequest) {
        // Verify OTP
        if (!otpService.verifyOtp(otpRequest.getEmail(), otpRequest.getOtp())) {
            throw new RuntimeException("Invalid or expired OTP");
        }

        log.info("OTP verified successfully for email: {}", otpRequest.getEmail());

        // Decrypt JWT token
        String decryptedToken = jwtTokenProvider.decryptToken(otpRequest.getJwtToken());
        log.info("JWT token decrypted for email: {}", otpRequest.getEmail());

        // Validate the decrypted token
        if (!jwtTokenProvider.validateToken(decryptedToken)) {
            throw new RuntimeException("Invalid or expired JWT token");
        }

        // Extract user details from JWT token
        Claims claims = jwtTokenProvider.getClaimsFromToken(decryptedToken);
        if (claims == null) {
            throw new RuntimeException("Failed to extract user details from token");
        }

        if (userRepository.existsByEmail(otpRequest.getEmail())) {
            throw new RuntimeException("Email already registered");
        }

        if (userRepository.existsByUsername((String) claims.get("username"))) {
            throw new RuntimeException("Username already taken");
        }

        String aadharNumber = normalizeUniqueField((String) claims.get("aadharNumber"));
        if (aadharNumber != null && userRepository.existsByAadharNumber(aadharNumber)) {
            throw new RuntimeException("Aadhar number already registered");
        }

        String panNumber = normalizeUniqueField((String) claims.get("panNumber"));
        if (panNumber != null && userRepository.existsByPanNumber(panNumber)) {
            throw new RuntimeException("PAN number already registered");
        }

        // Create user in database
        User user = new User();
        user.setUsername((String) claims.get("username"));
        user.setEmail(claims.getSubject());
        user.setPassword((String) claims.get("password"));
        user.setFullName((String) claims.get("fullName"));
        user.setPhone(normalizeOptionalField((String) claims.get("phone")));
        user.setRole(UserRole.valueOf((String) claims.get("role")));
        user.setAddress((String) claims.get("address"));
        user.setAadharNumber(aadharNumber);
        user.setPanNumber(panNumber);

        User savedUser = userRepository.save(user);
        log.info("User created successfully: {}", savedUser.getUsername());

        // Send account creation email after successful registration
        try {
            emailService.sendAccountCreatedEmail(savedUser.getEmail(), savedUser.getFullName());
        } catch (Exception e) {
            log.error("Failed to send account-created email to: {}", savedUser.getEmail(), e);
        }

        // Generate authentication token for immediate login
        String authToken = jwtTokenProvider.generateTokenAfterOtpVerification(savedUser);
        log.info("Authentication token generated for user: {}", savedUser.getUsername());

        // Return OTP verification response with authentication token
        OtpVerificationResponse response = new OtpVerificationResponse();
        response.setMessage("Email verified successfully! You are now registered.");
        response.setAuthToken(authToken);
        response.setEmail(savedUser.getEmail());
        response.setUserId(savedUser.getId());
        response.setUsername(savedUser.getUsername());
        response.setRole(savedUser.getRole().toString());
        response.setExpiresIn("7 days");

        return response;
    }

    /**
     * Resend OTP to email
     */
    public String resendOtp(String email) {
        Optional<User> userOptional = userRepository.findByEmail(email);

        otpService.clearOtp(email);
        OtpService.OtpDispatchResult dispatchResult =
                otpService.generateAndSendOtp(email, userOptional.map(User::getFullName).orElse("User"));

        if (dispatchResult.emailSent()) {
            log.info("OTP resent to email: {}", email);
            return "OTP has been sent to your email.";
        }

        log.warn("OTP regenerated for {} but email delivery failed: {}", email, dispatchResult.errorMessage());
        return "OTP generated, but email delivery failed. Check server logs for the OTP in local development.";
    }

    private SignupResponse initiateOtpSignup(User tempUser) {
        String jwtToken = jwtTokenProvider.generateTokenForOtp(tempUser);
        log.info("JWT token generated for OTP verification for email: {}", tempUser.getEmail());

        String encryptedToken = jwtTokenProvider.encryptToken(jwtToken);
        log.info("JWT token encrypted for email: {}", tempUser.getEmail());

        otpService.clearOtp(tempUser.getEmail());
        OtpService.OtpDispatchResult dispatchResult =
                otpService.generateAndSendOtp(tempUser.getEmail(), tempUser.getFullName());

        if (dispatchResult.emailSent()) {
            log.info("OTP generated and sent to email: {}", tempUser.getEmail());
        } else {
            log.warn("OTP generated for {} but email delivery failed: {}",
                    tempUser.getEmail(), dispatchResult.errorMessage());
        }

        SignupResponse response = new SignupResponse();
        response.setMessage(dispatchResult.emailSent()
                ? "OTP sent to your email. Please verify within 10 minutes."
                : "OTP generated, but email delivery failed. Please verify within 10 minutes.");
        response.setEmail(tempUser.getEmail());
        response.setJwtToken(encryptedToken);
        response.setExpiresIn("15 minutes");
        response.setEmailSent(dispatchResult.emailSent());

        if (!dispatchResult.emailSent()) {
            response.setWarning("Email delivery failed. SMTP/DNS may be unavailable.");
            if (exposeOtpOnEmailFailure) {
                response.setDebugOtp(dispatchResult.otp());
            }
        }

        return response;
    }

    private boolean passwordMatches(String rawPassword, String storedPassword) {
        if (rawPassword == null || storedPassword == null) {
            return false;
        }

        try {
            return passwordEncoder.matches(rawPassword, storedPassword);
        } catch (Exception ex) {
            log.warn("Password comparison failed for stored credential format");
            return false;
        }
    }

    /**
     * Convert blank/whitespace-only optional unique fields to null so the DB
     * treats them as absent instead of an empty string that collides on the
     * unique index.
     */
    private String normalizeUniqueField(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /**
     * Normalize optional non-unique fields (e.g., phone) by trimming and
     * converting blank strings to null so updates with \"\" don't fail or leave
     * phantom empty values.
     */
    private String normalizeOptionalField(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
