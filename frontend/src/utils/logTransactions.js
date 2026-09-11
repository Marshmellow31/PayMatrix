import { toPaise, fromPaise } from './money.js';

export const DEFAULT_ACCOUNTS = ['Cash', 'UPI', 'Bank', 'Credit Card', 'Wallet'].map((name) => ({
  id: `account_${name.toLowerCase().replaceAll(' ', '_')}`,
  name,
  archived: false,
}));
export const DEFAULT_CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Entertainment',
  'Bills',
  'Health',
  'Education',
  'Travel',
  'Fuel',
  'Subscriptions',
  'Rent',
  'Groceries',
  'Other',
].map((name) => ({ id: `category_${name.toLowerCase()}`, name, archived: false }));
export const transactionKind = (entry) => entry.transactionType || 'expense';
export const entryPaise = (entry) =>
  Number.isSafeInteger(entry.amountPaise) ? entry.amountPaise : toPaise(Number(entry.amount || 0));
export const localDateTime = (value = new Date()) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return localDateTime();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
export const transactionFields = (data) => {
  const amountPaise = toPaise(data.amount);
  const kind = data.transactionType || 'expense';
  if (!['expense', 'income', 'transfer'].includes(kind))
    throw new Error('Choose a transaction type.');
  if (amountPaise <= 0 || amountPaise > 100000000)
    throw new Error('Enter an amount between ₹0.01 and ₹10,00,000.');
  const accountId = data.accountId || 'account_cash';
  if (kind === 'transfer' && (!data.toAccountId || accountId === data.toAccountId))
    throw new Error('Choose two different accounts for a transfer.');
  if ((data.currency || 'INR') !== 'INR')
    throw new Error('Only INR entry is supported at present.');
  return {
    amountPaise,
    amount: fromPaise(amountPaise),
    currency: data.currency || 'INR',
    transactionType: kind,
    accountId,
    accountName: data.accountName || 'Cash',
    categoryId: data.categoryId || `category_${(data.category || 'Other').toLowerCase()}`,
    toAccountId: kind === 'transfer' ? data.toAccountId : '',
    toAccountName: kind === 'transfer' ? data.toAccountName || '' : '',
    friendId: data.friendId || '',
    friendName: data.friendName || '',
  };
};

export const evaluateMathExpression = (expr) => {
  if (typeof expr !== 'string') return expr;
  const clean = expr.trim();
  if (!clean) return '';
  if (/^-?\d+(\.\d+)?$/.test(clean)) return clean;
  if (!/^[0-9\s.+\-*/]+$/.test(clean)) return expr;
  try {
    const tokens = clean.match(/(\d+(?:\.\d+)?|[+\-*/])/g);
    if (!tokens || tokens.length <= 1) return clean;
    const values = [];
    const ops = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (['+', '-', '*', '/'].includes(token)) {
        ops.push(token);
      } else {
        let num = parseFloat(token);
        if (Number.isNaN(num)) return expr;
        if (ops.length > 0 && (ops[ops.length - 1] === '*' || ops[ops.length - 1] === '/')) {
          const op = ops.pop();
          const prev = values.pop();
          num = op === '*' ? prev * num : num !== 0 ? prev / num : prev;
        }
        values.push(num);
      }
    }
    if (values.length !== ops.length + 1) return expr;
    let result = values[0];
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      const next = values[i + 1];
      if (next === undefined) break;
      if (op === '+') result += next;
      else if (op === '-') result -= next;
    }
    if (Number.isFinite(result) && result >= 0) {
      return (Math.round(result * 100) / 100).toFixed(2);
    }
    return expr;
  } catch {
    return expr;
  }
};

export const cloneTransactionEntry = (entry) => {
  if (!entry) return null;
  const {
    _id: _unusedId,
    id: _unusedRawId,
    createdAt: _unusedCreated,
    updatedAt: _unusedUpdated,
    lastMutationId: _unusedMutId,
    lastMutationType: _unusedMutType,
    lastMutationAt: _unusedMutAt,
    lastEditedBy: _unusedEditedBy,
    ...rest
  } = entry;
  return {
    ...rest,
    date: new Date().toISOString(),
  };
};
