import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../common/Modal.jsx';
import Input from '../common/Input.jsx';
import Button from '../common/Button.jsx';
import LogTimeline from './LogTimeline.jsx';
import { entryPaise, transactionKind } from '../../utils/logTransactions.js';
const emptyFilters = {
  type: '',
  from: '',
  to: '',
  category: '',
  account: '',
  group: '',
  friend: '',
  min: '',
  max: '',
};
export default function LogTransactions({
  entries,
  currentUid,
  isOwner,
  showAuthor,
  onEdit,
  onDuplicate,
  onDelete,
}) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(emptyFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const filtered = useMemo(
    () =>
      entries.filter((entry) => {
        const text = [
          entry.title,
          entry.note,
          entry.category,
          entry.accountName || 'Cash',
          entry.toAccountName,
          entry.sourceGroupName,
          entry.friendName,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        const date = new Date(entry.date);
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const amount = entryPaise(entry);
        return (
          text.includes(search.trim().toLowerCase()) &&
          (!filters.type || transactionKind(entry) === filters.type) &&
          (!filters.from || dateKey >= filters.from) &&
          (!filters.to || dateKey <= filters.to) &&
          (!filters.category ||
            (entry.categoryId || entry.category || 'Other') === filters.category) &&
          (!filters.account ||
            (entry.accountId || 'account_cash') === filters.account ||
            entry.toAccountId === filters.account) &&
          (!filters.group || entry.sourceGroupId === filters.group) &&
          (!filters.friend || (entry.friendId || entry.friendName) === filters.friend) &&
          (filters.min === '' || amount >= Math.round(Number(filters.min) * 100)) &&
          (filters.max === '' || amount <= Math.round(Number(filters.max) * 100))
        );
      }),
    [entries, search, filters]
  );
  const options = (idField, nameField, fallbackId = '', fallbackName = '') => [
    ...new Map(
      entries
        .map((entry) => [
          entry[idField] || fallbackId || entry[nameField],
          entry[nameField] || fallbackName,
        ])
        .filter(([id]) => id)
    ).entries(),
  ];
  const count = Object.values(filters).filter(Boolean).length;
  const select = (field, label, items) => (
    <label className="block text-sm text-white/70">
      {label}
      <select
        className="input-field mt-2 w-full"
        value={filters[field]}
        onChange={(e) => setFilters((previous) => ({ ...previous, [field]: e.target.value }))}
      >
        <option value="">All</option>
        {items.map(([id, name]) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
  const canChange = selected && (isOwner || selected.addedBy === currentUid);
  const amountLabel = (entry) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: entry.currency || 'INR' }).format(
      entryPaise(entry) / 100
    );
  return (
    <>
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Input
            label="Search transactions"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Note, category, account or person"
          />
        </div>
        <Button variant="secondary" onClick={() => setShowFilters(true)}>
          Filters{count ? ` (${count})` : ''}
        </Button>
      </div>
      <p className="text-xs text-white/60">
        {filtered.length} of {entries.length} loaded transactions
      </p>
      <LogTimeline
        entries={filtered}
        showAuthor={showAuthor}
        onSelect={(entry) => {
          setSelected(entry);
          setConfirmDelete(false);
        }}
      />
      <Modal isOpen={showFilters} onClose={() => setShowFilters(false)} title="Filter transactions">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {select('type', 'Type', [
            ['expense', 'Expense'],
            ['income', 'Income'],
            ['transfer', 'Transfer'],
          ])}
          {select('category', 'Category', options('categoryId', 'category', '', 'Other'))}
          {select('account', 'Account', [
            ...new Map([
              ...options('accountId', 'accountName', 'account_cash', 'Cash'),
              ...options('toAccountId', 'toAccountName'),
            ]).entries(),
          ])}
          {select('group', 'Source group', options('sourceGroupId', 'sourceGroupName'))}
          {select('friend', 'Friend', options('friendId', 'friendName'))}
          {['from', 'to', 'min', 'max'].map((field) => (
            <Input
              key={field}
              label={
                {
                  from: 'From date',
                  to: 'To date',
                  min: 'Minimum amount (INR)',
                  max: 'Maximum amount (INR)',
                }[field]
              }
              type={field === 'from' || field === 'to' ? 'date' : 'number'}
              min={field === 'min' || field === 'max' ? '0' : undefined}
              step={field === 'min' || field === 'max' ? '0.01' : undefined}
              value={filters[field]}
              onChange={(e) => setFilters((previous) => ({ ...previous, [field]: e.target.value }))}
            />
          ))}
        </div>
        <div className="mt-5 flex justify-between gap-3">
          <Button variant="secondary" onClick={() => setFilters(emptyFilters)}>
            Clear filters
          </Button>
          <Button onClick={() => setShowFilters(false)}>Show {filtered.length}</Button>
        </div>
      </Modal>
      <Modal
        isOpen={!!selected}
        onClose={() => {
          if (!deleting) setSelected(null);
        }}
        title="Transaction details"
      >
        {selected && (
          <div className="space-y-5">
            <p className="break-all text-3xl font-semibold tabular-nums text-white">
              {amountLabel(selected)}
            </p>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-3 text-sm">
              {Object.entries({
                Type: transactionKind(selected),
                Account: selected.accountName || 'Cash',
                ...(selected.toAccountId
                  ? { 'To account': selected.toAccountName || selected.toAccountId }
                  : {}),
                Category: selected.category || 'Other',
                Title: selected.title,
                Note: selected.note || '—',
                'Date and time': new Date(selected.date).toLocaleString('en-IN'),
                ...(selected.friendName ? { Friend: selected.friendName } : {}),
                ...(selected.sourceGroupName
                  ? {
                      'Source group': selected.sourceGroupName,
                      'Split amount': 'Recorded share of the source expense',
                    }
                  : {}),
              }).map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-white/60">{label}</dt>
                  <dd className="break-words text-white">{value}</dd>
                </div>
              ))}
            </dl>
            {selected.sourceGroupId && (
              <Link
                to={`/groups/${encodeURIComponent(selected.sourceGroupId)}`}
                className="inline-block py-2 text-sm text-white underline"
              >
                Open source group
              </Link>
            )}
            <div className="flex flex-wrap gap-2">
              {canChange && selected.type === 'manual' && (
                <Button
                  onClick={() => {
                    onEdit(selected);
                    setSelected(null);
                  }}
                >
                  Edit
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => {
                  onDuplicate(selected);
                  setSelected(null);
                }}
              >
                Duplicate
              </Button>
              {canChange && (
                <Button variant="secondary" onClick={() => setConfirmDelete(true)}>
                  Delete
                </Button>
              )}
            </div>
            {confirmDelete && (
              <div className="space-y-3 rounded-xl border border-white/15 p-4">
                <p className="text-sm text-white/80">
                  Delete this transaction? Its audit history will remain.
                </p>
                <div className="flex gap-2">
                  <Button
                    disabled={deleting}
                    loading={deleting}
                    onClick={async () => {
                      setDeleting(true);
                      try {
                        if (await onDelete(selected)) setSelected(null);
                      } finally {
                        setDeleting(false);
                      }
                    }}
                  >
                    Delete transaction
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={deleting}
                    onClick={() => setConfirmDelete(false)}
                  >
                    Keep
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
