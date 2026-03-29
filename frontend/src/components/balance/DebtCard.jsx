import Avatar from '../common/Avatar.jsx';
import { formatCurrency } from '../../utils/formatCurrency.js';

const DebtCard = ({ from, to, amount }) => {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar name={from?.name} src={from?.avatar} size="sm" />
        <div className="min-w-0">
          <p className="text-sm text-on-surface truncate">
            <span className="font-medium">{from?.name}</span>
          </p>
          <p className="text-xs text-on-surface-variant">owes</p>
        </div>
      </div>

      <div className="flex-shrink-0 text-center">
        <p className="text-sm font-bold text-error font-manrope">
          {formatCurrency(amount)}
        </p>
        <div className="w-8 h-px bg-outline-variant mx-auto mt-1" />
      </div>

      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0 text-right">
          <p className="text-sm text-on-surface truncate">
            <span className="font-medium">{to?.name}</span>
          </p>
        </div>
        <Avatar name={to?.name} src={to?.avatar} size="sm" />
      </div>
    </div>
  );
};

export default DebtCard;
