import { useState, useCallback } from 'react';
import { EXPENSE_CATEGORIES } from '../utils/constants.js';

const VALID_CATEGORIES = EXPENSE_CATEGORIES.map(c => c.value);

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-3.1-flash-lite";

const RECEIPT_SCHEMA = {
  type: "OBJECT",
  properties: {
    amount: { type: "NUMBER", description: "Final grand total actually payable, including tax and charges" },
    title: { type: "STRING", description: "Short merchant/store name" },
    date: { type: "STRING", description: "Bill date as YYYY-MM-DD, or empty if not found" },
    category: { type: "STRING", enum: VALID_CATEGORIES },
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

const loadImage = (file) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = URL.createObjectURL(file);
});

// Downscale + re-encode to JPEG to keep the upload small and fast.
// Returns raw base64 (no data-URL prefix) plus the mime type.
const fileToCompressedBase64 = async (file) => {
  let source;
  try {
    source = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    source = await loadImage(file).catch(() => null);
  }

  // Fallback: send the original file bytes if canvas isn't usable
  if (!source) {
    const buf = await file.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return { base64: btoa(binary), mimeType: file.type || 'image/jpeg' };
  }

  const maxDim = 1600;
  const longest = Math.max(source.width, source.height);
  const factor = longest > maxDim ? maxDim / longest : 1;
  const w = Math.round(source.width * factor);
  const h = Math.round(source.height * factor);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(source, 0, 0, w, h);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  return { base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' };
};

export const useBillScanner = () => {
  const [scanning, setScanning] = useState(false);

  const scanBill = useCallback(async (file) => {
    setScanning(true);
    try {
      const { base64, mimeType } = await fileToCompressedBase64(file);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

      const body = {
        contents: [{
          role: "user",
          parts: [
            { text: PROMPT },
            { inlineData: { mimeType: mimeType || "image/jpeg", data: base64 } },
          ],
        }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: RECEIPT_SCHEMA,
        },
      };

      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        console.error(`[scanBill] Gemini REST Error ${resp.status}:`, errText);
        return null;
      }

      const payload = await resp.json();
      const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        console.error("[scanBill] Empty Gemini response:", payload);
        return null;
      }

      const parsed = JSON.parse(text);

      const amount = Number(parsed.amount) > 0 ? Number(parsed.amount) : null;
      const category = VALID_CATEGORIES.includes(parsed.category) ? parsed.category : 'Other';
      const items = Array.isArray(parsed.items)
        ? parsed.items
            .map(it => ({ name: String(it?.name || '').trim(), price: Number(it?.price) || 0 }))
            .filter(it => it.name && it.price > 0)
        : [];

      return {
        amount,
        candidates: amount != null ? [amount] : [],
        title: String(parsed.title || '').trim(),
        date: /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : null,
        category,
        items,
      };
    } catch (err) {
      console.error('[scanBill] failed:', err?.message || err);
      return null;
    } finally {
      setScanning(false);
    }
  }, []);

  return { scanBill, scanning };
};
