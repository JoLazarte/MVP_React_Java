package com.smartcrumbs.api.service;

import java.util.List;

import com.smartcrumbs.api.dto.response.AlertResponse;

/** Se publica cuando una pasada de generación creó alertas nuevas (para avisar por Push). */
public record AlertsCreatedEvent(List<AlertResponse> alerts) {
}
