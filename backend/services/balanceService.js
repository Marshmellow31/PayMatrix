import Expense from '../models/Expense.js';
import Settlement from '../models/Settlement.js';

/**
 * Calculate net balance for each member in a group
 * Positive balance = owed money (creditor)
 * Negative balance = owes money (debtor)
 */
export const calculateBalances = async (groupId, memberIds) => {
  const balances = {};

  // Initialize all members with 0 balance
  memberIds.forEach((id) => {
    balances[id.toString()] = 0;
  });

  // Get all expenses for this group
  const expenses = await Expense.find({ group: groupId });

  for (const expense of expenses) {
    const payerId = expense.paidBy.toString();

    // The payer paid the full amount — they are owed this
    balances[payerId] = (balances[payerId] || 0) + expense.amount;

    // Each split user owes their share
    for (const split of expense.splits) {
      const userId = split.user.toString();
      balances[userId] = (balances[userId] || 0) - split.amount;
    }
  }

  // Factor in settlements
  const settlements = await Settlement.find({ group: groupId });

  for (const settlement of settlements) {
    const payerId = settlement.payer.toString();
    const payeeId = settlement.payee.toString();

    // Payer paid money to payee — payer's debt decreases, payee's credit decreases
    balances[payerId] = (balances[payerId] || 0) + settlement.amount;
    balances[payeeId] = (balances[payeeId] || 0) - settlement.amount;
  }

  // Convert to array format
  return Object.entries(balances).map(([userId, balance]) => ({
    userId,
    balance: Math.round(balance * 100) / 100, // Round to 2 decimal places
  }));
};
