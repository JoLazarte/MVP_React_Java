package com.smartcrumbs.api.dto.response;

import java.math.BigDecimal;

public record SalesByCategoryResponse(
        Long categoryId,
        String categoryName,
        Long movementsCount,
        BigDecimal totalQuantitySold,
        BigDecimal totalRevenue
) {
}
