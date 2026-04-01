/**
 * Balance Engine for PayMatrix
 * Handles net balance calculations and debt simplification (min-flow algorithm).
 * Numbers are handled as 2-decimal floats.
 */

// Helper for 2-decimal rounding to prevent float precision drift
const round2 = (num) => Math.round(num * 100) / 100;

/**
 * Extracts a unique ID from various member/user object shapes or strings.
 */
const extractUid = (user) => {
  if (!user) return null;
  if (typeof user === 'string') return user;
  // Handle various object shapes: { _id }, { uid }, { id }, or { user: { _id } }
  const uid = user._id || user.uid || user.id || 
              (user.user && (user.user._id || user.user.uid || user.user.id || (typeof user.user === 'string' ? user.user : null)));
  return uid ? uid.toString() : null;
};

/**
 * Calculates expense splits based on amount and split configuration.
 * Returns Array of { user: userId, amount: float, percent?: float, shares?: int }
 */
export const calculateSplits = (amount, splitType, splitData, participants = []) => {
  const total = parseFloat(amount || 0);
  if (participants.length === 0) return [];

  switch (splitType) {
    case 'equal': {
      const perPerson = round2(total / participants.length);
      return participants.map(uid => ({ user: uid, amount: perPerson }));
    }
    case 'percentage': {
      const pcts = splitData.percentages || {};
      return participants.map(uid => {
        const pct = parseFloat(pcts[uid] || 0);
        return { user: uid, amount: round2((total * pct) / 100), percent: pct };
      });
    }
    case 'exact': {
      const values = splitData.exactAmounts || {};
      return participants.map(uid => ({ user: uid, amount: round2(parseFloat(values[uid] || 0)) }));
    }
    case 'shares': {
      const shares = splitData.shares || {};
      const totalShares = participants.reduce((sum, uid) => sum + parseInt(shares[uid] || 1), 0);
      return participants.map(uid => {
        const userShares = parseInt(shares[uid] || 1);
        const amt = totalShares > 0 ? round2((total * userShares) / totalShares) : 0;
        return { user: uid, amount: amt, shares: userShares };
      });
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
export const computeGroupBalances = (expenses = [], settlements = [], groupMembers = []) => {
  const netBalances = {};
  
  // Initialize for all group members
  groupMembers.forEach(member => {
    const id = extractUid(member);
    if (id) {
        netBalances[id] = 0;
    }
  });

  // Add from expenses
  for (const expense of expenses) {
    try {
      const payerId = extractUid(expense.paidBy);
      if (!payerId) continue;

      // Ensure splits exist
      const splits = expense.splits || [];
      
      splits.forEach(split => {
        const splitUserId = extractUid(split.user);
        if (!splitUserId) return;
        
        const splitAmount = parseFloat(split.amount || 0);
        if (isNaN(splitAmount)) return;

        // The person who paid is owed back
        if (payerId !== splitUserId) {
           netBalances[payerId] = round2((netBalances[payerId] || 0) + splitAmount);
           netBalances[splitUserId] = round2((netBalances[splitUserId] || 0) - splitAmount);
        }
      });
    } catch (err) {
      console.error("Error processing expense for balance:", err, expense);
    }
  }

  // Add from settlements
  for (const settlement of settlements) {
    try {
      const payerId = extractUid(settlement.payer || settlement.createdBy);
      const payeeId = extractUid(settlement.payee || settlement.recipient || settlement.to);
      if (!payerId || !payeeId || (payerId === payeeId)) continue;
      
      const amount = round2(parseFloat(settlement.amount || 0));
      if (isNaN(amount) || amount <= 0) continue;
      
      // Payer settles debt (less negative), Payee is paid (less positive)
      netBalances[payerId] = round2((netBalances[payerId] || 0) + amount);
      netBalances[payeeId] = round2((netBalances[payeeId] || 0) - amount);
    } catch (err) {
      console.error("Error processing settlement for balance:", err, settlement);
    }
  }

  return netBalances;
};
