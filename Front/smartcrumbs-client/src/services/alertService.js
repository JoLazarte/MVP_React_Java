// Alertas persistentes del backend (vencimientos y stock bajo). Ambos roles.

const BASE_URL = import.meta.env.MODE === 'development'
  ? ''
  : import.meta.env.VITE_API_URL;

const authHeaders = (token) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const handleResponse = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || data?.error || `Error ${res.status}`);
  }
  return data;
};

export const alertService = {
  /** GET /api/alerts → todas, de la más reciente a la más antigua */
  getAll: (token) =>
    fetch(`${BASE_URL}/api/alerts`, { headers: authHeaders(token) }).then(handleResponse),

  /** POST /api/alerts/generate → { createdAlerts, alerts } */
  generate: (token) =>
    fetch(`${BASE_URL}/api/alerts/generate`, {
      method: 'POST',
      headers: authHeaders(token),
    }).then(handleResponse),

  /** PATCH /api/alerts/{id}/resolve → la alerta resuelta */
  resolve: (token, id) =>
    fetch(`${BASE_URL}/api/alerts/${id}/resolve`, {
      method: 'PATCH',
      headers: authHeaders(token),
    }).then(handleResponse),
};
