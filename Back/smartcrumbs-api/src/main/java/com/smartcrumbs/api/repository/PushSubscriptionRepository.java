package com.smartcrumbs.api.repository;

import com.smartcrumbs.api.entity.PushSubscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, Long> {

    Optional<PushSubscription> findByEndpoint(String endpoint);

    List<PushSubscription> findByUser_Id(Long userId);

    /** Suscripciones de usuarios habilitados (un empleado deshabilitado no recibe avisos). */
    List<PushSubscription> findByUser_EnabledTrue();
}
