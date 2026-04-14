/**
 * usePushNotifications Hook
 *
 * Initiates FCM setup after the user logs in:
 *  - Silently requests notification permission on first run
 *  - Saves the FCM token to Firestore (used by Cloud Functions to target pushes)
 *  - Shows a toast for FCM messages received while the app is in focus (foreground)
 *
 * This is a "fire and forget" progressive enhancement — failures are caught
 * internally and will never crash the app or block the user.
 */

import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import fcmService from '../services/fcmService.js';

export const usePushNotifications = () => {
  const { user } = useSelector((state) => state.auth);
  // Track initialization so we only run once per login session
  const initialized = useRef(false);

  useEffect(() => {
    // Only run when user is logged in and this hasn't been initialized yet
    if (!user?._id || initialized.current) return;
    if (!fcmService.isSupported()) return;

    initialized.current = true;

    // Silently attempt to get/refresh token.
    // Will prompt for permission if not previously granted.
    fcmService.requestPermissionAndGetToken().catch(() => {
      // Suppress — permission denial or unsupported browser is acceptable
    });

    // Listen for messages while the app tab is open (foreground).
    // Background messages are handled directly by the service worker.
    const unsubscribe = fcmService.onForegroundMessage((payload) => {
      const notification = payload.notification || {};
      const title = notification.title || 'PayMatrix';
      const body  = notification.body  || '';

      // Show an in-app toast so the user doesn't miss the event
      toast(
        (t) => (
          `${title}${body ? ': ' + body : ''}`
        ),
        {
          icon: '🔔',
          duration: 5000,
          style: {
            background: '#1c1c1c',
            color:      '#e5e2e1',
            border:     '1px solid rgba(255, 255, 255, 0.08)',
            fontSize:   '0.875rem',
          },
        }
      );
    });

    // Clean up foreground listener on logout (user state becomes null)
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      initialized.current = false;
    };
  }, [user?._id]);
};
