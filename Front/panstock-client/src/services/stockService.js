//const BASE_URL = import.meta.env.VITE_API_URL;

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
    const msg = data?.message || data?.error || `Error ${res.status}`;
    throw new Error(msg);
  }
  if (data && typeof data === 'object' && 'ok' in data) {
    if (!data.ok) throw new Error(data.error || 'Error desconocido');
    return data.data ?? data;
  }
  return data;
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardService = {
  /**
   * GET /api/dashboard/expiration-semaphore
   * Returns DashboardSemaphoreResponse:
   *   { greenCount, yellowCount, redCount, expiredCount, items: ExpirationItemResponse[] }
   */
  getSemaphore: (token) =>
    fetch(`${BASE_URL}/api/dashboard/expiration-semaphore`, {
      headers: authHeaders(token),
    }).then(handleResponse),
};

// ─── Stock / Expiration ───────────────────────────────────────────────────────

export const stockService = {
  /**
   * GET /api/stock/expiring?days=N
   * Returns ExpirationItemResponse[] — lotes próximos a vencer
   */
  getExpiring: (token, days = null) => {
    const qs = days != null ? `?days=${days}` : '';
    return fetch(`${BASE_URL}/api/stock/expiring${qs}`, {
      headers: authHeaders(token),
    }).then(handleResponse);
  },

  /**
   * GET /api/stock/expired
   * Returns ExpirationItemResponse[] — lotes ya vencidos
   */
  getExpired: (token) =>
    fetch(`${BASE_URL}/api/stock/expired`, {
      headers: authHeaders(token),
    }).then(handleResponse),

  /**
   * GET /api/stock/batches/{id}
   */
  getBatchById: (token, id) =>
    fetch(`${BASE_URL}/api/stock/batches/${id}`, {
      headers: authHeaders(token),
    }).then(handleResponse),

  /**
   * POST /api/stock/adjustments
   * Body: { batchId, adjustmentType: 'IN' | 'OUT', quantity, notes }
   * El usuario se toma del token. Returns StockOperationResponse.
   */
  registerAdjustment: (token, data) =>
    fetch(`${BASE_URL}/api/stock/adjustments`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(data),
    }).then(handleResponse),

  /**
   * GET /api/stock/movements?productId&batchId&movementType&from&to
   * Todos los filtros son opcionales (los vacíos no se envían).
   * Returns StockMovementHistoryResponse[] — del más reciente al más antiguo, sin paginar.
   */
  getMovements: (token, filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value != null) params.set(key, value);
    });
    const qs = params.toString();
    return fetch(`${BASE_URL}/api/stock/movements${qs ? `?${qs}` : ''}`, {
      headers: authHeaders(token),
    }).then(handleResponse);
  },
};