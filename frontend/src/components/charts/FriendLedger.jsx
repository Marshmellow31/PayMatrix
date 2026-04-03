import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from '../common/Avatar.jsx';

const FriendLedger = ({ networkData }) => {
  const [animated, setAnimated] = useState(false);

  // Take top 4 by absolute net balance (most financially significant)
  const top4 = networkData
    .slice()
    .sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance))
    .slice(0, 4);

  const count = top4.length;

  // Max value for bar scaling
  const maxBalance = Math.max(...top4.map(d => Math.abs(d.netBalance)), 1);
  const maxTurnover = Math.max(...top4.map(d => d.totalTurnover), 1);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Dynamic row height based on count
  const rowHeight = count === 1 ? 120 : count === 2 ? 100 : count === 3 ? 84 : 72;

  const getLabel = (balance) => {
    if (Math.abs(balance) < 1) return { text: 'Settled', color: 'text-white/30', badge: 'bg-white/5 text-white/30 border-white/10' };
    if (balance > 0) return { text: 'Owes you', color: 'text-emerald-400', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    return { text: 'You owe', color: 'text-orange-400', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20' };
  };

  const getBarColor = (balance) => {
    if (Math.abs(balance) < 1) return 'bg-white/20';
    if (balance > 0) return 'bg-gradient-to-r from-emerald-600 to-emerald-400';
    return 'bg-gradient-to-r from-orange-600 to-orange-400';
  };

  const getGlow = (balance) => {
    if (Math.abs(balance) < 1) return '';
    if (balance > 0) return 'shadow-[0_0_12px_rgba(52,211,153,0.4)]';
    return 'shadow-[0_0_12px_rgba(249,115,22,0.4)]';
  };

  return (
    <div
      className="w-full flex flex-col"
      style={{ gap: count > 2 ? '12px' : '16px' }}
    >
      <AnimatePresence>
        {top4.map((stat, idx) => {
          const { text, color, badge } = getLabel(stat.netBalance);
          const balancePct = (Math.abs(stat.netBalance) / maxBalance) * 100;
          const turnoverPct = (stat.totalTurnover / maxTurnover) * 100;
          const name = stat.friend?.name || 'Member';
          const initial = name.charAt(0).toUpperCase();

          return (
            <motion.div
              key={stat.friend?._id || idx}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08, duration: 0.4 }}
              className="group relative flex flex-col justify-between bg-white/[0.03] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 rounded-2xl p-4 transition-all duration-300 overflow-hidden"
              style={{ minHeight: `${rowHeight}px` }}
            >
              {/* Subtle animated background shimmer on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-white/[0.02] via-transparent to-transparent pointer-events-none rounded-2xl" />

              {/* Top Row: Avatar + Name + Badge */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <Avatar 
                    name={name} 
                    src={stat.friend?.avatar} 
                    size="sm" 
                    className={`rounded-xl ${
                      Math.abs(stat.netBalance) < 1
                        ? 'bg-white/10 text-white/50 border-white/5'
                        : stat.netBalance > 0
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/10'
                          : 'bg-orange-500/20 text-orange-400 border-orange-500/10'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-black text-white leading-none tracking-tight">{name}</p>
                    <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest mt-0.5">
                      {stat.mutualGroupsCount} group{stat.mutualGroupsCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className={`flex items-center gap-2 ${count <= 2 ? '' : ''}`}>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${badge}`}>
                    {text}
                  </span>
                  <span className={`text-sm font-black font-manrope tracking-tight ${color}`}>
                    ₹{Math.abs(stat.netBalance).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Bar: Net Balance */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.15em]">Net Balance</span>
                  <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.15em]">
                    ₹{(stat.totalTurnover || 0).toLocaleString()} turnover
                  </span>
                </div>
                {/* Balance Bar Track */}
                <div className="relative h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <motion.div
                    className={`absolute left-0 top-0 h-full rounded-full ${getBarColor(stat.netBalance)} ${getGlow(stat.netBalance)}`}
                    initial={{ width: '0%' }}
                    animate={{ width: animated ? `${balancePct}%` : '0%' }}
                    transition={{ delay: 0.2 + idx * 0.1, duration: 0.7, ease: 'easeOut' }}
                  />
                </div>
                {/* Turnover Bar Track (secondary, dimmer) */}
                <div className="relative h-0.5 bg-white/[0.04] rounded-full overflow-hidden">
                  <motion.div
                    className="absolute left-0 top-0 h-full rounded-full bg-white/20"
                    initial={{ width: '0%' }}
                    animate={{ width: animated ? `${turnoverPct}%` : '0%' }}
                    transition={{ delay: 0.3 + idx * 0.1, duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default FriendLedger;
