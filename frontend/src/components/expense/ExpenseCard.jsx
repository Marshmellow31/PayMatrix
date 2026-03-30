import { motion } from 'framer-motion';
import { HiTrash } from 'react-icons/hi';
import * as LucideIcons from 'lucide-react';
import Avatar from '../common/Avatar.jsx';
import { formatCurrency } from '../../utils/formatCurrency.js';
import { EXPENSE_CATEGORIES } from '../../utils/constants.js';
import { format, isToday } from 'date-fns';

const ExpenseCard = ({ expense, currentUserId, onDelete }) => {
  const category = EXPENSE_CATEGORIES.find((c) => c.value === expense.category);
  const userSplit = expense.splits?.find(
    (s) => (s.user?._id || s.user) === currentUserId
  );

  const displayDate = isToday(new Date(expense.date)) 
    ? `Today, ${format(new Date(expense.createdAt || expense.date), 'HH:mm')}`
    : format(new Date(expense.date), 'MMM dd, HH:mm');

  return (
    <motion.div
      className="p-5 rounded-2xl bg-surface-container-lowest hover:bg-surface-container-low transition-all duration-300 flex items-center justify-between gap-6 group"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
    >
      <div className="flex items-center gap-5 flex-1 min-w-0">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-surface-lowest shadow-inner"
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
          <h4 className="text-base font-bold font-manrope text-primary tracking-tight truncate group-hover:text-secondary transition-colors">
            {expense.title}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-[10px] text-on-surface-variant font-inter uppercase tracking-widest opacity-60">
              Paid by{' '}
              <span className="text-on-surface font-black">
                {expense.paidBy?.name || 'Unknown'}
              </span>
            </p>
            <span className="w-1 h-1 rounded-full bg-white/10" />
            <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">
              {displayDate}
            </p>
          </div>
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="text-lg font-bold text-primary font-manrope tracking-tight">
          {formatCurrency(expense.amount)}
        </p>
        {userSplit && (
          <p className="text-xs font-semibold text-on-surface-variant mt-1 font-inter uppercase tracking-widest opacity-80">
            Share: {formatCurrency(userSplit.amount)}
          </p>
        )}
      </div>

      {onDelete && (
        <button
          onClick={() => onDelete(expense._id)}
          className="p-3 rounded-full hover:bg-error/10 text-on-surface-variant hover:text-error transition-all opacity-0 group-hover:opacity-100"
          aria-label="Delete expense"
        >
          <HiTrash size={18} />
        </button>
      )}
    </motion.div>
  );
};

export default ExpenseCard;
