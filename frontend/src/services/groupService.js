import api from './api.js';
import { queueOperation, invalidateCache } from './db.js';

const groupService = {
  getGroups: () => api.get('/groups'),
  getGroup: (id) => api.get(`/groups/${id}`),

  createGroup: async (data) => {
    await invalidateCache('/groups');
    if (!navigator.onLine) {
      await queueOperation('create', 'group', data);
      return { data: { offline: true, message: 'Group creation queued for sync.', group: { ...data, _id: `temp_${Date.now()}` } } };
    }
    try {
      return await api.post('/groups', data);
    } catch (err) {
      if (!err.response || err.message === 'Network Error') {
        await queueOperation('create', 'group', data);
        return { data: { offline: true, message: 'Network error. Group creation queued.', group: { ...data, _id: `temp_${Date.now()}` } } };
      }
      throw err;
    }
  },

  updateGroup: async (id, data) => {
    if (!navigator.onLine) {
      await queueOperation('update', 'group', { ...data, id });
      return { data: { offline: true, message: 'Group update queued for sync.' } };
    }
    try {
      return await api.put(`/groups/${id}`, data);
    } catch (err) {
      if (!err.response || err.message === 'Network Error') {
        await queueOperation('update', 'group', { ...data, id });
        return { data: { offline: true, message: 'Group update queued.' } };
      }
      throw err;
    }
  },

  deleteGroup: async (id) => {
    if (!navigator.onLine) {
      await queueOperation('delete', 'group', { id });
      return { data: { offline: true, message: 'Group deletion queued for sync.' } };
    }
    try {
      return await api.delete(`/groups/${id}`);
    } catch (err) {
      if (!err.response || err.message === 'Network Error') {
        await queueOperation('delete', 'group', { id });
        return { data: { offline: true, message: 'Group deletion queued.' } };
      }
      throw err;
    }
  },

  addMember: async (groupId, data) => {
    await invalidateCache(`/groups/${groupId}`);
    if (!navigator.onLine) {
      await queueOperation('add_member', 'group', { ...data, groupId });
      return { data: { offline: true, message: 'Member addition queued for sync.' } };
    }
    try {
      return await api.post(`/groups/${groupId}/members`, data);
    } catch (err) {
      if (!err.response || err.message === 'Network Error') {
        await queueOperation('add_member', 'group', { ...data, groupId });
        return { data: { offline: true, message: 'Network error. Member addition queued.' } };
      }
      throw err;
    }
  },

  removeMember: async (groupId, userId) => {
    if (!navigator.onLine) {
      await queueOperation('remove_member', 'group', { groupId, userId });
      return { data: { offline: true, message: 'Member removal queued for sync.' } };
    }
    try {
      return await api.delete(`/groups/${groupId}/members/${userId}`);
    } catch (err) {
      if (!err.response || err.message === 'Network Error') {
        await queueOperation('remove_member', 'group', { groupId, userId });
        return { data: { offline: true, message: 'Member removal queued.' } };
      }
      throw err;
    }
  },

  leaveGroup: async (groupId) => {
    if (!navigator.onLine) {
      await queueOperation('leave', 'group', { groupId });
      return { data: { offline: true, message: 'Leave group queued for sync.' } };
    }
    try {
      return await api.post(`/groups/${groupId}/leave`);
    } catch (err) {
      if (!err.response || err.message === 'Network Error') {
        await queueOperation('leave', 'group', { groupId });
        return { data: { offline: true, message: 'Leave group queued.' } };
      }
      throw err;
    }
  },
};

export default groupService;
