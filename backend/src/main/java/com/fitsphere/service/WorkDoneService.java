package com.fitsphere.service;

import com.fitsphere.dto.WorkDoneRequest;
import com.fitsphere.model.PlanBooked;
import com.fitsphere.model.User;
import com.fitsphere.model.UserRole;
import com.fitsphere.model.WorkDone;
import com.fitsphere.repository.PlanBookedRepository;
import com.fitsphere.repository.UserRepository;
import com.fitsphere.repository.WorkDoneRepository;
import com.fitsphere.util.JwtTokenProvider;
import io.jsonwebtoken.Claims;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@Slf4j
public class WorkDoneService {

    @Autowired
    private WorkDoneRepository workDoneRepository;

    @Autowired
    private PlanBookedRepository planBookedRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    public WorkDone createWorkDone(String authToken, WorkDoneRequest request) {
        AuthenticatedUser actor = extractTrainerOrAdminFromToken(authToken);
        validateRequest(request);

        PlanBooked planBooked = planBookedRepository.findById(request.getPlanBookedId())
                .orElseThrow(() -> new RuntimeException("PlanBooked not found"));

        validateTrainerCanHandlePlanBooked(actor, planBooked);

        Set<Integer> approvedClientIds = new HashSet<>(sanitizeIdList(planBooked.getClientIds()));
        if (approvedClientIds.isEmpty()) {
            throw new RuntimeException("No approved clients found for this planBooked");
        }

        List<Integer> presentIds = sanitizeIdList(request.getPresentIdList());
        List<Integer> absentIds = sanitizeIdList(request.getAbsentIdList());

        validateNoOverlap(presentIds, absentIds);
        validateIdsBelongToApprovedClients(approvedClientIds, presentIds, absentIds);

        WorkDone workDone = new WorkDone();
        workDone.setDate(request.getDate());
        workDone.setPlanBooked(planBooked);
        workDone.setTopic(request.getTopic().trim());
        workDone.setPresentIdList(presentIds);
        workDone.setAbsentIdList(absentIds);
        workDone.setTrainer(resolveWorkDoneTrainer(actor, planBooked));

        WorkDone saved = workDoneRepository.save(workDone);
        log.info("WorkDone created for planBooked {} on {}", planBooked.getId(), request.getDate());
        return saved;
    }

    public List<WorkDone> getWorkDoneByPlanBooked(Long planBookedId) {
        PlanBooked planBooked = planBookedRepository.findById(planBookedId)
                .orElseThrow(() -> new RuntimeException("PlanBooked not found"));
        return workDoneRepository.findByPlanBooked(planBooked);
    }

    public Optional<WorkDone> getWorkDoneById(Long id) {
        return workDoneRepository.findById(id);
    }

    private void validateRequest(WorkDoneRequest request) {
        if (request == null) {
            throw new RuntimeException("WorkDone details are required");
        }
        if (request.getDate() == null) {
            throw new RuntimeException("date is required");
        }
        if (request.getPlanBookedId() == null) {
            throw new RuntimeException("planBookedId is required");
        }
        if (request.getTopic() == null || request.getTopic().trim().isEmpty()) {
            throw new RuntimeException("topic is required");
        }
        if ((request.getPresentIdList() == null || request.getPresentIdList().isEmpty())
                && (request.getAbsentIdList() == null || request.getAbsentIdList().isEmpty())) {
            throw new RuntimeException("presentIdList or absentIdList must contain at least one client");
        }
    }

    private void validateTrainerCanHandlePlanBooked(AuthenticatedUser actor, PlanBooked planBooked) {
        if (actor.role() == UserRole.ADMIN) {
            return;
        }

        if (planBooked.getPlan() == null || planBooked.getPlan().getTrainer() == null) {
            throw new RuntimeException("Trainer is not assigned to this plan");
        }

        if (!actor.user().getId().equals(planBooked.getPlan().getTrainer().getId())) {
            throw new RuntimeException("Trainer is not assigned to this plan");
        }
    }

    private List<Integer> sanitizeIdList(List<Integer> ids) {
        if (ids == null) {
            return new ArrayList<>();
        }

        List<Integer> sanitized = new ArrayList<>();
        for (Integer id : ids) {
            if (id == null) {
                continue;
            }
            sanitized.add(id);
        }
        return sanitized;
    }

    private void validateNoOverlap(List<Integer> presentIds, List<Integer> absentIds) {
        Set<Integer> presentSet = new HashSet<>(presentIds);
        for (Integer absentId : absentIds) {
            if (presentSet.contains(absentId)) {
                throw new RuntimeException("Same client cannot be in both presentIdList and absentIdList");
            }
        }
    }

    private void validateIdsBelongToApprovedClients(Set<Integer> approvedClientIds, List<Integer> presentIds, List<Integer> absentIds) {
        for (Integer id : presentIds) {
            if (!approvedClientIds.contains(id)) {
                throw new RuntimeException("Present client ID " + id + " is not approved for this plan");
            }
        }
        for (Integer id : absentIds) {
            if (!approvedClientIds.contains(id)) {
                throw new RuntimeException("Absent client ID " + id + " is not approved for this plan");
            }
        }
    }

    private User resolveWorkDoneTrainer(AuthenticatedUser actor, PlanBooked planBooked) {
        if (actor.role() == UserRole.TRAINER) {
            return actor.user();
        }

        if (planBooked.getPlan() != null && planBooked.getPlan().getTrainer() != null) {
            return planBooked.getPlan().getTrainer();
        }

        return actor.user();
    }

    private AuthenticatedUser extractTrainerOrAdminFromToken(String authToken) {
        if (authToken == null || authToken.isBlank()) {
            throw new RuntimeException("Authorization token is required");
        }

        String resolvedToken = resolveAuthToken(authToken);
        Claims claims = jwtTokenProvider.getClaimsFromToken(resolvedToken);
        if (claims == null) {
            throw new RuntimeException("Failed to extract user details from token");
        }

        String purpose = claims.get("purpose", String.class);
        if (!"authenticated".equalsIgnoreCase(purpose)) {
            throw new RuntimeException("Invalid token purpose");
        }

        String roleValue = claims.get("role", String.class);
        UserRole role = roleValue != null ? UserRole.valueOf(roleValue.toUpperCase()) : null;
        if (role != UserRole.ADMIN && role != UserRole.TRAINER) {
            throw new RuntimeException("Only TRAINER or ADMIN can manage workdone");
        }

        Long userId = claims.get("id", Long.class);
        if (userId == null) {
            Number userIdNumber = claims.get("id", Number.class);
            if (userIdNumber != null) {
                userId = userIdNumber.longValue();
            }
        }

        if (userId == null) {
            throw new RuntimeException("User ID missing in token");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return new AuthenticatedUser(user, role);
    }

    private String resolveAuthToken(String authToken) {
        if (jwtTokenProvider.validateToken(authToken)) {
            return authToken;
        }

        try {
            String decryptedToken = jwtTokenProvider.decryptToken(authToken);
            if (jwtTokenProvider.validateToken(decryptedToken)) {
                return decryptedToken;
            }
        } catch (Exception ex) {
            log.debug("Authorization token is not encrypted JWT format", ex);
        }

        throw new RuntimeException("Invalid or expired JWT token");
    }

    private record AuthenticatedUser(User user, UserRole role) {
    }
}
