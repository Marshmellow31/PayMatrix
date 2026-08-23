const GEMINI_MODEL = "gemini-3.1-flash-lite";
const ALLOWED_ORIGINS = new Set([
  "https://pay-matrix.vercel.app",
  "https://localhost",
]);
const MAX_IMAGES = 4;
const MAX_TOTAL_BASE64_LENGTH = 12_000_000;
const MAX_SCANS_PER_HOUR = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000;

const setCorsHeaders = (request, response) => {
  const origin = request.headers.origin;
  if (ALLOWED_ORIGINS.has(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
  }
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
};

const verifyFirebaseUser = async (request) => {
  const authorization = request.headers.authorization || "";
  const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!idToken) return null;

  const apiKey = process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) throw new Error("Firebase token verification is not configured.");

  const verifyResponse = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    },
  );
  if (!verifyResponse.ok) return null;

  const payload = await verifyResponse.json();
  const user = payload.users?.[0] || null;
  return user ? { user, idToken } : null;
};

const parseInteger = (field) => Number(field?.integerValue || 0);
const parseTimestamp = (field) => Date.parse(field?.timestampValue || 0);

const consumeScanQuota = async ({ uid, idToken }) => {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('Firebase project ID is not configured.');

  const documentUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/rate_limits/${encodeURIComponent(uid)}`;
  const headers = { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' };
  const currentResponse = await fetch(documentUrl, { headers, signal: AbortSignal.timeout(8000) });
  const now = new Date();
  const nowIso = now.toISOString();

  let count = 1;
  let windowStart = nowIso;
  let precondition = 'currentDocument.exists=false';

  if (currentResponse.ok) {
    const current = await currentResponse.json();
    const currentWindow = parseTimestamp(current.fields?.windowStart);
    const inCurrentWindow = Number.isFinite(currentWindow) && now.getTime() - currentWindow < RATE_WINDOW_MS;
    count = inCurrentWindow ? parseInteger(current.fields?.count) + 1 : 1;
    windowStart = inCurrentWindow ? new Date(currentWindow).toISOString() : nowIso;
    if (count > MAX_SCANS_PER_HOUR) return false;
    precondition = `currentDocument.updateTime=${encodeURIComponent(current.updateTime)}`;
  } else if (currentResponse.status !== 404) {
    throw new Error(`Rate-limit lookup failed (${currentResponse.status}).`);
  }

  const fields = {
    uid: { stringValue: uid },
    count: { integerValue: String(count) },
    windowStart: { timestampValue: windowStart },
    lastRequestAt: { timestampValue: nowIso },
  };
  const writeResponse = await fetch(`${documentUrl}?${precondition}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields }),
    signal: AbortSignal.timeout(8000),
  });
  if (writeResponse.status === 409) return false;
  if (!writeResponse.ok) throw new Error(`Rate-limit update failed (${writeResponse.status}).`);
  return true;
};

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
  "Read the attached bill image(s) and extract:",
  "- amount: the FINAL grand total payable (including GST/taxes/service charges). Not the subtotal.",
  "- title: a short merchant or store name (e.g. 'Pizza Hut', 'More Supermarket').",
  "- date: the bill date in YYYY-MM-DD. If absent, return an empty string.",
  "- category: the single best fit from the allowed list.",
  "- items: each ordered line item with its printed price. Combine quantity into the name. Do NOT include tax, subtotal, total, or discount rows.",
  "",
  "CRITICAL INSTRUCTION:",
  "The attached images may be parts of a single long receipt (they may overlap). Stitch them together logically.",
  "Output a SINGLE unified list of items. DO NOT output duplicate items that appear in the overlapping sections.",
  "",
  "All amounts are in Indian Rupees as plain numbers (no symbols). If the image is unreadable, return amount 0 and an empty items array.",
].join("\n");

export default async function handler(request, response) {
  setCorsHeaders(request, response);
  if (request.method === "OPTIONS") return response.status(204).end();

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const firebaseIdentity = await verifyFirebaseUser(request);
    if (!firebaseIdentity) return response.status(401).json({ error: "Authentication required." });
    const withinQuota = await consumeScanQuota({
      uid: firebaseIdentity.user.localId,
      idToken: firebaseIdentity.idToken,
    });
    if (!withinQuota) {
      return response.status(429).json({ error: `Bill scanning is limited to ${MAX_SCANS_PER_HOUR} requests per hour.` });
    }
  } catch (error) {
    console.error("[scan-bill] auth verification failed:", error.message);
    return response.status(503).json({ error: "Authentication service is unavailable." });
  }

  const { images } = request.body || {};
  if (!Array.isArray(images) || images.length === 0 || images.length > MAX_IMAGES) {
    return response.status(400).json({ error: `Provide between 1 and ${MAX_IMAGES} images.` });
  }

  const totalBase64Length = images.reduce((total, image) => total + (image?.base64?.length || 0), 0);
  const invalidImage = images.some((image) =>
    typeof image?.base64 !== "string" ||
    !["image/jpeg", "image/png", "image/webp"].includes(image?.mimeType || "image/jpeg")
  );
  if (invalidImage || totalBase64Length > MAX_TOTAL_BASE64_LENGTH) {
    return response.status(413).json({ error: "Image payload is invalid or too large." });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[scan-bill] GEMINI_API_KEY environment variable not set.");
    return response.status(500).json({ error: "AI service is not configured." });
  }

  const imageParts = images.map(img => ({
    inlineData: { mimeType: img.mimeType || "image/jpeg", data: img.base64 }
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{
      role: "user",
      parts: [
        { text: RECEIPT_PROMPT },
        ...imageParts,
      ],
    }],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: RECEIPT_SCHEMA,
    },
  };

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25000),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Gemini ${resp.status}: ${text.slice(0, 200)}`);
    }

    const payload = await resp.json();
    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Empty Gemini response");

    const raw = JSON.parse(text);
    const VALID_CATEGORIES = ["Food","Travel","Rent","Entertainment","Utilities","Shopping","Health","Education","Other"];
    
    const parsed = {
      amount: Number(raw.amount) > 0 ? Number(raw.amount) : null,
      title: String(raw.title || "").trim(),
      date: /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : null,
      category: VALID_CATEGORIES.includes(raw.category) ? raw.category : "Other",
      items: Array.isArray(raw.items)
        ? raw.items
            .map(it => ({ name: String(it?.name || "").trim(), price: Number(it?.price) || 0 }))
            .filter(it => it.name && it.price > 0)
        : [],
    };

    return response.status(200).json(parsed);
  } catch (err) {
    console.error("[scan-bill] error:", err);
    return response.status(500).json({ error: "Bill scanning failed. Please try again." });
  }
}
