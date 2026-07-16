import { db, auth, functions } from '../config/firebase.js';
import { collection, addDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

/**
 * Creates a notification for a user.
 *
 * Firestore rules (notifications) now allow a client to create a doc ONLY when
 * BOTH `createdBy` and `to` equal the caller's uid — i.e. self-notifications.
 * Cross-user notifications (expense added, settlement, friend request, …) are
 * created through the `createCrossUserNotification` Cloud Function, which runs
 * with admin privileges and validates group membership / recipient existence
 * before writing. This closes the notification phishing/spam vector where any
 * user could previously write a notification targeting anyone else.
 *
 * @param {string} to        - UID of the recipient.
 * @param {string} message   - Notification body.
 * @param {string} type      - 'expense_added' | 'settlement' | 'friend_request' | …
 * @param {string|null} relatedId - ID of the related document.
 * @param {string|null} groupId   - Group ID if applicable.
 */
export const createNotification = async (
  to,
  message,
  type = 'info',
  relatedId = null,
  groupId = null
) => {
  if (!to) return;

  const safeMessage =
    typeof message === 'string' ? message : message?.message || JSON.stringify(message);

  const currentUser = auth.currentUser;
  if (!currentUser) return;

  try {
    if (to === currentUser.uid) {
      // Self / system notification — allowed as a direct client write.
      await addDoc(collection(db, 'notifications'), {
        to,
        message: safeMessage,
        type,
        relatedId,
        groupId,
        read: false,
        createdAt: new Date().toISOString(),
        createdBy: currentUser.uid,
      });
    } else {
      // Cross-user notification — must go through the trusted Cloud Function.
      const createCrossUserNotification = httpsCallable(functions, 'createCrossUserNotification');
      await createCrossUserNotification({
        to,
        message: safeMessage,
        type,
        relatedId,
        groupId,
      });
    }
  } catch (error) {
    // Non-fatal — notification failure should not surface to the user
    console.error('[notificationHelper] createNotification failed:', error);
  }
};
