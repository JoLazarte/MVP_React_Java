package com.smartcrumbs.api.controller;

import com.smartcrumbs.api.dto.request.StockAdjustmentRequest;
import com.smartcrumbs.api.dto.request.StockSaleRequest;
import com.smartcrumbs.api.dto.response.StockOperationResponse;
import com.smartcrumbs.api.entity.User;
import com.smartcrumbs.api.service.StockService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/stock")
public class StockOperationController {

    private final StockService stockService;

    @PostMapping("/sales")
    public StockOperationResponse registerSale(
            @Valid @RequestBody StockSaleRequest request,
            @AuthenticationPrincipal User currentUser) {
        return stockService.registerSale(request, currentUser);
    }

    @PostMapping("/adjustments")
    public StockOperationResponse registerAdjustment(
            @Valid @RequestBody StockAdjustmentRequest request,
            @AuthenticationPrincipal User currentUser) {
        return stockService.registerAdjustment(request, currentUser);
    }
}