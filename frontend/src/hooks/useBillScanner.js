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
import { db, auth } from '../config/firebase.js';
import { collection, addDoc } from 'firebase/firestore';

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

  const scanBill = useCallback(async (files) => {
    setScanning(true);
    const started = Date.now();
    let errorMsg = null;
    let parsed = null;

    try {
      const fileArray = Array.isArray(files) ? files : [files];
      const processedImages = await Promise.all(fileArray.map((f) => fileToCompressedBase64(f)));

      const response = await fetch('/api/scan-bill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ images: processedImages }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(errText || `Server responded with status ${response.status}`);
      }

      parsed = await response.json();
      if (!parsed) return null;

      return {
        amount: parsed.amount,
        candidates: parsed.amount != null ? [parsed.amount] : [],
        title: parsed.title || '',
        date: parsed.date || null,
        category: parsed.category || 'Other',
        items: parsed.items || [],
      };
    } catch (err) {
      errorMsg = err?.message ?? String(err);
      console.error('[useBillScanner] scanBill failed:', errorMsg);
      return null;
    } finally {
      // Log requests directly to Firestore (Spark free plan allows direct writes)
      const currentUser = auth.currentUser;
      if (currentUser) {
        const duration = Date.now() - started;
        addDoc(collection(db, 'ai_requests'), {
          uid: currentUser.uid,
          status: errorMsg ? 'failed' : 'passed',
          duration,
          timestamp: new Date().toISOString(),
          parsedAmount: parsed?.amount ?? null,
          itemsCount: parsed?.items?.length ?? 0,
          error: errorMsg ?? null,
          model: 'gemini-2.0-flash-lite',
        }).catch((e) => console.error('[useBillScanner] Failed to write ai_requests log:', e));
      }

      setScanning(false);
    }
  }, []);

  return { scanBill, scanning };
};
