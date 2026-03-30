import api from './api.js';
import { queueOperation } from './db.js';

const expenseService = {
  getExpenses: (groupId, page = 1) => api.get(`/groups/${groupId}/expenses?page=${page}`),
  getExpense: (id) => api.get(`/expenses/${id}`),
  addExpense: async (groupId, data) => {
    if (!navigator.onLine) {
      console.log('Offline detected, saving expense to IndexedDB...');
      await queueOperation('create', 'expense', { ...data, groupId });
      return { data: { offline: true, message: 'Expense saved locally. It will sync when you are back online.', expense: { ...data, _id: `temp_${Date.now()}` } } };
    }
    try {
        return await api.post(`/groups/${groupId}/expenses`, data);
    } catch (err) {
        if (!err.response || err.message === 'Network Error') {
            await queueOperation('create', 'expense', { ...data, groupId });
            return { data: { offline: true, message: 'Network error. Expense queued for sync.', expense: { ...data, _id: `temp_${Date.now()}` } } };
        }
        throw err;
    }
  },
  updateExpense: async (id, data) => {
    if (!navigator.onLine) {
      await queueOperation('update', 'expense', { ...data, id });
      return { data: { offline: true, message: 'Update queued for sync.' } };
    }
    try {
        return await api.put(`/expenses/${id}`, data);
    } catch (err) {
        if (!err.response || err.message === 'Network Error') {
            await queueOperation('update', 'expense', { ...data, id });
            return { data: { offline: true, message: 'Network error. Update queued.' } };
        }
        throw err;
    }
  },
  deleteExpense: async (id) => {
    if (!navigator.onLine) {
      await queueOperation('delete', 'expense', { id });
      return { data: { offline: true, message: 'Delete queued for sync.' } };
    }
    try {
        return await api.delete(`/expenses/${id}`);
    } catch (err) {
        if (!err.response || err.message === 'Network Error') {
            await queueOperation('delete', 'expense', { id });
            return { data: { offline: true, message: 'Network error. Delete queued.' } };
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
