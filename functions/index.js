const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
admin.initializeApp();

// FIX SEC-02: FALLBACK_ADMIN_UID removed. All admin checks now rely solely on
// Custom Claims (token.admin === true). Grant claims via Admin Panel → Users → Grant Admin.

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

const INVALID_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

const getUserPushTargets = async (userRef) => {
  const [userSnap, tokenSnap] = await Promise.all([
    userRef.get(),
    userRef.collection("pushTokens").get(),
  ]);

  if (!userSnap.exists) return null;

  const targets = tokenSnap.docs
    .map((snapshot) => ({ token: snapshot.data().token, ref: snapshot.ref }))
    .filter(({ token }) => Boolean(token));
  const legacyToken = userSnap.data().fcmToken;
  if (legacyToken) targets.push({ token: legacyToken, legacyUserRef: userRef });

  const deduplicated = new Map();
  targets.forEach((target) => {
    if (!deduplicated.has(target.token)) deduplicated.set(target.token, target);
  });
  return [...deduplicated.values()];
};

const clearUserPushTargets = async (userRef) => {
  const tokenSnap = await userRef.collection("pushTokens").get();
  const batch = admin.firestore().batch();
  tokenSnap.docs.forEach((snapshot) => batch.delete(snapshot.ref));
  batch.update(userRef, { fcmToken: admin.firestore.FieldValue.delete() });
  await batch.commit();
};

const removeInvalidTargets = async (targets, response) => {
  await Promise.all(response.responses.map(async (result, index) => {
    if (result.success || !INVALID_TOKEN_CODES.has(result.error?.code)) return;
    const target = targets[index];
    if (target.ref) await target.ref.delete().catch(() => {});
    if (target.legacyUserRef) {
      await target.legacyUserRef.update({
        fcmToken: admin.firestore.FieldValue.delete(),
      }).catch(() => {});
    }
  }));
};

const buildMulticastPayload = ({ tokens, title, body, targetUrl, data, tag }) => ({
  tokens,
  notification: { title, body },
  android: {
    priority: "high",
    notification: { channelId: "paymatrix_activity", tag },
  },
  webpush: {
    notification: {
      icon: "/logo.png",
      badge: "/logo.png",
      tag,
      renotify: true,
    },
    fcmOptions: { link: targetUrl },
  },
  data: { url: targetUrl, ...data },
});

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
    const targets = await getUserPushTargets(userRef);

    if (!targets) {
      console.warn(`[PUSH_SKIP] User document not found for uid: ${to}`);
      return;
    }
    if (!targets.length) return;

    const targetUrl = getNavigationUrl(type, groupId);
    const title     = NOTIFICATION_TITLES[type] || "PayMatrix";

    const fcmPayload = buildMulticastPayload({
      tokens: targets.map(({ token }) => token),
      title,
      body: message,
      targetUrl,
      tag: event.params.notificationId,
      data: {
        type:           type           || "info",
        notificationId: event.params.notificationId,
        groupId:        groupId        || "",
        relatedId:      relatedId      || "",
      },
    });

    try {
      const response = await admin.messaging().sendEachForMulticast(fcmPayload);
      await removeInvalidTargets(targets, response);
      console.log(`[PUSH_SENT] ${type} → ${to} | sent=${response.successCount} failed=${response.failureCount}`);
    } catch (error) {
      console.error(`[PUSH_FAILED] Could not send to ${to}:`, error.message);
    }
  }
);



// ─── Admin: Manage User (suspend/enable/clearFcm/grantAdmin/revokeAdmin) ──────

exports.adminManageUser = onCall(
  { memory: "128MiB" },
  async (request) => {
    if (!request.auth?.token?.admin) {
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
        await clearUserPushTargets(db.doc(`users/${uid}`));
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
    if (!request.auth?.token?.admin) {
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
    if (!request.auth?.token?.admin) {
      throw new HttpsError("permission-denied", "Admin access required.");
    }

    const { title, body, url, targetUid } = request.data || {};
    if (!title || !body) throw new HttpsError("invalid-argument", "title and body are required.");

    const db        = admin.firestore();
    const messaging = admin.messaging();

    let targets        = [];
    let recipientCount = 0;

    if (targetUid) {
      targets = await getUserPushTargets(db.doc(`users/${targetUid}`));
      if (!targets) throw new HttpsError("not-found", "User not found.");
      recipientCount = 1;
    } else {
      const [tokenSnap, usersSnap] = await Promise.all([
        db.collectionGroup("pushTokens").get(),
        db.collection("users")
        .where("fcmToken", "!=", null)
        .select("fcmToken")
        .get(),
      ]);
      const candidates = [
        ...tokenSnap.docs.map((snapshot) => ({ token: snapshot.data().token, ref: snapshot.ref })),
        ...usersSnap.docs.map((snapshot) => ({
          token: snapshot.data().fcmToken,
          legacyUserRef: snapshot.ref,
        })),
      ].filter(({ token }) => Boolean(token));
      const byToken = new Map();
      candidates.forEach((target) => {
        if (!byToken.has(target.token)) byToken.set(target.token, target);
      });
      targets = [...byToken.values()];
      recipientCount = targets.length;
    }

    let sent   = 0;
    let failed = 0;
    const BATCH = 500;

    for (let i = 0; i < targets.length; i += BATCH) {
      const targetBatch = targets.slice(i, i + BATCH);
      const response = await messaging.sendEachForMulticast(buildMulticastPayload({
        tokens: targetBatch.map(({ token }) => token),
        title,
        body,
        targetUrl: url || "/dashboard",
        tag: "admin_broadcast",
        data: { type: "admin_broadcast" },
      }));
      await removeInvalidTargets(targetBatch, response);
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

// ─── Create Cross-User Notification ──────────────────────────────────────────
//
// Firestore rules block client-side writes to notifications/{id} when
// `to !== request.auth.uid`. Any time one user needs to notify another (e.g.
// expense added, settlement created, friend request accepted), the client calls
// this function instead of writing to Firestore directly.
//
// The function validates that the caller is a legitimate member of any related
// group before creating the notification, preventing notification spam.

exports.createCrossUserNotification = onCall(
  { memory: "128MiB" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in.");
    }

    const { to, type, relatedId, groupId } = request.data || {};
    if (!to || !type) {
      throw new HttpsError("invalid-argument", "'to' and 'type' are required.");
    }

    const db  = admin.firestore();
    const uid = request.auth.uid;

    const allowedTypes = new Set(["expense_added", "settlement_received", "friend_request", "friend_accepted"]);
    if (!allowedTypes.has(type)) {
      throw new HttpsError("invalid-argument", "Unsupported notification type.");
    }

    let safeMessage;
    const actorProfile = await db.doc(`publicProfiles/${uid}`).get();
    const actorName = String(actorProfile.data()?.name || "A PayMatrix member").slice(0, 50);

    if (type === "expense_added" || type === "settlement_received") {
      if (!groupId || !relatedId) {
        throw new HttpsError("invalid-argument", "Related group and record are required.");
      }
      const groupSnap = await db.doc(`groups/${groupId}`).get();
      if (!groupSnap.exists) {
        throw new HttpsError("not-found", "Related group not found.");
      }
      const members = groupSnap.data().members || [];
      if (!members.includes(uid)) {
        throw new HttpsError("permission-denied", "Caller is not a member of the related group.");
      }
      if (!members.includes(to)) {
        throw new HttpsError("permission-denied", "Recipient is not a member of the related group.");
      }

      if (type === "expense_added") {
        const expenseSnap = await db.doc(`groups/${groupId}/expenses/${relatedId}`).get();
        const expense = expenseSnap.data();
        if (!expenseSnap.exists || expense.paidBy !== uid || !(expense.participants || []).includes(to)) {
          throw new HttpsError("permission-denied", "Expense notification does not match the ledger.");
        }
        safeMessage = `${actorName} added an expense in ${String(groupSnap.data().name || "your group").slice(0, 100)}.`;
      } else {
        const settlementSnap = await db.doc(`groups/${groupId}/settlements/${relatedId}`).get();
        const settlement = settlementSnap.data();
        if (!settlementSnap.exists || settlement.payer !== uid || settlement.payee !== to || settlement.confirmationStatus !== "confirmed") {
          throw new HttpsError("permission-denied", "Settlement notification does not match the ledger.");
        }
        safeMessage = `${actorName} recorded a payer-confirmed settlement in ${String(groupSnap.data().name || "your group").slice(0, 100)}.`;
      }
    } else if (type === "friend_request") {
      const friendRequest = await db.doc(`friendRequests/${uid}_${to}`).get();
      if (!friendRequest.exists || friendRequest.data().status !== "pending") {
        throw new HttpsError("permission-denied", "No matching pending friend request.");
      }
      safeMessage = `${actorName} sent you a friend request.`;
    } else {
      const friendRequest = await db.doc(`friendRequests/${to}_${uid}`).get();
      if (!friendRequest.exists || friendRequest.data().status !== "accepted") {
        throw new HttpsError("permission-denied", "No matching accepted friend request.");
      }
      safeMessage = `${actorName} accepted your friend request.`;
    }

    // Verify the recipient exists
    const recipientSnap = await db.doc(`users/${to}`).get();
    if (!recipientSnap.exists) {
      throw new HttpsError("not-found", "Recipient user not found.");
    }

    await db.collection("notifications").add({
      to,
      message: safeMessage,
      type,
      relatedId: relatedId || null,
      groupId:   groupId   || null,
      read:      false,
      createdAt: new Date().toISOString(),
      createdBy: uid,
    });

    console.log(`[NOTIF_CREATED] type=${type} to=${to} by=${uid}`);
    return { success: true };
  }
);

// ─── Admin: List Groups with Pagination ──────────────────────────────────────

exports.adminListGroups = onCall(
  { memory: "256MiB" },
  async (request) => {
    if (!request.auth?.token?.admin) {
      throw new HttpsError("permission-denied", "Admin access required.");
    }

    const { pageSize = 20, startAfterId } = request.data || {};
    const db = admin.firestore();

    let q = db.collection("groups").orderBy("createdAt", "desc").limit(pageSize);

    if (startAfterId) {
      const startAfterSnap = await db.collection("groups").doc(startAfterId).get();
      if (startAfterSnap.exists) {
        q = q.startAfter(startAfterSnap);
      }
    }

    const snap = await q.get();
    const groups = snap.docs.map((d) => ({ _id: d.id, ...d.data() }));
    const lastDocId = groups[groups.length - 1]?._id || null;
    const hasMore = groups.length === pageSize;

    return { groups, lastDocId, hasMore };
  }
);

// ─── Admin: Get Group Details (Group, Expenses, Settlements) ────────────────

exports.adminGetGroupDetails = onCall(
  { memory: "256MiB" },
  async (request) => {
    if (!request.auth?.token?.admin) {
      throw new HttpsError("permission-denied", "Admin access required.");
    }

    const { groupId } = request.data || {};
    if (!groupId) throw new HttpsError("invalid-argument", "groupId is required.");

    const db = admin.firestore();

    const [groupSnap, expensesSnap, settlementsSnap] = await Promise.all([
      db.collection("groups").doc(groupId).get(),
      db.collection(`groups/${groupId}/expenses`).orderBy("createdAt", "desc").limit(20).get(),
      db.collection(`groups/${groupId}/settlements`).orderBy("createdAt", "desc").limit(20).get(),
    ]);

    return {
      group: groupSnap.exists ? { _id: groupSnap.id, ...groupSnap.data() } : null,
      expenses: expensesSnap.docs.map((d) => ({ _id: d.id, ...d.data() })),
      settlements: settlementsSnap.docs.map((d) => ({ _id: d.id, ...d.data() })),
    };
  }
);

// ─── Admin: Archive Group ───────────────────────────────────────────────────

exports.adminArchiveGroup = onCall(
  { memory: "128MiB" },
  async (request) => {
    if (!request.auth?.token?.admin) {
      throw new HttpsError("permission-denied", "Admin access required.");
    }

    const { groupId } = request.data || {};
    if (!groupId) throw new HttpsError("invalid-argument", "groupId is required.");

    const db = admin.firestore();
    await db.collection("groups").doc(groupId).update({
      status: "archived",
      archivedAt: new Date().toISOString()
    });

    return { success: true };
  }
);

// ─── Admin: Delete Group ─────────────────────────────────────────────────────

exports.adminDeleteGroup = onCall(
  { memory: "128MiB" },
  async (request) => {
    if (!request.auth?.token?.admin) {
      throw new HttpsError("permission-denied", "Admin access required.");
    }

    const { groupId } = request.data || {};
    if (!groupId) throw new HttpsError("invalid-argument", "groupId is required.");

    const db = admin.firestore();
    await db.collection("groups").doc(groupId).update({
      status: "deleted",
      deletedAt: new Date().toISOString()
    });

    return { success: true };
  }
);
