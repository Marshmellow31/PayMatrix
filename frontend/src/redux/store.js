import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice.js';
import groupReducer from './groupSlice.js';
import expenseReducer from './expenseSlice.js';
import notificationReducer from './notificationSlice.js';

const store = configureStore({
  reducer: {
    auth: authReducer,
    groups: groupReducer,
    expenses: expenseReducer,
    notifications: notificationReducer,
  },
});

export default store;
