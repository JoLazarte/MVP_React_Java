package com.smartcrumbs.api.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.smartcrumbs.api.dto.response.AlertGenerationResponse;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Genera las alertas de forma periódica, sin que nadie tenga que pedirlo.
 * Frecuencia (en milisegundos) configurable con app.alerts.generation-interval-ms;
 * por defecto cada 15 minutos, con la primera pasada un minuto después de arrancar.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AlertScheduler {

    private final AlertService alertService;

    @Scheduled(
            initialDelayString = "${app.alerts.initial-delay-ms:60000}",
            fixedDelayString = "${app.alerts.generation-interval-ms:900000}")
    public void generateAlerts() {
        try {
            AlertGenerationResponse result = alertService.generateAlerts();
            log.debug("Generación programada de alertas: {} nuevas", result.createdAlerts());
        } catch (Exception e) {
            // Si falla una pasada, la tarea sigue y vuelve a intentar en la próxima.
            log.error("Falló la generación programada de alertas", e);
        }
    }
}
