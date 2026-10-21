package com.smartcrumbs.api.service;

import com.smartcrumbs.api.dto.request.CategoryRequest;
import com.smartcrumbs.api.dto.response.CategoryResponse;

import java.util.List;

public interface CategoryService {

    CategoryResponse create(CategoryRequest request);

    List<CategoryResponse> findAll(Boolean activeOnly);

    CategoryResponse findById(Long id);

    CategoryResponse update(Long id, CategoryRequest request);

    void delete(Long id);
}