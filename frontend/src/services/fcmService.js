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
import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { messaging, db, auth } from '../config/firebase.js';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

const fcmService = {
  /**
   * Returns true if this browser supports Web Push / FCM.
   * Gracefully returns false on unsupported browsers.
   */
  isSupported: () => {
    return (
      typeof window !== 'undefined' &&
      'Notification'    in window &&
      'serviceWorker'   in navigator &&
      'PushManager'     in window
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
   * Persists the FCM token to `users/{uid}.fcmToken` in Firestore.
   * The Cloud Function reads this field to target the push.
   */
  saveTokenToFirestore: async (token) => {
    const uid = auth.currentUser?.uid;
    if (!uid || !token) return;

    try {
      await updateDoc(doc(db, 'users', uid), { fcmToken: token });
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
      await fbDeleteToken(messaging);
      if (uid) {
        await updateDoc(doc(db, 'users', uid), { fcmToken: deleteField() });
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
    return onMessage(messaging, callback);
  },
};

export default fcmService;
