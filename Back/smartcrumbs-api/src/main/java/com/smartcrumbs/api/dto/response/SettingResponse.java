package com.smartcrumbs.api.dto.response;

public record SettingResponse(
        String key,
        String value,
        String description
) {
}