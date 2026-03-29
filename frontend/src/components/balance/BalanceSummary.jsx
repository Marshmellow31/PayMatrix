import { formatCurrency } from '../../utils/formatCurrency.js';
import Avatar from '../common/Avatar.jsx';

const BalanceSummary = ({ balances = [] }) => {
  return (
    <div className="flex flex-col gap-3">
      {balances.map((item) => {
        const user = item.user || {};
        const balance = item.balance;
        const isPositive = balance > 0;
        const isZero = balance === 0;

        return (
          <div
            key={user._id}
            className="flex items-center justify-between py-2"
          >
            <div className="flex items-center gap-3">
              <Avatar name={user.name} src={user.avatar} size="sm" />
              <p className="text-sm font-medium text-on-surface">{user.name}</p>
            </div>
            <p
              className={`text-sm font-semibold font-manrope ${
                isZero
                  ? 'text-on-surface-variant'
                  : isPositive
                  ? 'text-green-400'
                  : 'text-error'
              }`}
            >
              {isPositive ? '+' : ''}
              {formatCurrency(balance)}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default BalanceSummary;
