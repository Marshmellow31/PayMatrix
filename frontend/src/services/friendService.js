import { db, auth } from '../config/firebase.js';

const friendService = {
  searchUsers: async (query) => { return { data: { data: { users: [] } } }; },
  sendRequest: async (receiverId) => { return { data: { message: 'Friend request sent' } }; },
  getRequests: async () => { return { data: { data: { requests: [] } } }; },
  respondToRequest: async (requestId, status) => { return { data: { message: 'Response saved' } }; },
  getFriends: async () => { return { data: { data: { friends: [] } } }; },
  getNetworkAnalytics: async () => { return { data: { data: {} } }; },
  getFriendAnalytics: async (friendId) => { return { data: { data: {} } }; },
};

export default friendService;
