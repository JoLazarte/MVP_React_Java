package com.smartcrumbs.api.controller;

import com.smartcrumbs.api.dto.response.DashboardSemaphoreResponse;
import com.smartcrumbs.api.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/expiration-semaphore")
    public DashboardSemaphoreResponse getExpirationSemaphore() {
        return dashboardService.getExpirationSemaphore();
    }
}