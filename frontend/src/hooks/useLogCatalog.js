import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../config/firebase.js';
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES } from '../utils/logTransactions.js';
const defaults = { accounts: DEFAULT_ACCOUNTS, categories: DEFAULT_CATEGORIES };
export default function useLogCatalog() {
  const [state, setState] = useState({ ...defaults, loading: true, error: '' });
  useEffect(() => {
    let unsubscribe;
    const stopAuth = onAuthStateChanged(auth, (user) => {
      unsubscribe?.();
      setState({ ...defaults, loading: !!user, error: '' });
      if (!user) return;
      unsubscribe = onSnapshot(
        collection(db, 'users', user.uid, 'logCatalog'),
        (snapshot) => {
          const records = snapshot.docs.map((item) => ({
            ...item.data(),
            id: item.id,
            persisted: true,
          }));
          const merge = (base, kind) => [
            ...new Map(
              [...base, ...records.filter((item) => item.kind === kind)].map((item) => [
                item.id,
                item,
              ])
            ).values(),
          ];
          setState({
            accounts: merge(DEFAULT_ACCOUNTS, 'account'),
            categories: merge(DEFAULT_CATEGORIES, 'category'),
            loading: false,
            error: '',
          });
        },
        () =>
          setState({
            ...defaults,
            loading: false,
            error: 'Custom accounts and categories could not load. Reconnect or try again later.',
          })
      );
    });
    return () => {
      stopAuth();
      unsubscribe?.();
    };
  }, []);
  return state;
}
