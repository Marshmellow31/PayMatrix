/**
 * useBillScanner
 *
 * Compresses the selected image on the client, then sends it to the
 * `scanBillWithGemini` Cloud Function for parsing.
 *
 * Why Cloud Function instead of direct Gemini fetch?
 * - VITE_GEMINI_API_KEY is no longer exposed in the browser bundle.
 * - Rate limiting and logging happen server-side with admin privileges.
 * - Clients cannot forge ai_request logs or bypass per-user quotas.
 */
import { useState, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

// ─── Image helpers ────────────────────────────────────────────────────────────

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });

/**
 * Downscales the image to at most 1600px on the longest side and re-encodes
 * as JPEG to keep the payload small. Returns { base64, mimeType }.
 */
const fileToCompressedBase64 = async (file) => {
  let source;
  try {
    source = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    source = await loadImage(file).catch(() => null);
  }

  // Fallback: send original bytes if canvas is unavailable
  if (!source) {
    const buf = await file.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return { base64: btoa(binary), mimeType: file.type || 'image/jpeg' };
  }

  const maxDim  = 1600;
  const longest = Math.max(source.width, source.height);
  const factor  = longest > maxDim ? maxDim / longest : 1;
  const w = Math.round(source.width  * factor);
  const h = Math.round(source.height * factor);

  const canvas = document.createElement('canvas');
  canvas.width  = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(source, 0, 0, w, h);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  return { base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' };
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useBillScanner = () => {
  const [scanning, setScanning] = useState(false);

  const scanBill = useCallback(async (file) => {
    setScanning(true);
    try {
      const { base64, mimeType } = await fileToCompressedBase64(file);

      const functions   = getFunctions();
      const cloudScan   = httpsCallable(functions, 'scanBillWithGemini', { timeout: 30_000 });
      const response    = await cloudScan({ imageBase64: base64, mimeType });

      // response.data is the parsed receipt object returned by the Cloud Function
      const parsed = response.data;
      if (!parsed) return null;

      return {
        amount:     parsed.amount,
        candidates: parsed.amount != null ? [parsed.amount] : [],
        title:      parsed.title  || '',
        date:       parsed.date   || null,
        category:   parsed.category || 'Other',
        items:      parsed.items  || [],
      };
    } catch (err) {
      console.error('[useBillScanner] scanBill failed:', err?.message ?? err);
      return null;
    } finally {
      setScanning(false);
    }
  }, []);

  return { scanBill, scanning };
};
