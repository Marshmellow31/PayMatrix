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
  try {
    await addDoc(collection(db, 'notifications'), {
      to,
      message,
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
