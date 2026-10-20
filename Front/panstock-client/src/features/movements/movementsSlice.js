import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { stockService } from '../../services/stockService';

// ─── Thunk ────────────────────────────────────────────────────────────────────

/** GET /api/stock/movements — filters: { productId, batchId, movementType, from, to } */
export const fetchMovements = createAsyncThunk(
  'movements/fetch',
  async ({ token, filters }, { rejectWithValue }) => {
    try {
      return await stockService.getMovements(token, filters);
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const movementsSlice = createSlice({
  name: 'movements',
  initialState: {
    items: [],
    status: 'idle',   // idle | loading | succeeded | failed
    error: null,
    requestId: null,  // solo vale la respuesta de la última consulta (evita pisar con una vieja)
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMovements.pending, (s, a) => {
        s.status = 'loading';
        s.error = null;
        s.requestId = a.meta.requestId;
      })
      .addCase(fetchMovements.fulfilled, (s, a) => {
        if (s.requestId !== a.meta.requestId) return;
        s.status = 'succeeded';
        s.items = a.payload;
      })
      .addCase(fetchMovements.rejected, (s, a) => {
        if (s.requestId !== a.meta.requestId) return;
        s.status = 'failed';
        s.error = a.payload || a.error?.message || 'No se pudo cargar el historial';
        s.items = [];
      });
  },
});

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectMovements       = (s) => s.movements.items;
export const selectMovementsStatus = (s) => s.movements.status;
export const selectMovementsError  = (s) => s.movements.error;

export default movementsSlice.reducer;
