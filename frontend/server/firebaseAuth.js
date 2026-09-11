/* eslint-env node */

const FIREBASE_LOOKUP_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup';

export const verifyFirebaseUser = async (request) => {
  const authorization = request.headers.authorization || '';
  const idToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!idToken) return null;

  const apiKey = process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) throw new Error('Firebase token verification is not configured.');

  const response = await fetch(`${FIREBASE_LOOKUP_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) return null;
  const payload = await response.json();
  return payload.users?.[0] || null;
};
