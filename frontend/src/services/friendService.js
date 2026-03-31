import api from './api';
import { queueOperation } from './db.js';

const friendService = {
  searchUsers: (query) => api.get(`/friends/search?query=${query}`),

  sendRequest: async (receiverId) => {
    if (!navigator.onLine) {
      await queueOperation('create', 'friend_request', { receiverId });
      return { data: { offline: true, message: 'Friend request queued for sync.' } };
    }
    try {
      return await api.post('/friends/request', { receiverId });
    } catch (err) {
      if (!err.response || err.message === 'Network Error') {
        await queueOperation('create', 'friend_request', { receiverId });
        return { data: { offline: true, message: 'Friend request queued.' } };
      }
      throw err;
    }
  },

  getRequests: () => api.get('/friends/requests'),

  respondToRequest: async (requestId, status) => {
    if (!navigator.onLine) {
      await queueOperation('update', 'friend_request', { requestId, status });
      return { data: { offline: true, message: 'Response queued for sync.' } };
    }
    try {
      return await api.put(`/friends/request/${requestId}`, { status });
    } catch (err) {
      if (!err.response || err.message === 'Network Error') {
        await queueOperation('update', 'friend_request', { requestId, status });
        return { data: { offline: true, message: 'Response queued.' } };
      }
      throw err;
    }
  },

  getFriends: () => api.get('/friends'),
  getNetworkAnalytics: () => api.get('/friends/network/analytics'),
  getFriendAnalytics: (friendId) => api.get(`/friends/${friendId}/analytics`),
};

export default friendService;
