/**
 * Balance Engine for PayMatrix
 * Handles net balance calculations and debt simplification (min-flow algorithm).
 * Numbers are handled as 2-decimal floats.
 */

// Helper for 2-decimal rounding to prevent float precision drift
const round2 = (num) => Math.round(num * 100) / 100;

/**
 * Simplifies a set of net balances into a minimum number of transactions.
 * balances: Map or object: { userId: netBalance }
 * positive = user is owed, negative = user owes
 */
export const simplifyDebts = (balances) => {
  const creditors = [];
  const debtors = [];

  // Filter out zero balances and split into creditors and debtors
  Object.keys(balances).forEach((userId) => {
    const amount = round2(balances[userId]);
    if (Math.abs(amount) < 0.01) return; // Ignore dust
    
    if (amount > 0) {
      creditors.push({ userId, amount });
    } else {
      debtors.push({ userId, amount: Math.abs(amount) });
    }
  });

  // Sort both lists (descending) to match largest creditor with largest debtor
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const simplifiedTransactions = [];

  let i = 0; // creditor index
  let j = 0; // debtor index

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];

    const amountToTransfer = round2(Math.min(creditor.amount, debtor.amount));
    
    // Safety check for tiny fractions
    if (amountToTransfer < 0.01) {
        if (creditor.amount < 0.01) i++;
        if (debtor.amount < 0.01) j++;
        continue;
    }

    simplifiedTransactions.push({
      from: debtor.userId,
      to: creditor.userId,
      amount: amountToTransfer,
    });

    creditor.amount = round2(creditor.amount - amountToTransfer);
    debtor.amount = round2(debtor.amount - amountToTransfer);

    if (creditor.amount < 0.01) i++;
    if (debtor.amount < 0.01) j++;
  }

  return simplifiedTransactions;
};

/**
 * Computes net balances for a group by aggregating all expenses and settlements.
 * expenses: Array of expense objects
 * settlements: Array of settlement objects
 */
export const computeGroupBalances = (expenses, settlements, groupMembers) => {
  const netBalances = {};
  
  // Initialize for all group members
  groupMembers.forEach(member => {
    const id = (member.user?._id || member.user).toString();
    netBalances[id] = 0;
  });

  // Add from expenses
  expenses.forEach(expense => {
    const payerId = expense.paidBy.toString();
    
    expense.splits.forEach(split => {
      const splitUserId = split.user.toString();
      const amount = round2(parseFloat(split.amount || 0));
      
      // The person who paid is owed back
      if (payerId !== splitUserId) {
         netBalances[payerId] = round2((netBalances[payerId] || 0) + amount);
         netBalances[splitUserId] = round2((netBalances[splitUserId] || 0) - amount);
      }
    });
  });

  // Add from settlements
  settlements.forEach(settlement => {
     const payerId = settlement.payer.toString();
     const payeeId = settlement.payee.toString();
     const amount = round2(parseFloat(settlement.amount || 0));
     
     // Payer settles debt (less negative), Payee is paid (less positive)
     netBalances[payerId] = round2((netBalances[payerId] || 0) + amount);
     netBalances[payeeId] = round2((netBalances[payeeId] || 0) - amount);
  });

  return netBalances;
};
