import { useState, useEffect } from 'react';
import { WifiOff, RefreshCcw, CheckCircle2 } from 'lucide-react';
import { syncManager } from '../../services/syncManager.js';

const SyncStatus = () => {
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [hasPending, setHasPending] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    const handleSyncComplete = () => {
      setIsSyncing(false);
      setHasPending(false);
      setLastSynced(new Date());
      // Hide the success message after 5 seconds
      setTimeout(() => setLastSynced(null), 5000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('syncComplete', handleSyncComplete);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('syncComplete', handleSyncComplete);
    };
  }, []);

  const handleManualSync = async () => {
    if (isOnline) {
      setIsSyncing(true);
      await syncManager.sync();
      setIsSyncing(false);
    }
  };

  if (isOnline && !isSyncing && !lastSynced && !hasPending) return null;

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-full flex items-center gap-3 backdrop-blur-xl border font-inter text-xs font-medium tracking-wide shadow-2xl transition-all duration-300 ${
      !isOnline 
        ? 'bg-red-500/10 text-red-500 border-red-500/20 shadow-red-500/10' 
        : isSyncing 
          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-blue-500/10'
          : 'bg-green-500/10 text-green-400 border-green-500/20 shadow-green-500/10'
    }`}>
      {!isOnline && (
        <>
          <WifiOff size={14} className="animate-pulse" />
          <span>Offline Mode. Pending changes saved safely.</span>
        </>
      )}
      
      {isOnline && isSyncing && (
        <>
          <RefreshCcw size={14} className="animate-spin" />
          <span>Syncing offline changes...</span>
        </>
      )}

      {isOnline && !isSyncing && lastSynced && (
        <>
          <CheckCircle2 size={14} />
          <span>Synced at {lastSynced.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          <button 
             onClick={handleManualSync}
             className="ml-2 px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors uppercase text-[9px] tracking-widest font-bold text-white/50 hover:text-white"
          >
             Sync Again
          </button>
        </>
      )}
    </div>
  );
};

export default SyncStatus;
