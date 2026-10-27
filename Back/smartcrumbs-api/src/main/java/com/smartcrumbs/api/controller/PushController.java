package com.smartcrumbs.api.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.smartcrumbs.api.dto.request.PushSubscriptionRequest;
import com.smartcrumbs.api.dto.response.PushConfigResponse;
import com.smartcrumbs.api.dto.response.PushTestResponse;
import com.smartcrumbs.api.entity.User;
import com.smartcrumbs.api.service.WebPushService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/** Suscripción de dispositivos a notificaciones Push. Cualquier usuario autenticado. */
@RestController
@RequestMapping("/api/push")
@RequiredArgsConstructor
public class PushController {

    private final WebPushService webPushService;

    /** Si el servidor tiene Push configurado y su clave pública (la usa el navegador para suscribirse). */
    @GetMapping("/config")
    public PushConfigResponse getConfig() {
        return new PushConfigResponse(webPushService.isEnabled(), webPushService.getPublicKey());
    }

    /** Alta (o reasignación) del dispositivo para el usuario autenticado. */
    @PostMapping("/subscriptions")
    public ResponseEntity<Void> subscribe(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody PushSubscriptionRequest request,
            @RequestHeader(value = "User-Agent", required = false) String userAgent) {
        webPushService.subscribe(currentUser, request, userAgent);
        return ResponseEntity.noContent().build();
    }

    /** Baja del dispositivo identificado por su endpoint. */
    @DeleteMapping("/subscriptions")
    public ResponseEntity<Void> unsubscribe(
            @AuthenticationPrincipal User currentUser,
            @RequestParam String endpoint) {
        webPushService.unsubscribe(currentUser, endpoint);
        return ResponseEntity.noContent().build();
    }

    /** Envía un push de prueba a los dispositivos del usuario. */
    @PostMapping("/test")
    public PushTestResponse sendTest(@AuthenticationPrincipal User currentUser) {
        return new PushTestResponse(webPushService.sendTest(currentUser));
    }
}
