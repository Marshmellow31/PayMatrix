import { z } from 'zod';

/**
 * Validation schemas for PayMatrix core entities.
 * Defines strict types, lengths, and formats to ensure data integrity.
 * Using .passthrough() during development to prevent errors from blocking testers.
 */

// User Profile Schema
export const UserSchema = z
  .object({
    displayName: z.string().min(1).max(50).optional(),
    avatar: z.string().url().or(z.string().length(0)).optional(),
    upiId: z
      .string()
      .regex(/^[\w.-]+@[\w.-]+$/i, 'Invalid UPI ID format')
      .or(z.string().length(0))
      .optional(),
    phone: z
      .string()
      .regex(/^\+?[\d\s-]{10,15}$/)
      .or(z.string().length(0))
      .optional(),
    email: z.string().email().optional(),
    updatedAt: z.string().datetime().optional(),
  })
  .passthrough();

// Group Schema Base
export const GroupBaseSchema = z
  .object({
    name: z.string().max(100).optional(),
    title: z.string().max(100).optional(), // Support both title and name
    description: z.string().max(500).optional(),
    members: z.array(z.string().min(1)).min(1, 'Group must have at least one member'),
    category: z.string().max(50).optional(),
    inviteCode: z.string().max(20).optional(),
    admin: z.string().optional(),
    status: z.enum(['active', 'archived', 'deleted']).optional(),
  })
  .passthrough();

export const GroupSchema = GroupBaseSchema.refine((data) => data.name || data.title, {
  message: 'Group name is required',
  path: ['title'],
});

// Expense Schema
export const ExpenseSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(100),
    description: z.string().max(500).optional(),
    amount: z.number().positive('Amount must be positive').max(1000000, 'Amount exceeds limit'),
    amountPaise: z.number().int().positive().max(100000000),
    currency: z.string().length(3).default('INR'),
    date: z
      .string()
      .datetime()
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
      .optional(), // ISO or YYYY-MM-DD
    paidBy: z.string().min(1, 'Payer UID required'),
    createdBy: z.string().min(1, 'Creator UID required'),
    paidByName: z.string().optional(),
    splitType: z.enum(['equal', 'exact', 'percentage', 'shares', 'itemized']).default('equal'),
    splitData: z.record(z.string(), z.any()), // Further validation in split logic
    participants: z.array(z.string()).min(1),
    splitUserIds: z.array(z.string()).min(1),
    category: z.string().max(50).optional(),
    attachments: z.array(z.string()).optional(),
    notes: z.string().max(500).optional(),
    groupId: z.string().min(1).optional(),
    admin: z.string().optional(),
    splits: z
      .array(
        z.object({
          user: z.string().min(1),
          amount: z.number(),
          amountPaise: z.number().int(),
          percent: z.number().optional(),
          shares: z.number().optional(),
          dish: z.number().optional(), // pre-GST dish/item cost for itemized splits
        })
      )
      .optional(),
    createdAt: z
      .string()
      .datetime()
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/))
      .optional(),
    updatedAt: z.string().datetime().optional(),
  })
  .passthrough();

// Friend Request Schema
export const FriendRequestSchema = z
  .object({
    from: z.string().min(1),
    to: z.string().min(1, 'Recipient required'),
    status: z.enum(['pending', 'accepted', 'rejected']).default('pending'),
    createdAt: z.string().datetime().optional(),
  })
  .passthrough();

// Personal Log Entry Schema (manual entries; 'expense' entries are system-synced)
export const LogEntrySchema = z
  .object({
    type: z.enum(['manual', 'expense']).default('manual'),
    title: z.string().min(1, 'Title is required').max(100),
    amount: z.number().positive('Amount must be positive').max(1000000, 'Amount exceeds limit'),
    category: z.string().max(50).optional(),
    place: z.string().max(100).optional(),
    note: z.string().max(500).optional(),
    date: z.string().min(1, 'Date is required'),
    groupId: z.string().optional(),
    groupName: z.string().optional(),
    expenseId: z.string().optional(),
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
  })
  .passthrough();

const validationService = {
  /**
   * Validates data against a schema and returns the parsed result.
   * Throws an error if validation fails.
   */
  validate: (schema, data) => {
    try {
      return schema.parse(data);
    } catch (err) {
      // Deeply safe error extraction for Zod and other error types
      let issues = [];
      if (err && typeof err === 'object') {
        issues = Array.isArray(err.issues)
          ? err.issues
          : Array.isArray(err.errors)
            ? err.errors
            : [];
      }

      console.error(
        '[VALIDATION_ERROR]',
        issues.length > 0 ? issues : err?.message || 'Internal Validation Error'
      );

      const firstError = issues?.[0]?.message || err?.message || 'Invalid data format';
      throw new Error(firstError);
    }
  },
};

export default validationService;
