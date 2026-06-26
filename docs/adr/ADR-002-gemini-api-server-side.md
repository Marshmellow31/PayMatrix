# ADR-002: Gemini API Calls via Cloud Function

**Date:** 2026-06-26  
**Status:** Accepted

## Context

`useBillScanner.js` called the Gemini REST API directly from the browser using `VITE_GEMINI_API_KEY`. Because Vite prefixes env vars with `VITE_`, this key is bundled into the JavaScript that every user downloads. Anyone who opens DevTools → Sources can extract the key and use it outside the app.

## Decision

Move the Gemini API call to a new `scanBillWithGemini` Cloud Function:

- Client compresses the image client-side (canvas resize to ≤1600px, JPEG re-encode at 0.85 quality)
- Client calls `httpsCallable(functions, 'scanBillWithGemini')` with `{ imageBase64, mimeType }`
- Cloud Function reads `process.env.GEMINI_API_KEY` (set via Firebase Console → Functions → Configuration)
- Cloud Function calls Gemini, logs the request to `ai_requests` with admin SDK, returns parsed receipt
- `VITE_GEMINI_API_KEY` in `frontend/.env` is no longer read by any client-side code

The `.env` file is left unchanged to avoid breaking the existing Vercel deploy config. The variable just becomes inert.

## Consequences

**Positive:**
- Gemini API key is no longer exposed in the browser bundle
- Rate limiting and abuse prevention can be enforced server-side
- `ai_requests` logging uses the Admin SDK (bypasses client Firestore rules)

**Negative:**
- Bill scanning now requires a network round-trip to Cloud Functions even when online (adds ~100–300ms)
- The `GEMINI_API_KEY` env var must be set separately in Firebase Functions config (one-time setup step)
- If the Cloud Function is cold-started, the first scan may take 1–2s longer

**Neutral:**
- Image compression still happens client-side (appropriate — saves bandwidth, no server compute cost)
- The function enforces auth (`request.auth` must be present), so anonymous users cannot call it
