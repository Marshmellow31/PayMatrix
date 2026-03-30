import { getPendingExpenses, deletePendingExpense } from './db.js';
import expenseService from './expenseService.js';
import toast from 'react-hot-toast';

class SyncManager {
  constructor() {
    this.isSyncing = false;
    this.init();
  }

  init() {
    // Listen for online event
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.sync());
      // Also try sync on load
      this.sync();
    }
  }

  async sync() {
    if (this.isSyncing || !navigator.onLine) return;

    const pending = await getPendingExpenses();
    if (pending.length === 0) return;

    this.isSyncing = true;
    console.log(`Syncing ${pending.length} pending expenses...`);

    const syncToast = toast.loading(`Syncing ${pending.length} offline expenses...`, {
        style: {
            background: '#000000',
            color: '#ffffff',
            border: '1px solid #333',
        }
    });

    try {
      for (const expense of pending) {
        const { id, groupId, ...data } = expense;
        try {
          await expenseService.addExpense(groupId, data);
          await deletePendingExpense(id);
          console.log(`Synced expense: ${data.title}`);
        } catch (err) {
          console.error(`Failed to sync expense ${id}:`, err);
          // If it's a validation error or something permanent, we might want to skip or handle it
        }
      }
      toast.success('Offline expenses synced successfully!', { id: syncToast });
    } catch (error) {
      console.error('Global sync error:', error);
      toast.error('Failed to sync offline expenses.', { id: syncToast });
    } finally {
      this.isSyncing = false;
    }
  }
}

export const syncManager = new SyncManager();
