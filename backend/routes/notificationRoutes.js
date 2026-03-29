import express from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';
import { idParamRule, validate } from '../middleware/validator.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.get('/', getNotifications);
router.put('/:id/read', idParamRule, validate, markAsRead);
router.put('/read-all', markAllAsRead);

export default router;
