/* eslint-disable no-console */
/**
 * PayMatrix FCM Service
 *
 * Manages the full FCM token lifecycle:
 *  - Requesting notification permission
 *  - Getting and saving the FCM registration token to Firestore
 *  - Listening for foreground messages
 *  - Cleaning up the token on logout
 */

import { getToken, onMessage, deleteToken as fbDeleteToken } from 'firebase/messaging';
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { messaging, db, auth } from '../config/firebase.js';
import {
  addNativePushReceivedListener,
  deleteNativePushToken,
  isNativeRuntime,
  requestNativePushToken,
} from '#paymatrix-runtime';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
const INSTALLATION_ID_KEY = 'paymatrix_push_installation_id_v1';
const PUSH_OPT_IN_KEY = 'paymatrix_push_opt_in_v1';

const getInstallationId = () => {
  const existing = localStorage.getItem(INSTALLATION_ID_KEY);
  if (existing) return existing;

  const id =
    globalThis.crypto?.randomUUID?.() ||
    `install-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  localStorage.setItem(INSTALLATION_ID_KEY, id);
  return id;
};

const getTokenDocument = (uid) => doc(db, 'users', uid, 'pushTokens', getInstallationId());

const fcmService = {
  isExplicitlyEnabled: () => localStorage.getItem(PUSH_OPT_IN_KEY) === 'true',

  setExplicitlyEnabled: async (enabled) => {
    localStorage.setItem(PUSH_OPT_IN_KEY, enabled ? 'true' : 'false');
    if (enabled) return fcmService.requestPermissionAndGetToken();
    await fcmService.deleteToken();
    return null;
  },
  /**
   * Returns true if this browser supports Web Push / FCM.
   * Gracefully returns false on unsupported browsers.
   */
  isSupported: () => {
    if (isNativeRuntime()) return true;
    return (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window
    );
  },

  /**
   * Requests notification permission then retrieves the FCM token.
   * Saves the token to the authenticated user's Firestore document.
   *
   * @returns {Promise<string|null>} The FCM token, or null on failure/denial.
   */
  requestPermissionAndGetToken: async () => {
    if (!fcmService.isSupported()) {
      console.log('[FCM] Push notifications not supported in this browser.');
      return null;
    }

    if (isNativeRuntime()) {
      const token = await requestNativePushToken();
      if (token) await fcmService.saveTokenToFirestore(token);
      return token;
    }

    // Don't re-prompt if the user has already made a decision
    if (Notification.permission === 'denied') {
      console.log('[FCM] Notification permission previously denied.');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[FCM] Notification permission not granted.');
      return null;
    }

    try {
      // Wait for the service worker registered by vite-plugin-pwa
      const registration = await navigator.serviceWorker.ready;

      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration,
      });

      if (token) {
        await fcmService.saveTokenToFirestore(token);
        console.log('[FCM] Token acquired and saved to Firestore.');
      } else {
        console.warn('[FCM] getToken() returned empty — check VAPID key and SW registration.');
      }

      return token || null;
    } catch (error) {
      // Non-critical: app still works, just without push notifications
      console.error('[FCM] Token acquisition failed:', error.message);
      return null;
    }
  },

  /**
   * Persists one token per browser/app installation so Android, web, and
   * multiple devices can all receive notifications for the same account.
   */
  saveTokenToFirestore: async (token) => {
    const uid = auth.currentUser?.uid;
    if (!uid || !token) return;

    try {
      await setDoc(getTokenDocument(uid), {
        token,
        platform: isNativeRuntime() ? 'android' : 'web',
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('[FCM] Failed to save token to Firestore:', error.message);
    }
  },

  /**
   * Removes the FCM token from both Firebase Messaging and Firestore.
   * Call this on user logout to prevent stale pushes to logged-out devices.
   */
  deleteToken: async () => {
    const uid = auth.currentUser?.uid;
    try {
      if (isNativeRuntime()) await deleteNativePushToken();
      else await fbDeleteToken(messaging);
      if (uid) {
        await deleteDoc(getTokenDocument(uid));
      }
      console.log('[FCM] Token deleted on logout.');
    } catch (error) {
      // Non-fatal — the Cloud Function handles stale tokens anyway
      console.warn('[FCM] Failed to delete token:', error.message);
    }
  },

  /**
   * Registers a listener for FCM messages received while the app is open
   * (foreground messages). Returns the unsubscribe function.
   *
   * @param {function} callback - Called with the FCM message payload object.
   * @returns {function} Unsubscribe function — call on component unmount.
   */
  onForegroundMessage: (callback) => {
    if (isNativeRuntime()) {
      let disposed = false;
      let remove = () => {};
      addNativePushReceivedListener(callback).then((listenerCleanup) => {
        if (disposed) listenerCleanup();
        else remove = listenerCleanup;
      });
      return () => {
        disposed = true;
        remove();
      };
    }
    return onMessage(messaging, callback);
  },
};

export default fcmService;
