import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Crown,
  Hash,
  IndianRupee,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { getLucideIcon } from '../../utils/iconMap.js';
import Avatar from '../common/Avatar.jsx';
import { formatCompactCurrency } from '../../utils/formatCurrency.js';
import { EXPENSE_CATEGORIES } from '../../utils/constants.js';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay, ease: 'easeOut' },
});

// ─── Hero stat card with ambient glow ────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, subValue, accent, delay = 0, className = '' }) => (
  <motion.div
    {...fadeUp(delay)}
    className={`relative overflow-hidden flex flex-col gap-3 p-4 sm:p-5 rounded-[1.5rem] border backdrop-blur-md transition-all hover:scale-[1.01] hover:border-white/10 ${className}`}
    style={{
      background: `linear-gradient(135deg, ${accent}0e 0%, ${accent}03 100%)`,
      borderColor: `${accent}20`,
    }}
  >
    <div
      className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-60"
      style={{ background: `${accent}40` }}
    />
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
      style={{
        background: `linear-gradient(135deg, ${accent}25 0%, ${accent}0e 100%)`,
        border: `1px solid ${accent}35`,
      }}
    >
      <Icon size={18} style={{ color: accent }} strokeWidth={2.5} />
    </div>
    <div className="relative">
      <p
        className="text-[9px] sm:text-[10px] font-black font-manrope uppercase tracking-[0.22em] mb-1"
        style={{ color: `${accent}b0` }}
      >
        {label}
      </p>
      <p className="text-2xl sm:text-3xl font-black font-manrope text-white leading-none tracking-tight">
        {value}
      </p>
      {subValue && (
        <p className="text-[10px] text-white/40 font-inter mt-1.5 leading-snug">{subValue}</p>
      )}
    </div>
  </motion.div>
);

// ─── 2×2 scorecard mini-tile ─────────────────────────────────────────────────
const ScoreTile = ({ icon: Icon, label, primary, secondary, accent, delay = 0 }) => (
  <motion.div
    {...fadeUp(delay)}
    className="flex flex-col gap-2.5 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors overflow-hidden"
  >
    <div className="flex items-center gap-2">
      <Icon size={13} style={{ color: accent }} strokeWidth={2.5} />
      <p className="text-[9px] font-black font-manrope text-white/30 uppercase tracking-[0.2em] truncate">
        {label}
      </p>
    </div>
    <p className="text-sm font-black font-manrope text-white leading-tight truncate">{primary}</p>
    {secondary && (
      <p className="text-[10px] text-white/25 font-inter truncate leading-snug">{secondary}</p>
    )}
  </motion.div>
);

// ─── Category bar row ─────────────────────────────────────────────────────────
const CategoryBar = ({ category, amount, total, delay }) => {
  const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
  const cat = EXPENSE_CATEGORIES.find((c) => c.value === category);
  const IconCmp = cat ? getLucideIcon(cat.icon) : Hash;
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

// ─── Member contribution card ─────────────────────────────────────────────────
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

        <div className="h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary/70"
            initial={{ width: 0 }}
            animate={{ width: `${barWidth}%` }}
            transition={{ duration: 0.6, delay: delay + 0.1, ease: 'easeOut' }}
          />
        </div>

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

const GroupInsightsTab = ({ members = [], expenses = [], settlements = [], netBalances = {} }) => {
  const stats = useMemo(() => {
    const activeExp = expenses.filter((e) => e.status !== 'deleted' && e.status !== 'archived');
    const activeSett = settlements.filter((s) => s.status !== 'deleted');

    const totalGroupSpend = activeExp.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    const totalSettled = activeSett.reduce((s, st) => s + parseFloat(st.amount || 0), 0);
    const unsettled = Math.max(0, totalGroupSpend - totalSettled);
    const settlementProgress =
      totalGroupSpend > 0 ? Math.min(100, Math.round((totalSettled / totalGroupSpend) * 100)) : 0;

    // Per-member: how much they PAID
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
      .slice(0, 6);

    const avgExpense = activeExp.length > 0 ? totalGroupSpend / activeExp.length : 0;

    // Top payer
    let topPayerUid = null;
    let topPayerAmt = 0;
    Object.entries(paidByMember).forEach(([uid, amt]) => {
      if (amt > topPayerAmt) {
        topPayerAmt = amt;
        topPayerUid = uid;
      }
    });
    const topPayerMember = members.find((m) => {
      const mid = m.user?._id || m.user?.uid || m.user || m._id || m.uid;
      return (mid || '').toString() === topPayerUid;
    });
    const topPayerName = topPayerMember?.user?.name || topPayerMember?.name || 'N/A';

    // Largest single expense
    const largestExp = activeExp.reduce(
      (max, e) => (parseFloat(e.amount || 0) > parseFloat(max?.amount || 0) ? e : max),
      null
    );

    // Most active member by number of expenses recorded
    const expCountByMember = {};
    activeExp.forEach((e) => {
      const uid = (
        e.admin ||
        (typeof e.paidBy === 'string' ? e.paidBy : e.paidBy?._id) ||
        ''
      ).toString();
      if (!uid) return;
      expCountByMember[uid] = (expCountByMember[uid] || 0) + 1;
    });
    let mostActiveUid = '';
    let mostActiveCount = 0;
    Object.entries(expCountByMember).forEach(([uid, cnt]) => {
      if (cnt > mostActiveCount) {
        mostActiveCount = cnt;
        mostActiveUid = uid;
      }
    });
    const mostActiveMember = members.find((m) => {
      const mid = (m.user?._id || m.user?.uid || m.user || m._id || m.uid || '').toString();
      return mid === mostActiveUid;
    });
    const mostActiveName = mostActiveMember?.user?.name || mostActiveMember?.name || 'N/A';

    // Member list sorted by paid desc
    const memberStats = members
      .map((m) => {
        const uid = (m.user?._id || m.user?.uid || m.user || m._id || m.uid || '').toString();
        const paid = paidByMember[uid] || 0;
        const netBalance = netBalances[uid] || 0;
        const actualShare = paid - netBalance;
        const sharePct =
          totalGroupSpend > 0 ? Math.round((actualShare / totalGroupSpend) * 100) : 0;
        return { member: m, uid, paid, netBalance, actualShare, sharePct };
      })
      .sort((a, b) => b.paid - a.paid);

    const maxPaid = memberStats[0]?.paid || 0;

    return {
      totalGroupSpend,
      totalSettled,
      unsettled,
      settlementProgress,
      expenseCount: activeExp.length,
      avgExpense,
      categoryBreakdown,
      topPayerName,
      topPayerAmt,
      largestExp,
      mostActiveName,
      mostActiveCount,
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
          <BarChart3 size={28} className="text-white/20" />
        </div>
        <p className="text-sm font-inter text-white/30 text-center">
          No expenses yet — insights will appear once the first expense is recorded.
        </p>
      </motion.div>
    );
  }

  const {
    totalGroupSpend,
    totalSettled,
    unsettled,
    settlementProgress,
    expenseCount,
    avgExpense,
    categoryBreakdown,
    topPayerName,
    topPayerAmt,
    largestExp,
    mostActiveName,
    mostActiveCount,
    memberStats,
    maxPaid,
  } = stats;

  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* ── Hero Stats Strip ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          icon={IndianRupee}
          label="Total Spent"
          value={formatCompactCurrency(totalGroupSpend)}
          subValue={`${expenseCount} expense${expenseCount !== 1 ? 's' : ''}`}
          accent="#a78bfa"
          delay={0.04}
          className="col-span-2 sm:col-span-1"
        />
        <StatCard
          icon={CheckCircle2}
          label="Settled"
          value={formatCompactCurrency(totalSettled)}
          subValue={`${settlementProgress}% of total`}
          accent="#34d399"
          delay={0.08}
          className="col-span-1"
        />
        <StatCard
          icon={AlertCircle}
          label="Outstanding"
          value={formatCompactCurrency(unsettled)}
          subValue={unsettled <= 0 ? 'All clear!' : 'remaining'}
          accent={unsettled <= 0 ? '#34d399' : '#f97316'}
          delay={0.12}
          className="col-span-1"
        />
      </div>

      {/* ── Settlement Progress ───────────────────────────────────────────── */}
      <motion.div
        {...fadeUp(0.14)}
        className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={12} className="text-emerald-400/60" />
            <p className="text-[10px] font-black font-manrope text-white/30 uppercase tracking-[0.22em]">
              Settlement Progress
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/20 font-inter hidden sm:block">
              {formatCompactCurrency(totalSettled)} / {formatCompactCurrency(totalGroupSpend)}
            </span>
            <span className="text-xs font-black font-manrope text-emerald-400 tabular-nums">
              {settlementProgress}%
            </span>
          </div>
        </div>
        <div className="h-2.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #059669, #34d399, #86efac)' }}
            initial={{ width: 0 }}
            animate={{ width: `${settlementProgress}%` }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />
        </div>
        <p className="text-[10px] font-inter mt-2 leading-snug">
          {settlementProgress >= 100 ? (
            <span className="text-emerald-400/60">All expenses fully settled!</span>
          ) : (
            <span className="text-white/20">{formatCompactCurrency(unsettled)} left to settle</span>
          )}
        </p>
      </motion.div>

      {/* ── 2×2 Scorecard ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <ScoreTile
          icon={TrendingUp}
          label="Avg Expense"
          primary={formatCompactCurrency(avgExpense)}
          secondary="per transaction"
          accent="#60a5fa"
          delay={0.16}
        />
        <ScoreTile
          icon={Zap}
          label="Largest Expense"
          primary={largestExp ? formatCompactCurrency(parseFloat(largestExp.amount || 0)) : '—'}
          secondary={largestExp?.title || '—'}
          accent="#fbbf24"
          delay={0.18}
        />
        <ScoreTile
          icon={Crown}
          label="Top Payer"
          primary={topPayerName}
          secondary={`${formatCompactCurrency(topPayerAmt)} paid`}
          accent="#eab308"
          delay={0.2}
        />
        <ScoreTile
          icon={Activity}
          label="Most Active"
          primary={mostActiveName}
          secondary={`${mostActiveCount} expense${mostActiveCount !== 1 ? 's' : ''} added`}
          accent="#f472b6"
          delay={0.22}
        />
      </div>

      {/* ── Member Contributions ──────────────────────────────────────────── */}
      <motion.div {...fadeUp(0.24)} className="flex flex-col gap-3">
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
              delay={0.26 + idx * 0.04}
            />
          ))}
        </div>
      </motion.div>

      {/* ── Category Breakdown ────────────────────────────────────────────── */}
      {categoryBreakdown.length > 0 && (
        <motion.div {...fadeUp(0.28)} className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] font-black font-manrope text-white/30 uppercase tracking-[0.3em]">
              By Category
            </p>
            <p className="text-[10px] font-bold text-white/20 font-inter">
              of {formatCompactCurrency(totalGroupSpend)}
            </p>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col gap-4">
            {categoryBreakdown.map(([category, amount], idx) => (
              <CategoryBar
                key={category}
                category={category}
                amount={amount}
                total={totalGroupSpend}
                delay={0.3 + idx * 0.05}
              />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default GroupInsightsTab;
