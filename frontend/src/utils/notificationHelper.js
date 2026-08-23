import { db, auth } from '../config/firebase.js';
import { collection, addDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';

const crossUserMessages = {
  expense_added: 'A group member added an expense.',
  settlement_received: 'A group member recorded a payer-confirmed settlement.',
  friend_request: 'A PayMatrix member sent you a friend request.',
  friend_accepted: 'A PayMatrix member accepted your friend request.',
};

/**
 * Creates a notification for a user.
 *
 * Self-notifications are limited to the current user.
 * Cross-user notifications use deterministic IDs, fixed non-user-controlled
 * copy, and Firestore rules that verify the related friend request or group
 * ledger record. This keeps the feature available on Firebase Spark without
 * allowing arbitrary notification phishing or duplicate-event spam.
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
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
      });
    } else {
      const fixedMessage = crossUserMessages[type];
      if (!fixedMessage) return;

      const relationId =
        relatedId ||
        (type === 'friend_request'
          ? `${currentUser.uid}_${to}`
          : type === 'friend_accepted'
            ? `${to}_${currentUser.uid}`
            : null);
      if (!relationId) return;

      const notificationId =
        type === 'friend_request' || type === 'friend_accepted'
          ? `${type}_${relationId}`
          : `${type}_${relationId}_${to}`;

      await setDoc(doc(db, 'notifications', notificationId), {
        to,
        message: fixedMessage,
        type,
        relatedId,
        groupId,
        read: false,
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
      });
    }
  } catch (error) {
    // Non-fatal — notification failure should not surface to the user
    console.error('[notificationHelper] createNotification failed:', error);
  }
};
