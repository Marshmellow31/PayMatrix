import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
const storage = getStorage(app);
let analytics = null;

if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
  
  // Initialize App Check
  // Note: RECAPTCHA_V3_SITE_KEY must be generated in Google Cloud Console
  const RECAPTCHA_V3_SITE_KEY = "YOUR_RECAPTCHA_V3_SITE_KEY_HERE"; 
  
  if (RECAPTCHA_V3_SITE_KEY !== "YOUR_RECAPTCHA_V3_SITE_KEY_HERE") {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(RECAPTCHA_V3_SITE_KEY),
      isTokenAutoRefreshEnabled: true
    });
  } else {
    console.warn("Firebase App Check: Site Key missing. Access restriction is currently inactive.");
  }
}

export { auth, db, storage, analytics };
