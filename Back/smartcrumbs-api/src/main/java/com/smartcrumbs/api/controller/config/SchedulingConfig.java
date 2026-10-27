package com.smartcrumbs.api.controller.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Habilita las tareas programadas (@Scheduled), como la generación periódica de alertas,
 * y las tareas asincrónicas (@Async), como el envío de notificaciones Push.
 */
@Configuration
@EnableScheduling
@EnableAsync
public class SchedulingConfig {
}