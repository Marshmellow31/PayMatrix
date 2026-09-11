import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { authenticatedGet } from '../services/razorpayService.js';

const FREE = Object.freeze({ state: 'free', isPro: false, limits: null });

export const useEntitlement = () => {
  const user = useSelector((state) => state.auth.user);
  const uid = user?.uid || user?._id;
  const [entitlement, setEntitlement] = useState(FREE);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(uid));

  useEffect(() => {
    if (!uid) {
      setEntitlement(FREE);
      setLoading(false);
      return undefined;
    }

    setEntitlement(FREE);
    setError('');
    let active = true;
    let generation = 0;
    let controller;
    const load = async () => {
      const request = ++generation;
      controller?.abort();
      controller = new AbortController();
      setLoading(true);
      try {
        const trusted = await authenticatedGet('/api/pro-status', { signal: controller.signal });
        if (active && request === generation) {
          setEntitlement(trusted);
          setError('');
        }
      } catch (error) {
        if (active && request === generation && error.name !== 'AbortError') {
          setEntitlement(FREE);
          setError('Unable to check Pro status.');
        }
      } finally {
        if (active && request === generation) setLoading(false);
      }
    };

    load();
    window.addEventListener('focus', load);
    window.addEventListener('paymatrix:entitlement-refresh', load);
    return () => {
      active = false;
      controller?.abort();
      window.removeEventListener('focus', load);
      window.removeEventListener('paymatrix:entitlement-refresh', load);
    };
  }, [uid]);

  return { ...entitlement, loading, error };
};
