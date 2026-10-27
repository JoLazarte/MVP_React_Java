package com.smartcrumbs.api.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.smartcrumbs.api.dto.request.PushSubscriptionRequest;
import com.smartcrumbs.api.dto.response.AlertResponse;
import com.smartcrumbs.api.entity.User;
import com.smartcrumbs.api.exception.BadRequestException;
import com.smartcrumbs.api.repository.PushSubscriptionRepository;

/** Sin claves VAPID (el caso por defecto), Push queda deshabilitado y no toca la base ni la red. */
@ExtendWith(MockitoExtension.class)
class WebPushServiceImplTest {

    @Mock
    private PushSubscriptionRepository subscriptionRepository;

    @InjectMocks
    private WebPushServiceImpl service;

    @Test
    void withoutVapidKeysPushIsDisabled() {
        assertThat(service.isEnabled()).isFalse();
        assertThat(service.getPublicKey()).isNull();
    }

    @Test
    void whenDisabledNewAlertsAreIgnored() {
        service.notifyNewAlerts(List.of(mock(AlertResponse.class)));

        verifyNoInteractions(subscriptionRepository);
    }

    @Test
    void whenDisabledSubscribingIsRejected() {
        PushSubscriptionRequest request = new PushSubscriptionRequest(
                "https://push.example.com/abc", new PushSubscriptionRequest.Keys("p256dh", "auth"));

        assertThatThrownBy(() -> service.subscribe(User.builder().id(1L).username("martina").build(), request, "test-agent"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("no están configuradas");
    }

    @Test
    void thePayloadEscapesQuotesBackslashesAndNewLines() {
        String json = WebPushServiceImpl.payload("Título \"X\"", "línea 1\nlínea 2 \\ fin", "tag", "/alerts", "Ver");

        assertThat(json)
                .contains("\"title\":\"Título \\\"X\\\"\"")
                .contains("\"body\":\"línea 1\\nlínea 2 \\\\ fin\"")
                .contains("\"url\":\"/alerts\"")
                .startsWith("{")
                .endsWith("}");
    }
}
