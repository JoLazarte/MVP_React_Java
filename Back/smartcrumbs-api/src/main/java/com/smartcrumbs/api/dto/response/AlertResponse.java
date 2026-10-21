package com.smartcrumbs.api.dto.response;

import com.smartcrumbs.api.enums.AlertSeverity;
import com.smartcrumbs.api.enums.AlertStatus;
import com.smartcrumbs.api.enums.AlertType;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record AlertResponse(
        Long id,
        AlertType alertType,
        Long productId,
        String productName,
        Long batchId,
        LocalDate expirationDate,
        String message,
        AlertSeverity severity,
        AlertStatus status,
        LocalDateTime createdAt,
        LocalDateTime resolvedAt
) {
}