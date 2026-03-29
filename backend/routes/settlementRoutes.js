import express from 'express';
import {
  getBalances,
  createSettlement,
  getSettlements,
} from '../controllers/settlementController.js';
import { protect } from '../middleware/auth.js';
import { idParamRule, validate } from '../middleware/validator.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// Group-scoped settlement routes
router.get('/:id/balances', idParamRule, validate, getBalances);

router.route('/:id/settlements')
  .post(idParamRule, validate, createSettlement)
  .get(idParamRule, validate, getSettlements);

export default router;
