import api from './api.js';
import { savePendingExpense } from './db.js';

const expenseService = {
  getExpenses: (groupId, page = 1) => api.get(`/groups/${groupId}/expenses?page=${page}`),
  getExpense: (id) => api.get(`/expenses/${id}`),
  addExpense: async (groupId, data) => {
    if (!navigator.onLine) {
      console.log('Offline detected, saving expense to IndexedDB...');
      await savePendingExpense({ ...data, groupId });
      return { offline: true, message: 'Expense saved locally. It will sync when you are back online.' };
    }
    return api.post(`/groups/${groupId}/expenses`, data);
  },
  updateExpense: (id, data) => api.put(`/expenses/${id}`, data),
  deleteExpense: (id) => api.delete(`/expenses/${id}`),
  restoreExpense: (id) => api.patch(`/expenses/${id}/restore`),
  getBalances: (groupId) => api.get(`/groups/${groupId}/balances`),
  getSettlements: (groupId) => api.get(`/groups/${groupId}/settlements`),
  getSummary: () => api.get('/expenses/summary'),
  createSettlement: (groupId, data) => api.post(`/groups/${groupId}/settlements`, data),
  getActivity: (groupId) => api.get(`/groups/${groupId}/activity`),
  getSpendingTrends: (days = 7) => api.get(`/expenses/trends?days=${days}`),
};

export default expenseService;
