package com.smartcrumbs.api.dto.response;

import com.smartcrumbs.api.enums.ProductOrigin;
import com.smartcrumbs.api.enums.UnitType;

import java.math.BigDecimal;
import java.time.LocalDate;

public record StockSummaryResponse(
        Long productId,
        String productName,
        ProductOrigin origin,
        UnitType unitType,
        BigDecimal totalQuantity,
        LocalDate nearestExpirationDate
) {
}