import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudOff } from 'lucide-react';

const SyncStatus = () => {
  const [online, setOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed top-20 sm:top-24 right-5 sm:right-8 z-[60]"
        >
          <div className="glass-pill px-4 py-2 flex items-center gap-3 shadow-2xl border border-white/5 bg-black/50 backdrop-blur-md">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <CloudOff size={16} className="text-amber-500" />
            <span className="text-xs font-semibold text-white/90">Offline Mode</span>
            <span className="text-[10px] bg-amber-500/10 px-2 py-0.5 rounded-full text-amber-500 border border-amber-500/20">
              Saving Locally
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SyncStatus;
