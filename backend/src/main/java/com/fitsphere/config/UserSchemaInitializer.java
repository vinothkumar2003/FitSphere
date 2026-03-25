package com.fitsphere.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class UserSchemaInitializer {

    private final JdbcTemplate jdbcTemplate;

    public UserSchemaInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void alignUsersTable() {
        run("ALTER TABLE users MODIFY COLUMN address TEXT NULL");
        run("ALTER TABLE users MODIFY COLUMN aadhar_number VARCHAR(255) NULL");
        run("ALTER TABLE users MODIFY COLUMN pan_number VARCHAR(255) NULL");
        run("ALTER TABLE users MODIFY COLUMN phone VARCHAR(255) NULL");
        run("ALTER TABLE users MODIFY COLUMN active BOOLEAN NOT NULL DEFAULT TRUE");
        run("ALTER TABLE users MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
        run("ALTER TABLE users MODIFY COLUMN updated_at DATETIME NULL");
        run("ALTER TABLE plan_bookings MODIFY COLUMN status ENUM('PENDING','APPROVED','REJECTED') NOT NULL");
        run("ALTER TABLE plan_bookings MODIFY COLUMN amount_paid DOUBLE NOT NULL");
    }

    private void run(String sql) {
        try {
            jdbcTemplate.execute(sql);
        } catch (Exception ex) {
            log.debug("Skipping schema alignment statement: {}", sql, ex);
        }
    }
}
