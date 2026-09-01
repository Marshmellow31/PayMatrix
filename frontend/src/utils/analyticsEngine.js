import { toPaise } from './money.js';

const allowedPeriods = new Set([7, 30, 90]);

const startOfLocalDay = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const addDays = (date, amount) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

const localDateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;

const calendarDayNumber = (date) =>
  Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;

const expenseDate = (expense) => {
  const raw = expense.date || expense.createdAt;
  if (!raw) return null;
  if (typeof raw?.toDate === 'function') return startOfLocalDay(raw.toDate());
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return startOfLocalDay(raw);
};

const userSharePaise = (expense, userId) => {
  const split = expense.splits?.find((entry) => {
    const splitUserId = entry.user?._id || entry.user?.uid || entry.user;
    return splitUserId === userId;
  });
  if (!split) return 0;
  if (Number.isSafeInteger(split.amountPaise)) return Math.max(split.amountPaise, 0);
  try {
    return Math.max(toPaise(split.amount || 0), 0);
  } catch {
    return 0;
  }
};

const formatBucketLabel = (date) =>
  date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

export const buildAnalyticsSnapshot = ({ expenses = [], userId, days = 30, now = new Date() }) => {
  const periodDays = allowedPeriods.has(Number(days)) ? Number(days) : 30;
  const today = startOfLocalDay(now) || startOfLocalDay(new Date());
  const currentStart = addDays(today, -(periodDays - 1));
  const currentEnd = addDays(today, 1);
  const previousStart = addDays(currentStart, -periodDays);
  const bucketSize = periodDays === 90 ? 7 : 1;
  const bucketCount = Math.ceil(periodDays / bucketSize);

  const currentExpenses = [];
  let previousTotalPaise = 0;

  expenses.forEach((expense) => {
    if (expense.status === 'deleted' || expense.status === 'archived') return;
    const date = expenseDate(expense);
    const sharePaise = userSharePaise(expense, userId);
    if (!date || sharePaise <= 0) return;

    if (date >= currentStart && date < currentEnd) {
      currentExpenses.push({ ...expense, analyticsDate: date, sharePaise });
    } else if (date >= previousStart && date < currentStart) {
      previousTotalPaise += sharePaise;
    }
  });

  const totalPaise = currentExpenses.reduce((sum, expense) => sum + expense.sharePaise, 0);
  const deltaPaise = totalPaise - previousTotalPaise;
  const percentChange =
    previousTotalPaise > 0 ? Math.round((Math.abs(deltaPaise) / previousTotalPaise) * 100) : null;

  const trend = Array.from({ length: bucketCount }, (_, index) => {
    const bucketStart = addDays(currentStart, index * bucketSize);
    const bucketEnd = addDays(bucketStart, bucketSize);
    return {
      key: localDateKey(bucketStart),
      label: formatBucketLabel(bucketStart),
      start: bucketStart,
      end: bucketEnd > currentEnd ? currentEnd : bucketEnd,
      amountPaise: 0,
    };
  });

  const categoryMap = new Map();
  const groupMap = new Map();

  currentExpenses.forEach((expense) => {
    const differenceDays =
      calendarDayNumber(expense.analyticsDate) - calendarDayNumber(currentStart);
    const bucketIndex = Math.min(Math.floor(differenceDays / bucketSize), trend.length - 1);
    if (bucketIndex >= 0) trend[bucketIndex].amountPaise += expense.sharePaise;

    const category = expense.category || 'Other';
    categoryMap.set(category, (categoryMap.get(category) || 0) + expense.sharePaise);

    const groupId = expense.groupId || 'unknown';
    const existingGroup = groupMap.get(groupId) || {
      id: groupId,
      name: expense.groupName || 'Shared group',
      amountPaise: 0,
      expenseCount: 0,
    };
    existingGroup.amountPaise += expense.sharePaise;
    existingGroup.expenseCount += 1;
    groupMap.set(groupId, existingGroup);
  });

  const categories = [...categoryMap.entries()]
    .map(([name, amountPaise]) => ({
      name,
      amountPaise,
      share: totalPaise > 0 ? amountPaise / totalPaise : 0,
    }))
    .sort((a, b) => b.amountPaise - a.amountPaise);

  const groups = [...groupMap.values()].sort((a, b) => b.amountPaise - a.amountPaise);
  const largestExpenses = [...currentExpenses]
    .sort((a, b) => b.sharePaise - a.sharePaise)
    .slice(0, 5)
    .map((expense) => ({
      id: expense._id,
      groupId: expense.groupId,
      groupName: expense.groupName || 'Shared group',
      title: expense.title || expense.description || 'Expense',
      category: expense.category || 'Other',
      date: localDateKey(expense.analyticsDate),
      amountPaise: expense.sharePaise,
    }));

  return {
    period: {
      days: periodDays,
      start: localDateKey(currentStart),
      end: localDateKey(today),
      totalPaise,
      previousTotalPaise,
      deltaPaise,
      percentChange,
      direction: deltaPaise > 0 ? 'up' : deltaPaise < 0 ? 'down' : 'flat',
      transactionCount: currentExpenses.length,
      dailyAveragePaise: Math.round(totalPaise / periodDays),
    },
    trend: trend.map(({ start: _start, end: _end, ...bucket }) => bucket),
    categories,
    groups,
    largestExpenses,
  };
};

export default buildAnalyticsSnapshot;
