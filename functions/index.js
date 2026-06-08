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
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

admin.initializeApp();

// Gemini API key — stored as a Functions secret, never shipped to the client.
// Set with: firebase functions:secrets:set GEMINI_API_KEY
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

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

/**
 * scanBill — Gemini Vision receipt parser (callable).
 *
 * The client sends a base64 image; this function asks Gemini 2.5 Flash to return
 * structured JSON (total, merchant, date, category, line items). The API key stays
 * server-side as a secret, so it is never exposed in the frontend bundle.
 *
 * The image is forwarded to Google for analysis but is NOT persisted anywhere.
 */
const EXPENSE_CATEGORIES = [
  "Food", "Travel", "Rent", "Entertainment",
  "Utilities", "Shopping", "Health", "Education", "Other",
];

const GEMINI_MODEL = "gemini-3.5-flash";

const RECEIPT_SCHEMA = {
  type: "OBJECT",
  properties: {
    amount: { type: "NUMBER", description: "Final grand total actually payable, including tax and charges" },
    title: { type: "STRING", description: "Short merchant/store name" },
    date: { type: "STRING", description: "Bill date as YYYY-MM-DD, or empty if not found" },
    category: { type: "STRING", enum: EXPENSE_CATEGORIES },
    items: {
      type: "ARRAY",
      description: "Individual ordered items with their line price. Exclude tax/subtotal/total/discount rows.",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          price: { type: "NUMBER" },
        },
        required: ["name", "price"],
      },
    },
  },
  required: ["amount", "items"],
};

const PROMPT = [
  "You are a precise receipt/bill parser for an Indian expense-splitting app.",
  "Read the attached bill image and extract:",
  "- amount: the FINAL grand total payable (the amount the customer actually pays, including GST/taxes/service charges). Not the subtotal.",
  "- title: a short merchant or store name (e.g. 'Pizza Hut', 'More Supermarket').",
  "- date: the bill date in YYYY-MM-DD. If absent, return an empty string.",
  "- category: the single best fit from the allowed list.",
  "- items: each ordered line item with its printed price. Combine quantity into the name (e.g. 'Coke x2'). Do NOT include tax, subtotal, total, discount, or rounding rows as items.",
  "All amounts are in Indian Rupees as plain numbers (no symbols). If the image is unreadable, return amount 0 and an empty items array.",
].join("\n");

exports.scanBill = onCall(
  { secrets: [GEMINI_API_KEY], timeoutSeconds: 60, memory: "256MiB" },
  async (request) => {
    // Require an authenticated user
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in to scan bills.");
    }

    const { imageBase64, mimeType } = request.data || {};
    if (!imageBase64 || typeof imageBase64 !== "string") {
      throw new HttpsError("invalid-argument", "imageBase64 is required.");
    }
    // Guard against oversized payloads (~7MB of base64 ≈ 5MB image)
    if (imageBase64.length > 7_000_000) {
      throw new HttpsError("invalid-argument", "Image is too large. Use a smaller photo.");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY.value()}`;

    const body = {
      contents: [{
        role: "user",
        parts: [
          { text: PROMPT },
          { inlineData: { mimeType: mimeType || "image/jpeg", data: imageBase64 } },
        ],
      }],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: RECEIPT_SCHEMA,
      },
    };

    let resp;
    try {
      resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (err) {
      console.error("[SCAN_BILL] Network error calling Gemini:", err.message);
      throw new HttpsError("unavailable", "Could not reach the scanning service.");
    }

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      console.error(`[SCAN_BILL] Gemini ${resp.status}:`, errText.slice(0, 500));
      throw new HttpsError("internal", "Scanning failed. Please try again.");
    }

    const payload = await resp.json();
    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error("[SCAN_BILL] Empty Gemini response:", JSON.stringify(payload).slice(0, 500));
      throw new HttpsError("internal", "Couldn't read the bill.");
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error("[SCAN_BILL] Non-JSON Gemini text:", text.slice(0, 300));
      throw new HttpsError("internal", "Couldn't read the bill.");
    }

    // Normalise before returning to the client
    const category = EXPENSE_CATEGORIES.includes(parsed.category) ? parsed.category : "Other";
    const items = Array.isArray(parsed.items)
      ? parsed.items
          .map((it) => ({ name: String(it?.name || "").trim(), price: Number(it?.price) || 0 }))
          .filter((it) => it.name && it.price > 0)
      : [];

    return {
      amount: Number(parsed.amount) > 0 ? Number(parsed.amount) : null,
      title: String(parsed.title || "").trim(),
      date: /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : null,
      category,
      items,
    };
  }
);
