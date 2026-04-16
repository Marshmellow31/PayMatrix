/**
 * PayMatrix — Firebase Cloud Functions
 * 
 * Trigger: Fires on every new document created in `notifications/{id}`
 * (these are written by `notificationHelper.js` on the frontend for every
 * expense_added, settlement_received, friend_request, etc.)
 * 
 * It reads the recipient's FCM token from their user document and sends
 * a native OS push notification via Firebase Cloud Messaging.
 */

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

// Map notification types to meaningful titles
const NOTIFICATION_TITLES = {
  expense_added:      "💸 New Expense",
  settlement_received: "✅ Payment Received",
  settlement_deleted:  "❌ Settlement Removed",
  friend_request:     "👋 Friend Request",
  friend_accepted:    "🤝 Now Connected",
};

// Map notification types to the correct in-app route
const getNavigationUrl = (type, groupId) => {
  if (type === "expense_added" && groupId)      return `/groups/${groupId}`;
  if (type === "settlement_received" && groupId) return `/groups/${groupId}`;
  if (type === "settlement_deleted" && groupId)  return `/groups/${groupId}`;
  if (type === "friend_request")                 return "/friends";
  if (type === "friend_accepted")                return "/friends";
  return "/dashboard";
};

exports.sendPushOnNotification = onDocumentCreated(
  "notifications/{notificationId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const { to, message, type, relatedId, groupId } = snap.data();

    // Guard: recipient UID and message are required
    if (!to || !message) {
      console.warn("[PUSH_SKIP] Missing 'to' or 'message' field — skipping.");
      return;
    }

    // Fetch the recipient's FCM token from their user document
    const userRef = admin.firestore().doc(`users/${to}`);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      console.warn(`[PUSH_SKIP] User document not found for uid: ${to}`);
      return;
    }

    const fcmToken = userSnap.data().fcmToken;
    if (!fcmToken) {
      // Normal case — user hasn't granted push permission yet
      return;
    }

    const targetUrl  = getNavigationUrl(type, groupId);
    const title      = NOTIFICATION_TITLES[type] || "PayMatrix";

    const fcmPayload = {
      token: fcmToken,
      notification: {
        title,
        body: message,
      },
      webpush: {
        notification: {
          icon:     "/logo.png",
          badge:    "/logo.png",
          tag:      event.params.notificationId, // deduplicate identical pushes
          renotify: true,
        },
        fcmOptions: {
          // Opens the correct section directly when the user taps the notification
          link: targetUrl,
        },
      },
      // Raw data is also available to the SW push handler for custom routing
      data: {
        url:            targetUrl,
        type:           type           || "info",
        notificationId: event.params.notificationId,
        groupId:        groupId        || "",
        relatedId:      relatedId      || "",
      },
    };

    try {
      const response = await admin.messaging().send(fcmPayload);
      console.log(`[PUSH_SENT] ${type} → ${to} | messageId: ${response}`);
    } catch (error) {
      // Token is no longer valid — remove it to stop sending dead pushes
      if (
        error.code === "messaging/registration-token-not-registered" ||
        error.code === "messaging/invalid-registration-token"
      ) {
        console.log(`[TOKEN_CLEANUP] Stale FCM token for user ${to} — removing.`);
        await userRef.update({ fcmToken: admin.firestore.FieldValue.delete() }).catch(() => {});
      } else {
        console.error(`[PUSH_FAILED] Could not send to ${to}:`, error.message);
      }
    }
  }
);
