import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal.jsx';
import Input from '../common/Input.jsx';
import Button from '../common/Button.jsx';
import logService from '../../services/logService.js';
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_CATEGORIES,
  localDateTime,
  transactionFields,
  evaluateMathExpression,
} from '../../utils/logTransactions.js';

const LogEntryModal = ({
  isOpen,
  onClose,
  onSaved,
  entry,
  groupId,
  duplicate = false,
  catalog,
  recentEntries = [],
}) => {
  const accounts = catalog?.accounts || DEFAULT_ACCOUNTS;
  const categories = catalog?.categories || DEFAULT_CATEGORIES;
  const isEdit = !!entry && !duplicate;
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [allCategories, setAllCategories] = useState(false);
  const change = (field, value) => setForm((previous) => ({ ...previous, [field]: value }));
  useEffect(() => {
    if (!isOpen) return;
    setForm({
      amount: entry ? String((entry.amountPaise ?? Math.round(entry.amount * 100)) / 100) : '',
      title: entry?.title || '',
      place: entry?.place || '',
      note: entry?.note || '',
      category: entry?.category || 'Other',
      categoryId: entry?.categoryId || `category_${(entry?.category || 'Other').toLowerCase()}`,
      accountId: entry?.accountId || 'account_cash',
      accountName: entry?.accountName || 'Cash',
      transactionType: entry?.transactionType || 'expense',
      currency: entry?.currency || 'INR',
      toAccountId: entry?.toAccountId || '',
      toAccountName: entry?.toAccountName || '',
      friendId: entry?.friendId || '',
      friendName: entry?.friendName || '',
      ...(entry?.sourceGroupId
        ? {
            sourceGroupId: entry.sourceGroupId,
            sourceGroupName: entry.sourceGroupName || '',
            sourceExpenseId: entry.sourceExpenseId || '',
          }
        : {}),
      date: localDateTime(duplicate ? new Date() : entry?.date || new Date()),
    });
    setError('');
    setAllCategories(false);
  }, [isOpen, entry, duplicate]);
  useEffect(() => {
    if (!isOpen || entry || catalog?.loading) return;
    setForm((previous) => {
      const account =
        accounts.find((item) => item.id === previous.accountId && !item.archived) ||
        accounts.find((item) => !item.archived);
      const category =
        categories.find((item) => item.id === previous.categoryId && !item.archived) ||
        categories.find((item) => !item.archived);
      return {
        ...previous,
        accountId: account?.id || '',
        accountName: account?.name || '',
        categoryId: category?.id || '',
        category: category?.name || '',
      };
    });
  }, [isOpen, entry, catalog?.loading, accounts, categories]);
  const available = (items, selected, name) => {
    const result = items.filter((item) => !item.archived || (entry && item.id === selected));
    return selected && !result.some((item) => item.id === selected)
      ? [...result, { id: selected, name: name || 'Previous selection' }]
      : result;
  };
  const recentIds = [
    ...new Set(
      recentEntries.map(
        (item) => item.categoryId || `category_${(item.category || 'Other').toLowerCase()}`
      )
    ),
  ].slice(0, 3);
  const recent = categories.filter((item) => !item.archived && recentIds.includes(item.id));
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setError('');
    try {
      if (!form.accountId || (form.transactionType !== 'transfer' && !form.categoryId))
        throw new Error('Create or restore an account and category first.');
      const evaluatedAmount = evaluateMathExpression(form.amount);
      const financials = transactionFields({ ...form, amount: evaluatedAmount });
      const payload = {
        ...form,
        ...financials,
        title:
          form.title.trim() ||
          (form.transactionType === 'transfer' ? 'Account transfer' : form.category),
        note: form.note.trim(),
        place: form.place.trim(),
        date: new Date(form.date).toISOString(),
      };
      setSaving(true);
      if (isEdit) await logService.updateManualEntry(groupId, entry._id, payload);
      else await logService.addManualEntry(groupId, payload);
      toast.success(isEdit ? 'Transaction updated' : 'Transaction added');
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  const selectAccount = (field, id) => {
    change(field, id);
    change(
      field === 'accountId' ? 'accountName' : 'toAccountName',
      accounts.find((item) => item.id === id)?.name || ''
    );
  };
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!saving) onClose();
      }}
      title={isEdit ? 'Edit transaction' : duplicate ? 'Duplicate transaction' : 'New transaction'}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <fieldset disabled={saving || catalog?.loading} className="space-y-5">
          <div
            role="group"
            aria-label="Transaction type"
            className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1"
          >
            {['expense', 'income', 'transfer'].map((kind) => (
              <button
                key={kind}
                type="button"
                aria-pressed={form.transactionType === kind}
                onClick={() => change('transactionType', kind)}
                className={`min-h-11 rounded-lg text-sm font-medium capitalize ${form.transactionType === kind ? 'bg-white text-black' : 'text-white/65 hover:bg-white/5'}`}
              >
                {kind}
              </button>
            ))}
          </div>
          <div>
            <Input
              label="Amount (INR)"
              inputMode="decimal"
              value={form.amount || ''}
              onChange={(e) => change('amount', e.target.value)}
              onBlur={() => {
                const evaluated = evaluateMathExpression(form.amount);
                if (evaluated !== form.amount) change('amount', evaluated);
              }}
              placeholder="0.00"
              className="text-3xl font-semibold tabular-nums"
              autoFocus
              required
            />
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-white/30">
                Quick:
              </span>
              {[50, 100, 500].map((delta) => (
                <button
                  key={delta}
                  type="button"
                  onClick={() => {
                    const base = parseFloat(evaluateMathExpression(form.amount) || '0') || 0;
                    change('amount', (base + delta).toFixed(2));
                  }}
                  className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                >
                  +{delta}
                </button>
              ))}
            </div>
          </div>
          <label className="block text-sm text-white/70">
            {form.transactionType === 'transfer' ? 'From account' : 'Account'}
            <select
              className="input-field mt-2 w-full"
              value={form.accountId || ''}
              onChange={(e) => selectAccount('accountId', e.target.value)}
            >
              {available(accounts, form.accountId, form.accountName).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.archived ? ' (archived)' : ''}
                </option>
              ))}
            </select>
          </label>
          {form.transactionType === 'transfer' && (
            <label className="block text-sm text-white/70">
              To account
              <select
                required
                className="input-field mt-2 w-full"
                value={form.toAccountId || ''}
                onChange={(e) => selectAccount('toAccountId', e.target.value)}
              >
                <option value="">Choose account</option>
                {available(accounts, form.toAccountId, form.toAccountName)
                  .filter((item) => item.id !== form.accountId)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
              <span className="mt-2 block text-xs text-white/60">
                Transfers move money between accounts and are excluded from spending.
              </span>
            </label>
          )}
          {form.transactionType !== 'transfer' && (
            <div>
              <p className="mb-2 text-sm text-white/70">Category</p>
              {!!recent.length && (
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-white/60">Recently used</span>
                  {recent.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      aria-pressed={form.categoryId === item.id}
                      className="min-h-11 rounded-xl border border-white/10 px-3 text-xs text-white/80"
                      onClick={() => {
                        change('categoryId', item.id);
                        change('category', item.name);
                      }}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              )}
              {!allCategories ? (
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center justify-between rounded-xl border border-white/10 px-3 text-sm text-white"
                  onClick={() => setAllCategories(true)}
                >
                  <span>{form.category}</span>
                  <span className="text-xs text-white/60">View all</span>
                </button>
              ) : (
                <select
                  aria-label="Category"
                  className="input-field w-full"
                  value={form.categoryId || ''}
                  onChange={(e) => {
                    change('categoryId', e.target.value);
                    change(
                      'category',
                      categories.find((item) => item.id === e.target.value)?.name || form.category
                    );
                  }}
                >
                  {available(categories, form.categoryId, form.category).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {item.archived ? ' (archived)' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
          <Input
            label="Note (optional)"
            maxLength={500}
            value={form.note || ''}
            onChange={(e) => change('note', e.target.value)}
            placeholder="What was this for?"
          />
          <Input
            label="Date and time"
            type="datetime-local"
            required
            value={form.date || ''}
            onChange={(e) => change('date', e.target.value)}
          />
          <details className="rounded-xl border border-white/10 p-3">
            <summary className="cursor-pointer text-sm text-white/70">More details</summary>
            <div className="mt-4 space-y-4">
              <Input
                label="Title (optional)"
                maxLength={100}
                value={form.title || ''}
                onChange={(e) => change('title', e.target.value)}
              />
              <Input
                label="Friend name (optional reference)"
                maxLength={100}
                value={form.friendName || ''}
                onChange={(e) => {
                  change('friendName', e.target.value);
                  change('friendId', '');
                }}
              />
              <Input
                label="Place (optional)"
                maxLength={100}
                value={form.place || ''}
                onChange={(e) => change('place', e.target.value)}
              />
              <p className="text-xs text-white/60">
                Saved in this log. Use “From transaction” to include an existing group expense and
                your share.
              </p>
            </div>
          </details>
        </fieldset>
        {catalog?.error && (
          <p role="status" className="text-sm text-white/70">
            {catalog.error} Default selections remain available.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}
        <Button
          type="submit"
          className="w-full"
          loading={saving}
          disabled={saving || catalog?.loading}
        >
          {isEdit ? 'Save changes' : 'Add transaction'}
        </Button>
      </form>
    </Modal>
  );
};
export default LogEntryModal;
