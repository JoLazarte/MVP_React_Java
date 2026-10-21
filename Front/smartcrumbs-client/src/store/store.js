import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore, persistReducer,
  FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/es/storage';


import authReducer                  from '../features/auth/authSlice';
import categoriesReducer            from '../features/catalog/categoriesSlice';
import productsReducer              from '../features/catalog/productsSlice';
import suppliersReducer             from '../features/catalog/suppliersSlice';
import expirationReducer            from '../features/stock/expirationSlice';
import stockReducer                 from '../features/stock/stockSlice';
import wasteReducer                 from '../features/waste/wasteSlice';
import notificationsReducer         from '../features/notifications/notificationsSlice';
import restockReducer               from '../features/stock/restockSlice';
import promotionsReducer            from '../features/promotions/promotionsSlice';
import autoWasteNotificationReducer from '../features/waste/autoWasteNotificationSlice';
import reportsReducer               from '../features/reports/reportsSlice';
import usersReducer                 from '../features/users/usersSlice';
import movementsReducer             from '../features/movements/movementsSlice';
import alertsReducer                from '../features/alerts/alertsSlice';
import settingsReducer              from '../features/settings/settingsSlice';


const authPersistConfig = {
  key: 'smartcrumbs-auth', storage,
  whitelist: ['token', 'user', 'isAuthenticated'],
};


const categoriesPersistConfig = {
  key: 'smartcrumbs-categories', storage,
  whitelist: ['items'],
};


const productsPersistConfig = {
  key: 'smartcrumbs-products', storage,
  whitelist: ['items'],
};


const suppliersPersistConfig = {
  key: 'smartcrumbs-suppliers', storage,
  whitelist: ['items'],
};


const wastePersistConfig = {
  key: 'smartcrumbs-waste', storage,
  whitelist: ['users'],
};


const notificationsPersistConfig = {
  key: 'smartcrumbs-notifications', storage,
  whitelist: [
    'enabled',
    'channel',
    'intervalMinutes',
    'notifiedBatchIds',
    'permission',
  ],
};


/**
 * autoWasteNotification persiste los lotes auto-descartados del día
 * y si el usuario confirmó el descarte físico.
 * Persiste todo el slice (dateKey, confirmedForDate, batches) para que
 * sobreviva recargas de página durante el mismo día.
 */
const autoWasteNotificationPersistConfig = {
  key: 'smartcrumbs-auto-waste-notification', storage,
  // whitelist vacío = persiste todo el estado del slice
};


//Persistimos solo los rangos de fecha de los reportes (UX convenience)
const reportsPersistConfig = {
  key: 'smartcrumbs-reports', storage,
  whitelist: ['dateRanges'],
};


const appReducer = combineReducers({
  auth:                  persistReducer(authPersistConfig,                  authReducer),
  categories:            persistReducer(categoriesPersistConfig,            categoriesReducer),
  products:              persistReducer(productsPersistConfig,              productsReducer),
  suppliers:             persistReducer(suppliersPersistConfig,             suppliersReducer),
  expiration:            expirationReducer,
  stock:                 stockReducer,
  waste:                 persistReducer(wastePersistConfig,                 wasteReducer),
  notifications:         persistReducer(notificationsPersistConfig,         notificationsReducer),
  restock:               restockReducer,
  promotions:            promotionsReducer,
  autoWasteNotification: persistReducer(autoWasteNotificationPersistConfig, autoWasteNotificationReducer),
  reports:               persistReducer(reportsPersistConfig,               reportsReducer),
  users:                 usersReducer,
  movements:             movementsReducer,
  alerts:                alertsReducer,
  settings:              settingsReducer,
});


const rootReducer = (state, action) => {
  if (action.type === 'auth/logout') {
    // Al cerrar sesión limpiamos todo excepto auth, notifications y
    // autoWasteNotification. Este último se preserva para que, si el
    // usuario cierra sesión sin confirmar el descarte físico, el modal
    // vuelva a aparecer cuando cualquier usuario inicie sesión de nuevo
    // en el mismo día.
    const { auth, notifications, autoWasteNotification } = state;
    return appReducer({ auth, notifications, autoWasteNotification }, action);
  }
  return appReducer(state, action);
};


export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  devTools: import.meta.env.DEV,
});


export const persistor = persistStore(store);
