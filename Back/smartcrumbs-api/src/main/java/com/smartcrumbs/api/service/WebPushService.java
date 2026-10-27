package com.smartcrumbs.api.service;

import java.util.List;

import com.smartcrumbs.api.dto.request.PushSubscriptionRequest;
import com.smartcrumbs.api.dto.response.AlertResponse;
import com.smartcrumbs.api.entity.User;

/**
 * Notificaciones Push (Web Push con claves VAPID): llegan al dispositivo aunque la app
 * esté cerrada. Si el servidor no tiene claves configuradas, el servicio queda deshabilitado.
 */
public interface WebPushService {

    /** true si el servidor tiene las claves VAPID y puede enviar notificaciones Push. */
    boolean isEnabled();

    /** Clave pública VAPID que el navegador necesita para suscribirse (null si está deshabilitado). */
    String getPublicKey();

    /** Alta de un dispositivo para el usuario. Si el endpoint ya existía, se reasigna a este usuario. */
    void subscribe(User user, PushSubscriptionRequest request, String userAgent);

    /** Baja de un dispositivo del usuario (si no es suyo, se ignora). */
    void unsubscribe(User user, String endpoint);

    /** Envía un push de prueba a los dispositivos del usuario; devuelve cuántos lo recibieron. */
    int sendTest(User user);

    /** Avisa a todos los dispositivos suscriptos (de usuarios habilitados) de las alertas nuevas. */
    void notifyNewAlerts(List<AlertResponse> alerts);
}
