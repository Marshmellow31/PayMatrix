import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from 'lucide-react';
import { entryPaise, transactionKind } from '../../utils/logTransactions.js';
const dayLabel = (value) => {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
export default function LogTimeline({ entries = [], showAuthor = false, onSelect }) {
  if (!entries.length)
    return (
      <p className="rounded-2xl border border-white/10 px-4 py-10 text-center text-sm text-white/60">
        No transactions to show.
      </p>
    );
  const days = new Map();
  [...entries]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach((entry) => {
      const day = dayLabel(entry.date);
      if (!days.has(day)) days.set(day, []);
      days.get(day).push(entry);
    });
  return (
    <div className="space-y-6">
      {[...days].map(([day, items]) => (
        <section key={day} aria-label={day}>
          <h2 className="mb-2 text-xs font-medium text-white/60">{day}</h2>
          <div className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.02]">
            {items.map((entry) => {
              const kind = transactionKind(entry);
              const Icon =
                kind === 'income'
                  ? ArrowDownLeft
                  : kind === 'transfer'
                    ? ArrowLeftRight
                    : ArrowUpRight;
              return (
                <button
                  key={entry._id}
                  type="button"
                  onClick={() => onSelect(entry)}
                  className="flex w-full items-center gap-3 px-3 py-4 text-left transition-colors hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:px-4"
                >
                  <Icon size={18} className="shrink-0 text-white/60" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">
                      {entry.note || entry.title || entry.category || 'Transaction'}
                    </span>
                    <span className="mt-1 block truncate text-xs text-white/60">
                      {kind === 'transfer' ? 'Transfer' : entry.category || 'Other'} ·{' '}
                      {entry.accountName || 'Cash'}
                      {entry.sourceGroupName ? ` · ${entry.sourceGroupName}` : ''}
                      {showAuthor ? ` · ${entry.addedByName || 'Member'}` : ''}
                    </span>
                  </span>
                  <span className="min-w-0 text-right">
                    <span
                      className={`block break-all text-sm font-semibold tabular-nums ${kind === 'income' ? 'text-emerald-300' : 'text-white'}`}
                    >
                      {kind === 'income' ? '+' : kind === 'expense' ? '−' : ''}
                      {new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: entry.currency || 'INR',
                      }).format(entryPaise(entry) / 100)}
                    </span>
                    <span className="mt-1 block text-xs capitalize text-white/60">
                      {kind} ·{' '}
                      {new Date(entry.date).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
