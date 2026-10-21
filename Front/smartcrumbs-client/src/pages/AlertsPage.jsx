import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  fetchAlerts,
  refreshAlerts,
  resolveAlert,
  clearAlertAction,
  selectAlerts,
  selectAlertsStatus,
  selectAlertsError,
  selectAlertAction,
} from '../features/alerts/alertsSlice';
import { selectToken, selectUser } from '../features/auth/authSlice';
import { EmptyState, SectionHeader, TableSkeleton } from '../components/ui/CatalogUI';
import AppTopbar from '../components/layout/AppTopbar';
import { formatDateTime } from '../utils/format';

const SEVERITY = {
  RED:    { label: 'Urgente',  color: '#C0392B', bg: 'rgba(192,57,43,0.10)', rank: 0 },
  YELLOW: { label: 'Atención', color: '#B9770E', bg: 'rgba(185,119,14,0.12)', rank: 1 },
  INFO:   { label: 'Info',     color: '#2563A8', bg: 'rgba(37,99,168,0.10)',  rank: 2 },
};

const TYPE = {
  EXPIRING_SOON: { icon: '⏰', label: 'Por vencer' },
  EXPIRED:       { icon: '⛔', label: 'Vencido' },
  LOW_STOCK:     { icon: '📉', label: 'Stock bajo' },
};

const PAGE_SIZE = 50;

export default function AlertsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const token  = useSelector(selectToken);
  const user   = useSelector(selectUser);
  const items  = useSelector(selectAlerts);
  const status = useSelector(selectAlertsStatus);
  const error  = useSelector(selectAlertsError);
  const { status: actStatus, error: actError, busyId } = useSelector(selectAlertAction);

  const isOwner = user?.role === 'OWNER';

  const [tab,     setTab]     = useState('active');   // active | resolved
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    dispatch(clearAlertAction());
    dispatch(fetchAlerts({ token }));
  }, [dispatch, token]);

  const active = useMemo(
    () => items
      .filter((a) => a.status === 'ACTIVE')
      .sort((a, b) => (SEVERITY[a.severity]?.rank ?? 9) - (SEVERITY[b.severity]?.rank ?? 9)),
    [items]
  );
  const resolved = useMemo(() => items.filter((a) => a.status === 'RESOLVED'), [items]);

  const list     = tab === 'active' ? active : resolved;
  const shown    = list.slice(0, visible);
  const loading  = status === 'loading';
  const refreshing = actStatus === 'loading' && busyId == null;

  const switchTab = (t) => { setTab(t); setVisible(PAGE_SIZE); };

  return (
    <div className="al-page">
      <AppTopbar />

      <div className="al-content">
        <SectionHeader
          title="Alertas"
          subtitle={`${active.length} activa${active.length !== 1 ? 's' : ''}`}
          action={
            <div className="al-header-actions">
              {isOwner && (
                <button type="button" className="al-btn" onClick={() => navigate('/settings')}>
                  ⚙️ Configurar
                </button>
              )}
              <button
                type="button"
                className="al-btn"
                onClick={() => dispatch(refreshAlerts({ token }))}
                disabled={refreshing}
              >
                {refreshing ? 'Actualizando…' : '🔄 Actualizar'}
              </button>
            </div>
          }
        />

        <p className="al-hint">
          El sistema revisa los vencimientos y el stock cada pocos minutos y crea las alertas solo.
          Una alerta se cierra sola cuando el problema se arregla (se vende, se descarta o se repone
          el lote); también podés resolverla a mano. Si el stock sigue bajo el mínimo, la alerta de
          stock bajo vuelve a aparecer.
        </p>

        <div className="al-tabs">
          <button type="button" className={`al-tab ${tab === 'active' ? 'on' : ''}`} onClick={() => switchTab('active')}>
            Activas ({active.length})
          </button>
          <button type="button" className={`al-tab ${tab === 'resolved' ? 'on' : ''}`} onClick={() => switchTab('resolved')}>
            Resueltas ({resolved.length})
          </button>
        </div>

        {error && <div className="al-error">⚠ {error}</div>}
        {actStatus === 'failed' && actError && <div className="al-error">⚠ {actError}</div>}

        {loading && <TableSkeleton rows={4} />}

        {!loading && status === 'succeeded' && list.length === 0 && (
          <EmptyState
            icon={tab === 'active' ? '✅' : '🗂️'}
            title={tab === 'active' ? 'No hay alertas activas' : 'Todavía no hay alertas resueltas'}
            description={tab === 'active'
              ? 'Todo en orden: no hay lotes por vencer ni productos bajo el stock mínimo.'
              : 'Acá vas a ver el historial de alertas ya atendidas.'}
          />
        )}

        {!loading && list.length > 0 && (
          <>
            <div className="al-list">
              {shown.map((a, i) => {
                const sev = SEVERITY[a.severity] || SEVERITY.INFO;
                const typ = TYPE[a.alertType] || { icon: '🔔', label: 'Alerta' };
                const isBusy = busyId === a.id;
                return (
                  <div key={a.id} className="al-row" style={{ animationDelay: `${Math.min(i, 12) * 0.03}s` }}>
                    <div className="al-icon" style={{ background: sev.bg, color: sev.color }}>{typ.icon}</div>

                    <div className="al-body">
                      <span className="al-msg">{a.message}</span>
                      <div className="al-meta">
                        <span className="al-pill" style={{ background: sev.bg, color: sev.color }}>{sev.label}</span>
                        <span>{typ.label}</span>
                        {a.batchId != null && <span>Lote #{a.batchId}</span>}
                        <span>Creada {formatDateTime(a.createdAt)}</span>
                        {a.resolvedAt && <span>Resuelta {formatDateTime(a.resolvedAt)}</span>}
                      </div>
                    </div>

                    {a.status === 'ACTIVE' && (
                      <button
                        type="button"
                        className="al-resolve"
                        onClick={() => dispatch(resolveAlert({ token, id: a.id }))}
                        disabled={isBusy}
                      >
                        {isBusy ? '…' : '✓ Resolver'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {list.length > visible && (
              <button type="button" className="al-more" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                Ver más ({list.length - visible} restantes)
              </button>
            )}
          </>
        )}
      </div>

      <style>{`
        .al-page    { min-height: 100vh; background: var(--cream); }
        .al-content { max-width: 900px; margin: 0 auto; padding: var(--space-xl) var(--space-lg); }

        .al-header-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .al-btn {
          padding: 9px 16px; background: white; cursor: pointer;
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.84rem; font-weight: 600; color: var(--espresso);
          transition: all var(--transition-fast);
        }
        .al-btn:hover:not(:disabled) { border-color: var(--amber); }
        .al-btn:disabled { opacity: 0.6; cursor: default; }

        .al-hint { font-size: 0.84rem; color: var(--warm-gray); line-height: 1.55; margin: 0 0 16px; }

        .al-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
        .al-tab {
          padding: 8px 16px; cursor: pointer; background: white;
          border: 1.5px solid var(--cream-dark); border-radius: 20px;
          font-family: var(--font-body); font-size: 0.84rem; font-weight: 600; color: var(--warm-gray);
        }
        .al-tab.on { background: var(--espresso); border-color: var(--espresso); color: var(--cream); }

        .al-error {
          padding: 12px 16px; background: var(--error-light);
          border: 1px solid var(--error); border-radius: var(--radius-md);
          color: var(--error); font-size: 0.88rem; margin-bottom: 16px;
        }

        .al-list { display: flex; flex-direction: column; gap: 8px; }
        .al-row {
          display: flex; align-items: center; gap: 12px; padding: 12px 14px;
          background: white; border: 1px solid var(--cream-dark);
          border-radius: var(--radius-lg); box-shadow: var(--shadow-sm);
          animation: fadeIn 0.3s ease both;
        }
        .al-icon {
          width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; font-size: 1.05rem;
        }
        .al-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
        .al-msg  { font-weight: 700; font-size: 0.92rem; color: var(--espresso); word-break: break-word; }
        .al-meta {
          display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px;
          font-size: 0.76rem; color: var(--warm-gray);
        }
        .al-pill { padding: 2px 9px; border-radius: 20px; font-size: 0.7rem; font-weight: 700; }
        .al-resolve {
          flex-shrink: 0; padding: 8px 14px; cursor: pointer;
          background: rgba(30,132,73,0.10); border: 1.5px solid #1E8449; border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.8rem; font-weight: 700; color: #1E8449;
        }
        .al-resolve:hover:not(:disabled) { background: rgba(30,132,73,0.20); }
        .al-resolve:disabled { opacity: 0.6; cursor: default; }

        .al-more {
          display: block; margin: 16px auto 0; padding: 10px 20px; cursor: pointer;
          background: white; border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.86rem; font-weight: 600; color: var(--espresso);
        }
        .al-more:hover { border-color: var(--amber); }

        @media (max-width: 540px) {
          .al-content { padding: var(--space-lg) var(--space-sm); }
          .al-row { flex-wrap: wrap; }
          .al-resolve { width: 100%; }
        }
      `}</style>
    </div>
  );
}
