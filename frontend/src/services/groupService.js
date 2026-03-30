import api from './api.js';
import { queueOperation } from './db.js';

const groupService = {
  getGroups: () => api.get('/groups'),
  getGroup: (id) => api.get(`/groups/${id}`),
  createGroup: async (data) => {
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
  updateGroup: (id, data) => api.put(`/groups/${id}`, data),
  deleteGroup: (id) => api.delete(`/groups/${id}`),
  addMember: async (groupId, data) => {
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
  removeMember: (groupId, userId) => api.delete(`/groups/${groupId}/members/${userId}`),
  leaveGroup: (groupId) => api.post(`/groups/${groupId}/leave`),
};

export default groupService;
