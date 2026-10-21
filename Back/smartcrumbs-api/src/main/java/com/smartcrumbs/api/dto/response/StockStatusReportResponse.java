package com.smartcrumbs.api.dto.response;

import com.smartcrumbs.api.enums.ProductOrigin;
import com.smartcrumbs.api.enums.UnitType;

import java.math.BigDecimal;
import java.time.LocalDate;

public record StockStatusReportResponse(
        Long productId,
        String productName,
        ProductOrigin origin,
        String categoryName,
        UnitType unitType,
        BigDecimal totalQuantity,
        BigDecimal minimumStock,
        LocalDate nearestExpirationDate,
        String stockStatus
) {
}