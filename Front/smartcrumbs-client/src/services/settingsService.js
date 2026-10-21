// Configuración del sistema (solo OWNER): días de alerta y de sugerencia de promoción.

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

// Nombres de los ajustes en la API
export const SETTING = {
  EXPIRATION_DAYS: 'expiration-alert-days',
  PROMOTION_DAYS:  'promotion-suggestion-days',
};

export const settingsService = {
  /** GET /api/settings/{name} → { key, value, description } (value llega como texto) */
  get: (token, name) =>
    fetch(`${BASE_URL}/api/settings/${name}`, { headers: authHeaders(token) }).then(handleResponse),

  /** PUT /api/settings/{name}  Body: { value } (entero de 1 a 30) */
  update: (token, name, value) =>
    fetch(`${BASE_URL}/api/settings/${name}`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify({ value }),
    }).then(handleResponse),
};
