package com.fitsphere.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.time.LocalDateTime;
import java.util.List;

@Service
@Slf4j
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.from}")
    private String fromEmail;

    @Value("${spring.mail.display-name}")
    private String displayName;

    /**
     * Send simple email with just subject and text
     */
    public void sendSimpleEmail(String to, String subject, String text) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(text);
            
            mailSender.send(message);
            log.info("Email sent successfully to: {}", to);
        } catch (Exception e) {
            log.error("Failed to send email to: {}", to, e);
            throw new RuntimeException("Failed to send email: " + e.getMessage());
        }
    }

    /**
     * Send email with multiple recipients
     */
    public void sendEmailToMultiple(List<String> recipients, String subject, String text) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(recipients.toArray(new String[0]));
            message.setSubject(subject);
            message.setText(text);
            
            mailSender.send(message);
            log.info("Email sent successfully to {} recipients", recipients.size());
        } catch (Exception e) {
            log.error("Failed to send email to multiple recipients", e);
            throw new RuntimeException("Failed to send email: " + e.getMessage());
        }
    }

    /**
     * Send HTML email
     */
    public void sendHtmlEmail(String to, String subject, String htmlContent) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setFrom(fromEmail, displayName);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true); // true indicates HTML content
            
            mailSender.send(message);
            log.info("HTML email sent successfully to: {}", to);
        } catch (Exception e) {
            log.error("Failed to send HTML email to: {}", to, e);
            throw new RuntimeException("Failed to send email: " + e.getMessage());
        }
    }

    /**
     * Send email with CC and BCC
     */
    public void sendEmailWithCcBcc(String to, String cc, String bcc, String subject, String text) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setFrom(fromEmail, displayName);
            helper.setTo(to);
            if (cc != null && !cc.isEmpty()) {
                helper.setCc(cc);
            }
            if (bcc != null && !bcc.isEmpty()) {
                helper.setBcc(bcc);
            }
            helper.setSubject(subject);
            helper.setText(text);
            
            mailSender.send(message);
            log.info("Email with CC/BCC sent successfully to: {}", to);
        } catch (Exception e) {
            log.error("Failed to send email with CC/BCC to: {}", to, e);
            throw new RuntimeException("Failed to send email: " + e.getMessage());
        }
    }

    /**
     * Send welcome email for new user registration
     */
    public void sendWelcomeEmail(String email, String fullName, String username) {
        String subject = "Welcome to FitSphere - Your Fitness Journey Starts Here!";
        String htmlContent = String.format(
            "<html>" +
            "<body style='font-family: Arial, sans-serif;'>" +
            "<h2>Welcome to FitSphere, %s!</h2>" +
            "<p>Your account has been successfully created.</p>" +
            "<p><strong>Account Details:</strong></p>" +
            "<ul>" +
            "<li>Username: <strong>%s</strong></li>" +
            "<li>Email: <strong>%s</strong></li>" +
            "</ul>" +
            "<p>You can now log in to access our fitness plans, book sessions with trainers, and track your progress.</p>" +
            "<p><a href='http://localhost:3000/login' style='background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>Login to FitSphere</a></p>" +
            "<p>If you have any questions, feel free to contact us.</p>" +
            "<p>Best regards,<br/>FitSphere Team</p>" +
            "</body>" +
            "</html>",
            fullName, username, email
        );
        
        sendHtmlEmail(email, subject, htmlContent);
    }

    /**
     * Send email verification link
     */
    public void sendEmailVerificationLink(String email, String verificationToken) {
        String subject = "Verify Your Email Address";
        String htmlContent = String.format(
            "<html>" +
            "<body style='font-family: Arial, sans-serif;'>" +
            "<h2>Email Verification</h2>" +
            "<p>Please verify your email address by clicking the link below:</p>" +
            "<p><a href='http://localhost:8080/api/auth/verify?token=%s' style='background-color: #007BFF; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>Verify Email</a></p>" +
            "<p>This link will expire in 24 hours.</p>" +
            "<p>If you didn't request this, please ignore this email.</p>" +
            "<p>Regards,<br/>FitSphere Team</p>" +
            "</body>" +
            "</html>",
            verificationToken
        );
        
        sendHtmlEmail(email, subject, htmlContent);
    }

    /**
     * Send password reset link
     */
    public void sendPasswordResetLink(String email, String resetToken, String fullName) {
        String subject = "Reset Your FitSphere Password";
        String htmlContent = String.format(
            "<html>" +
            "<body style='font-family: Arial, sans-serif;'>" +
            "<h2>Password Reset Request</h2>" +
            "<p>Hello %s,</p>" +
            "<p>We received a request to reset your password. Click the link below to create a new password:</p>" +
            "<p><a href='http://localhost:3000/reset-password?token=%s' style='background-color: #FF6B6B; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>Reset Password</a></p>" +
            "<p>This link will expire in 1 hour.</p>" +
            "<p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>" +
            "<p>Regards,<br/>FitSphere Team</p>" +
            "</body>" +
            "</html>",
            fullName, resetToken
        );
        
        sendHtmlEmail(email, subject, htmlContent);
    }

    /**
     * Send fitness plan booking confirmation
     */
    public void sendBookingConfirmation(String email, String fullName, String planName, 
                                       String trainerName, String startDate, Double amount) {
        String subject = "Fitness Plan Booking Confirmed - " + planName;
        String htmlContent = String.format(
            "<html>" +
            "<body style='font-family: Arial, sans-serif;'>" +
            "<h2>Booking Confirmation</h2>" +
            "<p>Hello %s,</p>" +
            "<p>Your fitness plan booking has been confirmed!</p>" +
            "<p><strong>Booking Details:</strong></p>" +
            "<table style='border-collapse: collapse; width: 100%;'>" +
            "<tr><td style='border: 1px solid #ddd; padding: 8px;'><strong>Plan Name:</strong></td><td style='border: 1px solid #ddd; padding: 8px;'>%s</td></tr>" +
            "<tr><td style='border: 1px solid #ddd; padding: 8px;'><strong>Trainer:</strong></td><td style='border: 1px solid #ddd; padding: 8px;'>%s</td></tr>" +
            "<tr><td style='border: 1px solid #ddd; padding: 8px;'><strong>Start Date:</strong></td><td style='border: 1px solid #ddd; padding: 8px;'>%s</td></tr>" +
            "<tr><td style='border: 1px solid #ddd; padding: 8px;'><strong>Amount:</strong></td><td style='border: 1px solid #ddd; padding: 8px;'>₹%.2f</td></tr>" +
            "</table>" +
            "<p>Your trainer will contact you soon to schedule your sessions.</p>" +
            "<p><a href='http://localhost:3000/dashboard' style='background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>View Your Bookings</a></p>" +
            "<p>Regards,<br/>FitSphere Team</p>" +
            "</body>" +
            "</html>",
            fullName, planName, trainerName, startDate, amount
        );
        
        sendHtmlEmail(email, subject, htmlContent);
    }

    /**
     * Send session reminder email
     */
    public void sendSessionReminder(String email, String fullName, String sessionDate, 
                                   String sessionTime, String trainerName, String location) {
        String subject = "Reminder: Your Fitness Session Tomorrow";
        String htmlContent = String.format(
            "<html>" +
            "<body style='font-family: Arial, sans-serif;'>" +
            "<h2>Session Reminder</h2>" +
            "<p>Hi %s,</p>" +
            "<p>This is a reminder about your fitness session tomorrow:</p>" +
            "<p><strong>Session Details:</strong></p>" +
            "<ul>" +
            "<li>Date: <strong>%s</strong></li>" +
            "<li>Time: <strong>%s</strong></li>" +
            "<li>Trainer: <strong>%s</strong></li>" +
            "<li>Location: <strong>%s</strong></li>" +
            "</ul>" +
            "<p>Please arrive 10 minutes early. If you need to reschedule, please contact your trainer.</p>" +
            "<p>Regards,<br/>FitSphere Team</p>" +
            "</body>" +
            "</html>",
            fullName, sessionDate, sessionTime, trainerName, location
        );
        
        sendHtmlEmail(email, subject, htmlContent);
    }

    /**
     * Send contact form response
     */
    public void sendContactFormResponse(String email, String name, String subject) {
        String htmlContent = String.format(
            "<html>" +
            "<body style='font-family: Arial, sans-serif;'>" +
            "<h2>Thank You for Contacting FitSphere</h2>" +
            "<p>Hello %s,</p>" +
            "<p>We have received your message with subject: <strong>%s</strong></p>" +
            "<p>Our support team will get back to you within 24 hours.</p>" +
            "<p>Thank you for choosing FitSphere!</p>" +
            "<p>Regards,<br/>FitSphere Support Team</p>" +
            "</body>" +
            "</html>",
            name, subject
        );
        
        sendHtmlEmail(email, "Re: " + subject, htmlContent);
    }

    /**
     * Send OTP verification email
     */
    public void sendOtpEmail(String email, String fullName, String otp) {
        String subject = "FitSphere - Your OTP Code for Email Verification";
        String htmlContent = String.format(
            "<html>" +
            "<body style='font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;'>" +
            "<div style='max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);'>" +
            "<h2 style='color: #4CAF50; text-align: center;'>Email Verification</h2>" +
            "<p style='font-size: 14px; color: #666;'>Hi %s,</p>" +
            "<p style='font-size: 14px; color: #666;'>Thank you for signing up with FitSphere! Please verify your email address using the OTP code below:</p>" +
            "<div style='background-color: #f0f0f0; padding: 20px; text-align: center; border-radius: 5px; margin: 30px 0;'>" +
            "<p style='font-size: 12px; color: #999; margin: 0 0 10px 0;'>Your OTP Code</p>" +
            "<p style='font-size: 36px; font-weight: bold; color: #4CAF50; margin: 0; letter-spacing: 5px;'>%s</p>" +
            "</div>" +
            "<p style='font-size: 12px; color: #999;'>This code will expire in 10 minutes. Do not share this code with anyone.</p>" +
            "<p style='font-size: 14px; color: #666;'>If you didn't request this code, please ignore this email.</p>" +
            "<hr style='border: none; border-top: 1px solid #ddd; margin: 30px 0;'>" +
            "<p style='font-size: 12px; color: #999; text-align: center;'>FitSphere Team<br/>Your Fitness Companion</p>" +
            "</div>" +
            "</body>" +
            "</html>",
            fullName, otp
        );
        
        sendHtmlEmail(email, subject, htmlContent);
    }

    /**
     * Send plan renewal reminder email
     */
    public void sendPlanRenewalReminder(String email, String fullName, String planName,
                                        LocalDateTime expiryDate, String message) {
        String subject = "Your FitSphere plan will expire soon";
        String expiryText = expiryDate != null ? expiryDate.toLocalDate().toString() : "Soon";
        String htmlContent = String.format(
            "<html>" +
            "<body style='font-family: Arial, sans-serif;'>" +
            "<h2>Plan Renewal Reminder</h2>" +
            "<p>Hello %s,</p>" +
            "<p>%s</p>" +
            "<p><strong>Plan Details:</strong></p>" +
            "<table style='border-collapse: collapse; width: 100%%;'>" +
            "<tr><td style='border: 1px solid #ddd; padding: 8px;'><strong>Plan Name:</strong></td><td style='border: 1px solid #ddd; padding: 8px;'>%s</td></tr>" +
            "<tr><td style='border: 1px solid #ddd; padding: 8px;'><strong>Expected Expiry Date:</strong></td><td style='border: 1px solid #ddd; padding: 8px;'>%s</td></tr>" +
            "</table>" +
            "<p>Please renew your plan to continue your sessions without interruption.</p>" +
            "<p>Regards,<br/>FitSphere Team</p>" +
            "</body>" +
            "</html>",
            fullName, message, planName, expiryText
        );

        sendHtmlEmail(email, subject, htmlContent);
    }

    /**
     * Send a short confirmation when a user logs in successfully.
     */
    public void sendLoginSuccessEmail(String email, String fullName) {
        String subject = "FitSphere - Login Successful";
        String htmlContent = String.format(
            "<html>"
          + "<body style='font-family: Arial, sans-serif;'>"
          + "<h3>Hi %s,</h3>"
          + "<p>You have logged in successfully.</p>"
          + "<p>If this wasn't you, please reset your password immediately.</p>"
          + "<p>Regards,<br/>FitSphere Team</p>"
          + "</body>"
          + "</html>",
          fullName != null ? fullName : "FitSphere user"
        );

        sendHtmlEmail(email, subject, htmlContent);
    }

    /**
     * Send a short confirmation when a user account is created successfully.
     */
    public void sendAccountCreatedEmail(String email, String fullName) {
        String subject = "FitSphere - Account Created Successfully";
        String htmlContent = String.format(
            "<html>"
          + "<body style='font-family: Arial, sans-serif;'>"
          + "<h3>Welcome %s!</h3>"
          + "<p>Your account has been created successfully. You can now log in and start using FitSphere.</p>"
          + "<p>If this wasn't you, please reset your password immediately.</p>"
          + "<p>Regards,<br/>FitSphere Team</p>"
          + "</body>"
          + "</html>",
          fullName != null ? fullName : "FitSphere user"
        );

        sendHtmlEmail(email, subject, htmlContent);
    }
}
