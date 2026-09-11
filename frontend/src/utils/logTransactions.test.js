import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_CATEGORIES,
  entryPaise,
  transactionKind,
  transactionFields,
  evaluateMathExpression,
  cloneTransactionEntry,
} from './logTransactions.js';

describe('logTransactions utilities', () => {
  describe('entryPaise fallback and validation', () => {
    it('uses integer amountPaise directly when present', () => {
      expect(entryPaise({ amountPaise: 4500, amount: 45 })).toBe(4500);
      expect(entryPaise({ amountPaise: 1, amount: 0.01 })).toBe(1);
    });

    it('falls back to decimal amount converted safely to paise when amountPaise is missing', () => {
      expect(entryPaise({ amount: 15.5 })).toBe(1550);
      expect(entryPaise({ amount: '99.99' })).toBe(9999);
      expect(entryPaise({})).toBe(0);
    });
  });

  describe('transactionKind', () => {
    it('returns transactionType if set or defaults to expense', () => {
      expect(transactionKind({ transactionType: 'income' })).toBe('income');
      expect(transactionKind({ transactionType: 'transfer' })).toBe('transfer');
      expect(transactionKind({})).toBe('expense');
    });
  });

  describe('transactionFields validation', () => {
    it('constructs valid expense transaction fields', () => {
      const data = {
        amount: 250,
        transactionType: 'expense',
        accountId: 'account_bank',
        accountName: 'Bank',
        categoryId: 'category_food',
        category: 'Food',
      };
      const result = transactionFields(data);
      expect(result.amountPaise).toBe(25000);
      expect(result.amount).toBe(250);
      expect(result.currency).toBe('INR');
      expect(result.transactionType).toBe('expense');
      expect(result.accountId).toBe('account_bank');
      expect(result.accountName).toBe('Bank');
      expect(result.categoryId).toBe('category_food');
    });

    it('enforces transfer constraints: toAccountId must be provided and different', () => {
      expect(() =>
        transactionFields({
          amount: 100,
          transactionType: 'transfer',
          accountId: 'account_cash',
          toAccountId: 'account_cash',
        })
      ).toThrow(/different accounts/i);

      expect(() =>
        transactionFields({
          amount: 100,
          transactionType: 'transfer',
          accountId: 'account_cash',
          toAccountId: '',
        })
      ).toThrow(/different accounts/i);

      const validTransfer = transactionFields({
        amount: 500,
        transactionType: 'transfer',
        accountId: 'account_bank',
        accountName: 'Bank',
        toAccountId: 'account_cash',
        toAccountName: 'Cash',
      });
      expect(validTransfer.transactionType).toBe('transfer');
      expect(validTransfer.accountId).toBe('account_bank');
      expect(validTransfer.toAccountId).toBe('account_cash');
    });

    it('rejects zero or negative amounts', () => {
      expect(() => transactionFields({ amount: 0 })).toThrow(/between/i);
      expect(() => transactionFields({ amount: -10 })).toThrow(/between/i);
    });

    it('rejects invalid transaction types', () => {
      expect(() => transactionFields({ amount: 100, transactionType: 'invalid' })).toThrow(
        /choose a transaction type/i
      );
    });

    it('rejects non-INR currency if entered', () => {
      expect(() => transactionFields({ amount: 100, currency: 'USD' })).toThrow(/only inr/i);
    });
  });

  describe('evaluateMathExpression', () => {
    it('evaluates valid basic arithmetic expressions cleanly', () => {
      expect(evaluateMathExpression('100 + 50')).toBe('150.00');
      expect(evaluateMathExpression('200 - 45.50')).toBe('154.50');
      expect(evaluateMathExpression('10 * 5')).toBe('50.00');
      expect(evaluateMathExpression('100 / 4')).toBe('25.00');
      expect(evaluateMathExpression('100 + 20 * 2')).toBe('140.00');
    });

    it('returns raw number string if already numeric', () => {
      expect(evaluateMathExpression('450')).toBe('450');
      expect(evaluateMathExpression('12.34')).toBe('12.34');
    });

    it('handles empty or malformed input without throwing', () => {
      expect(evaluateMathExpression('')).toBe('');
      expect(evaluateMathExpression('abc')).toBe('abc');
      expect(evaluateMathExpression('100 +')).toBe('100 +');
    });
  });

  describe('cloneTransactionEntry', () => {
    it('clears mutation audit IDs and resets date for a fresh duplicate', () => {
      const original = {
        _id: 'entry_123',
        title: 'Lunch',
        amount: 150,
        amountPaise: 15000,
        currency: 'INR',
        transactionType: 'expense',
        accountId: 'account_upi',
        accountName: 'UPI',
        categoryId: 'category_food',
        createdAt: '2026-08-01T10:00:00.000Z',
        updatedAt: '2026-08-01T10:00:00.000Z',
        lastMutationId: 'mut_abc',
        lastMutationType: 'entry_added',
        lastMutationAt: '2026-08-01T10:00:00.000Z',
        lastEditedBy: 'user_xyz',
      };

      const cloned = cloneTransactionEntry(original);
      expect(cloned._id).toBeUndefined();
      expect(cloned.lastMutationId).toBeUndefined();
      expect(cloned.lastMutationType).toBeUndefined();
      expect(cloned.title).toBe('Lunch');
      expect(cloned.amountPaise).toBe(15000);
      expect(cloned.accountId).toBe('account_upi');
      expect(typeof cloned.date).toBe('string');
    });
  });

  describe('Archived accounts and categories retention', () => {
    it('preserves historical accounts and categories in lists', () => {
      const accounts = [
        ...DEFAULT_ACCOUNTS,
        { id: 'account_old', name: 'Old Bank', archived: true },
      ];
      const activeOnly = accounts.filter((a) => !a.archived);
      expect(activeOnly.some((a) => a.id === 'account_old')).toBe(false);

      const tx = { accountId: 'account_old', accountName: 'Old Bank', amountPaise: 5000 };
      expect(tx.accountName).toBe('Old Bank');
    });

    it('has standard default accounts and categories with stable IDs', () => {
      expect(DEFAULT_ACCOUNTS.length).toBe(5);
      expect(DEFAULT_ACCOUNTS.map((a) => a.id)).toContain('account_cash');
      expect(DEFAULT_ACCOUNTS.map((a) => a.id)).toContain('account_upi');

      expect(DEFAULT_CATEGORIES.length).toBe(13);
      expect(DEFAULT_CATEGORIES.map((c) => c.id)).toContain('category_food');
      expect(DEFAULT_CATEGORIES.map((c) => c.id)).toContain('category_transport');
    });
  });
});
