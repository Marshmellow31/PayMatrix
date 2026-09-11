/**
 * wrappedEngine.js
 * Analyzes expenses and settlements for a group to compute Spotify-Wrapped style recap statistics
 */
export const calculateGroupWrapped = (group = {}, expenses = [], settlements = [], members = []) => {
  const totalSpent = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const expenseCount = expenses.length;

  // 1. Upfront Hero: Member who paid the highest upfront amount
  const paidByMap = {};
  expenses.forEach((e) => {
    const payer = e.paidBy || 'Unknown';
    paidByMap[payer] = (paidByMap[payer] || 0) + (Number(e.amount) || 0);
  });

  const sortedPayers = Object.keys(paidByMap).sort((a, b) => paidByMap[b] - paidByMap[a]);
  const topPayerId = sortedPayers[0] || '';
  const topPayerMember = members.find((m) => m.id === topPayerId || m.name === topPayerId) || { name: topPayerId || 'Everyone' };
  const topPayerAmount = paidByMap[topPayerId] || 0;
  const topPayerPercentage = totalSpent > 0 ? Math.round((topPayerAmount / totalSpent) * 100) : 0;

  // 2. Debt Simplification Calculations:
  // In an unsimplified network, each pair pays each other: N*(N-1)/2
  const memberCount = Math.max(2, members.length || 2);
  const unsimplifiedTransactions = (memberCount * (memberCount - 1)) / 2;
  const actualTransactions = settlements.length || (memberCount - 1);
  const transactionsSaved = Math.max(0, unsimplifiedTransactions - actualTransactions);

  // 3. Category Breakdown
  const categoryMap = {};
  expenses.forEach((e) => {
    const cat = e.category || 'General';
    categoryMap[cat] = (categoryMap[cat] || 0) + (Number(e.amount) || 0);
  });
  const topCategory = Object.keys(categoryMap).sort((a, b) => categoryMap[b] - categoryMap[a])[0] || 'General';

  return {
    groupTitle: group.name || 'Our Group Adventure',
    currencySymbol: group.currencySymbol || '$',
    totalSpent,
    expenseCount,
    topPayerName: topPayerMember.name || 'Everyone',
    topPayerAmount,
    topPayerPercentage,
    transactionsSaved,
    topCategory,
  };
};

export default calculateGroupWrapped;
