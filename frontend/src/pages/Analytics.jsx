import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronRight, RefreshCw, TrendingDown, TrendingUp, WifiOff } from 'lucide-react';

import expenseService from '../services/expenseService.js';
import { useFeatureFlags } from '../hooks/useFeatureFlags.js';
import Loader from '../components/common/Loader.jsx';
import LiveUpdate from '../components/common/LiveUpdate.jsx';
import SpendingBars from '../components/charts/SpendingBars.jsx';

const periods = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];
const spring = { type: 'spring', stiffness: 360, damping: 36, mass: 0.8 };

const money = (paise, { compact = false, sign = false } = {}) => {
  const amount = (paise || 0) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    notation: compact && Math.abs(amount) >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : paise % 100 === 0 ? 0 : 2,
    signDisplay: sign ? 'exceptZero' : 'auto',
  }).format(amount);
};

const shortDate = (dateString) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
  });
};

const comparisonCopy = (period) => {
  if (!period) return '';
  if (period.previousTotalPaise === 0) {
    return period.totalPaise > 0
      ? 'First spending in the compared period'
      : 'No spending in either period';
  }
  if (period.direction === 'flat') return `The same as the previous ${period.days} days`;
  return `${money(Math.abs(period.deltaPaise))} ${period.direction === 'up' ? 'more' : 'less'} than the previous ${period.days} days`;
};

const Analytics = () => {
  const flags = useFeatureFlags();
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const [days, setDays] = useState(30);
  const [snapshots, setSnapshots] = useState({});
  const [loadingPeriod, setLoadingPeriod] = useState(30);
  const [refreshing, setRefreshing] = useState(false);
  const snapshot = snapshots[days];

  useEffect(() => {
    if (flags && flags.analyticsPage === false) navigate('/dashboard', { replace: true });
  }, [flags, navigate]);

  const loadSnapshot = useCallback(async (periodDays, force = false) => {
    setLoadingPeriod((current) => (current == null && !force ? periodDays : current));
    if (force) setRefreshing(true);
    try {
      const response = await expenseService.getAnalyticsSnapshot(periodDays, { force });
      setSnapshots((current) => ({ ...current, [periodDays]: response.data.data }));
    } catch (error) {
      console.error('Analytics refresh failed:', error);
    } finally {
      setLoadingPeriod((current) => (current === periodDays ? null : current));
      if (force) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (location.pathname === '/analytics') loadSnapshot(days);
  }, [days, loadSnapshot, location.pathname]);

  const periodLabel = snapshot
    ? `${shortDate(snapshot.period.start)}–${shortDate(snapshot.period.end)}`
    : `Last ${days} days`;
  const categories = snapshot?.categories || [];
  const groups = snapshot?.groups || [];
  const largestExpenses = snapshot?.largestExpenses || [];
  const balances = snapshot?.balances || {};
  const topCategory = categories[0];
  const sourceLabel = useMemo(() => {
    if (!snapshot) return '';
    if (snapshot.source === 'offline-cache' || snapshot.source === 'stale-cache') {
      return 'Saved offline';
    }
    return 'Updated just now';
  }, [snapshot]);

  const hasLoadedSnapshot = Object.keys(snapshots).length > 0;

  if (!hasLoadedSnapshot && !snapshot && loadingPeriod === days) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0.12 : 0.24 }}
      className="mx-auto w-full max-w-md pb-32 pt-3 lg:max-w-6xl"
    >
      <header className="mb-7 flex items-start justify-between gap-4 lg:mb-9">
        <div>
          <p className="text-xs font-medium text-white/35">Your money, clearly</p>
          <h1 className="mt-1 font-manrope text-[1.9rem] font-black tracking-[-0.05em] text-white sm:text-4xl">
            Insights
          </h1>
          <p className="mt-1 text-xs text-white/30">{periodLabel}</p>
        </div>
        <button
          type="button"
          aria-label="Refresh insights"
          onClick={() => loadSnapshot(days, true)}
          disabled={refreshing}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.035] text-white/45 hover:text-white disabled:opacity-40"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </header>

      <div className="mb-6 flex w-full rounded-2xl border border-white/[0.07] bg-white/[0.025] p-1 sm:w-fit">
        {periods.map((period) => (
          <button
            key={period.days}
            type="button"
            onClick={() => {
              if (!snapshots[period.days]) setLoadingPeriod(period.days);
              setDays(period.days);
            }}
            className={`relative min-h-10 flex-1 rounded-xl px-4 text-xs font-semibold sm:flex-none ${
              days === period.days ? 'text-black' : 'text-white/35 hover:text-white/70'
            }`}
          >
            {days === period.days && (
              <motion.span
                layoutId="analytics-period"
                className="absolute inset-0 rounded-xl bg-white"
                transition={reduceMotion ? { duration: 0.12 } : spring}
              />
            )}
            <span className="relative z-10">{period.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="popLayout" initial={false}>
        {snapshot && (
          <motion.div
            key={days}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={reduceMotion ? { duration: 0.12 } : spring}
            className="grid grid-cols-1 gap-6 lg:grid-cols-12"
          >
            <LiveUpdate
              value={`${snapshot.period.totalPaise}:${snapshot.period.deltaPaise}`}
              className="rounded-[1.75rem] border border-white/[0.09] bg-[#191919] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] lg:col-span-7 lg:p-8"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-white/45">Your spending</p>
                  <p className="mt-4 font-manrope text-[2.9rem] font-black leading-none tracking-[-0.065em] text-white tabular-nums sm:text-6xl">
                    {money(snapshot.period.totalPaise)}
                  </p>
                </div>
                {snapshot.period.direction !== 'flat' && snapshot.period.previousTotalPaise > 0 && (
                  <span
                    className={`mt-1 flex h-9 w-9 items-center justify-center rounded-full ${
                      snapshot.period.direction === 'up'
                        ? 'bg-red-300/10 text-red-300'
                        : 'bg-emerald-300/10 text-emerald-300'
                    }`}
                  >
                    {snapshot.period.direction === 'up' ? (
                      <TrendingUp size={17} />
                    ) : (
                      <TrendingDown size={17} />
                    )}
                  </span>
                )}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-white/38">
                {comparisonCopy(snapshot.period)}
                {snapshot.period.percentChange != null && (
                  <span className="text-white/55"> · {snapshot.period.percentChange}%</span>
                )}
              </p>
              <div className="mt-8 grid grid-cols-3 gap-4 border-t border-white/[0.07] pt-5">
                <Metric
                  label="Daily average"
                  value={money(snapshot.period.dailyAveragePaise, { compact: true })}
                />
                <Metric label="Transactions" value={snapshot.period.transactionCount} />
                <Metric
                  label="Top category"
                  value={topCategory?.name || 'None'}
                  supporting={topCategory ? `${Math.round(topCategory.share * 100)}%` : ''}
                />
              </div>
            </LiveUpdate>

            <section className="rounded-[1.75rem] border border-white/[0.08] bg-[#171717] p-5 lg:col-span-5 lg:p-6">
              <SectionHeading title="Balances today" body="Not affected by the date range" />
              <div className="mt-6 space-y-4">
                <BalanceLine label="You are owed" value={balances.totalOwedPaise} tone="positive" />
                <BalanceLine label="You owe" value={balances.totalOwePaise} tone="negative" />
                <div className="h-px bg-white/[0.07]" />
                <BalanceLine label="Net position" value={balances.netBalancePaise} signed />
              </div>
              {balances.groups?.length > 0 && (
                <div className="mt-6 space-y-1 border-t border-white/[0.07] pt-4">
                  {balances.groups.slice(0, 3).map((group) => (
                    <Link
                      key={group.id}
                      to={`/groups/${group.id}`}
                      className="flex min-h-11 items-center justify-between rounded-xl px-2 text-sm hover:bg-white/[0.035]"
                    >
                      <span className="truncate text-white/55">{group.name}</span>
                      <span className="ml-3 font-semibold tabular-nums text-white/80">
                        {money(group.balancePaise, { sign: true })}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[1.75rem] border border-white/[0.08] bg-[#171717] p-5 lg:col-span-7 lg:p-7">
              <SectionHeading
                title="Spending over time"
                body={days === 90 ? 'Weekly totals' : 'Daily totals'}
              />
              <div className="mt-5">
                <SpendingBars data={snapshot.trend} />
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-white/[0.08] bg-[#171717] p-5 lg:col-span-5 lg:p-7">
              <SectionHeading title="Where it went" body="Your share by category" />
              <div className="mt-6 space-y-5">
                {categories.slice(0, 6).map((category) => (
                  <BreakdownRow
                    key={category.name}
                    label={category.name}
                    amountPaise={category.amountPaise}
                    share={category.share}
                  />
                ))}
                {!categories.length && (
                  <QuietEmpty>No category spending in this period.</QuietEmpty>
                )}
              </div>
            </section>

            <section className="space-y-4 lg:col-span-5">
              <SectionHeading title="Groups driving spending" body="Ordered by your contribution" />
              <div className="overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-[#171717]">
                {groups.slice(0, 5).map((group) => (
                  <Link
                    key={group.id}
                    to={`/groups/${group.id}`}
                    className="flex min-h-[4.6rem] items-center justify-between gap-4 border-b border-white/[0.06] px-4 py-3 last:border-b-0 hover:bg-white/[0.025]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white/80">{group.name}</p>
                      <p className="mt-1 text-[10px] text-white/28">
                        {group.expenseCount} expense{group.expenseCount === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold tabular-nums text-white/75">
                        {money(group.amountPaise)}
                      </span>
                      <ChevronRight size={14} className="text-white/18" />
                    </div>
                  </Link>
                ))}
                {!groups.length && <QuietEmpty>No group spending in this period.</QuietEmpty>}
              </div>
            </section>

            <section className="space-y-4 lg:col-span-7">
              <SectionHeading title="Largest expenses" body="Your biggest shares in this period" />
              <div className="overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-[#171717]">
                {largestExpenses.map((expense) => (
                  <Link
                    key={`${expense.groupId}:${expense.id}`}
                    to={`/groups/${expense.groupId}`}
                    className="flex min-h-[4.6rem] items-center justify-between gap-4 border-b border-white/[0.06] px-4 py-3 last:border-b-0 hover:bg-white/[0.025]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white/80">
                        {expense.title}
                      </p>
                      <p className="mt-1 truncate text-[10px] text-white/28">
                        {expense.groupName} · {shortDate(expense.date)}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums text-white/75">
                      {money(expense.amountPaise)}
                    </span>
                  </Link>
                ))}
                {!largestExpenses.length && <QuietEmpty>No expenses in this period.</QuietEmpty>}
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>

      {!snapshot && loadingPeriod === days && (
        <div className="flex min-h-[24rem] items-center justify-center">
          <Loader />
        </div>
      )}

      {snapshot && (
        <div className="mt-7 flex items-center justify-center gap-2 text-[10px] text-white/22">
          {(snapshot.source === 'offline-cache' || snapshot.source === 'stale-cache') && (
            <WifiOff size={11} />
          )}
          {sourceLabel}
        </div>
      )}
    </motion.div>
  );
};

const SectionHeading = ({ title, body }) => (
  <div>
    <h2 className="font-manrope text-base font-semibold tracking-[-0.02em] text-white">{title}</h2>
    <p className="mt-1 text-xs text-white/30">{body}</p>
  </div>
);

const Metric = ({ label, value, supporting }) => (
  <div className="min-w-0">
    <p className="text-[9px] leading-snug text-white/28">{label}</p>
    <p className="mt-2 truncate font-manrope text-sm font-semibold text-white/80 sm:text-base">
      {value}
    </p>
    {supporting && <p className="mt-0.5 text-[9px] text-white/25">{supporting}</p>}
  </div>
);

const BalanceLine = ({ label, value = 0, tone, signed = false }) => (
  <LiveUpdate value={value} className="flex items-center justify-between gap-4">
    <span className="text-sm text-white/42">{label}</span>
    <span
      className={`font-manrope text-lg font-semibold tabular-nums ${
        tone === 'positive'
          ? 'text-emerald-300/90'
          : tone === 'negative'
            ? 'text-red-300/90'
            : 'text-white/85'
      }`}
    >
      {money(value, { sign: signed })}
    </span>
  </LiveUpdate>
);

const BreakdownRow = ({ label, amountPaise, share }) => (
  <LiveUpdate value={`${amountPaise}:${share}`}>
    <div className="flex items-baseline justify-between gap-4">
      <span className="truncate text-sm font-medium text-white/65">{label}</span>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-white/80">
        {money(amountPaise)}
      </span>
    </div>
    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
      <motion.div
        initial={false}
        animate={{ width: `${Math.max(share * 100, 2)}%` }}
        transition={spring}
        className="h-full rounded-full bg-white/65"
      />
    </div>
    <p className="mt-1.5 text-[9px] text-white/23">{Math.round(share * 100)}% of the period</p>
  </LiveUpdate>
);

const QuietEmpty = ({ children }) => (
  <div className="px-5 py-10 text-center text-xs leading-relaxed text-white/28">{children}</div>
);

export default Analytics;
