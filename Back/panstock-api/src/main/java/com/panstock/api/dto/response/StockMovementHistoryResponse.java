package com.panstock.api.dto.response;
import com.panstock.api.enums.StockMovementType;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record StockMovementHistoryResponse(
        Long id,
        Long productId,
        String productName,
        Long batchId,
        Long userId,
        String userName,
        StockMovementType movementType,
        BigDecimal quantity,
        BigDecimal unitSalePrice,
        LocalDateTime movementDate,
        Long relatedWasteRecordId,
        String notes
) {
}