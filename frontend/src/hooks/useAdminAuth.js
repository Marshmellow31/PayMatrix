import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase.js';

export const useAdminAuth = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAdmin(!!user); // Allow showing the admin link in sidebar, secured by App.jsx route password check
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { isAdmin, loading };
};
