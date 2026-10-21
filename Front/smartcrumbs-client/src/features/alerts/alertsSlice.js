import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { alertService } from '../../services/alertService';


// ─── Thunks ───────────────────────────────────────────────────────────────────


export const fetchAlerts = createAsyncThunk(
  'alerts/fetch',
  async ({ token }, { rejectWithValue }) => {
    try {
      return await alertService.getAll(token);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);


/** Pide al servidor que revise y genere alertas ahora, y devuelve la lista completa actualizada. */
export const refreshAlerts = createAsyncThunk(
  'alerts/refresh',
  async ({ token }, { rejectWithValue }) => {
    try {
      await alertService.generate(token);
      return await alertService.getAll(token);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);


export const resolveAlert = createAsyncThunk(
  'alerts/resolve',
  async ({ token, id }, { rejectWithValue }) => {
    try {
      return await alertService.resolve(token, id);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);


// ─── Slice ────────────────────────────────────────────────────────────────────


const alertsSlice = createSlice({
  name: 'alerts',
  initialState: {
    items: [],
    status: 'idle',        // idle | loading | succeeded | failed
    error: null,
    actionStatus: 'idle',  // idle | loading | failed (refrescar / resolver)
    actionError: null,
    busyId: null,          // alerta que se está resolviendo
  },
  reducers: {
    clearAlertAction(state) {
      state.actionStatus = 'idle';
      state.actionError  = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAlerts.pending,   (s) => { s.status = 'loading'; s.error = null; })
      .addCase(fetchAlerts.fulfilled, (s, a) => { s.status = 'succeeded'; s.items = a.payload; })
      .addCase(fetchAlerts.rejected,  (s, a) => { s.status = 'failed'; s.error = a.payload; });


    builder
      .addCase(refreshAlerts.pending,   (s) => { s.actionStatus = 'loading'; s.actionError = null; })
      .addCase(refreshAlerts.fulfilled, (s, a) => { s.actionStatus = 'idle'; s.status = 'succeeded'; s.items = a.payload; })
      .addCase(refreshAlerts.rejected,  (s, a) => { s.actionStatus = 'failed'; s.actionError = a.payload; });


    builder
      .addCase(resolveAlert.pending,   (s, a) => { s.actionStatus = 'loading'; s.actionError = null; s.busyId = a.meta.arg.id; })
      .addCase(resolveAlert.fulfilled, (s, a) => {
        s.actionStatus = 'idle';
        s.busyId = null;
        const idx = s.items.findIndex((x) => x.id === a.payload.id);
        if (idx !== -1) s.items[idx] = a.payload;
      })
      .addCase(resolveAlert.rejected,  (s, a) => { s.actionStatus = 'failed'; s.actionError = a.payload; s.busyId = null; });
  },
});


export const { clearAlertAction } = alertsSlice.actions;


// ─── Selectors ────────────────────────────────────────────────────────────────


export const selectAlerts       = (s) => s.alerts.items;
export const selectAlertsStatus = (s) => s.alerts.status;
export const selectAlertsError  = (s) => s.alerts.error;
export const selectAlertAction  = (s) => ({
  status: s.alerts.actionStatus,
  error:  s.alerts.actionError,
  busyId: s.alerts.busyId,
});


export default alertsSlice.reducer;


