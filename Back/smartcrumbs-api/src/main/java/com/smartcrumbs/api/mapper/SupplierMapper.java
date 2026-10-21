package com.smartcrumbs.api.mapper;

import com.smartcrumbs.api.dto.response.SupplierResponse;
import com.smartcrumbs.api.entity.Supplier;

public class SupplierMapper {

    private SupplierMapper() {
    }

    public static SupplierResponse toResponse(Supplier supplier) {
        if (supplier == null) {
            return null;
        }

        return new SupplierResponse(
                supplier.getId(),
                supplier.getName(),
                supplier.getSupplierType(),
                supplier.getContactName(),
                supplier.getPhone(),
                supplier.getEmail(),
                supplier.getNotes(),
                supplier.getActive()
        );
    }
}