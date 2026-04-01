import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiTrash, HiPencil } from 'react-icons/hi';
import * as LucideIcons from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency.js';
import { EXPENSE_CATEGORIES } from '../../utils/constants.js';
import { format } from 'date-fns';

const ExpenseCard = ({ expense, currentUserId, onDelete, onEdit }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const category = EXPENSE_CATEGORIES.find((c) => c.value === expense.category);
  const userSplit = expense.splits?.find(
    (s) => (s.user?._id || s.user) === currentUserId
  );

  // Safely derive display time; offline expenses may lack createdAt
  let loggedTime = 'Just now';
  try {
    const rawDate = expense.createdAt || expense.date || new Date();
    const parsed = new Date(rawDate);
    if (!isNaN(parsed.getTime())) {
      loggedTime = format(parsed, 'p, MMM dd');
    }
  } catch (_) { /* silently keep 'Just now' */ }


  return (
    <motion.div
      layout
      onClick={() => setIsExpanded(!isExpanded)}
      className="p-5 rounded-3xl bg-surface-container-lowest border border-white/5 transition-all duration-300 cursor-pointer overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
    >
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-5 flex-1 min-w-0">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-surface-lowest shadow-inner group-hover/card:scale-110 transition-transform"
            style={{ background: `${category?.color || '#ffffff'}10` }}
          >
            {category?.icon ? (
              (() => {
                const IconComponent = LucideIcons[category.icon];
                return IconComponent ? <IconComponent size={24} style={{ color: category.color }} /> : <LucideIcons.Hash size={24} />;
              })()
            ) : (
              <LucideIcons.Hash size={24} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-base font-bold font-manrope text-primary tracking-tight truncate">
              {expense.title}
            </h4>
            <p className="text-[10px] text-on-surface-variant font-inter uppercase tracking-widest opacity-60 mt-0.5">
              Paid by <span className="text-on-surface font-black">{expense.paidByName || expense.paidBy?.name || 'Member'}</span>
            </p>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-lg font-bold text-primary font-manrope tracking-tight">
            {formatCurrency(expense.amount)}
          </p>
          {userSplit && (
            <p className="text-[10px] font-semibold text-on-surface-variant mt-0.5 font-inter uppercase tracking-widest opacity-60">
              Your Share: {formatCurrency(userSplit.amount)}
            </p>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: 'auto', opacity: 1, marginTop: 20 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            className="border-t border-white/5 pt-4 flex items-center justify-between"
          >
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-widest text-on-surface-variant font-bold opacity-40">Recorded</span>
              <p className="text-xs font-manrope font-bold text-on-surface">{loggedTime}</p>
            </div>

            <div className="flex items-center gap-2">
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(expense);
                  }}
                  className="p-2.5 rounded-xl bg-surface-container-high hover:bg-white hover:text-black text-on-surface-variant transition-all flex items-center gap-2 text-xs font-bold"
                >
                  <HiPencil size={16} />
                  <span>Edit</span>
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(expense._id);
                  }}
                  className="p-2.5 rounded-xl bg-error/10 hover:bg-error hover:text-white text-error transition-all flex items-center gap-2 text-xs font-bold"
                >
                  <HiTrash size={16} />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ExpenseCard;
