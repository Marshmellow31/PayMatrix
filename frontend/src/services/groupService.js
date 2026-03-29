import api from './api.js';

const groupService = {
  getGroups: () => api.get('/v1/groups'),
  getGroup: (id) => api.get(`/v1/groups/${id}`),
  createGroup: (data) => api.post('/v1/groups', data),
  updateGroup: (id, data) => api.put(`/v1/groups/${id}`, data),
  deleteGroup: (id) => api.delete(`/v1/groups/${id}`),
  addMember: (groupId, data) => api.post(`/v1/groups/${groupId}/members`, data),
  removeMember: (groupId, userId) => api.delete(`/v1/groups/${groupId}/members/${userId}`),
};

export default groupService;
