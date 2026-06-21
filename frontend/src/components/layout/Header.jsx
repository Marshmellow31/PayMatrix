import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Bell, Menu, BarChart3, Sparkles } from 'lucide-react';
import Avatar from '../common/Avatar.jsx';

import { useFeatureFlags } from '../../hooks/useFeatureFlags.js';

const Header = ({ onToggleSidebar }) => {
  const { user } = useSelector((state) => state.auth);
  const { unreadCount } = useSelector((state) => state.notifications);
  const flags = useFeatureFlags();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-white/5">
      <div className="flex items-center justify-between h-20 px-4 sm:px-6 lg:px-10">
        {/* Left — Menu + Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="hidden p-2 rounded-md hover:bg-surface-container transition-colors text-on-surface-variant"
            aria-label="Toggle menu"
          >
            <Menu size={22} />
          </button>
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="text-xl font-bold font-manrope text-primary tracking-tight">
              PayMatrix
            </span>
          </Link>
        </div>

        {/* Right — Notifications + Profile */}
        <div className="flex items-center gap-3">
          {flags.analyticsPage && (
            <Link
              to="/analytics"
              className="p-2 rounded-md hover:bg-surface-container transition-colors text-on-surface-variant"
              aria-label="Analytics"
            >
              <BarChart3 size={22} />
            </Link>
          )}
          <Link
            to="/copilot"
            className="p-2 rounded-md hover:bg-surface-container transition-colors text-primary"
            aria-label="AI Copilot"
          >
            <Sparkles size={22} className="animate-pulse" />
          </Link>
          <Link
            to="/activity"
            className="relative p-2 rounded-md hover:bg-surface-container transition-colors text-on-surface-variant"
            aria-label="Notifications"
          >
            <Bell size={22} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary text-on-primary text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          <Link to="/profile" className="flex items-center gap-2">
            <Avatar name={user?.name} src={user?.avatar || user?.photoURL} size="sm" />
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
