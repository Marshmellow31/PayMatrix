import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency.js';

const SettlementsPanel = ({ groups = [], groupBalances = {} }) => {
  const groupsWithBalances = groups
    .map((g) => ({ ...g, myBalance: groupBalances[g._id] || 0 }))
    .filter((g) => g.myBalance !== 0);

  if (groupsWithBalances.length === 0) return null;

  return (
    <div className="lg:col-span-12 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-manrope font-black text-xs uppercase tracking-wider text-white">
          Settlements
        </h2>
        <p className="text-[9px] text-white/30 font-inter">
          {groupsWithBalances.length} active balance{groupsWithBalances.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="space-y-2">
        {groupsWithBalances.map((group, idx) => {
          const isPositive = group.myBalance > 0;
          return (
            <motion.div
              key={group._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
            >
              <Link
                to={`/groups/${group._id}`}
                className="group px-5 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/20 flex items-center justify-between transition-all duration-300 shadow-xl"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center font-black font-manrope text-sm border shrink-0
                    ${
                      isPositive
                        ? 'bg-white text-black border-white'
                        : 'bg-white/10 text-white/60 border-white/10'
                    }`}
                  >
                    {(group.name || group.title || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <p className="text-base font-black text-white font-manrope truncate group-hover:text-white">
                      {group.name || group.title}
                    </p>
                    <p
                      className={`text-[9px] font-black tracking-[0.2em] truncate ${isPositive ? 'text-white/40' : 'text-white/20'}`}
                    >
                      {isPositive ? 'RECEIVABLE' : 'PAYABLE'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <p
                    className={`text-lg sm:text-xl font-black font-manrope whitespace-nowrap ${isPositive ? 'text-white' : 'text-white/60'}`}
                  >
                    {isPositive ? '+' : '-'}
                    {formatCurrency(Math.abs(group.myBalance))}
                  </p>
                  <ChevronRight
                    size={16}
                    className="text-white/10 group-hover:text-white/50 transition-colors shrink-0"
                  />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default SettlementsPanel;
