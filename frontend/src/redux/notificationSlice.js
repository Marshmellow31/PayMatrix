import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { db } from '../config/firebase.js';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  updateDoc,
  doc,
  writeBatch,
  orderBy,
  limit,
  startAfter,
} from 'firebase/firestore';
import { serializeFirestoreData } from '../utils/firestoreSerialization.js';
import {
  compareCursorRecords,
  deduplicateById,
  PAGE_SIZES,
  getItemId,
  getCreatedAtMillis,
} from '../utils/cursorPagination.js';
import { instrumentation } from '../services/instrumentation.js';

const initialState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  loadingMore: false,
  hasMore: true,
  nextCursor: null,
};

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchAll',
  async (userId, thunkAPI) => {
    try {
      if (!userId) return { notifications: [], unreadCount: 0, hasMore: false };
      const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const q = query(
        collection(db, 'notifications'),
        where('to', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZES.NOTIFICATIONS.initial)
      );
      const snap = await getDocs(q);
      const elapsed = Math.round(
        (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime
      );
      instrumentation.recordRead({
        count: snap.docs.length,
        fromCache: Boolean(snap.metadata?.fromCache),
        latencyMs: elapsed,
        signature: 'notifications:to:initial',
      });

      const notifications = snap.docs.map((d) =>
        serializeFirestoreData({ _id: d.id, ...d.data() })
      );
      const unreadCount = notifications.filter((n) => !n.read).length;
      const lastDoc = snap.docs[snap.docs.length - 1];
      const nextCursor = lastDoc
        ? { id: lastDoc.id, createdAt: getCreatedAtMillis(lastDoc.data()) }
        : null;
      return {
        notifications,
        unreadCount,
        hasMore: snap.docs.length === PAGE_SIZES.NOTIFICATIONS.initial,
        nextCursor,
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message || 'Failed to fetch notifications');
    }
  }
);

export const fetchEarlierNotifications = createAsyncThunk(
  'notifications/fetchEarlier',
  async ({ userId, lastId, pageSize = PAGE_SIZES.NOTIFICATIONS.page }, thunkAPI) => {
    try {
      if (!userId || !lastId) return { notifications: [], hasMore: false, nextCursor: null };
      const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

      const lastDocRef = doc(db, 'notifications', lastId);
      const lastDocSnap = await getDoc(lastDocRef);

      let snap;
      if (lastDocSnap.exists() && lastDocSnap.data()?.createdAt) {
        const q = query(
          collection(db, 'notifications'),
          where('to', '==', userId),
          orderBy('createdAt', 'desc'),
          startAfter(lastDocSnap),
          limit(pageSize)
        );
        snap = await getDocs(q);
      } else {
        // Fallback for continuation past legacy docs or missing createdAt
        const fallbackQ = query(
          collection(db, 'notifications'),
          where('to', '==', userId),
          limit(pageSize)
        );
        snap = await getDocs(fallbackQ);
      }

      const elapsed = Math.round(
        (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime
      );
      instrumentation.recordRead({
        count: snap.docs.length,
        fromCache: Boolean(snap.metadata?.fromCache),
        latencyMs: elapsed,
        signature: 'notifications:to:earlier',
      });

      const fetched = snap.docs.map((d) => serializeFirestoreData({ _id: d.id, ...d.data() }));
      const lastDoc = snap.docs[snap.docs.length - 1];
      const nextCursor = lastDoc
        ? { id: lastDoc.id, createdAt: getCreatedAtMillis(lastDoc.data()) }
        : null;

      return {
        notifications: fetched,
        hasMore: snap.docs.length === pageSize,
        nextCursor,
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message || 'Failed to fetch earlier notifications');
    }
  }
);

export const markAsRead = createAsyncThunk('notifications/markRead', async (id, thunkAPI) => {
  try {
    const docRef = doc(db, 'notifications', id);
    await updateDoc(docRef, { read: true });
    instrumentation.recordWrite({ count: 1, type: 'update', signature: 'notifications:markRead' });
    return id;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message || 'Failed to mark as read');
  }
});

export const markAllRead = createAsyncThunk(
  'notifications/markAllRead',
  async (userId, thunkAPI) => {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('to', '==', userId),
        where('read', '==', false)
      );
      const snap = await getDocs(q);
      if (snap.empty) return true;
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
      await batch.commit();
      instrumentation.recordWrite({
        count: snap.docs.length,
        type: 'batch_update',
        signature: 'notifications:markAllRead',
      });
      return true;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message || 'Failed to mark all as read');
    }
  }
);

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setNotifications: (state, action) => {
      const incoming = Array.isArray(action.payload) ? action.payload : [];
      // Merge incoming recent notifications with any previously paginated older notifications
      const combined = deduplicateById([...incoming, ...state.notifications]);
      combined.sort(compareCursorRecords);
      state.notifications = combined;
      state.unreadCount = incoming.filter((notification) => !notification.read).length;
      state.loading = false;
      if (
        incoming.length < PAGE_SIZES.NOTIFICATIONS.initial &&
        state.notifications.length <= incoming.length
      ) {
        state.hasMore = false;
      }
    },
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
      state.loading = false;
      state.loadingMore = false;
      state.hasMore = true;
      state.nextCursor = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        if (state.notifications.length === 0) state.loading = true;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        const incoming = action.payload.notifications || [];
        const merged = deduplicateById([...incoming, ...state.notifications]);
        merged.sort(compareCursorRecords);
        state.notifications = merged;
        state.unreadCount = action.payload.unreadCount;
        state.hasMore = action.payload.hasMore;
        state.nextCursor = action.payload.nextCursor;
      })
      .addCase(fetchNotifications.rejected, (state) => {
        state.loading = false;
      })
      .addCase(fetchEarlierNotifications.pending, (state) => {
        state.loadingMore = true;
      })
      .addCase(fetchEarlierNotifications.fulfilled, (state, action) => {
        state.loadingMore = false;
        const incoming = action.payload.notifications || [];
        const merged = deduplicateById([...state.notifications, ...incoming]);
        merged.sort(compareCursorRecords);
        state.notifications = merged;
        state.hasMore = action.payload.hasMore;
        state.nextCursor = action.payload.nextCursor;
      })
      .addCase(fetchEarlierNotifications.rejected, (state) => {
        state.loadingMore = false;
      })
      .addCase(markAsRead.fulfilled, (state, action) => {
        const notif = state.notifications.find((n) => getItemId(n) === action.payload);
        if (notif && !notif.read) {
          notif.read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markAllRead.fulfilled, (state) => {
        state.notifications.forEach((n) => {
          n.read = true;
        });
        state.unreadCount = 0;
      });
  },
});

export const { setNotifications, clearNotifications } = notificationSlice.actions;
export default notificationSlice.reducer;
