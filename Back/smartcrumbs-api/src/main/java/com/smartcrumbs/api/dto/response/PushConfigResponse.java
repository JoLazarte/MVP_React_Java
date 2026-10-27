package com.smartcrumbs.api.dto.response;

/** Si el servidor tiene Push configurado y, en ese caso, su clave pública (VAPID). */
public record PushConfigResponse(boolean enabled, String publicKey) {
}
