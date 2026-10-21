package com.smartcrumbs.api.dto.response;

import com.smartcrumbs.api.enums.ProductOrigin;
import com.smartcrumbs.api.enums.UnitType;

import java.math.BigDecimal;

public record ProductResponse(
        Long id,
        String name,
        String description,

        Long categoryId,
        String categoryName,

        Long defaultSupplierId,
        String defaultSupplierName,

        ProductOrigin origin,
        Boolean perishable,
        UnitType unitType,

        BigDecimal costPrice,
        BigDecimal salePrice,
        BigDecimal minimumStock,

        Boolean active
) {
}