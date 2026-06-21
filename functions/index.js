const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

// Set this to your Firebase User UID to bypass custom claims complexity
const FALLBACK_ADMIN_UID = "eidrZjV5Nwcq6iY5Gp51L4KZLHs2";

const NOTIFICATION_TITLES = {
  expense_added:       "💸 New Expense",
  settlement_received: "✅ Payment Received",
  settlement_deleted:  "❌ Settlement Removed",
  friend_request:      "👋 Friend Request",
  friend_accepted:     "🤝 Now Connected",
};

const getNavigationUrl = (type, groupId) => {
  if (type === "expense_added" && groupId)       return `/groups/${groupId}`;
  if (type === "settlement_received" && groupId)  return `/groups/${groupId}`;
  if (type === "settlement_deleted" && groupId)   return `/groups/${groupId}`;
  if (type === "friend_request")                  return "/friends";
  if (type === "friend_accepted")                 return "/friends";
  return "/dashboard";
};

exports.sendPushOnNotification = onDocumentCreated(
  "notifications/{notificationId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const { to, message, type, relatedId, groupId } = snap.data();

    if (!to || !message) {
      console.warn("[PUSH_SKIP] Missing 'to' or 'message' field — skipping.");
      return;
    }

    const userRef = admin.firestore().doc(`users/${to}`);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      console.warn(`[PUSH_SKIP] User document not found for uid: ${to}`);
      return;
    }

    const fcmToken = userSnap.data().fcmToken;
    if (!fcmToken) return;

    const targetUrl = getNavigationUrl(type, groupId);
    const title     = NOTIFICATION_TITLES[type] || "PayMatrix";

    const fcmPayload = {
      token: fcmToken,
      notification: { title, body: message },
      webpush: {
        notification: {
          icon:     "/logo.png",
          badge:    "/logo.png",
          tag:      event.params.notificationId,
          renotify: true,
        },
        fcmOptions: { link: targetUrl },
      },
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



// ─── Admin: Manage User (suspend/enable/clearFcm/grantAdmin/revokeAdmin) ──────

exports.adminManageUser = onCall(
  { memory: "128MiB" },
  async (request) => {
    if (!request.auth?.token?.admin && request.auth?.uid !== FALLBACK_ADMIN_UID) {
      throw new HttpsError("permission-denied", "Admin access required.");
    }

    const { uid, action } = request.data || {};
    if (!uid || !action) throw new HttpsError("invalid-argument", "uid and action are required.");

    const db  = admin.firestore();
    const now = new Date().toISOString();

    switch (action) {
      case "disable":
        await admin.auth().updateUser(uid, { disabled: true });
        await db.doc(`users/${uid}`).update({ suspended: true, suspendedAt: now });
        break;
      case "enable":
        await admin.auth().updateUser(uid, { disabled: false });
        await db.doc(`users/${uid}`).update({ suspended: false, suspendedAt: null });
        break;
      case "clearFcm":
        await db.doc(`users/${uid}`).update({ fcmToken: admin.firestore.FieldValue.delete() });
        break;
      case "grantAdmin":
        await admin.auth().setCustomUserClaims(uid, { admin: true });
        break;
      case "revokeAdmin":
        await admin.auth().setCustomUserClaims(uid, { admin: false });
        break;
      default:
        throw new HttpsError("invalid-argument", `Unknown action: ${action}`);
    }

    console.log(`[ADMIN_MANAGE] uid=${uid} action=${action} by=${request.auth.uid}`);
    return { success: true };
  }
);

// ─── Admin: Get Platform Stats ────────────────────────────────────────────────

exports.getAdminStats = onCall(
  { memory: "512MiB", timeoutSeconds: 60 },
  async (request) => {
    if (!request.auth?.token?.admin && request.auth?.uid !== FALLBACK_ADMIN_UID) {
      throw new HttpsError("permission-denied", "Admin access required.");
    }

    const db = admin.firestore();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      usersCount,
      groupsCount,
      notifCount,
      securityCount,
      aiCount,
      newUsers7,
      newUsers30,
      activeGroups,
      recentSecurity,
      recentNotifs,
    ] = await Promise.all([
      db.collection("users").count().get(),
      db.collection("groups").count().get(),
      db.collection("notifications").count().get(),
      db.collection("security_logs").count().get(),
      db.collection("ai_requests").count().get(),
      db.collection("users").where("createdAt", ">=", sevenDaysAgo.toISOString()).count().get(),
      db.collection("users").where("createdAt", ">=", thirtyDaysAgo.toISOString()).count().get(),
      db.collection("groups").where("status", "==", "active").count().get(),
      db.collection("security_logs").where("timestamp", ">=", sevenDaysAgo.toISOString()).count().get(),
      db.collection("notifications").where("createdAt", ">=", thirtyDaysAgo.toISOString()).count().get(),
    ]);

    // User signup trend — one count per day for the last 7 days
    const dailyCounts = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const snap = await db.collection("users")
        .where("createdAt", ">=", dayStart.toISOString())
        .where("createdAt", "<=", dayEnd.toISOString())
        .count().get();

      dailyCounts.push({
        date:  dayStart.toISOString().split("T")[0],
        count: snap.data().count,
      });
    }

    return {
      totalUsers:             usersCount.data().count,
      totalGroups:            groupsCount.data().count,
      activeGroups:           activeGroups.data().count,
      totalNotifications:     notifCount.data().count,
      totalSecurityEvents:    securityCount.data().count,
      totalAiRequests:        aiCount.data().count,
      newUsersLast7Days:      newUsers7.data().count,
      newUsersLast30Days:     newUsers30.data().count,
      recentSecurityEvents:   recentSecurity.data().count,
      recentNotifications:    recentNotifs.data().count,
      signupTrend:            dailyCounts,
    };
  }
);

// ─── Admin: Broadcast Push Notification ──────────────────────────────────────

exports.broadcastNotification = onCall(
  { memory: "512MiB", timeoutSeconds: 120 },
  async (request) => {
    if (!request.auth?.token?.admin && request.auth?.uid !== FALLBACK_ADMIN_UID) {
      throw new HttpsError("permission-denied", "Admin access required.");
    }

    const { title, body, url, targetUid } = request.data || {};
    if (!title || !body) throw new HttpsError("invalid-argument", "title and body are required.");

    const db        = admin.firestore();
    const messaging = admin.messaging();

    let tokens         = [];
    let recipientCount = 0;

    if (targetUid) {
      const userSnap = await db.doc(`users/${targetUid}`).get();
      if (!userSnap.exists) throw new HttpsError("not-found", "User not found.");
      const fcmToken = userSnap.data().fcmToken;
      if (fcmToken) tokens.push(fcmToken);
      recipientCount = 1;
    } else {
      const usersSnap = await db.collection("users")
        .where("fcmToken", "!=", null)
        .select("fcmToken")
        .get();
      tokens         = usersSnap.docs.map((d) => d.data().fcmToken).filter(Boolean);
      recipientCount = tokens.length;
    }

    let sent   = 0;
    let failed = 0;
    const BATCH = 500;

    for (let i = 0; i < tokens.length; i += BATCH) {
      const batch = tokens.slice(i, i + BATCH);
      const response = await messaging.sendEachForMulticast({
        tokens: batch,
        notification: { title, body },
        webpush: {
          notification: { icon: "/logo.png", badge: "/logo.png" },
          fcmOptions:   { link: url || "/dashboard" },
        },
        data: { url: url || "/dashboard", type: "admin_broadcast" },
      });
      sent   += response.successCount;
      failed += response.failureCount;
    }

    await db.collection("admin_notifications").add({
      title,
      body,
      url:            url || "",
      targetUid:      targetUid || null,
      sentBy:         request.auth.uid,
      recipientCount,
      successCount:   sent,
      failureCount:   failed,
      createdAt:      new Date().toISOString(),
    });

    console.log(`[BROADCAST] title="${title}" sent=${sent} failed=${failed} by=${request.auth.uid}`);
    return { sent, failed, recipientCount };
  }
);
