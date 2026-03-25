package com.fitsphere.repository;

import com.fitsphere.model.User;
import com.fitsphere.model.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);
    Optional<User> findByAadharNumber(String aadharNumber);
    Optional<User> findByPanNumber(String panNumber);
    List<User> findByRole(UserRole role);
    Boolean existsByEmail(String email);
    Boolean existsByUsername(String username);
    Boolean existsByAadharNumber(String aadharNumber);
    Boolean existsByPanNumber(String panNumber);
}
