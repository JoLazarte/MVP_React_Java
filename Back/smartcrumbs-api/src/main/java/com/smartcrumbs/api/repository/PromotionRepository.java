package com.smartcrumbs.api.repository;

import com.smartcrumbs.api.entity.Promotion;
import com.smartcrumbs.api.enums.PromotionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface PromotionRepository extends JpaRepository<Promotion, Long> {

    List<Promotion> findAllByOrderByStartDateDesc();

    List<Promotion> findByStatusAndEndDateGreaterThanEqualOrderByEndDateAsc(
            PromotionStatus status,
            LocalDateTime now
    );

    // batch es @ManyToOne, se navega con batch_Id
    boolean existsByBatch_IdAndStatusAndEndDateGreaterThanEqual(
            Long batchId,
            PromotionStatus status,
            LocalDateTime now
    );

    // ── Atajos de dominio ────────────────────────────────────────────────────

    /** Promociones activas que todavía no vencieron. */
    default List<Promotion> findActive() {
        return findByStatusAndEndDateGreaterThanEqualOrderByEndDateAsc(
                PromotionStatus.ACTIVE,
                LocalDateTime.now()
        );
    }

    default boolean existsActiveByBatchId(Long batchId) {
        return existsByBatch_IdAndStatusAndEndDateGreaterThanEqual(
                batchId,
                PromotionStatus.ACTIVE,
                LocalDateTime.now()
        );
    }
}
