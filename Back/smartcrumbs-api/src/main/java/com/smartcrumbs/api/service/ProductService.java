package com.smartcrumbs.api.service;

import com.smartcrumbs.api.dto.request.ProductRequest;
import com.smartcrumbs.api.dto.response.ProductResponse;
import com.smartcrumbs.api.enums.ProductOrigin;

import java.util.List;

public interface ProductService {

    ProductResponse create(ProductRequest request);

    List<ProductResponse> findAll(ProductOrigin origin, Long categoryId, Boolean activeOnly);

    ProductResponse findById(Long id);

    ProductResponse update(Long id, ProductRequest request);

    void delete(Long id);
}