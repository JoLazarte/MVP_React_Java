package com.smartcrumbs.api.service;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Envía el push cuando las alertas nuevas ya quedaron guardadas (después del commit) y en
 * otro hilo, para que la generación de alertas no espere a los servicios de push.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PushAlertListener {

    private final WebPushService webPushService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onAlertsCreated(AlertsCreatedEvent event) {
        try {
            webPushService.notifyNewAlerts(event.alerts());
        } catch (Exception e) {
            log.error("No se pudo enviar el push de alertas nuevas", e);
        }
    }
}
