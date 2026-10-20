import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  registerAdjustment,
  clearAdjustState,
  selectAdjustAction,
} from '../../features/stock/stockSlice';
import { selectToken } from '../../features/auth/authSlice';
import { Input, Button, Alert } from '../ui/FormField';
import { formatQty, formatDate } from '../../utils/format';

const TYPES = [
  { value: 'IN',  icon: '➕', label: 'Sumar',  help: 'Hay más unidades que las registradas' },
  { value: 'OUT', icon: '➖', label: 'Restar', help: 'Hay menos unidades que las registradas' },
];

const NOTES_MIN = 5;
const NOTES_MAX = 250;

const toNumber = (raw) => Number(String(raw).trim().replace(',', '.'));
const round3   = (n) => Math.round(n * 1000) / 1000;

/**
 * Corrige el stock de UN lote cuando no coincide con el recuento físico.
 * No reemplaza a: Ingreso (lote nuevo), Venta (descuenta por FEFO) ni Mermas (pérdidas).
 */
export default function StockAdjustmentForm({ batch, onSuccess, onCancel }) {
  const dispatch          = useDispatch();
  const token             = useSelector(selectToken);
  const { status, error } = useSelector(selectAdjustAction);

  const [type,  setType]  = useState('OUT');
  const [qty,   setQty]   = useState('');
  const [notes, setNotes] = useState('');
  const [fieldErrors, setFE] = useState({});

  const current = Number(batch.currentQuantity);

  // Limpia el estado de la acción al abrir el formulario
  useEffect(() => {
    dispatch(clearAdjustState());
  }, [dispatch]);

  // Cierra al registrar con éxito
  useEffect(() => {
    if (status === 'succeeded') {
      dispatch(clearAdjustState());
      onSuccess?.();
    }
  }, [status, dispatch, onSuccess]);

  const validate = () => {
    const e = {};
    const raw = qty.trim();
    if (!raw) {
      e.qty = 'Ingresá la cantidad';
    } else if (!/^\d+([.,]\d{1,3})?$/.test(raw)) {
      e.qty = 'Usá un número positivo, con hasta 3 decimales';
    } else {
      const n = toNumber(raw);
      if (n <= 0) e.qty = 'La cantidad debe ser mayor a cero';
      else if (type === 'OUT' && n > current) {
        e.qty = `No podés restar más que el stock actual (${formatQty(current)} u.)`;
      }
    }

    const reason = notes.trim();
    if (reason.length < NOTES_MIN)      e.notes = `Explicá el motivo (mínimo ${NOTES_MIN} caracteres)`;
    else if (reason.length > NOTES_MAX) e.notes = `Máximo ${NOTES_MAX} caracteres`;
    return e;
  };

  const handleSubmit = (ev) => {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFE(errs); return; }

    dispatch(registerAdjustment({
      token,
      data: {
        batchId:        batch.id,
        adjustmentType: type,
        quantity:       toNumber(qty),
        notes:          notes.trim(),
      },
    }));
  };

  // Vista previa del stock resultante (solo si la cantidad es válida)
  const qtyIsValid = /^\d+([.,]\d{1,3})?$/.test(qty.trim()) && toNumber(qty) > 0;
  const resulting  = qtyIsValid
    ? round3(type === 'IN' ? current + toNumber(qty) : current - toNumber(qty))
    : null;

  const isLoading = status === 'loading';

  return (
    <form onSubmit={handleSubmit} noValidate className="adj-form">
      {error && <Alert type="error">{error}</Alert>}

      <div className="adj-batch">
        <span className="adj-batch-name">{batch.productName}</span>
        <span className="adj-batch-meta">
          Lote #{batch.id} · Stock actual <strong>{formatQty(current)} u.</strong>
          {batch.expirationDate && <> · Vence {formatDate(batch.expirationDate)}</>}
        </span>
      </div>

      <div>
        <span className="adj-label">¿Qué encontraste al contar?</span>
        <div className="adj-types">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              className={`adj-type ${type === t.value ? 'active' : ''}`}
              onClick={() => { setType(t.value); setFE((p) => ({ ...p, qty: undefined })); }}
              disabled={isLoading}
            >
              <span className="adj-type-title">{t.icon} {t.label}</span>
              <span className="adj-type-help">{t.help}</span>
            </button>
          ))}
        </div>
      </div>

      <Input
        label="Cantidad a ajustar *"
        type="text"
        inputMode="decimal"
        placeholder="Ej: 2"
        value={qty}
        onChange={(e) => { setQty(e.target.value); if (fieldErrors.qty) setFE((p) => ({ ...p, qty: undefined })); }}
        error={fieldErrors.qty}
        disabled={isLoading}
        autoFocus
      />

      {resulting !== null && (
        <p className="adj-preview">
          El stock del lote pasará de <strong>{formatQty(current)}</strong> a <strong>{formatQty(resulting)} u.</strong>
        </p>
      )}

      <div>
        <label className="adj-label" htmlFor="adj-notes">Motivo del ajuste *</label>
        <textarea
          id="adj-notes"
          className={`adj-textarea ${fieldErrors.notes ? 'has-error' : ''}`}
          rows={3}
          maxLength={NOTES_MAX}
          placeholder="Ej: Diferencia detectada en el recuento del cierre"
          value={notes}
          onChange={(e) => { setNotes(e.target.value); if (fieldErrors.notes) setFE((p) => ({ ...p, notes: undefined })); }}
          disabled={isLoading}
        />
        {fieldErrors.notes && <span className="adj-error">{fieldErrors.notes}</span>}
      </div>

      <p className="adj-hint">
        Usá el ajuste solo para corregir diferencias de recuento. Para descartar mercadería vencida o
        dañada usá <strong>Mermas</strong>; para una venta, <strong>Registrar venta</strong>; y si llegó
        mercadería nueva, <strong>Registrar ingreso</strong>. Queda registrado quién hizo el ajuste.
      </p>

      <div className="adj-actions">
        <button type="button" className="adj-cancel" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </button>
        <Button type="submit" variant="amber" loading={isLoading}>
          Registrar ajuste
        </Button>
      </div>

      <style>{`
        .adj-form { display: flex; flex-direction: column; gap: 16px; }
        .adj-batch {
          display: flex; flex-direction: column; gap: 3px;
          padding: 12px 14px; background: var(--cream);
          border: 1px solid var(--cream-dark); border-radius: var(--radius-md);
        }
        .adj-batch-name { font-weight: 700; color: var(--espresso); }
        .adj-batch-meta { font-size: 0.8rem; color: var(--warm-gray); }
        .adj-label {
          display: block; margin-bottom: 6px;
          font-size: 0.8rem; font-weight: 600; color: var(--espresso);
        }
        .adj-types { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .adj-type {
          display: flex; flex-direction: column; gap: 3px; text-align: left;
          padding: 10px 12px; background: white; cursor: pointer;
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          font-family: var(--font-body); transition: all var(--transition-fast);
        }
        .adj-type:hover:not(:disabled) { border-color: var(--amber); }
        .adj-type.active { border-color: var(--amber); background: rgba(200,137,58,0.08); }
        .adj-type-title { font-weight: 700; font-size: 0.9rem; color: var(--espresso); }
        .adj-type-help  { font-size: 0.72rem; color: var(--warm-gray); line-height: 1.3; }
        .adj-preview { margin: -6px 0 0; font-size: 0.84rem; color: var(--espresso); }
        .adj-textarea {
          width: 100%; box-sizing: border-box; padding: 10px 12px; resize: vertical;
          font-family: var(--font-body); font-size: 0.9rem; color: var(--espresso);
          background: white; border: 1.5px solid var(--cream-dark);
          border-radius: var(--radius-md); outline: none;
          transition: border-color var(--transition-base);
        }
        .adj-textarea:focus { border-color: var(--amber); }
        .adj-textarea.has-error { border-color: var(--error); }
        .adj-error { display: block; margin-top: 4px; font-size: 0.75rem; color: var(--error); }
        .adj-hint { margin: 0; font-size: 0.78rem; line-height: 1.5; color: var(--warm-gray); }
        .adj-actions { display: flex; gap: 10px; justify-content: flex-end; padding-top: 4px; }
        .adj-cancel {
          padding: 10px 20px; background: var(--cream);
          border: 1.5px solid var(--cream-dark); border-radius: var(--radius-md);
          font-family: var(--font-body); font-size: 0.88rem; font-weight: 600;
          color: var(--warm-gray); cursor: pointer; transition: all var(--transition-fast);
        }
        .adj-cancel:hover:not(:disabled) { border-color: var(--warm-gray); color: var(--espresso); }
        @media (max-width: 480px) { .adj-types { grid-template-columns: 1fr; } }
      `}</style>
    </form>
  );
}
