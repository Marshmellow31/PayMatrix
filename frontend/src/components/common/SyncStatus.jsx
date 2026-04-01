import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

const SyncStatus = () => {
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-full flex items-center gap-3 backdrop-blur-xl border font-inter text-xs font-medium tracking-wide shadow-2xl transition-all duration-300 bg-red-500/10 text-red-500 border-red-500/20 shadow-red-500/10`}>
      <WifiOff size={14} className="animate-pulse" />
      <span>Offline Mode. Changes saved safely via Firebase.</span>
    </div>
  );
};

export default SyncStatus;
