import api from './api.js';
import { queueOperation, invalidateCache, invalidateCachePrefix, getOperationByOperationId, updateOperationPayload } from './db.js';

const expenseService = {
  getExpenses: (groupId, page = 1) => api.get(`/groups/${groupId}/expenses?page=${page}`),
  getExpense: (id) => api.get(`/expenses/${id}`),

  addExpense: async (groupId, data) => {
    const operation_id = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const payload = { ...data, idempotencyKey: operation_id };

    // Always invalidate the local expense/balance cache before mutating
    await invalidateCachePrefix(`/groups/${groupId}/expenses`);
    await invalidateCache(`/groups/${groupId}/balances`);
    await invalidateCache('/expenses/summary');

    if (!navigator.onLine) {
      await queueOperation('create', 'expense', { ...payload, groupId }, operation_id);
      return {
        data: {
          status: 'success',
          message: 'Expense saved locally. It will sync when online.',
          data: { expense: { ...payload, _id: operation_id, offline: true } }
        }
      };
    }
    try {
      return await api.post(`/groups/${groupId}/expenses`, payload);
    } catch (err) {
      if (!err.response || err.message === 'Network Error') {
        await queueOperation('create', 'expense', { ...payload, groupId }, operation_id);
        return {
          data: {
            status: 'success',
            message: 'Network error. Expense queued for sync.',
            data: { expense: { ...payload, _id: operation_id, offline: true } }
          }
        };
      }
      throw err;
    }
  },

  updateExpense: async (id, data) => {
    const groupId = data.groupId;

    if (groupId) {
      await invalidateCachePrefix(`/groups/${groupId}/expenses`);
      await invalidateCache(`/groups/${groupId}/balances`);
    }
    await invalidateCache('/expenses/summary');

    if (!navigator.onLine) {
      // --- COALESCING FIX ---
      // If the expense being edited is itself an offline-created placeholder (temp ID),
      // update its payload in the queue instead of queuing a separate update operation.
      // This prevents the old pre-edit version from being pushed on sync.
      const isOfflinePlaceholder = typeof id === 'string' && id.startsWith('op_');
      if (isOfflinePlaceholder) {
        const existingOp = await getOperationByOperationId(id);
        if (existingOp) {
          // Merge new data into the original create payload
          const mergedPayload = { ...existingOp.payload, ...data, groupId };
          await updateOperationPayload(existingOp.id, mergedPayload);
          console.log(`[Offline] Coalesced edit into create operation ${id}`);
          return {
            data: {
              status: 'success',
              message: 'Edit saved to queued operation.',
              data: { expense: { ...mergedPayload, _id: id, offline: true } }
            }
          };
        }
      }

      // Standard offline update for a real (server) expense
      const operation_id = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await queueOperation('update', 'expense', { ...data, id }, operation_id);
      return {
        data: {
          status: 'success',
          message: 'Update queued for sync.',
          data: { expense: { ...data, _id: id, offline: true } }
        }
      };
    }

    try {
      return await api.put(`/expenses/${id}`, data);
    } catch (err) {
      if (!err.response || err.message === 'Network Error') {
        const operation_id = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await queueOperation('update', 'expense', { ...data, id }, operation_id);
        return {
          data: {
            status: 'success',
            message: 'Network error. Update queued.',
            data: { expense: { ...data, _id: id, offline: true } }
          }
        };
      }
      throw err;
    }
  },

  deleteExpense: async (id) => {
    await invalidateCache('/expenses/summary');

    if (!navigator.onLine) {
      // If deleting an offline-created expense, just remove it from the queue directly
      const isOfflinePlaceholder = typeof id === 'string' && id.startsWith('op_');
      if (isOfflinePlaceholder) {
        const existingOp = await getOperationByOperationId(id);
        if (existingOp) {
          const { deleteOperation } = await import('./db.js');
          await deleteOperation(existingOp.id);
          console.log(`[Offline] Removed unsynced create operation for ${id}`);
          return { data: { status: 'success', message: 'Offline expense removed.' } };
        }
      }
      await queueOperation('delete', 'expense', { id });
      return { data: { status: 'success', message: 'Delete queued for sync.' } };
    }
    try {
      return await api.delete(`/expenses/${id}`);
    } catch (err) {
      if (!err.response || err.message === 'Network Error') {
        await queueOperation('delete', 'expense', { id });
        return { data: { status: 'success', message: 'Network error. Delete queued.' } };
      }
      throw err;
    }
  },

  restoreExpense: async (id) => {
    if (!navigator.onLine) {
      await queueOperation('restore', 'expense', { id });
      return { data: { status: 'success', message: 'Restore queued for sync.' } };
    }
    try {
      return await api.patch(`/expenses/${id}/restore`);
    } catch (err) {
      if (!err.response || err.message === 'Network Error') {
        await queueOperation('restore', 'expense', { id });
        return { data: { status: 'success', message: 'Restore queued.' } };
      }
      throw err;
    }
  },

  getBalances: (groupId) => api.get(`/groups/${groupId}/balances`),
  getSettlements: (groupId) => api.get(`/groups/${groupId}/settlements`),
  getSummary: () => api.get('/expenses/summary'),

  createSettlement: async (groupId, data) => {
    if (!navigator.onLine) {
      const operation_id = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await queueOperation('create', 'settlement', { ...data, groupId }, operation_id);
      await invalidateCache(`/groups/${groupId}/balances`);
      await invalidateCache(`/groups/${groupId}/settlements`);
      return { data: { status: 'success', message: 'Settlement queued for sync.' } };
    }
    try {
      return await api.post(`/groups/${groupId}/settlements`, data);
    } catch (err) {
      if (!err.response || err.message === 'Network Error') {
        const operation_id = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await queueOperation('create', 'settlement', { ...data, groupId }, operation_id);
        return { data: { status: 'success', message: 'Settlement queued.' } };
      }
      throw err;
    }
  },

  getUserSettlementPlan: (groupId, userId) => api.get(`/groups/${groupId}/settlements/${userId}`),
  getActivity: (groupId) => api.get(`/groups/${groupId}/activity`),
  getSpendingTrends: (days = 7) => api.get(`/expenses/trends?days=${days}`),
};

export default expenseService;
