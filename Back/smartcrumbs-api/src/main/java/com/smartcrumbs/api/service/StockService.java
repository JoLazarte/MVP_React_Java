package com.smartcrumbs.api.service;

import com.smartcrumbs.api.dto.request.StockAdjustmentRequest;
import com.smartcrumbs.api.dto.request.StockEntryRequest;
import com.smartcrumbs.api.dto.request.StockSaleRequest;
import com.smartcrumbs.api.dto.response.ExpirationItemResponse;
import com.smartcrumbs.api.dto.response.InventoryBatchResponse;
import com.smartcrumbs.api.dto.response.StockOperationResponse;
import com.smartcrumbs.api.dto.response.StockSummaryResponse;
import com.smartcrumbs.api.entity.User;
import com.smartcrumbs.api.enums.ExpirationStatus;

import java.time.LocalDate;
import java.util.List;

public interface StockService {

    InventoryBatchResponse registerEntry(StockEntryRequest request);

    StockOperationResponse registerSale(StockSaleRequest request, User currentUser);

    StockOperationResponse registerAdjustment(StockAdjustmentRequest request, User currentUser);

    List<StockSummaryResponse> getStockSummary();

    List<InventoryBatchResponse> getBatches();

    InventoryBatchResponse getBatchById(Long id);

    List<ExpirationItemResponse> getExpiring(Integer days);

    List<ExpirationItemResponse> getExpired();

    ExpirationStatus calculateExpirationStatus(LocalDate expirationDate);
}