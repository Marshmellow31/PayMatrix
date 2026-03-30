/**
 * Splitting Engine for PayMatrix
 * Handles all expense splitting logic using 2-decimal floating point precision.
 */

export const SplitTypes = {
  EQUAL: 'equal',
  EXACT: 'exact',
  PERCENTAGE: 'percentage',
  SHARES: 'shares',
  ITEMIZED: 'itemized',
};

// Helper for 2-decimal rounding to prevent float precision drift
const round2 = (num) => Math.round(num * 100) / 100;

// Sort participants to ensure the payer is always processed LAST to take the rounded diff
const sortParticipantsForRounding = (participants, payerId) => {
  return [...participants].sort((a, b) => {
    if (a.toString() === payerId?.toString()) return 1;
    if (b.toString() === payerId?.toString()) return -1;
    return 0;
  });
};

/**
 * Main entry point for split calculation
 */
export const calculateSplits = (totalAmount, splitType, participants, payerId, options = {}) => {
  const amount = round2(parseFloat(totalAmount));
  const sortedParticipants = sortParticipantsForRounding(participants, payerId);
  
  switch (splitType) {
    case SplitTypes.EQUAL:
      return calculateEqualSplit(amount, sortedParticipants);
    case SplitTypes.EXACT:
      return calculateExactSplit(amount, participants, options.exactAmounts);
    case SplitTypes.PERCENTAGE:
      return calculatePercentageSplit(amount, sortedParticipants, options.percentages);
    case SplitTypes.SHARES:
      return calculateSharesSplit(amount, sortedParticipants, options.shares);
    case SplitTypes.ITEMIZED:
      return calculateItemizedSplit(amount, sortedParticipants, options.items); // Passed sorted participants for items
    default:
      throw new Error(`Invalid split type: ${splitType}`);
  }
};

/**
 * Equal Split: Total / N, rounds UP for non-payers, payer takes smaller remainder
 */
const calculateEqualSplit = (total, participants) => {
  const n = participants.length;
  if (n === 0) return [];
  
  const exactAmount = total / n;
  const amountForOthers = Math.ceil(exactAmount * 100) / 100; 

  let distributed = 0;
  return participants.map((userId, index) => {
    let amt;
    if (index === participants.length - 1) {
      amt = round2(total - distributed);
    } else {
      amt = amountForOthers;
    }
    distributed = round2(distributed + amt);
    return { user: userId, amount: amt };
  });
};

/**
 * Exact Split: Validates that the sum match the total
 */
const calculateExactSplit = (total, participants, exactAmounts) => {
  let sum = 0;
  const splits = participants.map(userId => {
    const amt = round2(parseFloat(exactAmounts[userId] || 0));
    sum = round2(sum + amt);
    return { user: userId, amount: amt };
  });
  
  if (Math.abs(sum - total) > 0.01) {
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
  return participants.map((userId, index) => {
    let amt;
    if (index === participants.length - 1) {
      amt = round2(total - distributed);
    } else {
      amt = Math.ceil((total * parseFloat(percentages[userId] || 0) / 100) * 100) / 100;
    }
    distributed = round2(distributed + amt);
    return { user: userId, amount: amt };
  });
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
  return participants.map((userId, index) => {
    let amt;
    if (index === participants.length - 1) {
      amt = round2(total - distributed);
    } else {
      amt = Math.ceil((total * parseInt(shares[userId] || 0, 10) / totalShares) * 100) / 100;
    }
    distributed = round2(distributed + amt);
    return { user: userId, amount: amt };
  });
};

/**
 * Itemized Split: Sum of individual items
 * items: [{ name, amount, participants: [userIds] }]
 */
const calculateItemizedSplit = (total, participants, items) => {
  const userTotals = {};
  participants.forEach(id => userTotals[id] = 0);
  
  items.forEach(item => {
    const itemAmt = round2(parseFloat(item.amount || 0));
    const count = item.participants.length;
    if (count === 0) return;
    
    // For itemized, respect the payer context by using the order of the participants array passed in 
    // which has payer last. We filter the item's participants to match that sorted order.
    const sortedItemParticipants = participants.filter(pId => 
      item.participants.some(ip => ip.toString() === pId.toString())
    );

    const exactAmount = itemAmt / count;
    const amountForOthers = Math.ceil(exactAmount * 100) / 100;
    
    let itemDistributed = 0;
    sortedItemParticipants.forEach((userId, index) => {
      let amt;
      if (index === sortedItemParticipants.length - 1) {
        amt = round2(itemAmt - itemDistributed);
      } else {
        amt = amountForOthers;
      }
      
      itemDistributed = round2(itemDistributed + amt);
      
      if (userTotals[userId] === undefined) userTotals[userId] = 0;
      userTotals[userId] = round2(userTotals[userId] + amt);
    });
  });
  
  return participants.map(userId => ({
    user: userId,
    amount: userTotals[userId],
  }));
};
