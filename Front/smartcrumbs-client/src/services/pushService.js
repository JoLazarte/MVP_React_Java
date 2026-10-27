// Notificaciones Push: configuración del servidor y alta/baja de este dispositivo. Ambos roles.

const BASE_URL = import.meta.env.MODE === 'development'
  ? ''
  : import.meta.env.VITE_API_URL;

const authHeaders = (token) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const handleResponse = async (res) => {
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || data?.error || `Error ${res.status}`);
  }
  return data;
};

export const pushService = {
  /** GET /api/push/config → { enabled, publicKey } */
  getConfig: (token) =>
    fetch(`${BASE_URL}/api/push/config`, { headers: authHeaders(token) }).then(handleResponse),

  /** POST /api/push/subscriptions  Body: PushSubscription.toJSON() → 204 */
  subscribe: (token, subscription) =>
    fetch(`${BASE_URL}/api/push/subscriptions`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.keys?.p256dh, auth: subscription.keys?.auth },
      }),
    }).then(handleResponse),

  /** DELETE /api/push/subscriptions?endpoint=... → 204 */
  unsubscribe: (token, endpoint) =>
    fetch(`${BASE_URL}/api/push/subscriptions?endpoint=${encodeURIComponent(endpoint)}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }).then(handleResponse),

  /** POST /api/push/test → { sent } (dispositivos que recibieron el aviso) */
  sendTest: (token) =>
    fetch(`${BASE_URL}/api/push/test`, {
      method: 'POST',
      headers: authHeaders(token),
    }).then(handleResponse),
};
