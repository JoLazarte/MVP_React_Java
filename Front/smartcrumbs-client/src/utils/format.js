// Formatos compartidos (es-AR) para números, moneda y fechas.

/** 1234.5 → "1.234,5" (hasta 3 decimales) */
export const formatQty = (v) =>
  v != null ? Number(v).toLocaleString('es-AR', { maximumFractionDigits: 3 }) : '—';

/** 1500 → "$ 1.500,00" */
export const formatARS = (v) =>
  v != null
    ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(v)
    : '—';

/** 'YYYY-MM-DD' → "08 may 2026" */
export const formatDate = (d) =>
  d
    ? new Date(`${d}T00:00:00`).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

/** 'YYYY-MM-DDTHH:mm:ss' (sin zona horaria) → "08 may 2026, 16:15" */
export const formatDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString('es-AR', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : '—';

/** Date → 'YYYY-MM-DD' en hora local (toISOString usaría UTC y puede correr el día). */
export const toISODate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
