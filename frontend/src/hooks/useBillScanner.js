import { useState, useCallback } from 'react';

// ─── Category inference ───────────────────────────────────────────────────────
const CATEGORY_MAP = {
  Food: ['restaurant', 'cafe', 'pizza', 'burger', 'hotel', 'dhaba', 'kitchen', 'biryani', 'swiggy', 'zomato', 'bakery', 'chai', 'canteen', 'diner', 'eatery', 'grill', 'mess', 'tiffin', 'barbeque', 'bbq', 'halwai', 'mithai', 'food', 'dosa', 'thali', 'juice'],
  Travel: ['uber', 'ola', 'taxi', 'cab', 'auto', 'petrol', 'fuel', 'parking', 'metro', 'rapido', 'flight', 'airline', 'train', 'irctc', 'bus', 'ferry', 'toll', 'transport', 'travels'],
  Rent: ['rent', 'lease', 'accommodation', 'hostel', 'oyo', 'airbnb', 'paying guest'],
  Entertainment: ['cinema', 'movie', 'pvr', 'inox', 'bowling', 'gaming', 'netflix', 'amusement', 'theatre', 'arcade', 'bookmyshow'],
  Utilities: ['electricity', 'water bill', 'gas', 'internet', 'broadband', 'jio', 'airtel', 'vodafone', 'bsnl', 'recharge', 'telecom'],
  Shopping: ['mall', 'store', 'mart', 'amazon', 'flipkart', 'retail', 'fashion', 'market', 'bazaar', 'boutique', 'myntra', 'reliance', 'dmart', 'supermarket'],
  Health: ['pharmacy', 'medical', 'hospital', 'clinic', 'medicine', 'diagnostic', 'pharma', 'chemist', 'apollo', 'health'],
  Education: ['school', 'college', 'university', 'tutor', 'coaching', 'academy', 'institute', 'stationery'],
};

const inferCategory = (text) => {
  const lower = text.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some(k => lower.includes(k))) return cat;
  }
  return 'Other';
};

// ─── Number parsing (handles Indian "1,23,456.78" / "1,234.50") ───────────────
const parseMoney = (raw) => {
  if (!raw) return null;
  const cleaned = String(raw).replace(/[₹$]|rs\.?|inr/gi, '').trim();
  const m = cleaned.match(/\d[\d,]*(?:\.\d{1,2})?/);
  if (!m) return null;
  const token = m[0];
  const digits = token.replace(/[.,]/g, '');
  const hasDecimal = /\.\d{1,2}$/.test(token);
  // Reject long digit runs without decimals (phone, GSTIN, invoice no, PIN)
  if (!hasDecimal && digits.length >= 6) return null;
  const val = parseFloat(token.replace(/,/g, ''));
  if (isNaN(val) || val <= 0 || val > 1_000_000) return null;
  return val;
};

// All money-like numbers found in a single line of text
const moneyTokensInLine = (line) => {
  const matches = line.match(/(?:₹|rs\.?|inr)?\s*\d[\d,]*(?:\.\d{1,2})?/gi) || [];
  return matches.map(parseMoney).filter(v => v != null);
};

// ─── Date parsing ─────────────────────────────────────────────────────────────
const parseDate = (text) => {
  const dmy = text.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/);
  if (dmy) {
    let [, d, mo, y] = dmy;
    if (y.length === 2) y = '20' + y;
    const date = new Date(+y, +mo - 1, +d);
    if (!isNaN(date.getTime()) && +y > 2000 && +mo <= 12 && +d <= 31)
      return date.toISOString().split('T')[0];
  }
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return iso[0];
  const dMon = text.match(/\b(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,'-]*(\d{2,4})\b/i);
  if (dMon) {
    const months = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
    let [, d, mo, y] = dMon;
    if (y.length === 2) y = '20' + y;
    const date = new Date(+y, months[mo.toLowerCase().slice(0, 3)], +d);
    if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
  }
  return null;
};

// ─── Merchant name ────────────────────────────────────────────────────────────
const extractMerchant = (lines) => {
  const skip = [
    /^\d+$/, /\d{6,}/,
    /^(gst|gstin|cin|www|http|mob|fax|tel|ph|order|invoice|receipt|bill|tax|date|time|table|cash|ref|no\.|thank|welcome)/i,
    /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]/i,
    /^[-=*#_|.]+$/,
    /^\d{1,2}[\/\-.]\d{1,2}/,
  ];
  for (const raw of lines) {
    const t = raw.trim();
    if (t.length < 3 || t.length > 50) continue;
    if (skip.some(p => p.test(t))) continue;
    if (!/[a-zA-Z]{3,}/.test(t)) continue;
    return t.replace(/[^a-zA-Z0-9\s&'.,-]/g, '').replace(/\s+/g, ' ').trim();
  }
  return '';
};

// ─── Line items ───────────────────────────────────────────────────────────────
const STOP_RE = /\b(total|subtotal|sub-total|sub total|gst|cgst|sgst|igst|vat|tax|discount|service|grand|cess|charge|round|change|cash|card|tender|balance|due|payable|qty|rate|amount|amt)\b/i;

// Prefer word-level bounding boxes (rightmost numeric word = price) when available;
// fall back to a whitespace/regex split on the raw line text.
const itemFromLine = (line) => {
  const words = (line.words || []).filter(w => w.text && w.text.trim());
  if (words.length >= 2) {
    for (let i = words.length - 1; i >= 0; i--) {
      const price = parseMoney(words[i].text);
      if (price != null) {
        const name = words.slice(0, i).map(w => w.text).join(' ')
          .replace(/[x*]\s*\d+\s*$/i, '')        // strip trailing "x2"
          .replace(/^\d+\s*[x*]?\s*/, '')         // strip leading qty
          .replace(/[^a-zA-Z0-9\s&'.,()-]/g, '').replace(/\s+/g, ' ').trim();
        if (name.length >= 2) return { name, price };
        return null;
      }
    }
  }
  const m = line.text.match(/^(.+?)[\s.:]{1,}(\d[\d,]*\.?\d{0,2})\s*$/);
  if (m) {
    const price = parseMoney(m[2]);
    const name = m[1].replace(/^\d+\s*[x*]?\s*/, '').replace(/[^a-zA-Z0-9\s&'.,()-]/g, '').trim();
    if (price != null && name.length >= 2) return { name, price };
  }
  return null;
};

const extractItems = (lines) => {
  const items = [];
  for (const line of lines) {
    const t = (line.text || '').trim();
    if (t.length < 4 || STOP_RE.test(t)) continue;
    const item = itemFromLine(line);
    if (item && item.price > 0 && item.price < 50000) items.push(item);
  }
  return items;
};

// ─── Total / amount detection with candidate ranking ──────────────────────────
const HIGH_KEYWORDS = /\b(grand\s*total|total\s*amount|net\s*total|bill\s*total|net\s*amount|amount\s*due|amount\s*payable|total\s*payable|payable\s*amount|net\s*payable|balance\s*due)\b/i;
const TOTAL_KEYWORD = /\btotal\b/i;

const detectAmount = (lines, itemsSum) => {
  const n = lines.length;
  const scored = [];

  lines.forEach((line, idx) => {
    const text = (line.text || line).toString();
    const tokens = moneyTokensInLine(text);
    if (tokens.length === 0) return;
    const value = tokens[tokens.length - 1]; // trailing number = the amount on that line

    let score = 0;
    if (HIGH_KEYWORDS.test(text)) score += 100;
    else if (TOTAL_KEYWORD.test(text)) score += 55;
    // Position: totals live near the bottom
    score += (idx / Math.max(1, n - 1)) * 25;
    // Agreement with summed line items is a strong signal
    if (itemsSum > 0 && Math.abs(value - itemsSum) / itemsSum < 0.4) score += 20;
    // Penalise obviously-small noise
    if (value < 5) score -= 20;

    scored.push({ value, score });
  });

  // Distinct candidate values, highest-scoring instance per value
  const byValue = new Map();
  scored.forEach(({ value, score }) => {
    const key = value.toFixed(2);
    if (!byValue.has(key) || byValue.get(key).score < score) byValue.set(key, { value, score });
  });

  const ranked = [...byValue.values()].sort((a, b) => b.score - a.score);
  if (ranked.length === 0) return { amount: null, candidates: [] };

  const best = ranked[0].value;
  // Candidate chips: the best pick + other plausible distinct values, largest first
  const candidates = [...new Set([best, ...ranked.map(r => r.value).sort((a, b) => b - a)])].slice(0, 5);
  return { amount: best, candidates };
};

// ─── Image preprocessing (grayscale + contrast, EXIF-aware) ───────────────────
const loadImage = (file) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = URL.createObjectURL(file);
});

const preprocess = async (file) => {
  let source;
  try {
    source = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    source = await loadImage(file).catch(() => null);
  }
  if (!source) return file; // give Tesseract the raw file if canvas fails

  const w0 = source.width, h0 = source.height;
  const longest = Math.max(w0, h0);
  // Target 1200–2200px on the long edge: enough DPI for OCR, not wastefully huge
  let factor = 1;
  if (longest > 2200) factor = 2200 / longest;
  else if (longest < 1200) factor = Math.min(2, 1400 / longest);
  const w = Math.round(w0 * factor), h = Math.round(h0 * factor);

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, w, h);

  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    const contrast = 1.4;            // moderate — avoids destroying faint thermal text
    const intercept = 128 * (1 - contrast) + 8;
    for (let i = 0; i < d.length; i += 4) {
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      let v = gray * contrast + intercept;
      v = v < 0 ? 0 : v > 255 ? 255 : v;
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    ctx.putImageData(imgData, 0, 0);
  } catch {
    /* tainted canvas / read failure — fall back to the drawn image as-is */
  }
  return canvas;
};

// Flatten Tesseract v6/v7 block tree → array of { text, words, bbox }
const flattenLines = (blocks) => {
  const out = [];
  (blocks || []).forEach(b =>
    (b.paragraphs || []).forEach(p =>
      (p.lines || []).forEach(l =>
        out.push({ text: (l.text || '').trim(), words: l.words || [], bbox: l.bbox })
      )
    )
  );
  return out;
};

export const useBillScanner = () => {
  const [scanning, setScanning] = useState(false);

  const scanBill = useCallback(async (file) => {
    setScanning(true);
    try {
      const processed = await preprocess(file);

      // Dynamic import defers the ~10 MB Tesseract bundle until first use
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      const { data } = await worker.recognize(processed, {}, { blocks: true, text: true });
      await worker.terminate();

      const rawText = data.text || '';
      let lines = flattenLines(data.blocks);
      if (lines.length === 0) {
        // Fallback when structured output is unavailable
        lines = rawText.split('\n').map(t => ({ text: t.trim(), words: [] })).filter(l => l.text);
      }

      const items = extractItems(lines);
      const itemsSum = items.reduce((s, it) => s + it.price, 0);
      const { amount, candidates } = detectAmount(lines, itemsSum);

      return {
        amount,
        candidates,
        title: extractMerchant(lines.map(l => l.text)),
        date: parseDate(rawText),
        category: inferCategory(rawText),
        items,
      };
    } catch {
      return null;
    } finally {
      setScanning(false);
    }
  }, []);

  return { scanBill, scanning };
};
