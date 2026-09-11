/**
 * useBillScanner
 *
 * Compresses the selected image on the client, then POSTs it to the
 * `/api/scan-bill` serverless endpoint (frontend/api/scan-bill.js) for parsing.
 *
 * Why a server endpoint instead of a direct Gemini fetch?
 * - The Gemini API key lives only in server env (GEMINI_API_KEY) and is never
 *   shipped in the browser bundle. (This is the single AI path — the old
 *   duplicate `scanBillWithGemini` Cloud Function was removed.)
 * - Field validation happens server-side, so clients can't inject bad data.
 */
import { useState, useCallback } from 'react';
import { auth } from '../config/firebase.js';

const SCAN_API_URL = import.meta.env.VITE_SCAN_API_URL || '/api/scan-bill';

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

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useBillScanner = () => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [usage, setUsage] = useState(null);

  const scanBill = useCallback(async (files) => {
    setScanning(true);
    setError(null);

    try {
      const fileArray = Array.isArray(files) ? files : [files];
      const processedImages = await Promise.all(fileArray.map((f) => fileToCompressedBase64(f)));
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Sign in before scanning a bill.');
      const idToken = await currentUser.getIdToken();

      const response = await fetch(SCAN_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ images: processedImages }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const failure = new Error(
          payload.error || `Server responded with status ${response.status}`
        );
        failure.code = payload.code || 'SCAN_FAILED';
        failure.usage = payload.usage || null;
        throw failure;
      }

      const parsed = await response.json();
      if (!parsed) return null;
      setUsage(parsed.usage || null);

      return {
        amount: parsed.amount,
        candidates: parsed.amount != null ? [parsed.amount] : [],
        title: parsed.title || '',
        date: parsed.date || null,
        category: parsed.category || 'Other',
        items: parsed.items || [],
      };
    } catch (err) {
      const failure = {
        code: err?.code || 'SCAN_FAILED',
        message: err?.message || 'Bill scanning failed. Please try again.',
        usage: err?.usage || null,
      };
      setError(failure);
      if (failure.usage) setUsage(failure.usage);
      console.error('[useBillScanner] scanBill failed:', failure.code);
      return { error: failure };
    } finally {
      setScanning(false);
    }
  }, []);

  return { scanBill, scanning, error, usage };
};
