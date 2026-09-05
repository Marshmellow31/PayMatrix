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
    splits.forEach((s) => expect(s.amount).toBe(30));
  });

  it('equal: allocates non-divisible paise deterministically and conserves the total', () => {
    const splits = calculateSplits(100, 'equal', {}, members);
    expect(splits.map((split) => split.amountPaise)).toEqual([3334, 3333, 3333]);
    expect(splits.reduce((sum, split) => sum + split.amountPaise, 0)).toBe(10000);
  });

  it('equal: returns empty array for no participants', () => {
    expect(calculateSplits(100, 'equal', {}, [])).toEqual([]);
  });

  it('percentage: allocates correct shares', () => {
    const splitData = { percentages: { alice: '50', bob: '30', carol: '20' } };
    const splits = calculateSplits(200, 'percentage', splitData, members);
    const map = Object.fromEntries(splits.map((s) => [s.user, s.amount]));
    expect(map.alice).toBe(100);
    expect(map.bob).toBe(60);
    expect(map.carol).toBe(40);
  });

  it('exact: respects manually entered amounts', () => {
    const splitData = { exactAmounts: { alice: '50', bob: '25', carol: '25' } };
    const splits = calculateSplits(100, 'exact', splitData, members);
    const map = Object.fromEntries(splits.map((s) => [s.user, s.amount]));
    expect(map.alice).toBe(50);
    expect(map.bob).toBe(25);
    expect(map.carol).toBe(25);
  });

  it('exact: rejects values that do not conserve the expense total', () => {
    expect(() =>
      calculateSplits(100, 'exact', { exactAmounts: { alice: 40, bob: 30, carol: 20 } }, members)
    ).toThrow('Exact splits must equal the expense total.');
  });

  it('shares: distributes proportionally by share count', () => {
    // alice=2, bob=1, carol=1 → alice pays half, others quarter each
    const splitData = { shares: { alice: '2', bob: '1', carol: '1' } };
    const splits = calculateSplits(100, 'shares', splitData, members);
    const map = Object.fromEntries(splits.map((s) => [s.user, s.amount]));
    expect(map.alice).toBe(50);
    expect(map.bob).toBe(25);
    expect(map.carol).toBe(25);
  });

  it('itemized: distributes proportionally to dish costs (including GST layer)', () => {
    // alice ordered ₹100, bob ₹100. Total bill is ₹240 (includes ₹40 GST).
    const splitData = { dishAmounts: { alice: '100', bob: '100' } };
    const splits = calculateSplits(240, 'itemized', splitData, ['alice', 'bob']);
    const map = Object.fromEntries(splits.map((s) => [s.user, s.amount]));
    // Each dish is 50% of subtotal → each pays half of total
    expect(map.alice).toBe(120);
    expect(map.bob).toBe(120);
  });

  it('itemized: shares a net discount in the same ratio as dishes', () => {
    // Dishes sum to ₹200 but the bill total is only ₹160 (a ₹40 discount).
    // alice ordered ₹150, bob ₹50 → the discount must split 3:1, not evenly.
    const splitData = { dishAmounts: { alice: '150', bob: '50' } };
    const splits = calculateSplits(160, 'itemized', splitData, ['alice', 'bob']);
    const map = Object.fromEntries(splits.map((s) => [s.user, s.amount]));
    // 160/200 = 0.8 → alice pays 150*0.8, bob pays 50*0.8
    expect(map.alice).toBe(120);
    expect(map.bob).toBe(40);
    // The pricier eater absorbs the larger discount (30 vs 10) and it reconciles.
    expect(map.alice + map.bob).toBe(160);
  });

  it('itemized: five diners with an overall discount, split by dish ratio', () => {
    const dishAmounts = { a: '100', b: '200', c: '300', d: '150', e: '250' };
    const subtotal = 1000;
    const total = 900; // ₹100 overall discount on the bill
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const splits = calculateSplits(total, 'itemized', { dishAmounts }, ids);
    const map = Object.fromEntries(splits.map((s) => [s.user, s.amount]));
    // Each person pays dish * (total/subtotal); discount share scales with dish.
    ids.forEach((id) => {
      const dish = parseFloat(dishAmounts[id]);
      expect(map[id]).toBeCloseTo(dish * (total / subtotal), 2);
    });
    // Splits always reconcile back to the exact bill total.
    expect(splits.reduce((s, x) => s + x.amount, 0)).toBeCloseTo(total, 2);
  });
  it('itemized: degrades to equal split when no dish amounts provided', () => {
    const splits = calculateSplits(100, 'itemized', {}, ['alice', 'bob']);
    splits.forEach((s) => expect(s.amount).toBe(50));
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
    const expenses = [
      {
        paidBy: 'alice',
        amount: 90,
        status: 'active',
        splits: [
          { user: 'alice', amount: 30 },
          { user: 'bob', amount: 30 },
          { user: 'carol', amount: 30 },
        ],
      },
    ];
    const balances = computeGroupBalances(expenses, [], members);
    // alice paid for bob and carol → alice is owed 60
    expect(balances.alice).toBe(60);
    expect(balances.bob).toBe(-30);
    expect(balances.carol).toBe(-30);
  });

  it('settlement reduces debt correctly', () => {
    const expenses = [
      {
        paidBy: 'alice',
        amount: 60,
        status: 'active',
        splits: [
          { user: 'alice', amount: 30 },
          { user: 'bob', amount: 30 },
        ],
      },
    ];
    const settlements = [
      {
        payer: 'bob',
        payee: 'alice',
        amount: 30,
        status: 'active',
      },
    ];
    const balances = computeGroupBalances(expenses, settlements, [
      { uid: 'alice' },
      { uid: 'bob' },
    ]);
    expect(Math.abs(balances.alice)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(balances.bob)).toBeLessThanOrEqual(0.01);
  });

  it('ignores a settlement until the payer-confirmed state is durable', () => {
    const expenses = [
      {
        paidBy: 'alice',
        splits: [
          { user: 'alice', amountPaise: 3000 },
          { user: 'bob', amountPaise: 3000 },
        ],
      },
    ];
    const pending = [
      { payer: 'bob', payee: 'alice', amountPaise: 3000, confirmationStatus: 'pending' },
    ];
    expect(computeGroupBalances(expenses, pending, [{ uid: 'alice' }, { uid: 'bob' }])).toEqual({
      alice: 30,
      bob: -30,
    });
  });

  it('ignores deleted expenses', () => {
    const expenses = [
      {
        paidBy: 'alice',
        amount: 90,
        status: 'deleted',
        splits: [
          { user: 'alice', amount: 30 },
          { user: 'bob', amount: 30 },
          { user: 'carol', amount: 30 },
        ],
      },
    ];
    const balances = computeGroupBalances(expenses, [], members);
    expect(balances.alice).toBe(0);
  });

  it('correctly calculates balances when an expense has multiple payers', () => {
    const expenses = [
      {
        payers: [
          { user: 'alice', amountPaise: 6000 },
          { user: 'bob', amountPaise: 4000 },
        ],
        amount: 100,
        amountPaise: 10000,
        status: 'active',
        splits: [
          { user: 'alice', amountPaise: 3334 },
          { user: 'bob', amountPaise: 3333 },
          { user: 'carol', amountPaise: 3333 },
        ],
      },
    ];
    const balances = computeGroupBalances(expenses, [], members);
    expect(balances.alice).toBe(26.66);
    expect(balances.bob).toBe(6.67);
    expect(balances.carol).toBe(-33.33);
  });

  it('handles missing splits gracefully', () => {
    const expenses = [{ paidBy: 'alice', amount: 90, status: 'active' }];
    expect(() => computeGroupBalances(expenses, [], members)).not.toThrow();
  });

  it('net balances sum to zero (conservation of money)', () => {
    const expenses = [
      {
        paidBy: 'alice',
        amount: 90,
        status: 'active',
        splits: [
          { user: 'alice', amount: 30 },
          { user: 'bob', amount: 30 },
          { user: 'carol', amount: 30 },
        ],
      },
      {
        paidBy: 'bob',
        amount: 60,
        status: 'active',
        splits: [
          { user: 'alice', amount: 20 },
          { user: 'bob', amount: 20 },
          { user: 'carol', amount: 20 },
        ],
      },
    ];
    const balances = computeGroupBalances(expenses, [], members);
    const sum = Object.values(balances).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum)).toBeLessThanOrEqual(0.01);
  });
});
