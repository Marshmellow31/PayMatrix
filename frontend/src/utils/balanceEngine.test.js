/**
 * Tests for balanceEngine.js
 *
 * These tests cover the financial logic that directly drives what users owe
 * each other. Correctness here is critical — a bug means real money disputes.
 */
import { describe, it, expect } from 'vitest';
import { calculateSplits, simplifyDebts, computeGroupBalances } from './balanceEngine.js';

// ─── calculateSplits ─────────────────────────────────────────────────────────

describe('calculateSplits', () => {
  const members = ['alice', 'bob', 'carol'];

  it('equal: divides total evenly across all participants', () => {
    const splits = calculateSplits(90, 'equal', {}, members);
    expect(splits).toHaveLength(3);
    splits.forEach(s => expect(s.amount).toBe(30));
  });

  it('equal: handles non-divisible amounts via rounding', () => {
    // 100 / 3 = 33.33… — should not accumulate float drift
    const splits = calculateSplits(100, 'equal', {}, members);
    expect(splits.every(s => typeof s.amount === 'number')).toBe(true);
    const total = splits.reduce((s, x) => s + x.amount, 0);
    // Allow 1 cent rounding tolerance across three splits
    expect(Math.abs(total - 100)).toBeLessThanOrEqual(0.02);
  });

  it('equal: returns empty array for no participants', () => {
    expect(calculateSplits(100, 'equal', {}, [])).toEqual([]);
  });

  it('percentage: allocates correct shares', () => {
    const splitData = { percentages: { alice: '50', bob: '30', carol: '20' } };
    const splits = calculateSplits(200, 'percentage', splitData, members);
    const map = Object.fromEntries(splits.map(s => [s.user, s.amount]));
    expect(map.alice).toBe(100);
    expect(map.bob).toBe(60);
    expect(map.carol).toBe(40);
  });

  it('exact: respects manually entered amounts', () => {
    const splitData = { exactAmounts: { alice: '50', bob: '25', carol: '25' } };
    const splits = calculateSplits(100, 'exact', splitData, members);
    const map = Object.fromEntries(splits.map(s => [s.user, s.amount]));
    expect(map.alice).toBe(50);
    expect(map.bob).toBe(25);
    expect(map.carol).toBe(25);
  });

  it('shares: distributes proportionally by share count', () => {
    // alice=2, bob=1, carol=1 → alice pays half, others quarter each
    const splitData = { shares: { alice: '2', bob: '1', carol: '1' } };
    const splits = calculateSplits(100, 'shares', splitData, members);
    const map = Object.fromEntries(splits.map(s => [s.user, s.amount]));
    expect(map.alice).toBe(50);
    expect(map.bob).toBe(25);
    expect(map.carol).toBe(25);
  });

  it('itemized: distributes proportionally to dish costs (including GST layer)', () => {
    // alice ordered ₹100, bob ₹100. Total bill is ₹240 (includes ₹40 GST).
    const splitData = { dishAmounts: { alice: '100', bob: '100' } };
    const splits = calculateSplits(240, 'itemized', splitData, ['alice', 'bob']);
    const map = Object.fromEntries(splits.map(s => [s.user, s.amount]));
    // Each dish is 50% of subtotal → each pays half of total
    expect(map.alice).toBe(120);
    expect(map.bob).toBe(120);
  });

  it('itemized: degrades to equal split when no dish amounts provided', () => {
    const splits = calculateSplits(100, 'itemized', {}, ['alice', 'bob']);
    splits.forEach(s => expect(s.amount).toBe(50));
  });

  it('unknown split type: returns empty array', () => {
    expect(calculateSplits(100, 'custom_unknown', {}, members)).toEqual([]);
  });
});

// ─── simplifyDebts ────────────────────────────────────────────────────────────

describe('simplifyDebts', () => {
  it('returns empty array for zero balances', () => {
    expect(simplifyDebts({ alice: 0, bob: 0 })).toEqual([]);
  });

  it('single debtor → single creditor', () => {
    const txs = simplifyDebts({ alice: 50, bob: -50 });
    expect(txs).toHaveLength(1);
    expect(txs[0]).toMatchObject({ from: 'bob', to: 'alice', amount: 50 });
  });

  it('two debtors → one creditor: produces two transactions', () => {
    const txs = simplifyDebts({ alice: 100, bob: -60, carol: -40 });
    expect(txs).toHaveLength(2);
    const totalTransferred = txs.reduce((s, t) => s + t.amount, 0);
    expect(Math.abs(totalTransferred - 100)).toBeLessThanOrEqual(0.02);
  });

  it('simplifies: two cross-debts collapse into fewer transactions', () => {
    // alice owes bob 50, bob owes carol 50 → net: alice owes carol 50
    const txs = simplifyDebts({ alice: -50, bob: 0, carol: 50 });
    expect(txs.length).toBeLessThanOrEqual(2);
  });

  it('ignores dust balances (< 0.01)', () => {
    const txs = simplifyDebts({ alice: 0.005, bob: -0.005 });
    expect(txs).toHaveLength(0);
  });
});

// ─── computeGroupBalances ─────────────────────────────────────────────────────

describe('computeGroupBalances', () => {
  const members = [{ uid: 'alice' }, { uid: 'bob' }, { uid: 'carol' }];

  it('initialises all members to zero with no expenses or settlements', () => {
    const balances = computeGroupBalances([], [], members);
    expect(balances.alice).toBe(0);
    expect(balances.bob).toBe(0);
    expect(balances.carol).toBe(0);
  });

  it('payer is owed money; participants owe money', () => {
    const expenses = [{
      paidBy: 'alice',
      amount: 90,
      status: 'active',
      splits: [
        { user: 'alice', amount: 30 },
        { user: 'bob',   amount: 30 },
        { user: 'carol', amount: 30 },
      ],
    }];
    const balances = computeGroupBalances(expenses, [], members);
    // alice paid for bob and carol → alice is owed 60
    expect(balances.alice).toBe(60);
    expect(balances.bob).toBe(-30);
    expect(balances.carol).toBe(-30);
  });

  it('settlement reduces debt correctly', () => {
    const expenses = [{
      paidBy: 'alice',
      amount: 60,
      status: 'active',
      splits: [
        { user: 'alice', amount: 30 },
        { user: 'bob',   amount: 30 },
      ],
    }];
    const settlements = [{
      payer: 'bob',
      payee: 'alice',
      amount: 30,
      status: 'active',
    }];
    const balances = computeGroupBalances(expenses, settlements, [
      { uid: 'alice' }, { uid: 'bob' }
    ]);
    expect(Math.abs(balances.alice)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(balances.bob)).toBeLessThanOrEqual(0.01);
  });

  it('ignores deleted expenses', () => {
    const expenses = [{
      paidBy: 'alice',
      amount: 90,
      status: 'deleted',
      splits: [
        { user: 'alice', amount: 30 },
        { user: 'bob',   amount: 30 },
        { user: 'carol', amount: 30 },
      ],
    }];
    const balances = computeGroupBalances(expenses, [], members);
    expect(balances.alice).toBe(0);
  });

  it('handles missing splits gracefully', () => {
    const expenses = [{ paidBy: 'alice', amount: 90, status: 'active' }];
    expect(() => computeGroupBalances(expenses, [], members)).not.toThrow();
  });

  it('net balances sum to zero (conservation of money)', () => {
    const expenses = [
      {
        paidBy: 'alice', amount: 90, status: 'active',
        splits: [{ user: 'alice', amount: 30 }, { user: 'bob', amount: 30 }, { user: 'carol', amount: 30 }],
      },
      {
        paidBy: 'bob', amount: 60, status: 'active',
        splits: [{ user: 'alice', amount: 20 }, { user: 'bob', amount: 20 }, { user: 'carol', amount: 20 }],
      },
    ];
    const balances = computeGroupBalances(expenses, [], members);
    const sum = Object.values(balances).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum)).toBeLessThanOrEqual(0.01);
  });
});
