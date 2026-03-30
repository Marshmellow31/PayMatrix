import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudOff, RefreshCcw, CheckCircle2, Cloud } from 'lucide-react';
import { db } from '../../services/db.js';
import { syncManager } from '../../services/syncManager.js';

const SyncStatus = () => {
  const [online, setOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const updatePendingCount = async () => {
      try {
        const count = await db.operationQueue.count();
        setPendingCount(count);
      } catch (e) {
        // Init edge case
      }
    };

    updatePendingCount();
    const interval = setInterval(updatePendingCount, 5000);

    const handleSyncComplete = () => {
      setIsSyncing(false);
      setLastSynced(new Date());
      updatePendingCount();
      setTimeout(() => setLastSynced(null), 5000);
    };

    window.addEventListener('syncComplete', handleSyncComplete);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('syncComplete', handleSyncComplete);
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = async () => {
    if (online) {
      setIsSyncing(true);
      await syncManager.sync();
    }
  };

  return (
    <AnimatePresence>
      {(!online || pendingCount > 0 || isSyncing || lastSynced) && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-24 lg:bottom-10 right-6 z-[60]"
          onClick={pendingCount > 0 && online ? handleManualSync : undefined}
        >
          <div className="glass-pill px-4 py-2 flex items-center gap-3 shadow-2xl border border-white/5 cursor-pointer hover:bg-white/5 transition-colors">
            {!online ? (
              <>
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <CloudOff size={16} className="text-amber-500" />
                <span className="text-xs font-semibold text-on-surface">Offline Mode</span>
                {pendingCount > 0 && (
                  <span className="text-[10px] bg-amber-500/10 px-2 py-0.5 rounded-full text-amber-500 border border-amber-500/20">
                    {pendingCount} Pending
                  </span>
                )}
              </>
            ) : isSyncing ? (
              <>
                <RefreshCcw size={16} className="text-primary animate-spin" />
                <span className="text-xs font-semibold text-on-surface">Syncing Changes...</span>
              </>
            ) : pendingCount > 0 ? (
              <>
                <Cloud size={16} className="text-primary" />
                <span className="text-xs font-semibold text-on-surface">Saving to Cloud (Tap to Sync)</span>
                <span className="text-[10px] bg-primary/10 px-2 py-0.5 rounded-full text-primary border border-primary/20 hover:bg-primary/20">
                  {pendingCount} Left
                </span>
              </>
            ) : lastSynced ? (
              <>
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span className="text-xs font-semibold text-on-surface">All Synced</span>
              </>
            ) : null}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SyncStatus;
