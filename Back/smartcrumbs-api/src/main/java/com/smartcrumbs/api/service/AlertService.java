package com.smartcrumbs.api.service;

import com.smartcrumbs.api.dto.response.AlertGenerationResponse;
import com.smartcrumbs.api.dto.response.AlertResponse;

import java.util.List;

public interface AlertService {

    List<AlertResponse> findAll();

    List<AlertResponse> findActive();

    AlertGenerationResponse generateAlerts();

    AlertResponse resolve(Long id);
}