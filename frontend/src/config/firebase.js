import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging } from 'firebase/messaging';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { isNativeRuntime } from '#paymatrix-runtime';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  experimentalForceLongPolling: true,
});
const storage = getStorage(app);
// messaging is only initialized in browser context (not in the service worker)
const messaging = isNativeRuntime() ? null : getMessaging(app);
// Callable Cloud Functions (e.g. scanBill — Gemini receipt parsing)
const functions = getFunctions(app);

if (import.meta.env.DEV) {
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

export { auth, db, storage, messaging, functions };
