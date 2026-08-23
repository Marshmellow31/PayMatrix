import { Cloud, CloudOff, LoaderCircle } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus.js';
import { useSyncStatus } from '../../hooks/useSyncStatus.js';

const SyncStatus = () => {
  const online = useOnlineStatus();
  const { pending, error } = useSyncStatus();

  if (online && pending === 0 && !error) return null;

  const label = !online
    ? pending > 0
      ? `${pending} change${pending === 1 ? '' : 's'} saved on this device`
      : 'Offline mode'
    : error
      ? 'Some changes need attention'
      : `Syncing ${pending} change${pending === 1 ? '' : 's'}…`;

  return (
    <div className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-neutral-950/95 px-4 py-2 text-xs font-semibold text-white shadow-2xl backdrop-blur lg:bottom-6">
      {!online ? (
        <CloudOff size={14} className="text-amber-400" />
      ) : pending ? (
        <LoaderCircle size={14} className="animate-spin text-primary" />
      ) : (
        <Cloud size={14} className="text-red-400" />
      )}
      <span>{label}</span>
    </div>
  );
};

export default SyncStatus;
