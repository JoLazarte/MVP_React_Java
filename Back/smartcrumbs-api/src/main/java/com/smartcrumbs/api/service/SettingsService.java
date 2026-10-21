package com.smartcrumbs.api.service;

import com.smartcrumbs.api.dto.request.UpdateIntegerSettingRequest;
import com.smartcrumbs.api.dto.response.SettingResponse;

public interface SettingsService {

    SettingResponse getExpirationAlertDays();

    SettingResponse updateExpirationAlertDays(UpdateIntegerSettingRequest request);

    SettingResponse getPromotionSuggestionDays();

    SettingResponse updatePromotionSuggestionDays(UpdateIntegerSettingRequest request);
}