import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../config/firebase.js';

const DEFAULTS = {
  billScanning:   true,
  friendRequests: true,
  groupCreation:  true,
  upiDeepLinks:   true,
  maintenanceMode: false,
  analyticsPage:  true,
};

let cachedFlags = null;

export const useFeatureFlags = () => {
  const [flags, setFlags] = useState(cachedFlags || DEFAULTS);

  useEffect(() => {
    let unsubSnapshot = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubSnapshot) {
        unsubSnapshot();
        unsubSnapshot = null;
      }

      if (user) {
        const ref = doc(db, 'config', 'featureFlags');
        unsubSnapshot = onSnapshot(ref, (snap) => {
          const data = snap.exists() ? { ...DEFAULTS, ...snap.data() } : DEFAULTS;
          cachedFlags = data;
          setFlags(data);
        }, (error) => {
          console.error("Error reading feature flags snapshot:", error);
          setFlags(DEFAULTS);
        });
      } else {
        setFlags(DEFAULTS);
      }
    });

    return () => {
      unsubAuth();
      if (unsubSnapshot) {
        unsubSnapshot();
      }
    };
  }, []);

  console.log("[useFeatureFlags] flags returned:", flags);
  return flags;
};
