import { db, auth } from '../config/firebase.js';
import { collection, addDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * Creates a notification for a user.
 *
 * Firestore rule (notifications): clients may only create docs where
 * `to == request.auth.uid`. Cross-user notifications (e.g. expense added
 * by user A, notification for user B) must go through the
 * `createCrossUserNotification` Cloud Function which runs with admin privileges.
 *
 * @param {string} to        - UID of the recipient.
 * @param {string} message   - Notification body.
 * @param {string} type      - 'expense_added' | 'settlement' | 'friend_request' | …
 * @param {string|null} relatedId - ID of the related document.
 * @param {string|null} groupId   - Group ID if applicable.
 */
export const createNotification = async (to, message, type = 'info', relatedId = null, groupId = null) => {
  if (!to) return;

  const safeMessage = typeof message === 'string'
    ? message
    : (message?.message || JSON.stringify(message));

  try {
    const currentUser = auth.currentUser;

    if (currentUser && to === currentUser.uid) {
      // Self-notification: Firestore rules allow this directly
      await addDoc(collection(db, 'notifications'), {
        to,
        message: safeMessage,
        type,
        relatedId,
        groupId,
        read: false,
        createdAt: new Date().toISOString(),
      });
    } else {
      // Cross-user notification: must go through Cloud Function
      // (Firestore rule blocks client writes where to !== auth.uid)
      const functions = getFunctions();
      const createCrossUserNotification = httpsCallable(functions, 'createCrossUserNotification');
      await createCrossUserNotification({ to, message: safeMessage, type, relatedId, groupId });
    }
  } catch (error) {
    // Non-fatal — notification failure should not surface to the user
    console.error('[notificationHelper] createNotification failed:', error);
  }
};
