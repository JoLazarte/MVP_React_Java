package com.smartcrumbs.api.service.impl;

import com.smartcrumbs.api.dto.response.AlertGenerationResponse;
import com.smartcrumbs.api.dto.response.AlertResponse;
import com.smartcrumbs.api.entity.Alert;
import com.smartcrumbs.api.entity.AppSetting;
import com.smartcrumbs.api.entity.InventoryBatch;
import com.smartcrumbs.api.entity.Product;
import com.smartcrumbs.api.enums.AlertSeverity;
import com.smartcrumbs.api.enums.AlertStatus;
import com.smartcrumbs.api.enums.AlertType;
import com.smartcrumbs.api.enums.BatchStatus;
import com.smartcrumbs.api.exception.BadRequestException;
import com.smartcrumbs.api.exception.ResourceNotFoundException;
import com.smartcrumbs.api.mapper.AlertMapper;
import com.smartcrumbs.api.repository.AlertRepository;
import com.smartcrumbs.api.repository.AppSettingRepository;
import com.smartcrumbs.api.repository.InventoryBatchRepository;
import com.smartcrumbs.api.repository.ProductRepository;
import com.smartcrumbs.api.service.AlertService;
import com.smartcrumbs.api.service.AlertsCreatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;            
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Alertas persistentes: vencimientos próximos, vencidos y stock bajo el mínimo.
 *
 * generateAlerts() se ejecuta de forma programada (AlertScheduler) y también a pedido.
 * En cada pasada:
 *   1. cierra automáticamente las alertas que ya no aplican (lote vendido, descartado o
 *      vencido, stock repuesto, plazo configurado más corto);
 *   2. crea las alertas nuevas;
 *   3. si un lote pasa de "vence pronto" a "vence hoy", reemplaza la alerta amarilla por una roja.
 * Una alerta de lote que el usuario ya resolvió no se vuelve a crear.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class AlertServiceImpl implements AlertService {

    private static final String EXPIRATION_ALERT_DAYS_KEY    = "expiration_alert_days";
    private static final int    DEFAULT_EXPIRATION_ALERT_DAYS = 2;
    // ── Zona horaria del negocio ──────────────────────────────────────
    private static final ZoneId ZONE = ZoneId.of("America/Argentina/Buenos_Aires");

    private final AlertRepository          alertRepository;
    private final ProductRepository        productRepository;
    private final InventoryBatchRepository inventoryBatchRepository;
    private final AppSettingRepository     appSettingRepository;
    private final ApplicationEventPublisher events;

    @Override
    @Transactional(readOnly = true)
    public List<AlertResponse> findAll() {
        return alertRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(AlertMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AlertResponse> findActive() {
        return alertRepository.findActive()
                .stream()
                .map(AlertMapper::toResponse)
                .toList();
    }

    @Override
    public AlertGenerationResponse generateAlerts() {
        LocalDate today = LocalDate.now(ZONE);
        int alertDays = getExpirationAlertDays();
        Map<Long, BigDecimal> stockByProduct = stockByProduct();

        List<Alert> active = new ArrayList<>(alertRepository.findActive());
        int autoResolved = resolveStaleAlerts(active, today, alertDays, stockByProduct);

        List<Alert> created = new ArrayList<>();
        created.addAll(generateExpirationAlerts(active, today, alertDays));
        created.addAll(generateLowStockAlerts(active, stockByProduct));

        if (autoResolved > 0 || !created.isEmpty()) {
            log.info("Alertas: {} nuevas, {} resueltas automáticamente", created.size(), autoResolved);
        }

        List<AlertResponse> responses = created.stream()
                .map(AlertMapper::toResponse)
                .toList();

        // Se avisa por Push cuando la transacción se confirma (ver PushAlertListener)
        if (!responses.isEmpty()) {
            events.publishEvent(new AlertsCreatedEvent(responses));
        }

        return new AlertGenerationResponse(responses.size(), responses);
    }

    @Override
    public AlertResponse resolve(Long id) {
        Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Alerta no encontrada con id " + id));

        if (alert.getStatus() == AlertStatus.RESOLVED) {
            throw new BadRequestException("La alerta ya se encuentra resuelta.");
        }

        markResolved(alert);
        return AlertMapper.toResponse(alertRepository.save(alert));
    }

    // ── Private: cierre automático ────────────────────────────────────────────

    /** Resuelve las alertas activas que ya no aplican y las quita de la lista. */
    private int resolveStaleAlerts(List<Alert> active, LocalDate today, int alertDays,
                                   Map<Long, BigDecimal> stockByProduct) {
        int resolved = 0;
        Iterator<Alert> iterator = active.iterator();
        while (iterator.hasNext()) {
            Alert alert = iterator.next();
            if (isStale(alert, today, alertDays, stockByProduct)) {
                markResolved(alert);
                alertRepository.save(alert);
                iterator.remove();
                resolved++;
            }
        }
        return resolved;
    }

    private boolean isStale(Alert alert, LocalDate today, int alertDays,
                            Map<Long, BigDecimal> stockByProduct) {
        if (alert.getAlertType() == AlertType.LOW_STOCK) {
            Product product = alert.getProduct();
            if (product == null
                    || !Boolean.TRUE.equals(product.getActive())
                    || product.getMinimumStock() == null) {
                return true;
            }
            BigDecimal stock = stockByProduct.getOrDefault(product.getId(), BigDecimal.ZERO);
            return stock.compareTo(product.getMinimumStock()) >= 0;
        }

        InventoryBatch batch = alert.getBatch();
        if (batch == null
                || batch.getExpirationDate() == null
                || !hasStock(batch)
                || isClosed(batch)) {
            return true;
        }

        long days = ChronoUnit.DAYS.between(today, batch.getExpirationDate());
        if (alert.getAlertType() == AlertType.EXPIRING_SOON) {
            // Ya venció (lo cubre una alerta EXPIRED) o el plazo configurado se acortó.
            return days < 0 || days > alertDays;
        }
        // EXPIRED, pero la fecha de vencimiento del lote se corrigió.
        return days >= 0;
    }

    // ── Private: alertas de vencimiento ───────────────────────────────────────

    private List<Alert> generateExpirationAlerts(List<Alert> active, LocalDate today, int alertDays) {
        Map<String, Alert> activeByKey = new HashMap<>();
        for (Alert alert : active) {
            if (alert.getBatch() != null) {
                activeByKey.put(batchKey(alert.getAlertType(), alert.getBatch().getId()), alert);
            }
        }

        List<Alert> created = new ArrayList<>();

        for (InventoryBatch batch : inventoryBatchRepository.findAll()) {
            if (batch.getExpirationDate() == null || !hasStock(batch) || isClosed(batch)) continue;

            long days = ChronoUnit.DAYS.between(today, batch.getExpirationDate());
            String name = batch.getProduct().getName();

            if (days < 0) {
                upsertBatchAlert(AlertType.EXPIRED, batch, name + " ya venció.",
                        AlertSeverity.RED, activeByKey, created);
            } else if (days <= alertDays) {
                // days == 0 → vence HOY → RED; days >= 1 → YELLOW
                AlertSeverity severity = days == 0 ? AlertSeverity.RED : AlertSeverity.YELLOW;
                String message = days == 0
                        ? name + " vence hoy."
                        : name + " vence dentro de " + days + " día(s).";
                upsertBatchAlert(AlertType.EXPIRING_SOON, batch, message,
                        severity, activeByKey, created);
            }
        }

        return created;
    }

    private void upsertBatchAlert(AlertType type, InventoryBatch batch, String message,
                                  AlertSeverity severity, Map<String, Alert> activeByKey,
                                  List<Alert> created) {
        Alert existing = activeByKey.get(batchKey(type, batch.getId()));

        if (existing != null) {
            if (existing.getSeverity() == severity) {
                // Misma alerta: solo se actualiza el texto (los días restantes cambian)
                if (!message.equals(existing.getMessage())) {
                    existing.setMessage(message);
                    alertRepository.save(existing);
                }
                return;
            }
            // Pasó de amarillo a rojo (vence hoy): se cierra la anterior y se crea una nueva
            markResolved(existing);
            alertRepository.save(existing);
        } else if (alertRepository.existsByAlertTypeAndBatch_IdAndSeverity(type, batch.getId(), severity)) {
            // Ya se atendió (resuelta): no se vuelve a crear
            return;
        }

        Alert alert = new Alert();
        alert.setAlertType(type);
        alert.setProduct(batch.getProduct());
        alert.setBatch(batch);
        alert.setMessage(message);
        alert.setSeverity(severity);
        alert.setStatus(AlertStatus.ACTIVE);
        created.add(alertRepository.save(alert));
    }

    // ── Private: alertas de stock bajo ────────────────────────────────────────

    private List<Alert> generateLowStockAlerts(List<Alert> active, Map<Long, BigDecimal> stockByProduct) {
        Map<Long, Alert> activeByProduct = new HashMap<>();
        for (Alert alert : active) {
            if (alert.getAlertType() == AlertType.LOW_STOCK && alert.getProduct() != null) {
                activeByProduct.put(alert.getProduct().getId(), alert);
            }
        }

        List<Alert> created = new ArrayList<>();

        for (Product product : productRepository.findByActiveTrueOrderByNameAsc()) {
            if (product.getMinimumStock() == null) continue;

            BigDecimal currentStock = stockByProduct.getOrDefault(product.getId(), BigDecimal.ZERO);
            if (currentStock.compareTo(product.getMinimumStock()) >= 0) continue;

            String message = product.getName()
                    + " está por debajo del stock mínimo. Stock actual: " + plain(currentStock)
                    + ", mínimo: " + plain(product.getMinimumStock()) + ".";

            Alert existing = activeByProduct.get(product.getId());
            if (existing != null) {
                if (!message.equals(existing.getMessage())) {
                    existing.setMessage(message);
                    alertRepository.save(existing);
                }
                continue;
            }

            Alert alert = new Alert();
            alert.setAlertType(AlertType.LOW_STOCK);
            alert.setProduct(product);
            alert.setBatch(null);
            alert.setMessage(message);
            alert.setSeverity(AlertSeverity.YELLOW);
            alert.setStatus(AlertStatus.ACTIVE);
            created.add(alertRepository.save(alert));
        }

        return created;
    }

    // ── Private: helpers ──────────────────────────────────────────────────────

    private Map<Long, BigDecimal> stockByProduct() {
        Map<Long, BigDecimal> stockByProduct = new LinkedHashMap<>();
        for (InventoryBatch batch : inventoryBatchRepository.findAvailableWithStock()) {
            stockByProduct.merge(batch.getProduct().getId(), batch.getCurrentQuantity(), BigDecimal::add);
        }
        return stockByProduct;
    }

    private void markResolved(Alert alert) {
        alert.setStatus(AlertStatus.RESOLVED);
        alert.setResolvedAt(LocalDateTime.now());
    }

    private boolean hasStock(InventoryBatch batch) {
        return batch.getCurrentQuantity() != null
                && batch.getCurrentQuantity().compareTo(BigDecimal.ZERO) > 0;
    }

    /** Lote que ya no está en circulación: agotado o descartado. */
    private boolean isClosed(InventoryBatch batch) {
        return batch.getBatchStatus() == BatchStatus.DISCARDED
                || batch.getBatchStatus() == BatchStatus.DEPLETED;
    }

    private String batchKey(AlertType type, Long batchId) {
        return type + ":" + batchId;
    }

    private String plain(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }

    private int getExpirationAlertDays() {
        return appSettingRepository.findBySettingKey(EXPIRATION_ALERT_DAYS_KEY)
                .map(AppSetting::getSettingValue)
                .map(Integer::parseInt)
                .orElse(DEFAULT_EXPIRATION_ALERT_DAYS);
    }
}
