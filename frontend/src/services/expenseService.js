import api from './api.js';

const expenseService = {
  getExpenses: (groupId, page = 1) => api.get(`/v1/groups/${groupId}/expenses?page=${page}`),
  getExpense: (id) => api.get(`/v1/expenses/${id}`),
  addExpense: (groupId, data) => api.post(`/v1/groups/${groupId}/expenses`, data),
  updateExpense: (id, data) => api.put(`/v1/expenses/${id}`, data),
  deleteExpense: (id) => api.delete(`/v1/expenses/${id}`),
  getBalances: (groupId) => api.get(`/v1/groups/${groupId}/balances`),
  getSettlements: (groupId) => api.get(`/v1/groups/${groupId}/settlements`),
  createSettlement: (groupId, data) => api.post(`/v1/groups/${groupId}/settlements`, data),
};

export default expenseService;
