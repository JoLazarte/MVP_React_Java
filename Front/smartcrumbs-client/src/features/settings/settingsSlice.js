import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { settingsService, SETTING } from '../../services/settingsService';

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchSettings = createAsyncThunk(
  'settings/fetch',
  async ({ token }, { rejectWithValue }) => {
    try {
      const [expiration, promotion] = await Promise.all([
        settingsService.get(token, SETTING.EXPIRATION_DAYS),
        settingsService.get(token, SETTING.PROMOTION_DAYS),
      ]);
      return {
        expirationDays: Number(expiration.value),
        promotionDays:  Number(promotion.value),
      };
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

/** key: 'expirationDays' | 'promotionDays' */
export const saveSetting = createAsyncThunk(
  'settings/save',
  async ({ token, key, value }, { rejectWithValue }) => {
    const name = key === 'expirationDays' ? SETTING.EXPIRATION_DAYS : SETTING.PROMOTION_DAYS;
    try {
      const saved = await settingsService.update(token, name, value);
      return { key, value: Number(saved.value) };
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const settingsSlice = createSlice({
  name: 'settings',
  initialState: {
    expirationDays: null,
    promotionDays:  null,
    status: 'idle',      // idle | loading | succeeded | failed
    error: null,
    savingKey: null,     // ajuste que se está guardando
    savedKey: null,      // último ajuste guardado con éxito
    saveErrorKey: null,  // ajuste cuyo guardado falló
    saveError: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSettings.pending,   (s) => { s.status = 'loading'; s.error = null; })
      .addCase(fetchSettings.fulfilled, (s, a) => { s.status = 'succeeded'; Object.assign(s, a.payload); })
      .addCase(fetchSettings.rejected,  (s, a) => { s.status = 'failed'; s.error = a.payload; });

    builder
      .addCase(saveSetting.pending, (s, a) => {
        s.savingKey = a.meta.arg.key; s.savedKey = null; s.saveErrorKey = null; s.saveError = null;
      })
      .addCase(saveSetting.fulfilled, (s, a) => {
        s.savingKey = null; s.savedKey = a.payload.key; s[a.payload.key] = a.payload.value;
      })
      .addCase(saveSetting.rejected, (s, a) => {
        s.saveErrorKey = a.meta.arg.key; s.saveError = a.payload; s.savingKey = null;
      });
  },
});

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectSettings       = (s) => s.settings;
export const selectSettingsStatus = (s) => s.settings.status;

export default settingsSlice.reducer;
