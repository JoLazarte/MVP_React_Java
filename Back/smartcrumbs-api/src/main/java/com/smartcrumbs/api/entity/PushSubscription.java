package com.smartcrumbs.api.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/** Un dispositivo (navegador) de un usuario suscripto a notificaciones Push. */
@Getter
@Setter
@Entity
@Table(name = "push_subscriptions")
public class PushSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** URL del servicio push del navegador (única por dispositivo). */
    @Column(nullable = false, unique = true, length = 700)
    private String endpoint;

    /** Clave pública del navegador, para cifrar el mensaje. */
    @Column(nullable = false, length = 255)
    private String p256dh;

    /** Secreto de autenticación del navegador, para cifrar el mensaje. */
    @Column(nullable = false, length = 255)
    private String auth;

    @Column(name = "user_agent", length = 255)
    private String userAgent;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
