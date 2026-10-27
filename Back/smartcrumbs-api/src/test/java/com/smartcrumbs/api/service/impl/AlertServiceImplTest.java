package com.smartcrumbs.api.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.context.ApplicationEventPublisher;

import com.smartcrumbs.api.dto.response.AlertGenerationResponse;
import com.smartcrumbs.api.entity.Alert;
import com.smartcrumbs.api.entity.AppSetting;
import com.smartcrumbs.api.entity.InventoryBatch;
import com.smartcrumbs.api.entity.Product;
import com.smartcrumbs.api.enums.AlertSeverity;
import com.smartcrumbs.api.enums.AlertStatus;
import com.smartcrumbs.api.enums.AlertType;
import com.smartcrumbs.api.enums.BatchStatus;
import com.smartcrumbs.api.repository.AlertRepository;
import com.smartcrumbs.api.repository.AppSettingRepository;
import com.smartcrumbs.api.repository.InventoryBatchRepository;
import com.smartcrumbs.api.repository.ProductRepository;
import com.smartcrumbs.api.service.AlertsCreatedEvent;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AlertServiceImplTest {

    private static final ZoneId ZONE = ZoneId.of("America/Argentina/Buenos_Aires");

    @Mock
    private AlertRepository alertRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private InventoryBatchRepository inventoryBatchRepository;

    @Mock
    private AppSettingRepository appSettingRepository;

    @Mock
    private ApplicationEventPublisher events;

    @InjectMocks
    private AlertServiceImpl service;

    @BeforeEach
    void setUp() {
        AppSetting setting = new AppSetting();
        setting.setSettingKey("expiration_alert_days");
        setting.setSettingValue("2");
        when(appSettingRepository.findBySettingKey("expiration_alert_days")).thenReturn(Optional.of(setting));

        when(alertRepository.findActive()).thenReturn(List.of());
        when(inventoryBatchRepository.findAll()).thenReturn(List.of());
        when(inventoryBatchRepository.findAvailableWithStock()).thenReturn(List.of());
        when(productRepository.findByActiveTrueOrderByNameAsc()).thenReturn(List.of());
        when(alertRepository.save(any(Alert.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private LocalDate today() {
        return LocalDate.now(ZONE);
    }

    private Product product(Long id, String name, String minimumStock) {
        Product product = new Product();
        product.setId(id);
        product.setName(name);
        product.setActive(true);
        product.setMinimumStock(minimumStock == null ? null : new BigDecimal(minimumStock));
        return product;
    }

    private InventoryBatch batch(Long id, Product product, LocalDate expiration, String quantity, BatchStatus status) {
        InventoryBatch batch = new InventoryBatch();
        batch.setId(id);
        batch.setProduct(product);
        batch.setExpirationDate(expiration);
        batch.setCurrentQuantity(new BigDecimal(quantity));
        batch.setBatchStatus(status);
        return batch;
    }

    private Alert activeAlert(AlertType type, Product product, InventoryBatch batch, AlertSeverity severity) {
        Alert alert = new Alert();
        alert.setAlertType(type);
        alert.setProduct(product);
        alert.setBatch(batch);
        alert.setSeverity(severity);
        alert.setStatus(AlertStatus.ACTIVE);
        alert.setMessage("alerta de prueba");
        return alert;
    }

    // ── cierre automático ────────────────────────────────────────────────────

    @Test
    void anAlertOfADepletedBatchIsResolved() {
        Product bread = product(1L, "Pan", null);
        InventoryBatch batch = batch(10L, bread, today().plusDays(1), "0", BatchStatus.DEPLETED);
        Alert alert = activeAlert(AlertType.EXPIRING_SOON, bread, batch, AlertSeverity.YELLOW);
        when(alertRepository.findActive()).thenReturn(List.of(alert));

        AlertGenerationResponse result = service.generateAlerts();

        assertThat(alert.getStatus()).isEqualTo(AlertStatus.RESOLVED);
        assertThat(alert.getResolvedAt()).isNotNull();
        assertThat(result.createdAlerts()).isZero();
    }

    @Test
    void anExpiredAlertIsResolvedWhenTheBatchWasDiscarded() {
        Product bread = product(1L, "Pan", null);
        InventoryBatch batch = batch(10L, bread, today().minusDays(1), "5", BatchStatus.DISCARDED);
        Alert alert = activeAlert(AlertType.EXPIRED, bread, batch, AlertSeverity.RED);
        when(alertRepository.findActive()).thenReturn(List.of(alert));

        service.generateAlerts();

        assertThat(alert.getStatus()).isEqualTo(AlertStatus.RESOLVED);
    }

    @Test
    void aLowStockAlertIsResolvedWhenTheStockRecovers() {
        Product milk = product(2L, "Leche", "10");
        InventoryBatch batch = batch(20L, milk, today().plusDays(30), "12", BatchStatus.AVAILABLE);
        Alert alert = activeAlert(AlertType.LOW_STOCK, milk, null, AlertSeverity.YELLOW);
        when(alertRepository.findActive()).thenReturn(List.of(alert));
        when(inventoryBatchRepository.findAvailableWithStock()).thenReturn(List.of(batch));
        when(productRepository.findByActiveTrueOrderByNameAsc()).thenReturn(List.of(milk));

        AlertGenerationResponse result = service.generateAlerts();

        assertThat(alert.getStatus()).isEqualTo(AlertStatus.RESOLVED);
        assertThat(result.createdAlerts()).isZero();
    }

    // ── creación ─────────────────────────────────────────────────────────────

    @Test
    void aBatchWithinTheConfiguredDaysCreatesAYellowAlert() {
        Product bread = product(1L, "Pan", null);
        InventoryBatch batch = batch(10L, bread, today().plusDays(2), "5", BatchStatus.AVAILABLE);
        when(inventoryBatchRepository.findAll()).thenReturn(List.of(batch));

        AlertGenerationResponse result = service.generateAlerts();

        assertThat(result.createdAlerts()).isEqualTo(1);
        assertThat(result.alerts().get(0).alertType()).isEqualTo(AlertType.EXPIRING_SOON);
        assertThat(result.alerts().get(0).severity()).isEqualTo(AlertSeverity.YELLOW);
    }

    @Test
    void aBatchOutsideTheConfiguredDaysDoesNotCreateAnAlert() {
        Product bread = product(1L, "Pan", null);
        InventoryBatch batch = batch(10L, bread, today().plusDays(3), "5", BatchStatus.AVAILABLE);
        when(inventoryBatchRepository.findAll()).thenReturn(List.of(batch));

        AlertGenerationResponse result = service.generateAlerts();

        assertThat(result.createdAlerts()).isZero();
    }

    @Test
    void aBelowMinimumProductCreatesALowStockAlert() {
        Product milk = product(2L, "Leche", "10");
        InventoryBatch batch = batch(20L, milk, today().plusDays(30), "3", BatchStatus.AVAILABLE);
        when(inventoryBatchRepository.findAvailableWithStock()).thenReturn(List.of(batch));
        when(productRepository.findByActiveTrueOrderByNameAsc()).thenReturn(List.of(milk));

        AlertGenerationResponse result = service.generateAlerts();

        assertThat(result.createdAlerts()).isEqualTo(1);
        assertThat(result.alerts().get(0).alertType()).isEqualTo(AlertType.LOW_STOCK);
        assertThat(result.alerts().get(0).message()).contains("Stock actual: 3").contains("mínimo: 10");
    }

    // ── una alerta resuelta no vuelve; una amarilla escala a roja ────────────

    @Test
    void aResolvedBatchAlertIsNotCreatedAgain() {
        Product bread = product(1L, "Pan", null);
        InventoryBatch batch = batch(10L, bread, today().plusDays(2), "5", BatchStatus.AVAILABLE);
        when(inventoryBatchRepository.findAll()).thenReturn(List.of(batch));
        when(alertRepository.existsByAlertTypeAndBatch_IdAndSeverity(
                AlertType.EXPIRING_SOON, 10L, AlertSeverity.YELLOW)).thenReturn(true);

        AlertGenerationResponse result = service.generateAlerts();

        assertThat(result.createdAlerts()).isZero();
    }

    @Test
    void aYellowAlertEscalatesToRedWhenTheBatchExpiresToday() {
        Product bread = product(1L, "Pan", null);
        InventoryBatch batch = batch(10L, bread, today(), "5", BatchStatus.AVAILABLE);
        Alert yellow = activeAlert(AlertType.EXPIRING_SOON, bread, batch, AlertSeverity.YELLOW);
        when(alertRepository.findActive()).thenReturn(List.of(yellow));
        when(inventoryBatchRepository.findAll()).thenReturn(List.of(batch));

        AlertGenerationResponse result = service.generateAlerts();

        assertThat(yellow.getStatus()).isEqualTo(AlertStatus.RESOLVED);
        assertThat(result.createdAlerts()).isEqualTo(1);
        assertThat(result.alerts().get(0).severity()).isEqualTo(AlertSeverity.RED);
        assertThat(result.alerts().get(0).message()).contains("vence hoy");
    }

    // ── aviso por Push ───────────────────────────────────────────────────────

    @Test
    void newAlertsArePublishedSoThePushCanBeSent() {
        Product bread = product(1L, "Pan", null);
        InventoryBatch batch = batch(10L, bread, today().plusDays(1), "5", BatchStatus.AVAILABLE);
        when(inventoryBatchRepository.findAll()).thenReturn(List.of(batch));

        service.generateAlerts();

        verify(events).publishEvent(any(AlertsCreatedEvent.class));
    }

    @Test
    void nothingIsPublishedWhenNoAlertWasCreated() {
        service.generateAlerts();

        verify(events, never()).publishEvent(any(Object.class));
    }
}
