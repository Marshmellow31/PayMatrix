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
import SpendingTrendChart from '../components/charts/SpendingTrendChart';
import CategoryPieChart from '../components/charts/CategoryPieChart';
import Loader from '../components/common/Loader';

const Analytics = () => {
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [days, setDays] = useState(30);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        if (!isInitialLoading) setIsUpdating(true);
        const [summaryRes, trendsRes] = await Promise.all([
          expenseService.getSummary(),
          expenseService.getSpendingTrends(days)
        ]);
        setSummary(summaryRes.data.data);
        setTrends(trendsRes.data.data.trends);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setIsInitialLoading(false);
        setIsUpdating(false);
      }
    };

    fetchAnalytics();
  }, [days]);

  if (isInitialLoading) return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <Loader className="scale-150" />
    </div>
  );

  const { totalOwed, totalOwe, netBalance, categories } = summary || {};

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto pb-24 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-manrope tracking-tight text-on-surface">Financial Analytics</h1>
          <p className="text-on-surface-variant/70 text-sm mt-1">Visualize your spending patterns and balances</p>
        </div>
        
        <div className="flex items-center gap-1 bg-surface-container-low/50 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md relative">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`relative px-5 py-2.5 rounded-xl text-xs font-bold transition-colors z-10 ${
                days === d 
                  ? 'text-black' 
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="relative z-10">
                {d === 7 ? '1 Week' : d === 30 ? '1 Month' : '3 Months'}
              </span>
              {days === d && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-white rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary">
              <Wallet size={20} />
            </div>
            {netBalance >= 0 ? (
              <span className="flex items-center text-xs font-medium text-primary">
                Positive <ArrowUpRight size={14} className="ml-1" />
              </span>
            ) : (
              <span className="flex items-center text-xs font-medium text-error">
                Debt <ArrowDownRight size={14} className="ml-1" />
              </span>
            )}
          </div>
          <p className="text-on-surface-variant text-xs font-medium uppercase tracking-wider">Net Balance</p>
          <h2 className="text-3xl font-bold font-manrope mt-1">₹{Math.abs(netBalance || 0).toLocaleString()}</h2>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500">
              <ArrowUpRight size={20} />
            </div>
          </div>
          <p className="text-on-surface-variant text-xs font-medium uppercase tracking-wider">You Are Owed</p>
          <h2 className="text-3xl font-bold font-manrope mt-1 text-emerald-500">₹{(totalOwed || 0).toLocaleString()}</h2>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-500/10 rounded-2xl text-red-500">
              <ArrowDownRight size={20} />
            </div>
          </div>
          <p className="text-on-surface-variant text-xs font-medium uppercase tracking-wider">You Owe</p>
          <h2 className="text-3xl font-bold font-manrope mt-1 text-red-500">₹{(totalOwe || 0).toLocaleString()}</h2>
        </motion.div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Spending Trends */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-surface-container-low p-8 rounded-[2.5rem] border border-outline-variant/10 flex flex-col"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <TrendingUp size={18} />
              </div>
              <h3 className="font-bold font-manrope text-lg">Spending Trends</h3>
            </div>
          </div>
          <div className={`flex-1 w-full min-h-[300px] transition-opacity duration-300 ${isUpdating ? 'opacity-40' : 'opacity-100'}`}>
            <SpendingTrendChart data={trends} />
          </div>
        </motion.div>

        {/* Category Breakdown */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-surface-container-low p-8 rounded-[2.5rem] border border-outline-variant/10 flex flex-col"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <PieIcon size={18} />
              </div>
              <h3 className="font-bold font-manrope text-lg">Category Distribution</h3>
            </div>
          </div>
          <div className={`flex-1 w-full min-h-[300px] transition-opacity duration-300 ${isUpdating ? 'opacity-40' : 'opacity-100'}`}>
            {categories?.length > 0 ? (
              <CategoryPieChart data={categories} />
            ) : (
              <div className="h-full flex items-center justify-center text-on-surface-variant/40 text-sm italic">
                No categorical data available
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Analytics;
