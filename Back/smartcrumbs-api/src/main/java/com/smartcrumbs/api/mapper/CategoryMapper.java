package com.smartcrumbs.api.mapper;

import com.smartcrumbs.api.dto.response.CategoryResponse;
import com.smartcrumbs.api.entity.ProductCategory;

public class CategoryMapper {

    private CategoryMapper() {
    }

    public static CategoryResponse toResponse(ProductCategory category) {
        if (category == null) {
            return null;
        }

        return new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getDescription(),
                category.getActive()
        );
    }
}