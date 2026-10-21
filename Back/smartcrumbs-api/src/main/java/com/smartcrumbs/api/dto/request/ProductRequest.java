package com.smartcrumbs.api.dto.request;

import com.smartcrumbs.api.enums.ProductOrigin;
import com.smartcrumbs.api.enums.UnitType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;

public record ProductRequest(
        @NotBlank String name,
        String description,

        @NotNull Long categoryId,
        Long defaultSupplierId,

        @NotNull ProductOrigin origin,
        @NotNull Boolean perishable,
        @NotNull UnitType unitType,

        @PositiveOrZero BigDecimal costPrice,
        @PositiveOrZero BigDecimal salePrice,
        @PositiveOrZero BigDecimal minimumStock,

        Boolean active
) {
}