import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency.js';

const SettlementsPanel = ({ groups = [], groupBalances = {} }) => {
  const reduceMotion = useReducedMotion();
  const groupsWithBalances = groups
    .map((g) => ({ ...g, myBalance: groupBalances[g._id] || 0 }))
    .filter((g) => g.myBalance !== 0);

  if (groupsWithBalances.length === 0) return null;

  return (
    <section className="space-y-4 lg:col-span-12">
      <div className="flex items-center justify-between">
        <h2 className="font-manrope text-base font-semibold tracking-[-0.02em] text-white">
          Settlements
        </h2>
        <p className="text-xs text-white/[0.35]">
          {groupsWithBalances.length} active balance{groupsWithBalances.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="space-y-2">
        {groupsWithBalances.map((group, idx) => {
          const isPositive = group.myBalance > 0;
          return (
            <motion.div
              key={group._id}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: 'spring',
                stiffness: 340,
                damping: 32,
                delay: reduceMotion ? 0 : idx * 0.03,
              }}
              whileTap={reduceMotion ? undefined : { scale: 0.99 }}
            >
              <Link
                to={`/groups/${group._id}`}
                className="group flex items-center justify-between rounded-2xl border border-white/[0.08] bg-[#1A1A1A] px-4 py-3.5 shadow-[0_10px_26px_rgba(0,0,0,0.08)] transition-colors hover:bg-[#202020]"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.045] font-manrope text-sm font-semibold text-white/70">
                    {(group.name || group.title || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <p className="truncate font-manrope text-sm font-semibold text-white/[0.82]">
                      {group.name || group.title}
                    </p>
                    <p className="truncate text-[11px] text-white/30">
                      {isPositive ? 'You are owed' : 'You owe'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <p
                    className={`whitespace-nowrap font-manrope text-base font-semibold tabular-nums ${isPositive ? 'text-emerald-300/90' : 'text-red-300/90'}`}
                  >
                    {isPositive ? '+' : '-'}
                    {formatCurrency(Math.abs(group.myBalance))}
                  </p>
                  <ChevronRight
                    size={16}
                    className="shrink-0 text-white/[0.18] transition-colors group-hover:text-white/[0.45]"
                  />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default SettlementsPanel;
