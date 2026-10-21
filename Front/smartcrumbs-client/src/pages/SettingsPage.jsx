import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchSettings, saveSetting, selectSettings } from '../features/settings/settingsSlice';
import { selectToken } from '../features/auth/authSlice';
import { SectionHeader, TableSkeleton } from '../components/ui/CatalogUI';
import AppTopbar from '../components/layout/AppTopbar';

const MIN = 1;
const MAX = 30;

/** Un ajuste numérico (días) con − / + y botón Guardar. */
function SettingCard({ icon, title, intro, value, saving, saved, error, onSave, children }) {
  const [draft, setDraft] = useState(String(value ?? ''));

  // Si el valor guardado cambia (carga inicial o después de guardar), se refresca el borrador
  useEffect(() => { if (value != null) setDraft(String(value)); }, [value]);

  const n       = Number(draft);
  const valid   = draft.trim() !== '' && Number.isInteger(n) && n >= MIN && n <= MAX;
  const changed = valid && n !== value;

  const step = (delta) => {
    const base = Number.isInteger(n) ? n : (value ?? MIN);
    setDraft(String(Math.min(MAX, Math.max(MIN, base + delta))));
  };

  return (
    <section className="set-card">
      <div className="set-card-head">
        <span className="set-icon">{icon}</span>
        <div>
          <h2 className="set-title">{title}</h2>
          <p className="set-intro">{intro}</p>
        </div>
      </div>

      <div className="set-control">
        <button type="button" className="set-step" onClick={() => step(-1)} disabled={saving} aria-label="Restar un día">−</button>
        <input
          className="set-input"
          type="number"
          inputMode="numeric"
          min={MIN}
          max={MAX}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={saving}
        />
        <button type="button" className="set-step" onClick={() => step(1)} disabled={saving} aria-label="Sumar un día">+</button>
        <span className="set-unit">día{n === 1 ? '' : 's'}</span>

        <button
          type="button"
          className="set-save"
          onClick={() => onSave(n)}
          disabled={!changed || saving}
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        {saved && !changed && <span className="set-ok">✓ Guardado</span>}
      </div>

      {!valid && draft.trim() !== '' && (
        <p className="set-warn">Ingresá un número entero entre {MIN} y {MAX}.</p>
      )}
      {error && <p className="set-error">⚠ {error}</p>}

      <div className="set-explain">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const token    = useSelector(selectToken);
  const s        = useSelector(selectSettings);

  useEffect(() => {
    dispatch(fetchSettings({ token }));
  }, [dispatch, token]);

  const save = (key) => (value) => dispatch(saveSetting({ token, key, value }));
  const err  = (key) => (s.saveErrorKey === key ? s.saveError : null);

  return (
    <div className="set-page">
      <AppTopbar />

      <div className="set-content">
        <SectionHeader
          title="Configuración"
          subtitle="Plazos de vencimiento y promociones"
          action={
            <button type="button" className="set-link" onClick={() => navigate('/alerts')}>
              🔔 Ver alertas
            </button>
          }
        />

        {s.status === 'loading' && s.expirationDays == null && <TableSkeleton rows={2} />}
        {s.error && <div className="set-fetch-error">⚠ {s.error}</div>}

        {s.expirationDays != null && (
          <SettingCard
            icon="⏰"
            title="Días de aviso de vencimiento"
            intro="Cuántos días antes de vencer un lote se lo marca como “por vencer”."
            value={s.expirationDays}
            saving={s.savingKey === 'expirationDays'}
            saved={s.savedKey === 'expirationDays'}
            error={err('expirationDays')}
            onSave={save('expirationDays')}
          >
            <p>Se aplica a todo el sistema y a todos los dispositivos:</p>
            <ul>
              <li>🔴 <strong>Rojo:</strong> el lote vence hoy.</li>
              <li>🟡 <strong>Amarillo:</strong> vence dentro de 1 a {s.expirationDays} día{s.expirationDays === 1 ? '' : 's'}.</li>
              <li>🟢 <strong>Verde:</strong> faltan más de {s.expirationDays} día{s.expirationDays === 1 ? '' : 's'}.</li>
            </ul>
            <p>
              Define los colores del semáforo (Inicio, Stock y Vencimientos), las alertas de
              vencimiento y las notificaciones: se avisan los lotes en amarillo y rojo.
            </p>
          </SettingCard>
        )}

        {s.promotionDays != null && (
          <SettingCard
            icon="🏷️"
            title="Días para sugerir promociones"
            intro="Hasta cuántos días antes de vencer se le sugiere una promoción a un lote."
            value={s.promotionDays}
            saving={s.savingKey === 'promotionDays'}
            saved={s.savedKey === 'promotionDays'}
            error={err('promotionDays')}
            onSave={save('promotionDays')}
          >
            <p>
              Se sugieren promociones para los lotes con stock que vencen en los próximos{' '}
              {s.promotionDays} día{s.promotionDays === 1 ? '' : 's'} (hoy incluido) y que todavía
              no tienen una promoción activa. El descuento sugerido es:
            </p>
            <ul>
              <li><strong>20%</strong> si el lote vence hoy.</li>
              <li><strong>10%</strong> si faltan de 1 a {s.promotionDays} día{s.promotionDays === 1 ? '' : 's'}.</li>
            </ul>
          </SettingCard>
        )}
      </div>

      <style>{`
        .set-page    { min-height: 100vh; background: var(--cream); }
        .set-content { max-width: 760px; margin: 0 auto; padding: var(--space-xl) var(--space-lg); }

        .set-link {
          padding: 9px 16px; background: white; cursor: pointer;
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.84rem; font-weight: 600; color: var(--espresso);
        }
        .set-link:hover { border-color: var(--amber); }

        .set-fetch-error {
          padding: 12px 16px; background: var(--error-light);
          border: 1px solid var(--error); border-radius: var(--radius-md);
          color: var(--error); font-size: 0.88rem; margin-bottom: 16px;
        }

        .set-card {
          background: white; border: 1px solid var(--cream-dark);
          border-radius: var(--radius-lg); box-shadow: var(--shadow-sm);
          padding: 20px; margin-bottom: 16px;
        }
        .set-card-head { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 16px; }
        .set-icon  { font-size: 1.5rem; }
        .set-title { margin: 0 0 2px; font-size: 1.05rem; color: var(--espresso); }
        .set-intro { margin: 0; font-size: 0.84rem; color: var(--warm-gray); }

        .set-control { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .set-step {
          width: 38px; height: 38px; cursor: pointer; font-size: 1.2rem; line-height: 1;
          background: var(--cream); border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          color: var(--espresso); font-family: var(--font-body);
        }
        .set-step:hover:not(:disabled) { border-color: var(--amber); }
        .set-input {
          width: 72px; height: 38px; text-align: center; box-sizing: border-box;
          font-family: var(--font-body); font-size: 1rem; font-weight: 700; color: var(--espresso);
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md); outline: none;
        }
        .set-input:focus { border-color: var(--amber); }
        .set-unit { font-size: 0.88rem; color: var(--warm-gray); margin-right: 8px; }
        .set-save {
          padding: 9px 18px; cursor: pointer; font-family: var(--font-body);
          font-size: 0.86rem; font-weight: 700; color: white;
          background: var(--amber); border: none; border-radius: var(--radius-md);
        }
        .set-save:disabled { opacity: 0.45; cursor: default; }
        .set-ok    { font-size: 0.82rem; color: #1E8449; font-weight: 600; }
        .set-warn  { margin: 8px 0 0; font-size: 0.8rem; color: #B9770E; }
        .set-error { margin: 8px 0 0; font-size: 0.82rem; color: var(--error); }

        .set-explain {
          margin-top: 16px; padding: 12px 14px; background: var(--cream);
          border-radius: var(--radius-md); font-size: 0.82rem; color: var(--warm-gray); line-height: 1.55;
        }
        .set-explain p  { margin: 0 0 8px; }
        .set-explain p:last-child { margin-bottom: 0; }
        .set-explain ul { margin: 0 0 8px; padding-left: 18px; }

        @media (max-width: 540px) {
          .set-content { padding: var(--space-lg) var(--space-sm); }
        }
      `}</style>
    </div>
  );
}
