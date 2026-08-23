import { useEffect, useState } from 'react';
import syncTracker from '../services/syncTracker.js';

export const useSyncStatus = () => {
  const [status, setStatus] = useState(syncTracker.getSnapshot());

  useEffect(() => syncTracker.subscribe(setStatus), []);
  return status;
};
