package com.smartcrumbs.api.mapper;

import com.smartcrumbs.api.dto.response.AlertResponse;
import com.smartcrumbs.api.entity.Alert;
import com.smartcrumbs.api.entity.InventoryBatch;
import com.smartcrumbs.api.entity.Product;

public class AlertMapper {

    private AlertMapper() {
    }

    public static AlertResponse toResponse(Alert alert) {
        if (alert == null) {
            return null;
        }

        Product product = alert.getProduct();
        InventoryBatch batch = alert.getBatch();

        return new AlertResponse(
                alert.getId(),
                alert.getAlertType(),
                product != null ? product.getId() : null,
                product != null ? product.getName() : null,
                batch != null ? batch.getId() : null,
                batch != null ? batch.getExpirationDate() : null,
                alert.getMessage(),
                alert.getSeverity(),
                alert.getStatus(),
                alert.getCreatedAt(),
                alert.getResolvedAt()
        );
    }
}