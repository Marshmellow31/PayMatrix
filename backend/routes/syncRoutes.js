import express from 'express';
import { processSyncQueue } from '../controllers/syncController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, processSyncQueue);

export default router;
