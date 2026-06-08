import { useState, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase.js';
import { EXPENSE_CATEGORIES } from '../utils/constants.js';

const VALID_CATEGORIES = EXPENSE_CATEGORIES.map(c => c.value);

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

      // Calls the secured Cloud Function; the Gemini key never reaches the client.
      const scanBillFn = httpsCallable(functions, 'scanBill', { timeout: 70000 });
      const { data } = await scanBillFn({ imageBase64: base64, mimeType });

      if (!data) return null;

      const amount = Number(data.amount) > 0 ? Number(data.amount) : null;
      const category = VALID_CATEGORIES.includes(data.category) ? data.category : 'Other';
      const items = Array.isArray(data.items)
        ? data.items
            .map(it => ({ name: String(it?.name || '').trim(), price: Number(it?.price) || 0 }))
            .filter(it => it.name && it.price > 0)
        : [];

      return {
        amount,
        candidates: amount != null ? [amount] : [],
        title: String(data.title || '').trim(),
        date: data.date || null,
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
