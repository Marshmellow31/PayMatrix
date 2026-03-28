import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import groupReducer from './slices/groupSlice';
import expenseReducer from './slices/expenseSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    groups: groupReducer,
    expenses: expenseReducer,
  },
});
