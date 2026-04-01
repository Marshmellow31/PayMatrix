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
import SpendingTrendChart from '../components/charts/SpendingTrendChart';
import CategoryPieChart from '../components/charts/CategoryPieChart';
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
        const [summaryRes, trendsRes, networkRes] = await Promise.all([
          expenseService.getSummary(),
          expenseService.getSpendingTrends(days),
          friendService.getNetworkAnalytics()
        ]);
        setSummary(summaryRes.data.data || {});
        setTrends(trendsRes.data.data.trends || []);
        setNetworkStats(networkRes.data.data.networkAnalytics || []);
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

      {/* Optimized Summary Grid - High Visibility & Compact */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Net Balance - Prominent */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-2 lg:col-span-1 bg-white/[0.04] p-5 sm:p-6 rounded-[2rem] border border-white/10 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-white text-black rounded-xl flex items-center justify-center font-black">
              <Wallet size={18} />
            </div>
            <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border border-white/10
              ${netBalance >= 0 ? 'bg-white/5 text-white/60' : 'bg-white/5 text-white/30'}`}
            >
              {netBalance >= 0 ? 'Surplus' : 'Deficit'}
            </span>
          </div>
          <div>
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Net Balance</p>
            <h2 className="text-3xl sm:text-4xl font-black font-manrope text-white tracking-tighter mt-1">
              ₹{Math.abs(netBalance || 0).toLocaleString()}
            </h2>
          </div>
        </motion.div>

        {/* You Are Owed */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/[0.02] p-5 rounded-[2rem] border border-white/5 flex flex-col justify-between"
        >
          <div className="w-9 h-9 bg-white/10 text-white rounded-lg flex items-center justify-center mb-6">
            <ArrowUpRight size={18} />
          </div>
          <div>
            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Owed</p>
            <h2 className="text-xl sm:text-2xl font-black font-manrope text-white tracking-tight mt-1">
              ₹{(totalOwed || 0).toLocaleString()}
            </h2>
          </div>
        </motion.div>

        {/* You Owe */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/[0.02] p-5 rounded-[2rem] border border-white/5 flex flex-col justify-between"
        >
          <div className="w-9 h-9 bg-white/5 text-white/40 rounded-lg flex items-center justify-center mb-6">
            <ArrowDownRight size={18} />
          </div>
          <div>
            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Owe</p>
            <h2 className="text-xl sm:text-2xl font-black font-manrope text-white/40 tracking-tight mt-1">
              ₹{(totalOwe || 0).toLocaleString()}
            </h2>
          </div>
        </motion.div>
      </div>

      {/* Main Charts - Refined for mobile space */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending Trends */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white/[0.015] p-6 sm:p-8 rounded-[2.5rem] border border-white/5 flex flex-col"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 flex items-center justify-center text-white/40">
              <TrendingUp size={18} />
            </div>
            <h3 className="font-black font-manrope text-sm uppercase tracking-widest text-white/80">Trends</h3>
          </div>
          <div className={`flex-1 w-full min-h-[250px] sm:min-h-[300px] transition-opacity duration-300 ${isUpdating ? 'opacity-40' : 'opacity-100'}`}>
            <SpendingTrendChart data={trends} />
          </div>
        </motion.div>

        {/* Category Breakdown */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white/[0.015] p-6 sm:p-8 rounded-[2.5rem] border border-white/5 flex flex-col"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 flex items-center justify-center text-white/40">
              <PieIcon size={18} />
            </div>
            <h3 className="font-black font-manrope text-sm uppercase tracking-widest text-white/80">Distrubution</h3>
          </div>
          <div className={`flex-1 w-full min-h-[250px] sm:min-h-[300px] transition-opacity duration-300 ${isUpdating ? 'opacity-40' : 'opacity-100'}`}>
            {categories?.length > 0 ? (
              <CategoryPieChart data={categories} />
            ) : (
              <div className="h-full flex items-center justify-center text-white/10 text-[10px] font-bold uppercase tracking-[0.2em] italic">
                No categorical data available
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Social Capital - Friend Network Stats */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 pt-4"
      >
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-black font-manrope tracking-tight text-white uppercase italic">
            Social Capital
          </h3>
          <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.2em]">
            Network-wide spending synergy & balances
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {networkStats?.length > 0 ? (
            networkStats.map((stat, idx) => (
              <motion.div 
                key={stat.friend._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative overflow-hidden bg-white/[0.02] border border-white/5 rounded-3xl p-5 hover:bg-white/[0.04] hover:border-white/20 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-black text-xs">
                      {stat.friend.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-black text-white leading-tight">{stat.friend.name}</p>
                      <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest mt-0.5">Contact</p>
                    </div>
                  </div>
                  <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border
                    ${stat.netBalance >= 0 ? 'bg-white/5 text-white/40 border-white/10' : 'bg-white/5 text-white/20 border-white/5'}`}>
                    {stat.netBalance >= 0 ? 'Clear' : 'Owed'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Net Position</p>
                    <p className={`text-base font-black font-manrope tracking-tighter
                      ${stat.netBalance >= 0 ? 'text-white' : 'text-white/40'}`}>
                      ₹{Math.abs(stat.netBalance).toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Turnover</p>
                    <p className="text-base font-black font-manrope text-white tracking-tighter">
                      ₹{stat.totalTurnover.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Sublte progress indicator based on turnover vs total avg or just decorative */}
                <div className="absolute bottom-0 left-0 h-0.5 bg-white/10 group-hover:bg-white/30 transition-all" style={{ width: '100%' }} />
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-16 text-center border border-dashed border-white/5 rounded-[2.5rem] bg-white/[0.01]">
              <p className="text-[10px] text-white/10 font-black uppercase tracking-[0.3em]">No social data to compute</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Analytics;
