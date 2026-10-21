package com.smartcrumbs.api.service;

import com.smartcrumbs.api.dto.response.StockMovementHistoryResponse;
import com.smartcrumbs.api.enums.StockMovementType;

import java.time.LocalDate;
import java.util.List;

public interface StockMovementService {

    List<StockMovementHistoryResponse> findAll(
            Long productId,
            Long batchId,
            StockMovementType movementType,
            LocalDate from,
            LocalDate to
    );

    StockMovementHistoryResponse findById(Long id);
}