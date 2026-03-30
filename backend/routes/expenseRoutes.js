import express from 'express';
import {
  addExpense,
  getExpenses,
  getExpense,
  updateExpense,
  deleteExpense,
  getFinancialSummary,
} from '../controllers/expenseController.js';
import { protect } from '../middleware/auth.js';
import { createExpenseRules, idParamRule, validate } from '../middleware/validator.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// Expense summary route
router.get('/expenses/summary', getFinancialSummary);

// Group-scoped expense routes
router.route('/groups/:id/expenses')
  .post(idParamRule, createExpenseRules, validate, addExpense)
  .get(idParamRule, validate, getExpenses);

// Individual expense routes
router.route('/expenses/:id')
  .get(idParamRule, validate, getExpense)
  .put(idParamRule, validate, updateExpense)
  .delete(idParamRule, validate, deleteExpense);

export default router;
