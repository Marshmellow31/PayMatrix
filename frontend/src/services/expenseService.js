import api from './api.js';
import { queueOperation, invalidateCache, invalidateCachePrefix } from './db.js';

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
      console.log('Offline detected, saving expense to IndexedDB...');
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
    const operation_id = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const payload = { ...data, idempotencyKey: operation_id };
    const groupId = data.groupId;

    if (groupId) {
      await invalidateCachePrefix(`/groups/${groupId}/expenses`);
      await invalidateCache(`/groups/${groupId}/balances`);
    }
    await invalidateCache('/expenses/summary');

    if (!navigator.onLine) {
      await queueOperation('update', 'expense', { ...payload, id }, operation_id);
      return { 
        data: { 
          status: 'success', 
          message: 'Update queued for sync.', 
          data: { expense: { ...payload, _id: id, offline: true } } 
        } 
      };
    }
    try {
        return await api.put(`/expenses/${id}`, payload);
    } catch (err) {
        if (!err.response || err.message === 'Network Error') {
            await queueOperation('update', 'expense', { ...payload, id }, operation_id);
            return { 
              data: { 
                status: 'success', 
                message: 'Network error. Update queued.', 
                data: { expense: { ...payload, _id: id, offline: true } } 
              } 
            };
        }
        throw err;
    }
  },
  deleteExpense: async (id) => {
    await invalidateCache('/expenses/summary');

    if (!navigator.onLine) {
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
  restoreExpense: (id) => api.patch(`/expenses/${id}/restore`),
  getBalances: (groupId) => api.get(`/groups/${groupId}/balances`),
  getSettlements: (groupId) => api.get(`/groups/${groupId}/settlements`),
  getSummary: () => api.get('/expenses/summary'),
  createSettlement: (groupId, data) => api.post(`/groups/${groupId}/settlements`, data),
  getUserSettlementPlan: (groupId, userId) => api.get(`/groups/${groupId}/settlements/${userId}`),
  getActivity: (groupId) => api.get(`/groups/${groupId}/activity`),
  getSpendingTrends: (days = 7) => api.get(`/expenses/trends?days=${days}`),
};

export default expenseService;
