import { db } from '../config/firebase.js';
import { collection, addDoc } from 'firebase/firestore';

/**
 * Creates a global notification for a specific user.
 * @param {string} to - The UID of the recipient user.
 * @param {string} message - The notification message.
 * @param {string} type - 'expense_added', 'settlement', 'friend_request', etc.
 * @param {string} relatedId - ID of the related object (expense ID, request ID, etc).
 * @param {string} groupId - ID of the group if applicable.
 */
export const createNotification = async (to, message, type = 'info', relatedId = null, groupId = null) => {
  if (!to) return;
  // Defensive check: If message is accidentally an object (e.g. from a legacy bug), 
  // extract its internal message string or stringify it to avoid React "object as child" errors.
  const safeMessage = typeof message === 'string' 
    ? message 
    : (message?.message || JSON.stringify(message));

  try {
    await addDoc(collection(db, 'notifications'), {
      to,
      message: safeMessage,
      type,
      relatedId,
      groupId,
      read: false,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};
