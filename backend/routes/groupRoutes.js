const express = require('express');
const router = express.Router();
const { createGroup, getGroups, joinGroup } = require('../controllers/groupController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').post(protect, createGroup).get(protect, getGroups);
router.post('/join', protect, joinGroup);

module.exports = router;
