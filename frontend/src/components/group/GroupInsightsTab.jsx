import { useMemo } from 'react';
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import Avatar from '../common/Avatar.jsx';
import { formatCurrency, formatCompactCurrency } from '../../utils/formatCurrency.js';
import { EXPENSE_CATEGORIES } from '../../utils/constants.js';

// ─── Animation helpers ────────────────────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay, ease: 'easeOut' },
});

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Simple data pill used in the hero strip */
const StatPill = ({ icon: Icon, label, value, accent, className = '' }) => (
  <motion.div
    {...fadeUp(0.05)}
    className={`flex-1 min-w-0 flex flex-col gap-2 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors ${className}`}
  >
    <div
      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
      style={{ background: `${accent}18`, border: `1px solid ${accent}28` }}
    >
      <Icon size={16} style={{ color: accent }} strokeWidth={2.5} />
    </div>
    <p className="text-[10px] font-black font-manrope text-white/30 uppercase tracking-[0.22em] truncate">
      {label}
    </p>
    <p className="text-lg sm:text-xl font-black font-manrope text-white truncate leading-none">
      {value}
    </p>
  </motion.div>
);

/** Horizontal category bar row */
const CategoryBar = ({ category, amount, total, delay }) => {
  const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
  const cat = EXPENSE_CATEGORIES.find((c) => c.value === category);
  const IconCmp = cat ? LucideIcons[cat.icon] : LucideIcons.Hash;
  const color = cat?.color || '#888';

  return (
    <motion.div {...fadeUp(delay)} className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${color}18`, border: `1px solid ${color}26` }}
          >
            <IconCmp size={13} style={{ color }} strokeWidth={2.5} />
          </div>
          <span className="text-[11px] font-bold text-white/70 truncate font-inter">
            {category}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-bold text-white/30 font-mono">{pct}%</span>
          <span className="text-xs font-black font-manrope text-white/80">
            {formatCompactCurrency(amount)}
          </span>
        </div>
      </div>
      {/* Animated bar */}
      <div className="h-1.5 w-full rounded-full bg-white/[0.05] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}99, ${color})` }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, delay: delay + 0.1, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  );
};

/** Per-member contribution card */
const MemberCard = ({ member, paid, netBalance, actualShare, sharePct, maxPaid, rank, delay }) => {
  const user = member?.user || member || {};
  const name = user.name || user.email || 'Member';
  const barWidth = maxPaid > 0 ? Math.round((paid / maxPaid) * 100) : 0;
  const isOwed = netBalance > 0.009;
  const isOwes = netBalance < -0.009;

  return (
    <motion.div
      {...fadeUp(delay)}
      className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.025] border border-white/[0.05] hover:bg-white/[0.04] transition-colors"
    >
      {/* Rank badge */}
      <div className="w-5 shrink-0 flex items-center justify-center">
        <span className="text-[10px] font-black text-white/20 font-manrope">#{rank}</span>
      </div>

      <Avatar name={name} src={user.avatar} size="sm" className="shrink-0" />

      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-black font-manrope text-white truncate">{name}</p>
          <div className="flex items-center gap-2 shrink-0">
             <span className="text-[10px] font-bold text-white/30 font-mono italic">
               {sharePct}% impact
             </span>
             <p className="text-[10px] font-bold text-white/40 font-mono">
               paid {formatCompactCurrency(paid)}
             </p>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary/70"
            initial={{ width: 0 }}
            animate={{ width: `${barWidth}%` }}
            transition={{ duration: 0.6, delay: delay + 0.1, ease: 'easeOut' }}
          />
        </div>

        {/* Status indicator */}
        <div className="flex items-center justify-between gap-2">
          <p
            className={`text-[10px] font-bold uppercase tracking-wider ${
              isOwed ? 'text-emerald-400/80' : isOwes ? 'text-red-400/80' : 'text-white/25'
            }`}
          >
            {isOwed
              ? `Owed ${formatCompactCurrency(Math.abs(netBalance))}`
              : isOwes
              ? `Owes ${formatCompactCurrency(Math.abs(netBalance))}`
              : 'Settled ✓'}
          </p>
          <p className="text-[10px] font-bold text-white/10 uppercase tracking-tight">
            Share: {formatCompactCurrency(actualShare)}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const GroupInsightsTab = ({
  members = [],
  expenses = [],
  settlements = [],
  netBalances = {},
}) => {
  // ── Derived stats (all pure from props, no Firestore) ──────────────────────
  const stats = useMemo(() => {
    const activeExp = expenses.filter(
      (e) => e.status !== 'deleted' && e.status !== 'archived'
    );
    const activeSett = settlements.filter((s) => s.status !== 'deleted');

    // Total group spend & settlement
    const totalGroupSpend = activeExp.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    const totalSettled = activeSett.reduce((s, st) => s + parseFloat(st.amount || 0), 0);
    const settlementProgress =
      totalGroupSpend > 0 ? Math.min(100, Math.round((totalSettled / totalGroupSpend) * 100)) : 0;

    // Per-member: how much they PAID (raw, not net)
    const paidByMember = {};
    activeExp.forEach((e) => {
      const uid =
        e.paidBy?._id || e.paidBy?.uid || (typeof e.paidBy === 'string' ? e.paidBy : null);
      if (!uid) return;
      paidByMember[uid] = (paidByMember[uid] || 0) + parseFloat(e.amount || 0);
    });

    // Category breakdown
    const categoryTotals = {};
    activeExp.forEach((e) => {
      if (!e.category) return;
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + parseFloat(e.amount || 0);
    });
    const categoryBreakdown = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6); // cap at 6 rows

    // Average expense
    const avgExpense = activeExp.length > 0 ? totalGroupSpend / activeExp.length : 0;

    // Top payer
    let topPayerUid = null;
    let topPayerAmt = 0;
    Object.entries(paidByMember).forEach(([uid, amt]) => {
      if (amt > topPayerAmt) { topPayerAmt = amt; topPayerUid = uid; }
    });
    const topPayerMember = members.find((m) => {
      const mid = m.user?._id || m.user?.uid || m.user || m._id || m.uid;
      return (mid || '').toString() === topPayerUid;
    });
    const topPayerName =
      topPayerMember?.user?.name ||
      topPayerMember?.name ||
      'N/A';

    // Member list sorted by paid desc
    const memberStats = members.map((m) => {
      const uid = (m.user?._id || m.user?.uid || m.user || m._id || m.uid || '').toString();
      const paid = paidByMember[uid] || 0;
      const netBalance = netBalances[uid] || 0;
      // Core Insight Logic: ActualShare = paid - netBalance
      // If you paid 100 but are owed 80, your actual share was 20.
      const actualShare = paid - netBalance;
      const sharePct = totalGroupSpend > 0 ? Math.round((actualShare / totalGroupSpend) * 100) : 0;

      return {
        member: m,
        uid,
        paid,
        netBalance,
        actualShare,
        sharePct,
      };
    }).sort((a, b) => b.paid - a.paid);

    const maxPaid = memberStats[0]?.paid || 0;

    return {
      totalGroupSpend,
      totalSettled,
      settlementProgress,
      expenseCount: activeExp.length,
      avgExpense,
      categoryBreakdown,
      topPayerName,
      topPayerAmt,
      memberStats,
      maxPaid,
    };
  }, [expenses, settlements, members, netBalances]);

  // ── Empty state ───────────────────────────────────────────────────────────
  if (stats.expenseCount === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-24 gap-4"
      >
        <div className="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
          <LucideIcons.BarChart3 size={28} className="text-white/20" />
        </div>
        <p className="text-sm font-inter text-white/30 text-center">
          No expenses yet — insights will appear once the first expense is recorded.
        </p>
      </motion.div>
    );
  }

  const { totalGroupSpend, totalSettled, settlementProgress, expenseCount,
          avgExpense, categoryBreakdown, topPayerName, topPayerAmt,
          memberStats, maxPaid } = stats;

  return (
    <div className="flex flex-col gap-6 pb-4">

      {/* ── Hero Strip ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatPill
          icon={LucideIcons.IndianRupee}
          label="Total Spent"
          value={formatCurrency(totalGroupSpend)}
          accent="#a78bfa"
          className="col-span-2 sm:col-span-1"
        />
        <StatPill
          icon={LucideIcons.CheckCircle2}
          label="Settled"
          value={formatCurrency(totalSettled)}
          accent="#34d399"
        />
        <StatPill
          icon={LucideIcons.Receipt}
          label="Expenses"
          value={expenseCount}
          accent="#f97316"
        />
      </div>

      {/* ── Settlement Progress Bar ────────────────────────────────────────── */}
      <motion.div
        {...fadeUp(0.1)}
        className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-black font-manrope text-white/30 uppercase tracking-[0.22em]">
            Settlement Progress
          </p>
          <span className="text-xs font-black font-manrope text-emerald-400">
            {settlementProgress}%
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #34d39999, #34d399)' }}
            initial={{ width: 0 }}
            animate={{ width: `${settlementProgress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <p className="text-[10px] text-white/20 font-inter">
            {formatCompactCurrency(totalSettled)} settled
          </p>
          <p className="text-[10px] text-white/20 font-inter">
            {formatCompactCurrency(totalGroupSpend)} total
          </p>
        </div>
      </motion.div>

      {/* ── Group Scorecard ────────────────────────────────────────────────── */}
      <motion.div
        {...fadeUp(0.12)}
        className="grid grid-cols-2 gap-3"
      >
        {/* Avg expense */}
        <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-2">
            <LucideIcons.TrendingUp size={13} className="text-blue-400/70" />
            <p className="text-[10px] font-black font-manrope text-white/30 uppercase tracking-[0.18em]">
              Avg Expense
            </p>
          </div>
          <p className="text-base font-black font-manrope text-white leading-none">
            {formatCompactCurrency(avgExpense)}
          </p>
        </div>

        {/* Top payer */}
        <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-2">
            <LucideIcons.Crown size={13} className="text-yellow-400/70" />
            <p className="text-[10px] font-black font-manrope text-white/30 uppercase tracking-[0.18em] truncate">
              Top Payer
            </p>
          </div>
          <p className="text-base font-black font-manrope text-white leading-none truncate">
            {topPayerName}
          </p>
          <p className="text-[10px] text-white/25 font-inter">
            {formatCompactCurrency(topPayerAmt)} paid
          </p>
        </div>
      </motion.div>

      {/* ── Member Contributions ───────────────────────────────────────────── */}
      <motion.div {...fadeUp(0.14)} className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-[10px] font-black font-manrope text-white/30 uppercase tracking-[0.3em]">
            Member Contributions
          </p>
          <p className="text-[10px] font-bold text-white/20 font-inter">by amount paid</p>
        </div>
        <div className="flex flex-col gap-2">
          {memberStats.map(({ member, uid, paid, netBalance, actualShare, sharePct }, idx) => (
            <MemberCard
              key={uid}
              member={member}
              paid={paid}
              netBalance={netBalance}
              actualShare={actualShare}
              sharePct={sharePct}
              maxPaid={maxPaid}
              rank={idx + 1}
              delay={0.16 + idx * 0.04}
            />
          ))}
        </div>
      </motion.div>

      {/* ── Category Breakdown ─────────────────────────────────────────────── */}
      {categoryBreakdown.length > 0 && (
        <motion.div {...fadeUp(0.18)} className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] font-black font-manrope text-white/30 uppercase tracking-[0.3em]">
              By Category
            </p>
            <p className="text-[10px] font-bold text-white/20 font-inter">
              of {formatCompactCurrency(totalGroupSpend)}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col gap-4">
            {categoryBreakdown.map(([category, amount], idx) => (
              <CategoryBar
                key={category}
                category={category}
                amount={amount}
                total={totalGroupSpend}
                delay={0.2 + idx * 0.05}
              />
            ))}
          </div>
        </motion.div>
      )}

    </div>
  );
};

export default GroupInsightsTab;
