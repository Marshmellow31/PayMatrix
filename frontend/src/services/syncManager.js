import { getPendingOperations, deleteOperation, updateOperation } from './db.js';
import api from './api.js';
import toast from 'react-hot-toast';

class SyncManager {
  constructor() {
    this.isSyncing = false;
    this.init();
  }

  init() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.sync());
      // Try sync on load
      this.sync();
      
      // Periodic background sync every 3 minutes
      setInterval(() => {
        if (navigator.onLine && !this.isSyncing) {
            this.sync(true); // silent sync
        }
      }, 3 * 60 * 1000);
    }
  }

  async sync(silent = false) {
    if (this.isSyncing || !navigator.onLine) return;

    const pending = await getPendingOperations();
    // Only attempt to sync those that haven't permanently failed
    const toSync = pending.filter(op => (op.retryCount || 0) < 5);
    
    if (toSync.length === 0) return;

    this.isSyncing = true;
    console.log(`Syncing ${toSync.length} offline operations...`);

    let syncToast;
    if (!silent) {
        syncToast = toast.loading(`Syncing ${toSync.length} offline changes...`, {
            style: {
                background: '#000000',
                color: '#ffffff',
                border: '1px solid #333',
            }
        });
    }

    try {
      // Send batch to server
      const response = await api.post('/sync', { operations: toSync });
      const { success, failed, server_updates } = response.data.data;

      // Handle successful syncs (Remove from local queue)
      for (const opId of success) {
          const matchingOp = toSync.find(op => op.operation_id === opId);
          if (matchingOp) {
             await deleteOperation(matchingOp.id);
             console.log(`Synced operation: ${matchingOp.type} ${matchingOp.entity}`);
          }
      }

      // Handle failed syncs (Increment retry count)
      for (const fail of failed) {
          const matchingOp = toSync.find(op => op.operation_id === fail.operation_id);
          if (matchingOp) {
             const newRetry = (matchingOp.retryCount || 0) + 1;
             await updateOperation(matchingOp.id, { 
                 status: newRetry >= 5 ? 'failed' : 'pending',
                 retryCount: newRetry 
             });
             console.error(`Failed to sync operation ${fail.operation_id}. Retry ${newRetry}/5. Error: ${fail.error}`);
          }
      }

      if (!silent) {
          if (failed.length > 0) {
              toast.success(`Synced. ${failed.length} operations failed.`, { id: syncToast });
          } else {
              toast.success('All offline changes synced successfully!', { id: syncToast });
          }
      }
      
      // Notify UI that sync completed (useful for reloading cached lists)
      window.dispatchEvent(new CustomEvent('syncComplete', { 
          detail: { hasUpdates: server_updates && server_updates.length > 0 } 
      }));

    } catch (error) {
      console.error('Global sync error:', error);
      if (!silent) {
          toast.error('Network error during sync.', { id: syncToast });
      }
    } finally {
      this.isSyncing = false;
    }
  }
}

export const syncManager = new SyncManager();
