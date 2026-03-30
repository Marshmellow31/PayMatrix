/**
 * Splitting Engine for PayMatrix
 * Handles all expense splitting logic using integer arithmetic to avoid floating point errors.
 * All amounts are expected to be in cents/paise (integers).
 */

export const SplitTypes = {
  EQUAL: 'equal',
  EXACT: 'exact',
  PERCENTAGE: 'percentage',
  SHARES: 'shares',
  ITEMIZED: 'itemized',
};

/**
 * Main entry point for split calculation
 */
export const calculateSplits = (totalAmount, splitType, participants, options = {}) => {
  const amount = Math.round(totalAmount);
  
  switch (splitType) {
    case SplitTypes.EQUAL:
      return calculateEqualSplit(amount, participants);
    case SplitTypes.EXACT:
      return calculateExactSplit(amount, participants, options.exactAmounts);
    case SplitTypes.PERCENTAGE:
      return calculatePercentageSplit(amount, participants, options.percentages);
    case SplitTypes.SHARES:
      return calculateSharesSplit(amount, participants, options.shares);
    case SplitTypes.ITEMIZED:
      return calculateItemizedSplit(amount, participants, options.items);
    default:
      throw new Error(`Invalid split type: ${splitType}`);
  }
};

/**
 * Equal Split: Total / N, with remainder added to the first person
 */
const calculateEqualSplit = (total, participants) => {
  const n = participants.length;
  if (n === 0) return [];
  
  const baseAmount = Math.floor(total / n);
  let remainder = total - (baseAmount * n);
  
  return participants.map((userId, index) => ({
    user: userId,
    amount: index === 0 ? baseAmount + remainder : baseAmount,
  }));
};

/**
 * Exact Split: Validates that the sum match the total
 */
const calculateExactSplit = (total, participants, exactAmounts) => {
  let sum = 0;
  const splits = participants.map(userId => {
    const amt = Math.round(exactAmounts[userId] || 0);
    sum += amt;
    return { user: userId, amount: amt };
  });
  
  if (sum !== total) {
    throw new Error(`Total amount (${total}) does not match the sum of splits (${sum})`);
  }
  
  return splits;
};

/**
 * Percentage Split: Calculates amounts based on %, validates sum is 100
 */
const calculatePercentageSplit = (total, participants, percentages) => {
  let totalPercent = 0;
  participants.forEach(userId => {
    totalPercent += parseFloat(percentages[userId] || 0);
  });
  
  if (Math.abs(totalPercent - 100) > 0.01) {
    throw new Error(`Total percentage must equal 100% (Current: ${totalPercent}%)`);
  }
  
  let distributed = 0;
  const splits = participants.map((userId, index) => {
    let amt;
    if (index === participants.length - 1) {
      // Last person gets the rest to avoid rounding leaks
      amt = total - distributed;
    } else {
      amt = Math.round((total * percentages[userId]) / 100);
      distributed += amt;
    }
    return { user: userId, amount: amt };
  });
  
  return splits;
};

/**
 * Shares Split: Proportional distribution based on integer shares
 */
const calculateSharesSplit = (total, participants, shares) => {
  let totalShares = 0;
  participants.forEach(userId => {
    totalShares += parseInt(shares[userId] || 0, 10);
  });
  
  if (totalShares <= 0) {
    throw new Error('Total shares must be greater than 0');
  }
  
  let distributed = 0;
  const splits = participants.map((userId, index) => {
    let amt;
    if (index === participants.length - 1) {
      amt = total - distributed;
    } else {
      amt = Math.round((total * shares[userId]) / totalShares);
      distributed += amt;
    }
    return { user: userId, amount: amt };
  });
  
  return splits;
};

/**
 * Itemized Split: Sum of individual items
 * items: [{ name, amount, participants: [userIds] }]
 */
const calculateItemizedSplit = (total, participants, items) => {
  const userTotals = {};
  participants.forEach(id => userTotals[id] = 0);
  
  let itemTotal = 0;
  items.forEach(item => {
    const itemAmt = Math.round(item.amount);
    itemTotal += itemAmt;
    
    const count = item.participants.length;
    if (count === 0) return;
    
    const perPerson = Math.floor(itemAmt / count);
    let remainder = itemAmt - (perPerson * count);
    
    item.participants.forEach((userId, index) => {
      // Initialize if not in participants list (though usually they should be)
      if (userTotals[userId] === undefined) userTotals[userId] = 0;
      
      userTotals[userId] += (index === 0 ? perPerson + remainder : perPerson);
    });
  });
  
  // Note: We don't strictly enforce itemTotal == total here,
  // but it's good practice. Usually total is derived from items.
  
  return participants.map(userId => ({
    user: userId,
    amount: userTotals[userId],
  }));
};
