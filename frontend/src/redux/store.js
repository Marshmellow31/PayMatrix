import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import authReducer from './authSlice.js';
import groupReducer from './groupSlice.js';
import expenseReducer from './expenseSlice.js';
import notificationReducer from './notificationSlice.js';

const appReducer = combineReducers({
  auth: authReducer,
  groups: groupReducer,
  expenses: expenseReducer,
  notifications: notificationReducer,
});

const rootReducer = (state, action) => {
  if (action.type === 'auth/logoutUser/fulfilled') return appReducer(undefined, action);
  return appReducer(state, action);
};

const persistConfig = {
  key: 'root',
  version: 1,
  storage,
  // Firebase Auth owns session persistence. User and financial data must never
  // survive an account switch in shared, unpartitioned localStorage.
  whitelist: [],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        warnAfter: 1000,
      },
      immutableCheck: {
        warnAfter: 1000,
      },
    }),
});

export const persistor = persistStore(store);
export default store;
