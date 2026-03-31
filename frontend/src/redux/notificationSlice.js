import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api.js';

const initialState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
};

import { fetchWithCache } from '../utils/fetchWithCache.js';

export const fetchNotifications = createAsyncThunk('notifications/fetchAll', async (_, thunkAPI) => {
  return fetchWithCache(
    '/notifications',
    thunkAPI,
    () => api.get('/notifications')
  );
});

export const markAsRead = createAsyncThunk('notifications/markRead', async (id, thunkAPI) => {
  try {
    await api.put(`/notifications/${id}/read`);
    return id;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed');
  }
});

export const markAllRead = createAsyncThunk('notifications/markAllRead', async (_, thunkAPI) => {
  try {
    await api.put('/notifications/read-all');
    return true;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed');
  }
});

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => { state.loading = true; })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload.notifications;
        state.unreadCount = action.payload.unreadCount;
      })
      .addCase(fetchNotifications.rejected, (state) => { state.loading = false; })
      .addCase(markAsRead.fulfilled, (state, action) => {
        const notif = state.notifications.find((n) => n._id === action.payload);
        if (notif && !notif.read) {
          notif.read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markAllRead.fulfilled, (state) => {
        state.notifications.forEach((n) => { n.read = true; });
        state.unreadCount = 0;
      });
  },
});

export default notificationSlice.reducer;
