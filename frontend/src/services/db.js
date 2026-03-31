import Dexie from 'dexie';

export const db = new Dexie('PayMatrixOfflineDB');

db.version(1).stores({
  pendingExpenses: '++id, groupId, title, amount, date, category, participants, paidBy, status',
  cachedGroups: '_id, title, totalBalance',
  cachedExpenses: '_id, groupId, title, amount, date',
});

db.version(2).stores({
  pendingExpenses: null, // Drop legacy table
  operationQueue: '++id, operation_id, type, entity, timestamp, status', // type: create/update/delete, entity: expense/group
  cachedGroups: '_id, title, totalBalance',
  cachedExpenses: '_id, groupId, title, amount, date',
  cachedUsers: '_id, email'
});

db.version(3).stores({
  apiCache: 'url, timestamp'
});

// Helper to queue an operation
export const queueOperation = async (type, entity, payload, explicitOperationId = null) => {
  const operation_id = explicitOperationId || `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  return await db.operationQueue.add({
    operation_id,
    type,
    entity,
    payload,
    timestamp: new Date().toISOString(),
    status: 'pending',
    retryCount: 0
  });
};

// Helper to get pending operations ordered by timestamp
export const getPendingOperations = async () => {
  return await db.operationQueue.orderBy('timestamp').toArray();
};

// Helper to delete operation after successful sync
export const deleteOperation = async (id) => {
  return await db.operationQueue.delete(id);
};

// Helper to update operation (e.g., mark failed or increment retry)
export const updateOperation = async (id, changes) => {
  return await db.operationQueue.update(id, changes);
};

// Helper to invalidate specific API cache entries
export const invalidateCache = async (url) => {
  return await db.apiCache.delete(url);
};

// Helper to invalidate all cache entries starting with a prefix (e.g., /groups/123/expenses)
export const invalidateCachePrefix = async (prefix) => {
  return await db.apiCache.where('url').startsWith(prefix).delete();
};
