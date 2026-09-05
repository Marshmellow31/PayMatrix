/**
 * Balance Engine for PayMatrix
 * Handles net balance calculations and debt simplification (min-flow algorithm).
 * All calculations use integer paise. Rupee numbers are exposed only at UI boundaries.
 */
import { allocatePaise, fromPaise, toPaise } from './money.js';

/**
 * Extracts a unique ID from various member/user object shapes or strings.
 */
const extractUid = (user) => {
  if (!user) return null;
  if (typeof user === 'string') return user;
  // Handle various object shapes: { _id }, { uid }, { id }, or { user: { _id } }
  const uid =
    user._id ||
    user.uid ||
    user.id ||
    (user.user &&
      (user.user._id ||
        user.user.uid ||
        user.user.id ||
        (typeof user.user === 'string' ? user.user : null)));
  return uid ? uid.toString() : null;
};

/**
 * Calculates expense splits based on amount and split configuration.
 * Returns Array of { user: userId, amount: float, percent?: float, shares?: int }
 */
export const calculateSplits = (amount, splitType, splitData, participants = []) => {
  const totalPaise = toPaise(amount);
  if (participants.length === 0) return [];

  const finalize = (entries) =>
    entries
      .map((entry) => ({
        ...entry,
        amountPaise: entry.paise,
        amount: fromPaise(entry.paise),
      }))
      .map(({ paise: _paise, weight: _weight, ...entry }) => entry);

  switch (splitType) {
    case 'equal': {
      return finalize(
        allocatePaise(
          totalPaise,
          participants.map((user) => ({ user, weight: 1 }))
        )
      );
    }
    case 'percentage': {
      const pcts = splitData.percentages || {};
      const entries = participants.map((user) => ({
        user,
        weight: Number(pcts[user] || 0),
        percent: Number(pcts[user] || 0),
      }));
      const totalPercent = entries.reduce((sum, entry) => sum + entry.percent, 0);
      if (Math.abs(totalPercent - 100) > 0.0001) throw new Error('Percentages must total 100%.');
      return finalize(allocatePaise(totalPaise, entries));
    }
    case 'exact': {
      const values = splitData.exactAmounts || {};
      const entries = participants.map((user) => ({ user, paise: toPaise(values[user] || 0) }));
      if (entries.reduce((sum, entry) => sum + entry.paise, 0) !== totalPaise) {
        throw new Error('Exact splits must equal the expense total.');
      }
      return finalize(entries);
    }
    case 'shares': {
      const shares = splitData.shares || {};
      const entries = participants.map((user) => ({
        user,
        weight: Number.parseInt(shares[user] || 1, 10),
        shares: Number.parseInt(shares[user] || 1, 10),
      }));
      return finalize(allocatePaise(totalPaise, entries));
    }
    case 'itemized': {
      // Restaurant-style split: each participant has a base "dish" cost, and the
      // bill total includes GST/charges layered on top of the dish subtotal.
      // We distribute the *whole* total proportionally to each dish, so a pricier
      // dish absorbs a larger share of the tax. Algebraically each person pays
      //   dish * (total / subtotal) === dish + (dish / subtotal) * (total - subtotal)
      // i.e. their dish plus their proportional slice of the GST.
      const dishes = splitData.dishAmounts || {};
      const dishPaise = participants.map((user) => ({
        user,
        dishPaise: toPaise(dishes[user] || 0),
      }));
      const subtotalPaise = dishPaise.reduce((sum, entry) => sum + entry.dishPaise, 0);

      // No dishes entered yet → degrade gracefully to an equal split of the total.
      if (subtotalPaise <= 0) {
        return finalize(
          allocatePaise(
            totalPaise,
            participants.map((user) => ({ user, weight: 1, dish: 0, dishPaise: 0 }))
          )
        );
      }
      return finalize(
        allocatePaise(
          totalPaise,
          dishPaise.map((entry) => ({
            ...entry,
            dish: fromPaise(entry.dishPaise),
            weight: entry.dishPaise,
          }))
        )
      );
    }
    default:
      return [];
  }
};
export const simplifyDebts = (balances) => {
  const creditors = [];
  const debtors = [];

  // Filter out zero balances and split into creditors and debtors
  Object.keys(balances).forEach((userId) => {
    const amountPaise = toPaise(balances[userId]);
    if (amountPaise === 0) return;

    if (amountPaise > 0) {
      creditors.push({ userId, amountPaise });
    } else {
      debtors.push({ userId, amountPaise: Math.abs(amountPaise) });
    }
  });

  // Sort both lists (descending) to match largest creditor with largest debtor
  creditors.sort((a, b) => b.amountPaise - a.amountPaise);
  debtors.sort((a, b) => b.amountPaise - a.amountPaise);

  const simplifiedTransactions = [];

  let i = 0; // creditor index
  let j = 0; // debtor index

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];

    const amountPaise = Math.min(creditor.amountPaise, debtor.amountPaise);

    simplifiedTransactions.push({
      from: debtor.userId,
      to: creditor.userId,
      amountPaise,
      amount: fromPaise(amountPaise),
    });

    creditor.amountPaise -= amountPaise;
    debtor.amountPaise -= amountPaise;

    if (creditor.amountPaise === 0) i++;
    if (debtor.amountPaise === 0) j++;
  }

  return simplifiedTransactions;
};

/**
 * Computes net balances for a group by aggregating all expenses and settlements.
 * expenses: Array of expense objects
 * settlements: Array of settlement objects
 */
export const computeGroupBalances = (expenses = [], settlements = [], groupMembers = []) => {
  const netBalances = {};

  // Initialize for all group members
  groupMembers.forEach((member) => {
    const id = extractUid(member);
    if (id) {
      netBalances[id] = 0;
    }
  });

  // Add from expenses
  for (const expense of expenses) {
    try {
      if (expense.status === 'deleted') continue;

      // Ensure splits exist
      const splits = expense.splits || [];

      if (Array.isArray(expense.payers) && expense.payers.length > 0) {
        // Multi-payer allocation: credit each payer and debit each split participant
        expense.payers.forEach((payer) => {
          const payerId = extractUid(payer.user || payer);
          if (!payerId) return;
          const payerPaise = Number.isSafeInteger(payer.amountPaise)
            ? payer.amountPaise
            : toPaise(payer.amount || 0);
          netBalances[payerId] = (netBalances[payerId] || 0) + payerPaise;
        });

        splits.forEach((split) => {
          const splitUserId = extractUid(split.user);
          if (!splitUserId) return;
          const splitPaise = Number.isSafeInteger(split.amountPaise)
            ? split.amountPaise
            : toPaise(split.amount || 0);
          netBalances[splitUserId] = (netBalances[splitUserId] || 0) - splitPaise;
        });
      } else {
        // Legacy single payer
        const payerId = extractUid(expense.paidBy);
        if (!payerId) continue;

        splits.forEach((split) => {
          const splitUserId = extractUid(split.user);
          if (!splitUserId) return;

          const splitPaise = Number.isSafeInteger(split.amountPaise)
            ? split.amountPaise
            : toPaise(split.amount || 0);

          // The person who paid is owed back
          if (payerId !== splitUserId) {
            netBalances[payerId] = (netBalances[payerId] || 0) + splitPaise;
            netBalances[splitUserId] = (netBalances[splitUserId] || 0) - splitPaise;
          }
        });
      }
    } catch (err) {
      console.error('Error processing expense for balance:', err, expense);
    }
  }

  // Add from settlements
  for (const settlement of settlements) {
    try {
      const payerId = extractUid(settlement.payer || settlement.createdBy);
      const payeeId = extractUid(settlement.payee || settlement.recipient || settlement.to);
      if (
        !payerId ||
        !payeeId ||
        payerId === payeeId ||
        settlement.status === 'deleted' ||
        (settlement.confirmationStatus && settlement.confirmationStatus !== 'confirmed')
      )
        continue;

      const amountPaise = Number.isSafeInteger(settlement.amountPaise)
        ? settlement.amountPaise
        : toPaise(settlement.amount || 0);
      if (amountPaise <= 0) continue;

      // Payer settles debt (less negative), Payee is paid (less positive)
      netBalances[payerId] = (netBalances[payerId] || 0) + amountPaise;
      netBalances[payeeId] = (netBalances[payeeId] || 0) - amountPaise;
    } catch (err) {
      console.error('Error processing settlement for balance:', err, settlement);
    }
  }

  return Object.fromEntries(
    Object.entries(netBalances).map(([userId, paise]) => [userId, fromPaise(paise)])
  );
};
