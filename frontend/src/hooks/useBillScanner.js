import { useState, useCallback } from 'react';

// Maps OCR text keywords → expense category
const CATEGORY_MAP = {
  Food: ['restaurant', 'cafe', 'pizza', 'burger', 'hotel', 'dhaba', 'kitchen', 'biryani', 'swiggy', 'zomato', 'bakery', 'chai', 'canteen', 'diner', 'eatery', 'grill', 'mess', 'tiffin', 'barbeque', 'bbq', 'halwai', 'mithai', 'food', 'eat'],
  Travel: ['uber', 'ola', 'taxi', 'cab', 'auto', 'petrol', 'fuel', 'parking', 'metro', 'rapido', 'flight', 'airline', 'train', 'bus', 'ferry', 'toll', 'transport', 'travels'],
  Rent: ['rent', 'lease', 'accommodation', 'hostel', 'oyo', 'airbnb', 'pg', 'paying guest'],
  Entertainment: ['cinema', 'movie', 'pvr', 'inox', 'bowling', 'gaming', 'netflix', 'amusement', 'theatre', 'arcade'],
  Utilities: ['electricity', 'water', 'gas', 'internet', 'broadband', 'jio', 'airtel', 'vodafone', 'bsnl', 'recharge', 'telecom'],
  Shopping: ['mall', 'store', 'mart', 'amazon', 'flipkart', 'retail', 'fashion', 'market', 'bazaar', 'boutique', 'myntra', 'reliance', 'shop'],
  Health: ['pharmacy', 'medical', 'hospital', 'clinic', 'medicine', 'diagnostic', 'lab', 'pharma', 'chemist', 'apollo', 'health'],
  Education: ['school', 'college', 'university', 'tutor', 'coaching', 'academy', 'course', 'institute'],
};

const inferCategory = (text) => {
  const lower = text.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some(k => lower.includes(k))) return cat;
  }
  return 'Other';
};

const parseDate = (text) => {
  // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const dmy = text.match(/\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    if (!isNaN(date.getTime()) && date.getFullYear() > 2000)
      return date.toISOString().split('T')[0];
  }
  // YYYY-MM-DD
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return iso[0];
  // DD Mon YYYY
  const dmonY = text.match(/\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+(\d{4})\b/i);
  if (dmonY) {
    const months = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
    const [, d, m, y] = dmonY;
    const date = new Date(parseInt(y), months[m.toLowerCase().slice(0, 3)], parseInt(d));
    if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
  }
  return null;
};

const extractMerchantName = (lines) => {
  const skip = [
    /^\d+$/,                              // pure number
    /\d{6,}/,                             // long number sequence (phone, GSTIN)
    /^(gst|gstin|cin|www|http|mob|fax)/i, // common header noise
    /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]/i,// email
    /^(bill|receipt|invoice|tax|order|date|time|table|cash|ref|no\.|thank)/i,
    /^[-=*#_|]+$/,                        // separator lines
    /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/, // date lines
  ];
  for (const line of lines) {
    const t = line.trim();
    if (t.length < 3 || t.length > 60) continue;
    if (skip.some(p => p.test(t))) continue;
    if (!/[a-zA-Z]{2,}/.test(t)) continue;
    return t.replace(/[^a-zA-Z0-9\s&'.,-]/g, '').trim();
  }
  return '';
};

// Extracts lines that look like "Item name    99.00"
const extractLineItems = (lines) => {
  const items = [];
  const stopRe = /\b(total|subtotal|sub-total|gst|cgst|sgst|igst|tax|discount|service|grand|vat|cess|charge)\b/i;
  const itemRe = /^(.+?)\s{2,}(\d{1,6}(?:[.,]\d{2})?)\s*$/;

  for (const line of lines) {
    const t = line.trim();
    if (t.length < 5 || stopRe.test(t)) continue;
    const m = t.match(itemRe);
    if (m) {
      const name = m[1].trim();
      const price = parseFloat(m[2].replace(',', ''));
      if (name.length >= 2 && price > 0 && price < 50000) {
        items.push({ name, price });
      }
    }
  }
  return items;
};

const extractBestAmount = (text) => {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const trailingNum = (line) => {
    const m = line.match(/([\d,]+\.?\d{0,2})\s*$/);
    if (!m) return null;
    const v = parseFloat(m[1].replace(/,/g, ''));
    return v > 0 ? v : null;
  };

  // Search bottom-up: totals appear at the end of receipts
  const reversed = [...lines].reverse();

  const highPriority = /\b(grand\s+total|total\s+amount|net\s+total|bill\s+total|amount\s+due|amount\s+payable|total\s+payable|payable\s+amount|net\s+payable)\b/i;
  for (const line of reversed) {
    if (highPriority.test(line)) {
      const v = trailingNum(line);
      if (v) return v;
    }
  }

  for (const line of reversed) {
    if (/\btotal\b/i.test(line)) {
      const v = trailingNum(line);
      if (v) return v;
    }
  }

  // Fallback: largest X.XX number in entire text
  const all = [...text.matchAll(/([\d,]+\.\d{1,2})/g)]
    .map(m => parseFloat(m[1].replace(/,/g, '')))
    .filter(v => v > 0);
  return all.length > 0 ? Math.max(...all) : null;
};

export const useBillScanner = () => {
  const [scanning, setScanning] = useState(false);

  const scanBill = useCallback(async (file) => {
    setScanning(true);
    try {
      // Dynamic import defers the ~10 MB Tesseract bundle until first use
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

      return {
        amount: extractBestAmount(text),
        title: extractMerchantName(lines),
        date: parseDate(text),
        category: inferCategory(text),
        items: extractLineItems(lines),
      };
    } catch {
      return null;
    } finally {
      setScanning(false);
    }
  }, []);

  return { scanBill, scanning };
};
