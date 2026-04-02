import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  PieChart as PieIcon, 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet,
  Calendar,
  Filter
} from 'lucide-react';
import expenseService from '../services/expenseService.js';
import friendService from '../services/friendService.js';
import CategoryPieChart from '../components/charts/CategoryPieChart';
import TrendAreaChart from '../components/charts/TrendAreaChart';
import FriendLedger from '../components/charts/FriendLedger';
import Loader from '../components/common/Loader';

const Analytics = () => {
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [networkStats, setNetworkStats] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [days, setDays] = useState(30);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        if (!isInitialLoading) setIsUpdating(true);
        const [summaryRes, networkRes, trendsRes] = await Promise.all([
          expenseService.getSummary(),
          friendService.getNetworkAnalytics(),
          expenseService.getSpendingTrends(days)
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
  }, [days]);

  if (isInitialLoading && !summary) return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <Loader className="scale-150" />
    </div>
  );

  const { totalOwed, totalOwe, netBalance, categories } = summary || {};

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-10 pb-28 space-y-8">
      {/* Refined Mobile Header */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl sm:text-4xl font-black font-manrope tracking-tighter text-white">
            Financial Analytics
          </h1>
          <p className="text-xs sm:text-sm text-white/30 font-inter uppercase tracking-[0.1em]">
            Spending patterns & balances
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
              <span className="relative z-10">
                {d === 7 ? '1W' : d === 30 ? '1M' : '3M'}
              </span>
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


      {/* HERO: Spending Velocity Trend */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/[0.03] p-6 sm:p-8 rounded-[2.5rem] border border-white/5 overflow-hidden"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500/20 text-orange-400 rounded-lg flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
            <div>
              <h3 className="font-black font-manrope text-xs uppercase tracking-widest text-white/90">Spending Velocity</h3>
              <p className="text-[10px] text-white/20 font-black uppercase tracking-widest mt-0.5">Global network activity</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-white/40">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316]" />
              Your Share
            </div>
          </div>
        </div>
        
        <div className={`transition-opacity duration-500 h-[220px] sm:h-[280px] ${isUpdating ? 'opacity-40' : 'opacity-100'}`}>
          {trends?.length > 0 ? (
            <TrendAreaChart data={trends} />
          ) : (
            <div className="h-full flex items-center justify-center border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
              <p className="text-[10px] text-white/10 font-black uppercase tracking-[0.3em]">No trend data for this period</p>
            </div>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Distribution Breakdown */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white/[0.015] p-6 sm:p-8 rounded-[2.5rem] border border-white/5"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 flex items-center justify-center text-white/40">
              <PieIcon size={18} />
            </div>
            <h3 className="font-black font-manrope text-sm uppercase tracking-widest text-white/80">Asset Distribution</h3>
          </div>
          <div className={`w-full min-h-[300px] transition-opacity duration-300 ${isUpdating ? 'opacity-40' : 'opacity-100'}`}>
            {categories?.length > 0 ? (
              <CategoryPieChart data={categories} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-white/10 text-[10px] font-bold uppercase tracking-[0.2em] italic">
                No categorical data
              </div>
            )}
          </div>
        </motion.div>

        {/* Friend Ledger */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white/[0.015] p-6 sm:p-8 rounded-[2.5rem] border border-white/5"
        >
          <div className="flex items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="font-black font-manrope text-sm uppercase tracking-widest text-white/80">Friend Ledger</h3>
              <p className="text-[9px] text-white/20 font-black uppercase tracking-widest mt-1">Top 4 by balance</p>
            </div>
            <div className="flex items-center gap-3 text-[8px] font-black uppercase tracking-widest">
              <span className="flex items-center gap-1.5 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-400" />Owes You</span>
              <span className="flex items-center gap-1.5 text-orange-400"><span className="w-2 h-2 rounded-full bg-orange-400" />You Owe</span>
            </div>
          </div>
          <div className={`w-full transition-opacity duration-300 ${isUpdating ? 'opacity-40' : 'opacity-100'}`}>
            {networkStats?.length > 0 ? (
              <FriendLedger networkData={networkStats} />
            ) : (
              <div className="py-16 flex items-center justify-center text-white/10 text-[10px] font-bold uppercase tracking-[0.2em] italic">
                No friend data available
              </div>
            )}
          </div>
        </motion.div>
      </div>

    </div>
  );
};

export default Analytics;
