import { db, auth } from '../config/firebase.js';
import { collection, addDoc } from 'firebase/firestore';

/**
 * Creates a notification for a user.
 *
 * Firestore rule (notifications): clients may create docs where
 * `createdBy == request.auth.uid`. Cross-user notifications are written
 * directly from the client, bypassing Cloud Functions.
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

  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // Both self-notifications and cross-user notifications are written directly
    // (Firestore rule allows this if createdBy matches auth.uid)
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
  } catch (error) {
    // Non-fatal — notification failure should not surface to the user
    console.error('[notificationHelper] createNotification failed:', error);
  }
};
