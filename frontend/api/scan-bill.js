const GEMINI_MODEL = "gemini-3.1-flash-lite";
const ALLOWED_ORIGINS = new Set([
  "https://pay-matrix.vercel.app",
  "https://localhost",
]);
const MAX_IMAGES = 4;
const MAX_TOTAL_BASE64_LENGTH = 12_000_000;

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
  return payload.users?.[0] || null;
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
    const firebaseUser = await verifyFirebaseUser(request);
    if (!firebaseUser) return response.status(401).json({ error: "Authentication required." });
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
