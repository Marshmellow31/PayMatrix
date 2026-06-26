const express = require('express');
const fs = require('fs');
const path = require('path');

// Load environment variables from frontend/.env
const envPath = path.join(__dirname, '../frontend/.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      // Remove surrounding quotes if they exist
      if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value;
    }
  });
}

const app = express();
app.use(express.json({ limit: '10mb' }));

const GEMINI_MODEL = "gemini-3.1-flash-lite";

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

app.post('/api/scan-bill', async (req, res) => {
  const { imageBase64, mimeType = "image/jpeg" } = req.body || {};
  if (!imageBase64) {
    return res.status(400).json({ error: "imageBase64 is required." });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[dev-server] GEMINI_API_KEY or VITE_GEMINI_API_KEY environment variable not set.");
    return res.status(500).json({ error: "AI service is not configured." });
  }

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

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("[dev-server] scanBill failed:", err);
    return res.status(500).json({ error: err.message || "Bill scanning failed." });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`[dev-server] Local API server listening on port ${PORT}`);
});
