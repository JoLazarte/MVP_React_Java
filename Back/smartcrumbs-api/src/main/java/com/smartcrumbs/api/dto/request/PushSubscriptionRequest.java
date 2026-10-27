package com.smartcrumbs.api.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Suscripción Push tal como la entrega el navegador (PushSubscription.toJSON()):
 * { "endpoint": "...", "keys": { "p256dh": "...", "auth": "..." } }
 */
public record PushSubscriptionRequest(

        @NotBlank(message = "El endpoint es obligatorio.")
        @Size(max = 700, message = "El endpoint no puede superar los 700 caracteres.")
        String endpoint,

        @NotNull(message = "Las claves de la suscripción son obligatorias.")
        @Valid
        Keys keys
) {
    public record Keys(

            @NotBlank(message = "La clave p256dh es obligatoria.")
            @Size(max = 255, message = "La clave p256dh no puede superar los 255 caracteres.")
            String p256dh,

            @NotBlank(message = "El secreto auth es obligatorio.")
            @Size(max = 255, message = "El secreto auth no puede superar los 255 caracteres.")
            String auth
    ) {
    }
}
