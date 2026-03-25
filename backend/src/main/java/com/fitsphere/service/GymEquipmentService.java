package com.fitsphere.service;

import com.fitsphere.model.GymEquipment;
import com.fitsphere.repository.GymEquipmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class GymEquipmentService {
    @Autowired
    private GymEquipmentRepository gymEquipmentRepository;

    @Autowired
    private AdminAuthorizationService adminAuthorizationService;

    public List<GymEquipment> getAllEquipment() {
        return gymEquipmentRepository.findActiveEquipmentByOrderByNameAsc();
    }

    public Optional<GymEquipment> getEquipmentById(Long id) {
        return gymEquipmentRepository.findById(id);
    }

    public GymEquipment addEquipment(GymEquipment equipment, String authToken) {
        adminAuthorizationService.requireAdmin(authToken, "modify gym equipment");
        validateEquipment(equipment);
        applyDefaults(equipment);
        return gymEquipmentRepository.save(equipment);
    }

    public void deleteEquipment(Long id, String authToken) {
        adminAuthorizationService.requireAdmin(authToken, "modify gym equipment");
        GymEquipment equipment = gymEquipmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Equipment not found"));
        equipment.setActive(false);
        gymEquipmentRepository.save(equipment);
    }

    public GymEquipment updateEquipment(Long id, GymEquipment updatedEquipment, String authToken) {
        adminAuthorizationService.requireAdmin(authToken, "modify gym equipment");
        validateEquipment(updatedEquipment);
        return gymEquipmentRepository.findById(id)
                .map(equipment -> {
                    equipment.setName(updatedEquipment.getName());
                    equipment.setType(updatedEquipment.getType());
                    equipment.setManufacturer(updatedEquipment.getManufacturer());
                    equipment.setQuantity(updatedEquipment.getQuantity());
                    equipment.setReorderLevel(normalizeReorderLevel(updatedEquipment.getReorderLevel()));
                    equipment.setUnitCost(updatedEquipment.getUnitCost());
                    equipment.setLocation(trimToNull(updatedEquipment.getLocation()));
                    equipment.setNotes(trimToNull(updatedEquipment.getNotes()));
                    equipment.setActive(updatedEquipment.getActive() == null ? equipment.getActive() : updatedEquipment.getActive());
                    if (equipment.getActive() == null) {
                        equipment.setActive(true);
                    }
                    return gymEquipmentRepository.save(equipment);
                })
                .orElse(null);
    }

    private void validateEquipment(GymEquipment equipment) {
        if (equipment == null) {
            throw new RuntimeException("Equipment details are required");
        }

        if (equipment.getName() == null || equipment.getName().isBlank()) {
            throw new RuntimeException("Equipment name is required");
        }

        if (equipment.getQuantity() < 0) {
            throw new RuntimeException("Equipment quantity cannot be negative");
        }

        Integer reorderLevel = equipment.getReorderLevel();
        if (reorderLevel != null && reorderLevel < 0) {
            throw new RuntimeException("Reorder level cannot be negative");
        }

        Double unitCost = equipment.getUnitCost();
        if (unitCost != null && unitCost < 0) {
            throw new RuntimeException("Unit cost cannot be negative");
        }
    }

    private void applyDefaults(GymEquipment equipment) {
        equipment.setName(equipment.getName().trim());
        equipment.setType(trimToNull(equipment.getType()));
        equipment.setManufacturer(trimToNull(equipment.getManufacturer()));
        equipment.setReorderLevel(normalizeReorderLevel(equipment.getReorderLevel()));
        equipment.setLocation(trimToNull(equipment.getLocation()));
        equipment.setNotes(trimToNull(equipment.getNotes()));
        if (equipment.getActive() == null) {
            equipment.setActive(true);
        }
    }

    private Integer normalizeReorderLevel(Integer reorderLevel) {
        return reorderLevel == null ? 0 : reorderLevel;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
