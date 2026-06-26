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

// ─── Scan Bill with Gemini ────────────────────────────────────────────────────
//
// Moves the Gemini API call server-side so VITE_GEMINI_API_KEY is never
// exposed in the browser bundle. The client sends compressed base64 image
// data; this function calls Gemini and returns the parsed receipt fields.
//
// Required env var: GEMINI_API_KEY
// Set it in Firebase Console → Functions → Configuration, or via:
//   firebase functions:config:set gemini.api_key="YOUR_KEY"
// (The key value is the same as VITE_GEMINI_API_KEY in frontend/.env)

const GEMINI_MODEL = "gemini-2.0-flash-lite";

const RECEIPT_SCHEMA = {
  type: "OBJECT",
  properties: {
    amount:   { type: "NUMBER",  description: "Final grand total actually payable, including tax" },
    title:    { type: "STRING",  description: "Short merchant/store name" },
    date:     { type: "STRING",  description: "Bill date as YYYY-MM-DD, or empty if not found" },
    category: { type: "STRING",  enum: ["Food","Travel","Rent","Entertainment","Utilities","Shopping","Health","Education","Other"] },
    items: {
      type: "ARRAY",
      description: "Individual line items. Exclude tax/subtotal/total rows.",
      items: {
        type: "OBJECT",
        properties: { name: { type: "STRING" }, price: { type: "NUMBER" } },
        required: ["name", "price"],
      },
    },
  },
  required: ["amount", "items"],
};

const RECEIPT_PROMPT = [
  "You are a precise receipt/bill parser for an Indian expense-splitting app.",
  "Read the attached bill image and extract:",
  "- amount: the FINAL grand total payable (including GST/taxes/service charges). Not the subtotal.",
  "- title: a short merchant or store name (e.g. 'Pizza Hut', 'More Supermarket').",
  "- date: the bill date in YYYY-MM-DD. If absent, return an empty string.",
  "- category: the single best fit from the allowed list.",
  "- items: each ordered line item with its printed price. Combine quantity into the name. Do NOT include tax, subtotal, total, or discount rows.",
  "All amounts are in Indian Rupees as plain numbers (no symbols). If the image is unreadable, return amount 0 and an empty items array.",
].join("\n");

exports.scanBillWithGemini = onCall(
  { memory: "256MiB", timeoutSeconds: 30 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in to scan bills.");
    }

    const { imageBase64, mimeType = "image/jpeg" } = request.data || {};
    if (!imageBase64) {
      throw new HttpsError("invalid-argument", "imageBase64 is required.");
    }
    if (imageBase64.length > 2_000_000) { // ~1.5 MB base64 ≈ 1.1 MB binary
      throw new HttpsError("invalid-argument", "Image too large. Please use an image under 1.5 MB.");
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[scanBillWithGemini] GEMINI_API_KEY environment variable not set.");
      throw new HttpsError("internal", "AI service is not configured.");
    }

    const uid      = request.auth.uid;
    const db       = admin.firestore();
    const started  = Date.now();

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
    const body = {
      contents: [{
        role: "user",
        parts: [
          { text: RECEIPT_PROMPT },
          { inlineData: { mimeType, data: imageBase64 } },
        ],
      }],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: RECEIPT_SCHEMA,
      },
    };

    let parsed = null;
    let errorMsg = null;

    try {
      const resp = await fetch(url, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(`Gemini ${resp.status}: ${text.slice(0, 200)}`);
      }

      const payload = await resp.json();
      const text    = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Empty Gemini response");

      const raw = JSON.parse(text);

      const VALID_CATEGORIES = ["Food","Travel","Rent","Entertainment","Utilities","Shopping","Health","Education","Other"];
      parsed = {
        amount:   Number(raw.amount) > 0 ? Number(raw.amount) : null,
        title:    String(raw.title || "").trim(),
        date:     /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : null,
        category: VALID_CATEGORIES.includes(raw.category) ? raw.category : "Other",
        items:    Array.isArray(raw.items)
          ? raw.items
              .map(it => ({ name: String(it?.name || "").trim(), price: Number(it?.price) || 0 }))
              .filter(it => it.name && it.price > 0)
          : [],
      };
    } catch (err) {
      errorMsg = err.message || String(err);
      console.error("[scanBillWithGemini] error:", errorMsg);
    }

    const duration = Date.now() - started;

    // Log result to Firestore (admin write bypasses client rules on ai_requests)
    await db.collection("ai_requests").add({
      uid,
      status:        errorMsg ? "failed" : "passed",
      duration,
      timestamp:     new Date().toISOString(),
      parsedAmount:  parsed?.amount ?? null,
      itemsCount:    parsed?.items?.length ?? 0,
      error:         errorMsg ?? null,
      model:         GEMINI_MODEL,
    }).catch(() => {});

    if (errorMsg) {
      throw new HttpsError("internal", "Bill scanning failed. Please try again.");
    }

    return parsed;
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

    const { to, message, type, relatedId, groupId } = request.data || {};
    if (!to || !message) {
      throw new HttpsError("invalid-argument", "'to' and 'message' are required.");
    }

    const db  = admin.firestore();
    const uid = request.auth.uid;

    // Authorization: if a groupId is provided the caller must be a member
    if (groupId) {
      const groupSnap = await db.doc(`groups/${groupId}`).get();
      if (!groupSnap.exists) {
        throw new HttpsError("not-found", "Related group not found.");
      }
      const members = groupSnap.data().members || [];
      if (!members.includes(uid)) {
        throw new HttpsError("permission-denied", "Caller is not a member of the related group.");
      }
    }

    // Verify the recipient exists
    const recipientSnap = await db.doc(`users/${to}`).get();
    if (!recipientSnap.exists) {
      throw new HttpsError("not-found", "Recipient user not found.");
    }

    await db.collection("notifications").add({
      to,
      message: String(message).slice(0, 500), // cap length
      type:      type      || "info",
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
