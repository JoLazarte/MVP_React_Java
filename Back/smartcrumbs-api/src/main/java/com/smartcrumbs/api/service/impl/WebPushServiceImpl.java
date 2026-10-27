package com.smartcrumbs.api.service.impl;

import java.security.GeneralSecurityException;
import java.security.Security;
import java.util.List;
import java.util.stream.Collectors;

import org.apache.http.HttpResponse;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smartcrumbs.api.dto.request.PushSubscriptionRequest;
import com.smartcrumbs.api.dto.response.AlertResponse;
import com.smartcrumbs.api.entity.PushSubscription;
import com.smartcrumbs.api.entity.User;
import com.smartcrumbs.api.enums.AlertSeverity;
import com.smartcrumbs.api.exception.BadRequestException;
import com.smartcrumbs.api.repository.PushSubscriptionRepository;
import com.smartcrumbs.api.service.WebPushService;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import nl.martijndwars.webpush.Urgency;

@Slf4j
@Service
@RequiredArgsConstructor
public class WebPushServiceImpl implements WebPushService {

    private static final int  DIGEST_TTL_SECONDS = 12 * 60 * 60;   // un aviso viejo ya no sirve
    private static final int  TEST_TTL_SECONDS   = 60;
    private static final String DIGEST_TAG       = "smartcrumbs-alerts";
    private static final int  MAX_LINES          = 3;

    private final PushSubscriptionRepository subscriptionRepository;

    @Value("${app.push.vapid-public-key:}")
    private String publicKey;

    @Value("${app.push.vapid-private-key:}")
    private String privateKey;

    @Value("${app.push.subject:mailto:admin@smartcrumbs.local}")
    private String subject;

    /** null mientras no haya claves VAPID válidas: en ese caso Push está deshabilitado. */
    private PushService pushService;

    @PostConstruct
    void init() {
        if (isBlank(publicKey) || isBlank(privateKey)) {
            log.info("Web Push deshabilitado: faltan las claves VAPID (app.push.vapid-public-key / vapid-private-key).");
            return;
        }
        try {
            if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
                Security.addProvider(new BouncyCastleProvider());
            }
            pushService = new PushService(publicKey.trim(), privateKey.trim(), subject);
            log.info("Web Push habilitado");
        } catch (GeneralSecurityException | RuntimeException e) {
            pushService = null;
            log.error("Las claves VAPID no son válidas: Web Push queda deshabilitado", e);
        }
    }

    @Override
    public boolean isEnabled() {
        return pushService != null;
    }

    @Override
    public String getPublicKey() {
        return isEnabled() ? publicKey.trim() : null;
    }

    @Override
    @Transactional
    public void subscribe(User user, PushSubscriptionRequest request, String userAgent) {
        requireEnabled();

        PushSubscription subscription = subscriptionRepository.findByEndpoint(request.endpoint())
                .orElseGet(PushSubscription::new);
        subscription.setUser(user);
        subscription.setEndpoint(request.endpoint());
        subscription.setP256dh(request.keys().p256dh());
        subscription.setAuth(request.keys().auth());
        subscription.setUserAgent(truncate(userAgent, 255));
        subscriptionRepository.save(subscription);

        log.info("Dispositivo suscripto a Push: usuario {}", user.getUsername());
    }

    @Override
    @Transactional
    public void unsubscribe(User user, String endpoint) {
        subscriptionRepository.findByEndpoint(endpoint)
                .filter(subscription -> subscription.getUser().getId().equals(user.getId()))
                .ifPresent(subscriptionRepository::delete);
    }

    @Override
    public int sendTest(User user) {
        requireEnabled();

        List<PushSubscription> subscriptions = subscriptionRepository.findByUser_Id(user.getId());
        if (subscriptions.isEmpty()) {
            throw new BadRequestException("Este usuario no tiene dispositivos suscriptos a Push.");
        }

        String payload = payload(
                "SmartCrumbs — Prueba de Push",
                "Si ves este aviso, las notificaciones llegan aunque la app esté cerrada.",
                "smartcrumbs-test", "/alerts", "Ver alertas");

        int sent = 0;
        for (PushSubscription subscription : subscriptions) {
            if (send(subscription, payload, Urgency.NORMAL, TEST_TTL_SECONDS, null)) {
                sent++;
            }
        }
        return sent;
    }

    @Override
    public void notifyNewAlerts(List<AlertResponse> alerts) {
        if (!isEnabled() || alerts == null || alerts.isEmpty()) {
            return;
        }

        List<PushSubscription> subscriptions = subscriptionRepository.findByUser_EnabledTrue();
        if (subscriptions.isEmpty()) {
            return;
        }

        boolean urgent = alerts.stream().anyMatch(alert -> alert.severity() == AlertSeverity.RED);

        // Un solo aviso por pasada, aunque haya muchas alertas nuevas
        String body = alerts.stream()
                .limit(MAX_LINES)
                .map(AlertResponse::message)
                .collect(Collectors.joining("\n"));
        if (alerts.size() > MAX_LINES) {
            body += "\n+" + (alerts.size() - MAX_LINES) + " más";
        }

        String payload = payload(
                urgent ? "SmartCrumbs — Alerta urgente" : "SmartCrumbs — Nuevas alertas",
                body, DIGEST_TAG, "/alerts", "Ver alertas");

        int sent = 0;
        for (PushSubscription subscription : subscriptions) {
            if (send(subscription, payload, urgent ? Urgency.HIGH : Urgency.NORMAL,
                    DIGEST_TTL_SECONDS, DIGEST_TAG)) {
                sent++;
            }
        }
        log.info("Push de alertas nuevas ({}): enviado a {} de {} dispositivos",
                alerts.size(), sent, subscriptions.size());
    }

    // ── Private ───────────────────────────────────────────────────────────────

    private void requireEnabled() {
        if (!isEnabled()) {
            throw new BadRequestException("Las notificaciones Push no están configuradas en el servidor.");
        }
    }

    private boolean send(PushSubscription subscription, String payload, Urgency urgency,
                         int ttlSeconds, String topic) {
        try {
            Notification.NotificationBuilder builder = Notification.builder()
                    .endpoint(subscription.getEndpoint())
                    .userPublicKey(subscription.getP256dh())
                    .userAuth(subscription.getAuth())
                    .payload(payload)
                    .ttl(ttlSeconds)
                    .urgency(urgency);
            if (topic != null) {
                builder.topic(topic);
            }

            HttpResponse response = pushService.send(builder.build());
            int status = response.getStatusLine().getStatusCode();

            if (status >= 200 && status < 300) {
                return true;
            }
            if (status == 404 || status == 410) {
                // El navegador ya no existe o canceló la suscripción
                subscriptionRepository.delete(subscription);
                log.info("Suscripción Push vencida eliminada (HTTP {})", status);
                return false;
            }
            log.warn("El servicio Push respondió HTTP {}", status);
            return false;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        } catch (Exception e) {
            log.warn("No se pudo enviar el push: {}", e.getMessage());
            return false;
        }
    }

    /** JSON del mensaje que lee el service worker del frontend (public/sw.js). */
    static String payload(String title, String body, String tag, String url, String actionTitle) {
        return "{\"title\":" + quote(title)
                + ",\"body\":" + quote(body)
                + ",\"tag\":" + quote(tag)
                + ",\"url\":" + quote(url)
                + ",\"actionTitle\":" + quote(actionTitle) + "}";
    }

    static String quote(String value) {
        StringBuilder sb = new StringBuilder("\"");
        for (char c : value.toCharArray()) {
            switch (c) {
                case '"'  -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < 0x20) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        return sb.append('"').toString();
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() <= max ? value : value.substring(0, max);
    }
}
