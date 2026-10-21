package com.smartcrumbs.api.service;

import com.smartcrumbs.api.dto.request.SupplierRequest;
import com.smartcrumbs.api.dto.response.SupplierResponse;
import com.smartcrumbs.api.enums.SupplierType;

import java.util.List;

public interface SupplierService {

    SupplierResponse create(SupplierRequest request);

    List<SupplierResponse> findAll(Boolean activeOnly, SupplierType supplierType);

    SupplierResponse findById(Long id);

    SupplierResponse update(Long id, SupplierRequest request);

    void delete(Long id);
}