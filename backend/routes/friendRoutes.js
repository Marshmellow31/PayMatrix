import express from 'express';
import { 
  searchUsers, 
  sendFriendRequest, 
  getFriendRequests, 
  respondToRequest, 
  getFriends, 
  getFriendAnalytics,
  getNetworkAnalytics
} from '../controllers/friendController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/search', searchUsers);
router.get('/requests', getFriendRequests);
router.post('/request', sendFriendRequest);
router.put('/request/:id', respondToRequest);
router.get('/', getFriends);
router.get('/network/analytics', getNetworkAnalytics);
router.get('/:friendId/analytics', getFriendAnalytics);

export default router;
