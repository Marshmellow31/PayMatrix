import api from './api.js';

const expenseService = {
  getExpenses: (groupId, page = 1) => api.get(`/groups/${groupId}/expenses?page=${page}`),
  getExpense: (id) => api.get(`/expenses/${id}`),
  addExpense: (groupId, data) => api.post(`/groups/${groupId}/expenses`, data),
  updateExpense: (id, data) => api.put(`/expenses/${id}`, data),
  deleteExpense: (id) => api.delete(`/expenses/${id}`),
  getBalances: (groupId) => api.get(`/groups/${groupId}/balances`),
  getSettlements: (groupId) => api.get(`/groups/${groupId}/settlements`),
  getSummary: () => api.get('/expenses/summary'),
  createSettlement: (groupId, data) => api.post(`/groups/${groupId}/settlements`, data),
};

export default expenseService;
