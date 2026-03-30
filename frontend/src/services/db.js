import Dexie from 'dexie';

export const db = new Dexie('PayMatrixOfflineDB');

db.version(1).stores({
  pendingExpenses: '++id, groupId, title, amount, date, category, participants, paidBy, status',
  cachedGroups: '_id, title, totalBalance',
  cachedExpenses: '_id, groupId, title, amount, date',
});

// Helper to save pending expense
export const savePendingExpense = async (expenseData) => {
  return await db.pendingExpenses.add({
    ...expenseData,
    status: 'pending',
    createdAt: new Date(),
  });
};

// Helper to get all pending expenses
export const getPendingExpenses = async () => {
  return await db.pendingExpenses.toArray();
};

// Helper to delete pending expense after sync
export const deletePendingExpense = async (id) => {
  return await db.pendingExpenses.delete(id);
};
