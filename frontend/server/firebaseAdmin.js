/* eslint-env node */
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const credentials = () => {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey)
    throw Object.assign(new Error('Server authentication is not configured.'), { statusCode: 503 });
  return { projectId, clientEmail, privateKey };
};

const app = () => getApps()[0] || initializeApp({ credential: cert(credentials()) });

export const adminAuth = () => getAuth(app());
export const adminDb = () => getFirestore(app());

export const requireFirebaseUser = async (req) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    const error = new Error('Authentication required.');
    error.statusCode = 401;
    throw error;
  }
  let token;
  try {
    token = await adminAuth().verifyIdToken(header.slice(7), true);
  } catch (cause) {
    if (String(cause.code || '').startsWith('auth/')) {
      throw Object.assign(new Error('Your session has expired. Sign in again.'), {
        statusCode: 401,
      });
    }
    throw cause;
  }
  const provider = token.firebase?.sign_in_provider;
  if (provider === 'password' && token.email_verified !== true) {
    const error = new Error('Verify your email before continuing.');
    error.statusCode = 403;
    throw error;
  }
  return token;
};
