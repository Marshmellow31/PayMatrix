import api from './api';

const friendService = {
  searchUsers: (query) => api.get(`/friends/search?query=${query}`),
  sendRequest: (receiverId) => api.post('/friends/request', { receiverId }),
  getRequests: () => api.get('/friends/requests'),
  respondToRequest: (requestId, status) => api.put(`/friends/request/${requestId}`, { status }),
  getFriends: () => api.get('/friends'),
  getNetworkAnalytics: () => api.get('/friends/network/analytics'),
  getFriendAnalytics: (friendId) => api.get(`/friends/${friendId}/analytics`),
};

export default friendService;
