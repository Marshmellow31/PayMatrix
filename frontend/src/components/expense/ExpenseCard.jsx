import { motion } from 'framer-motion';
import { HiTrash } from 'react-icons/hi';
import Avatar from '../common/Avatar.jsx';
import { formatCurrency } from '../../utils/formatCurrency.js';
import { EXPENSE_CATEGORIES } from '../../utils/constants.js';

const ExpenseCard = ({ expense, currentUserId, onDelete }) => {
  const category = EXPENSE_CATEGORIES.find((c) => c.value === expense.category);
  const userSplit = expense.splits?.find(
    (s) => (s.user?._id || s.user) === currentUserId
  );

  return (
    <motion.div
      className="p-5 rounded-2xl bg-surface-container-lowest hover:bg-surface-container-low transition-all duration-300 flex items-center justify-between gap-6 group"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
    >
      <div className="flex items-center gap-5 flex-1 min-w-0">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 bg-surface-lowest shadow-inner"
          style={{ background: `${category?.color || '#ffffff'}10` }}
        >
          {category?.label?.split(' ')[0] || '📌'}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-base font-bold font-manrope text-primary tracking-tight truncate group-hover:text-secondary transition-colors">
            {expense.title}
          </h4>
          <p className="text-xs text-on-surface-variant font-inter mt-1 tracking-wide">
            Paid by{' '}
            <span className="text-on-surface font-semibold">
              {expense.paidBy?.name || 'Unknown'}
            </span>
          </p>
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
