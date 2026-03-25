package com.fitsphere.repository;

import com.fitsphere.model.GymEquipment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GymEquipmentRepository extends JpaRepository<GymEquipment, Long> {
    @Query("""
            select g from GymEquipment g
            where coalesce(g.active, true) = true
            order by g.name asc
            """)
    List<GymEquipment> findActiveEquipmentByOrderByNameAsc();
}
