import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { HiBell, HiMenu } from 'react-icons/hi';
import Avatar from '../common/Avatar.jsx';

const Header = ({ onToggleSidebar }) => {
  const { user } = useSelector((state) => state.auth);
  const { unreadCount } = useSelector((state) => state.notifications);

  return (
    <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl">
      <div className="flex items-center justify-between h-16 px-4 lg:px-8">
        {/* Left — Menu + Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-md hover:bg-surface-container transition-colors text-on-surface-variant"
            aria-label="Toggle menu"
          >
            <HiMenu size={22} />
          </button>
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="text-xl font-bold font-manrope text-primary">
              💸 PayMatrix
            </span>
          </Link>
        </div>

        {/* Right — Notifications + Profile */}
        <div className="flex items-center gap-3">
          <Link
            to="/activity"
            className="relative p-2 rounded-md hover:bg-surface-container transition-colors text-on-surface-variant"
            aria-label="Notifications"
          >
            <HiBell size={22} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary text-on-primary text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          <Link to="/profile" className="flex items-center gap-2">
            <Avatar name={user?.name} src={user?.avatar} size="sm" />
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
