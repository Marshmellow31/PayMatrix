import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  PieChart as PieIcon,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  BarChart3,
  Users,
} from 'lucide-react';
import expenseService from '../services/expenseService.js';
import friendService from '../services/friendService.js';
import CategoryPieChart from '../components/charts/CategoryPieChart';
import TrendAreaChart from '../components/charts/TrendAreaChart';
import FriendLedger from '../components/charts/FriendLedger';
import Loader from '../components/common/Loader';

import { useNavigate } from 'react-router-dom';
import { useFeatureFlags } from '../hooks/useFeatureFlags.js';

const fmt = (n) => {
  const abs = Math.abs(n);
  if (abs >= 100000) return `₹${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `₹${(abs / 1000).toFixed(1)}k`;
  return `₹${abs.toFixed(0)}`;
};

const BalanceCard = ({ label, value, icon: Icon, accent, delay = 0, prefix = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4, ease: 'easeOut' }}
    className="relative overflow-hidden flex flex-col gap-3 p-4 sm:p-5 rounded-[1.75rem] border"
    style={{
      background: `${accent}06`,
      borderColor: `${accent}18`,
    }}
  >
    {/* Ambient glow */}
    <div
      className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl pointer-events-none"
      style={{ background: `${accent}20` }}
    />
    <div
      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
      style={{ background: `${accent}15`, border: `1px solid ${accent}25` }}
    >
      <Icon size={15} style={{ color: accent }} strokeWidth={2.5} />
    </div>
    <div>
      <p
        className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.22em] font-manrope mb-1.5"
        style={{ color: `${accent}80` }}
      >
        {label}
      </p>
      <p
        className="text-xl sm:text-2xl font-black font-manrope leading-none tracking-tight"
        style={{ color: accent }}
      >
        {prefix}
        {fmt(value)}
      </p>
    </div>
  </motion.div>
);

const Analytics = () => {
  const flags = useFeatureFlags();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [networkStats, setNetworkStats] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [days, setDays] = useState(30);

  useEffect(() => {
    if (flags && flags.analyticsPage === false) {
      navigate('/dashboard', { replace: true });
    }
  }, [flags, navigate]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        if (!isInitialLoading) setIsUpdating(true);
        const [summaryRes, networkRes, trendsRes] = await Promise.all([
          expenseService.getSummary(),
          friendService.getNetworkAnalytics(),
          expenseService.getSpendingTrends(days),
        ]);
        setSummary(summaryRes.data.data || {});
        setNetworkStats(networkRes.data.data.networkAnalytics || []);
        setTrends(trendsRes.data.data.trends || []);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setIsInitialLoading(false);
        setIsUpdating(false);
      }
    };

    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  if (isInitialLoading && !summary)
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader className="scale-150" />
      </div>
    );

  const { totalOwed = 0, totalOwe = 0, netBalance = 0, categories = [] } = summary || {};

  // Period stats derived from trends
  const periodTotal = trends.reduce((s, t) => s + (t.amount || 0), 0);
  const halfLen = Math.floor(trends.length / 2);
  const firstHalf = trends.slice(0, halfLen).reduce((s, t) => s + (t.amount || 0), 0);
  const secondHalf = trends.slice(halfLen).reduce((s, t) => s + (t.amount || 0), 0);
  const trendPct =
    firstHalf > 0 ? Math.round(Math.abs(((secondHalf - firstHalf) / firstHalf) * 100)) : 0;
  const isTrendUp = secondHalf > firstHalf;
  const categoryTotal = categories.reduce((s, c) => s + (c.value || 0), 0);

  const netAccent = netBalance > 0 ? '#34d399' : netBalance < 0 ? '#f87171' : '#ffffff';

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-10 pb-28 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl sm:text-4xl font-black font-manrope tracking-tighter text-white">
            Financial Analytics
          </h1>
          <p className="text-xs sm:text-sm text-white/30 font-inter uppercase tracking-[0.1em]">
            Spending patterns &amp; balances
          </p>
        </div>

        {/* Compact Range Toggle */}
        <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-2xl border border-white/5 backdrop-blur-xl self-start sm:self-auto">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`relative px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all z-10 ${
                days === d ? 'text-black' : 'text-white/40 hover:text-white'
              }`}
            >
              <span className="relative z-10">{d === 7 ? '1W' : d === 30 ? '1M' : '3M'}</span>
              {days === d && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-white shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                  style={{ borderRadius: 'inherit' }}
                  transition={{ type: 'spring', bounce: 0.1, duration: 0.5 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Balance Overview */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <BalanceCard
          label="Owed to you"
          value={totalOwed}
          icon={ArrowDownRight}
          accent="#34d399"
          delay={0.05}
        />
        <BalanceCard
          label="You owe"
          value={totalOwe}
          icon={ArrowUpRight}
          accent="#f97316"
          delay={0.1}
        />
        <BalanceCard
          label="Net balance"
          value={Math.abs(netBalance)}
          icon={Wallet}
          accent={netAccent}
          delay={0.15}
          prefix={netBalance < 0 ? '−' : ''}
        />
      </div>

      {/* Spending Velocity Trend */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.18 }}
        className="bg-white/[0.03] p-6 sm:p-8 rounded-[2.5rem] border border-white/5 overflow-hidden"
      >
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-500/15 text-orange-400 rounded-xl flex items-center justify-center border border-orange-500/20">
              <TrendingUp size={16} />
            </div>
            <div>
              <h3 className="font-black font-manrope text-xs uppercase tracking-widest text-white/90">
                Spending Velocity
              </h3>
              <p className="text-[10px] text-white/20 font-black uppercase tracking-widest mt-0.5">
                {days === 7 ? 'Last 7 days' : days === 30 ? 'Last 30 days' : 'Last 90 days'}
              </p>
            </div>
          </div>

          {/* Period total + trend direction */}
          {periodTotal > 0 && (
            <div className="flex flex-col items-end gap-1.5">
              <span className="text-white font-black font-manrope text-lg sm:text-2xl tracking-tight leading-none">
                {fmt(periodTotal)}
              </span>
              {trends.length > 3 && (
                <div
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-widest ${
                    isTrendUp
                      ? 'bg-red-500/10 border-red-500/20 text-red-400'
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  }`}
                >
                  {isTrendUp ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                  {trendPct}% vs prior half
                </div>
              )}
              <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest">
                period total
              </p>
            </div>
          )}
        </div>

        <div
          className={`transition-opacity duration-500 h-[220px] sm:h-[280px] ${isUpdating ? 'opacity-40' : 'opacity-100'}`}
        >
          {trends?.length > 0 ? (
            <TrendAreaChart data={trends} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-4 border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
              <BarChart3 size={28} className="text-white/10" />
              <p className="text-[10px] text-white/10 font-black uppercase tracking-[0.3em]">
                No trend data for this period
              </p>
            </div>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Spend Distribution */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.22 }}
          className="bg-white/[0.015] p-6 sm:p-8 rounded-[2.5rem] border border-white/5"
        >
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                <PieIcon size={16} className="text-white/50" />
              </div>
              <div>
                <h3 className="font-black font-manrope text-xs uppercase tracking-widest text-white/80">
                  Spend Distribution
                </h3>
                {categories.length > 0 && (
                  <p className="text-[9px] text-white/20 font-black uppercase tracking-widest mt-0.5">
                    {categories.length} categories
                  </p>
                )}
              </div>
            </div>
            {categoryTotal > 0 && (
              <div className="text-right">
                <p className="text-sm font-black text-white/60 font-manrope tracking-tight">
                  {fmt(categoryTotal)}
                </p>
                <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest mt-0.5">
                  your share
                </p>
              </div>
            )}
          </div>
          <div
            className={`w-full min-h-[300px] transition-opacity duration-300 ${isUpdating ? 'opacity-40' : 'opacity-100'}`}
          >
            {categories?.length > 0 ? (
              <CategoryPieChart data={categories} />
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center gap-4">
                <PieIcon size={28} className="text-white/10" />
                <p className="text-white/10 text-[10px] font-bold uppercase tracking-[0.2em]">
                  No categorical data
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Friend Ledger */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white/[0.015] p-6 sm:p-8 rounded-[2.5rem] border border-white/5"
        >
          <div className="flex items-start justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                <Users size={16} className="text-white/50" />
              </div>
              <div>
                <h3 className="font-black font-manrope text-xs uppercase tracking-widest text-white/80">
                  Friend Ledger
                </h3>
                <p className="text-[9px] text-white/20 font-black uppercase tracking-widest mt-0.5">
                  Top {Math.min(4, networkStats.length)} by balance
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 text-[8px] font-black uppercase tracking-widest shrink-0">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Owes You
              </span>
              <span className="flex items-center gap-1.5 text-orange-400">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                You Owe
              </span>
            </div>
          </div>
          <div
            className={`w-full transition-opacity duration-300 ${isUpdating ? 'opacity-40' : 'opacity-100'}`}
          >
            {networkStats?.length > 0 ? (
              <FriendLedger networkData={networkStats} />
            ) : (
              <div className="py-16 flex flex-col items-center justify-center gap-4">
                <Users size={28} className="text-white/10" />
                <p className="text-white/10 text-[10px] font-bold uppercase tracking-[0.2em]">
                  No friend data available
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Analytics;
