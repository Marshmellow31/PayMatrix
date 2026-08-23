import { waitForPendingWrites } from 'firebase/firestore';
import { auth, db } from '../config/firebase.js';

const listeners = new Set();
let state = { pending: 0, lastSyncedAt: null, error: null };

const emit = () => listeners.forEach((listener) => listener(state));

const storageKey = () => `paymatrix_outbox_${auth.currentUser?.uid || 'anonymous'}`;

const persist = () => {
  try {
    if (state.pending > 0) {
      localStorage.setItem(
        storageKey(),
        JSON.stringify({ pending: state.pending, updatedAt: Date.now() })
      );
    } else {
      localStorage.removeItem(storageKey());
    }
  } catch {
    // The Firestore IndexedDB queue remains authoritative when storage is unavailable.
  }
};

const syncTracker = {
  getSnapshot: () => state,

  subscribe: (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  trackPendingWrites: () => {
    state = { ...state, pending: state.pending + 1, error: null };
    persist();
    emit();

    waitForPendingWrites(db)
      .then(() => {
        state = { pending: 0, lastSyncedAt: Date.now(), error: null };
        persist();
        emit();
      })
      .catch((error) => {
        state = { ...state, error: error?.message || 'Sync failed' };
        persist();
        emit();
      });
  },

  clear: () => {
    state = { pending: 0, lastSyncedAt: null, error: null };
    persist();
    emit();
  },
};

export default syncTracker;
