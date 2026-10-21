package com.smartcrumbs.api.service;

import com.smartcrumbs.api.dto.request.PromotionRequest;
import com.smartcrumbs.api.dto.response.PromotionResponse;
import com.smartcrumbs.api.dto.response.PromotionSuggestionResponse;
import com.smartcrumbs.api.entity.User;

import java.util.List;

public interface PromotionService {

    List<PromotionSuggestionResponse> getSuggestions();

    PromotionResponse create(PromotionRequest request, User currentUser);

    List<PromotionResponse> findAll();

    List<PromotionResponse> findActive();

    PromotionResponse cancel(Long id);
}