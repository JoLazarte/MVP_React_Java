package com.panstock.api.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

import com.panstock.api.dto.response.StockMovementHistoryResponse;
import com.panstock.api.entity.StockMovement;
import com.panstock.api.entity.User;
import com.panstock.api.enums.StockMovementType;

class StockMovementMapperTest {

    private StockMovement movementBy(User user) {
        StockMovement movement = new StockMovement();
        movement.setUser(user);
        movement.setMovementType(StockMovementType.ADJUSTMENT_OUT);
        movement.setQuantity(new BigDecimal("2.000"));
        return movement;
    }

    @Test
    void historyIncludesTheFullNameOfTheUser() {
        User user = User.builder().id(7L).username("martina").firstName("Martina").lastName("Pérez").build();

        StockMovementHistoryResponse response = StockMovementMapper.toHistoryResponse(movementBy(user));

        assertThat(response.userId()).isEqualTo(7L);
        assertThat(response.userName()).isEqualTo("Martina Pérez");
    }

    @Test
    void fallsBackToTheUsernameWhenTheUserHasNoName() {
        User user = User.builder().id(8L).username("martina").firstName("  ").lastName(null).build();

        StockMovementHistoryResponse response = StockMovementMapper.toHistoryResponse(movementBy(user));

        assertThat(response.userName()).isEqualTo("martina");
    }

    @Test
    void systemMovementsHaveNoUser() {
        StockMovementHistoryResponse response = StockMovementMapper.toHistoryResponse(movementBy(null));

        assertThat(response.userId()).isNull();
        assertThat(response.userName()).isNull();
    }
}
