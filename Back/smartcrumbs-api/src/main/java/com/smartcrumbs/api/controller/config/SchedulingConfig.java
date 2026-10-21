package com.smartcrumbs.api.controller.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Habilita las tareas programadas (@Scheduled), como la generación periódica de alertas. */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}