const express = require('express');
const router = express.Router();
const { addExpense, getGroupExpenses, getUserExpenses, getGroupBalances } = require('../controllers/expenseController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').post(protect, addExpense);
router.get('/group/:id', protect, getGroupExpenses);
router.get('/group/:id/balances', protect, getGroupBalances);
router.get('/me', protect, getUserExpenses);

module.exports = router;
