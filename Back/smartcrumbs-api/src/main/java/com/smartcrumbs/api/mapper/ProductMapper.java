package com.smartcrumbs.api.mapper;

import com.smartcrumbs.api.dto.response.ProductResponse;
import com.smartcrumbs.api.entity.Product;

public class ProductMapper {

    private ProductMapper() {
    }

    public static ProductResponse toResponse(Product product) {
        return new ProductResponse(
                product.getId(),
                product.getName(),
                product.getDescription(),

                product.getCategory().getId(),
                product.getCategory().getName(),

                product.getDefaultSupplier() != null ? product.getDefaultSupplier().getId() : null,
                product.getDefaultSupplier() != null ? product.getDefaultSupplier().getName() : null,

                product.getOrigin(),
                product.getPerishable(),
                product.getUnitType(),

                product.getCostPrice(),
                product.getSalePrice(),
                product.getMinimumStock(),

                product.getActive()
        );
    }
}