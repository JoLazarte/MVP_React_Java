import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  fetchMovements,
  selectMovements,
  selectMovementsStatus,
  selectMovementsError,
} from '../features/movements/movementsSlice';
import { fetchProducts, selectProducts } from '../features/catalog/productsSlice';
import { selectToken } from '../features/auth/authSlice';
import { EmptyState, SectionHeader, FilterBar, TableSkeleton } from '../components/ui/CatalogUI';
import AppTopbar from '../components/layout/AppTopbar';
import { formatQty, formatARS, formatDateTime, toISODate } from '../utils/format';

const TYPE_CONFIG = {
  ENTRY:          { label: 'Ingreso',  icon: '📥', color: '#1E8449', bg: 'rgba(30,132,73,0.10)',   sign: '+' },
  SALE:           { label: 'Venta',    icon: '🧾', color: '#2563A8', bg: 'rgba(37,99,168,0.10)',   sign: '−' },
  WASTE:          { label: 'Merma',    icon: '🗑️', color: '#C0392B', bg: 'rgba(192,57,43,0.10)',   sign: '−' },
  ADJUSTMENT_IN:  { label: 'Ajuste +', icon: '➕', color: '#7D5BA6', bg: 'rgba(125,91,166,0.10)',  sign: '+' },
  ADJUSTMENT_OUT: { label: 'Ajuste −', icon: '➖', color: '#B9770E', bg: 'rgba(185,119,14,0.10)',  sign: '−' },
};

const FALLBACK_CONFIG = { label: 'Movimiento', icon: '•', color: '#8C7B6B', bg: 'rgba(140,123,107,0.10)', sign: '' };

const TYPE_OPTIONS = [
  { value: '',               label: 'Todos los tipos' },
  { value: 'ENTRY',          label: '📥 Ingresos' },
  { value: 'SALE',           label: '🧾 Ventas' },
  { value: 'WASTE',          label: '🗑️ Mermas' },
  { value: 'ADJUSTMENT_IN',  label: '➕ Ajustes (suman)' },
  { value: 'ADJUSTMENT_OUT', label: '➖ Ajustes (restan)' },
];

const PAGE_SIZE = 50;

const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return toISODate(d); };

/** Quién hizo el movimiento. Sin usuario = lo generó el sistema (descarte automático). */
const whoDid = (m) => m.userName || (m.userId != null ? `Usuario #${m.userId}` : 'Sistema');

export default function MovementsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const token    = useSelector(selectToken);
  const items    = useSelector(selectMovements);
  const status   = useSelector(selectMovementsStatus);
  const error    = useSelector(selectMovementsError);
  const products = useSelector(selectProducts);

  // Si se llega desde un lote (?batchId=), se muestra todo su historial, sin límite de fechas
  const batchId = searchParams.get('batchId') || '';
  const [type,      setType]      = useState('');
  const [productId, setProductId] = useState(searchParams.get('productId') || '');
  const [from,      setFrom]      = useState(() => (searchParams.get('batchId') ? '' : daysAgo(29)));
  const [to,        setTo]        = useState(() => (searchParams.get('batchId') ? '' : toISODate(new Date())));
  const [visible,   setVisible]   = useState(PAGE_SIZE);

  const rangeError = from && to && from > to
    ? 'La fecha "Desde" no puede ser posterior a "Hasta".'
    : null;

  // Productos para el filtro (si todavía no se cargaron)
  useEffect(() => {
    if (token && products.length === 0) dispatch(fetchProducts({ token }));
  }, [dispatch, token, products.length]);

  // Los filtros se aplican en el servidor
  useEffect(() => {
    if (!token || rangeError) return;
    setVisible(PAGE_SIZE);
    dispatch(fetchMovements({
      token,
      filters: { productId, batchId, movementType: type, from, to },
    }));
  }, [dispatch, token, productId, batchId, type, from, to, rangeError]);

  const clearBatch = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('batchId');
    setSearchParams(next, { replace: true });
  };

  const resetFilters = () => {
    setType('');
    setProductId('');
    setFrom(daysAgo(29));
    setTo(toISODate(new Date()));
    clearBatch();
  };

  const productOptions = [...products]
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es'));

  const isLoading = status === 'loading';
  const shown     = items.slice(0, visible);

  return (
    <div className="mv-page">
      <AppTopbar />

      <div className="mv-content">
        <SectionHeader
          title="Historial de movimientos"
          subtitle={isLoading ? 'Cargando…' : `${items.length} movimiento${items.length !== 1 ? 's' : ''}`}
          action={
            <button type="button" className="mv-btn" onClick={() => navigate('/stock')}>
              ← Volver a Stock
            </button>
          }
        />

        <p className="mv-hint">
          Cada ingreso, venta, merma y ajuste deja un movimiento, del más reciente al más antiguo.
          Para ver el motivo y el costo de una merma, andá a <strong>Mermas</strong>.
        </p>

        <FilterBar>
          <div className="mv-filters">
            <label className="mv-field">
              <span>Tipo</span>
              <select className="mv-input" value={type} onChange={(e) => setType(e.target.value)}>
                {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>

            <label className="mv-field mv-field-wide">
              <span>Producto</span>
              <select className="mv-input" value={productId} onChange={(e) => setProductId(e.target.value)}>
                <option value="">Todos los productos</option>
                {productOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>

            <label className="mv-field">
              <span>Desde</span>
              <input className="mv-input" type="date" value={from} max={to || undefined}
                     onChange={(e) => setFrom(e.target.value)} />
            </label>

            <label className="mv-field">
              <span>Hasta</span>
              <input className="mv-input" type="date" value={to} min={from || undefined}
                     onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>
        </FilterBar>

        <div className="mv-chips">
          {batchId && (
            <span className="mv-chip">
              Lote #{batchId}
              <button type="button" aria-label="Quitar filtro de lote" onClick={clearBatch}>✕</button>
            </span>
          )}
          <button type="button" className="mv-link" onClick={resetFilters}>Restablecer filtros</button>
        </div>

        {rangeError && <div className="mv-error">⚠ {rangeError}</div>}
        {error && !rangeError && <div className="mv-error">⚠ {error}</div>}

        {isLoading && <TableSkeleton rows={6} />}

        {!isLoading && status === 'succeeded' && items.length === 0 && (
          <EmptyState
            icon="📜"
            title="No hay movimientos con estos filtros"
            description="Probá ampliando el rango de fechas o quitando algún filtro."
            action={<button type="button" className="mv-btn" onClick={resetFilters}>Restablecer filtros</button>}
          />
        )}

        {!isLoading && items.length > 0 && (
          <>
            <div className="mv-list">
              {shown.map((m, i) => {
                const cfg = TYPE_CONFIG[m.movementType] || FALLBACK_CONFIG;
                return (
                  <div key={m.id} className="mv-row" style={{ animationDelay: `${Math.min(i, 12) * 0.03}s` }}>
                    <div className="mv-icon" style={{ background: cfg.bg, color: cfg.color }}>{cfg.icon}</div>

                    <div className="mv-body">
                      <div className="mv-top">
                        <span className="mv-name">{m.productName || 'Producto'}</span>
                        <span className="mv-qty" style={{ color: cfg.color }}>
                          {cfg.sign}{formatQty(m.quantity)} u.
                        </span>
                      </div>

                      <div className="mv-meta">
                        <span className="mv-pill" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                        {m.batchId != null && <span>Lote #{m.batchId}</span>}
                        <span>{formatDateTime(m.movementDate)}</span>
                        <span>👤 {whoDid(m)}</span>
                        {m.movementType === 'SALE' && m.unitSalePrice != null && (
                          <span>{formatARS(m.unitSalePrice)} c/u</span>
                        )}
                        {m.relatedWasteRecordId != null && <span>Merma #{m.relatedWasteRecordId}</span>}
                      </div>

                      {m.notes && <p className="mv-notes">{m.notes}</p>}
                    </div>
                  </div>
                );
              })}
            </div>

            {items.length > visible && (
              <button type="button" className="mv-more" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                Ver más ({items.length - visible} restantes)
              </button>
            )}
          </>
        )}
      </div>

      <style>{`
        .mv-page    { min-height: 100vh; background: var(--cream); }
        .mv-content { max-width: 900px; margin: 0 auto; padding: var(--space-xl) var(--space-lg); }

        .mv-hint { font-size: 0.85rem; color: var(--warm-gray); line-height: 1.5; margin: 0 0 16px; }

        .mv-btn {
          padding: 9px 16px; background: white; cursor: pointer;
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.84rem; font-weight: 600; color: var(--espresso);
          transition: all var(--transition-fast);
        }
        .mv-btn:hover { border-color: var(--amber); }

        .mv-filters { display: flex; flex-wrap: wrap; gap: 12px; width: 100%; }
        .mv-field { display: flex; flex-direction: column; gap: 4px; min-width: 140px; flex: 1; }
        .mv-field-wide { flex: 2; min-width: 200px; }
        .mv-field > span {
          font-size: 0.68rem; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.06em; color: var(--warm-gray-light);
        }
        .mv-input {
          width: 100%; box-sizing: border-box; padding: 9px 10px;
          font-family: var(--font-body); font-size: 0.86rem; color: var(--espresso);
          background: white; border: 1.5px solid var(--cream-dark);
          border-radius: var(--radius-md); outline: none;
          transition: border-color var(--transition-base);
        }
        .mv-input:focus { border-color: var(--amber); }

        .mv-chips { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin: 4px 0 14px; }
        .mv-chip {
          display: inline-flex; align-items: center; gap: 6px; padding: 4px 6px 4px 12px;
          background: rgba(200,137,58,0.12); border: 1px solid var(--amber);
          border-radius: 20px; font-size: 0.8rem; font-weight: 600; color: var(--espresso);
        }
        .mv-chip button { background: none; border: none; cursor: pointer; color: var(--warm-gray); font-size: 0.75rem; padding: 2px 6px; }
        .mv-link {
          background: none; border: none; cursor: pointer; padding: 0;
          font-family: var(--font-body); font-size: 0.8rem; color: var(--warm-gray); text-decoration: underline;
        }
        .mv-link:hover { color: var(--espresso); }

        .mv-error {
          padding: 12px 16px; background: var(--error-light);
          border: 1px solid var(--error); border-radius: var(--radius-md);
          color: var(--error); font-size: 0.88rem; margin-bottom: 16px;
        }

        .mv-list { display: flex; flex-direction: column; gap: 8px; }
        .mv-row {
          display: flex; gap: 12px; padding: 12px 14px;
          background: white; border: 1px solid var(--cream-dark);
          border-radius: var(--radius-lg); box-shadow: var(--shadow-sm);
          animation: fadeIn 0.3s ease both;
        }
        .mv-icon {
          width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; font-size: 1rem;
        }
        .mv-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
        .mv-top  { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
        .mv-name { font-weight: 700; font-size: 0.93rem; color: var(--espresso); word-break: break-word; }
        .mv-qty  { font-weight: 800; font-size: 0.95rem; white-space: nowrap; }
        .mv-meta {
          display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px;
          font-size: 0.76rem; color: var(--warm-gray);
        }
        .mv-pill { padding: 2px 9px; border-radius: 20px; font-size: 0.7rem; font-weight: 700; }
        .mv-notes { margin: 0; font-size: 0.8rem; color: var(--warm-gray); line-height: 1.45; word-break: break-word; }

        .mv-more {
          display: block; margin: 16px auto 0; padding: 10px 20px; cursor: pointer;
          background: white; border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.86rem; font-weight: 600; color: var(--espresso);
        }
        .mv-more:hover { border-color: var(--amber); }

        @media (max-width: 540px) {
          .mv-content { padding: var(--space-lg) var(--space-sm); }
          .mv-top { flex-direction: column; gap: 2px; }
        }
      `}</style>
    </div>
  );
}
