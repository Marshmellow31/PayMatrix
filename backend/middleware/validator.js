import { body, param, validationResult } from 'express-validator';
import { ApiError } from '../utils/apiResponse.js';

/**
 * Process validation results — call after validation chains
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((err) => err.msg);
    return next(new ApiError(messages.join('. '), 400));
  }
  next();
};

/**
 * Validation chains for registration
 */
export const registerRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

/**
 * Validation chains for login
 */
export const loginRules = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

/**
 * Validation chains for creating a group
 */
export const createGroupRules = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Group title is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('category')
    .optional()
    .isIn(['Trip', 'Roommates', 'Events', 'Couple', 'Other'])
    .withMessage('Invalid category'),
  body('currency')
    .optional()
    .trim()
    .isLength({ min: 1, max: 10 })
    .withMessage('Currency code is invalid'),
];

/**
 * Validation chains for creating an expense
 */
export const createExpenseRules = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Expense title is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('category')
    .optional()
    .isIn([
      'Food',
      'Travel',
      'Rent',
      'Entertainment',
      'Utilities',
      'Shopping',
      'Health',
      'Education',
      'Other',
    ])
    .withMessage('Invalid expense category'),
  body('date').optional().isISO8601().withMessage('Invalid date format'),
];

/**
 * Validation for MongoDB ObjectId params
 */
export const idParamRule = [
  param('id').isMongoId().withMessage('Invalid ID format'),
];
