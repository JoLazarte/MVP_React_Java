package com.smartcrumbs.api.service;

import com.smartcrumbs.api.dto.response.DashboardSemaphoreResponse;

public interface DashboardService {

    DashboardSemaphoreResponse getExpirationSemaphore();
}