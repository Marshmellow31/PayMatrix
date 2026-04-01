import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { db } from '../config/firebase.js';
import { 
  collection, query, where, getDocs, updateDoc, doc, writeBatch 
} from 'firebase/firestore';

const initialState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
};

// Note: In a real-time app, we'll call setNotifications from a listener in App.jsx or Dashboard.jsx
export const fetchNotifications = createAsyncThunk('notifications/fetchAll', async (userId, thunkAPI) => {
  try {
    if (!userId) return { notifications: [], unreadCount: 0 };
    const q = query(collection(db, 'notifications'), where('to', '==', userId));
    const snap = await getDocs(q);
    const notifications = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
    const unreadCount = notifications.filter(n => !n.read).length;
    return { notifications, unreadCount };
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message || 'Failed to fetch notifications');
  }
});

export const markAsRead = createAsyncThunk('notifications/markRead', async (id, thunkAPI) => {
  try {
    const docRef = doc(db, 'notifications', id);
    await updateDoc(docRef, { read: true });
    return id;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message || 'Failed to mark as read');
  }
});

export const markAllRead = createAsyncThunk('notifications/markAllRead', async (userId, thunkAPI) => {
  try {
    const q = query(collection(db, 'notifications'), where('to', '==', userId), where('read', '==', false));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.update(d.ref, { read: true }));
    await batch.commit();
    return true;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message || 'Failed to mark all as read');
  }
});

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setNotifications: (state, action) => {
      state.notifications = action.payload;
      state.unreadCount = action.payload.filter(n => !n.read).length;
    }
  },
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
      });
  },
});

export const { setNotifications } = notificationSlice.actions;
export default notificationSlice.reducer;
