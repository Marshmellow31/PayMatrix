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
      className="elevated-card flex items-center justify-between gap-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
          style={{ background: `${category?.color || '#919191'}20` }}
        >
          {category?.label?.split(' ')[0] || '📌'}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-medium text-on-surface truncate">
            {expense.title}
          </h4>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Paid by{' '}
            <span className="text-on-surface">
              {expense.paidBy?.name || 'Unknown'}
            </span>
          </p>
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold text-on-surface font-manrope">
          {formatCurrency(expense.amount)}
        </p>
        {userSplit && (
          <p className="text-xs text-on-surface-variant mt-0.5">
            Your share: {formatCurrency(userSplit.amount)}
          </p>
        )}
      </div>

      {onDelete && (
        <button
          onClick={() => onDelete(expense._id)}
          className="p-2 rounded-md hover:bg-error-container/20 text-on-surface-variant hover:text-error transition-colors"
          aria-label="Delete expense"
        >
          <HiTrash size={16} />
        </button>
      )}
    </motion.div>
  );
};

export default ExpenseCard;
