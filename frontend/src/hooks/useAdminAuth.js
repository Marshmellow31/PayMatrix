import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase.js';

/**
 * Returns { isAdmin, loading } by reading Firebase Custom Claims.
 * Used to show/hide the admin link in the sidebar.
 * Actual route protection is enforced separately in AdminRoute (App.jsx).
 */
export const useAdminAuth = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      try {
        // forceRefresh=false: use cached token if it hasn't expired (5-min window)
        const result = await user.getIdTokenResult(false);
        setIsAdmin(result.claims.admin === true);
      } catch {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { isAdmin, loading };
};
