import express from 'express';
import {
  createGroup,
  getGroups,
  getGroup,
  updateGroup,
  deleteGroup,
  addMember,
  removeMember,
  joinGroupByCode,
  getGroupActivity,
  getGroupBalances,
} from '../controllers/groupController.js';

import { protect } from '../middleware/auth.js';
import { createGroupRules, idParamRule, validate } from '../middleware/validator.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.route('/')
  .post(createGroupRules, validate, createGroup)
  .get(getGroups);

router.route('/:id')
  .get(idParamRule, validate, getGroup)
  .put(idParamRule, validate, updateGroup)
  .delete(idParamRule, validate, deleteGroup);

router.post('/:id/members', idParamRule, validate, addMember);
router.delete('/:id/members/:userId', idParamRule, validate, removeMember);

router.post('/join/:code', joinGroupByCode);

router.get('/:id/activity', idParamRule, validate, getGroupActivity);
router.get('/:id/balances', idParamRule, validate, getGroupBalances);

export default router;
