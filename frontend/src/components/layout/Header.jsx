import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion, useReducedMotion } from 'framer-motion';
import { Bell, Menu, BarChart3 } from 'lucide-react';
import Avatar from '../common/Avatar.jsx';
import { useFeatureFlags } from '../../hooks/useFeatureFlags.js';

const HeaderAction = ({ children, label, to, reduceMotion }) => (
  <motion.div whileTap={reduceMotion ? undefined : { scale: 0.92 }}>
    <Link
      to={to}
      aria-label={label}
      className="relative flex h-10 w-10 items-center justify-center rounded-xl text-white/50 transition-colors hover:bg-white/[0.05] hover:text-white"
    >
      {children}
    </Link>
  </motion.div>
);

const Header = ({ onToggleSidebar }) => {
  const reduceMotion = useReducedMotion();
  const { user } = useSelector((state) => state.auth);
  const { unreadCount } = useSelector((state) => state.notifications);
  const flags = useFeatureFlags();

  return (
    <header className="paymatrix-app-header fixed inset-x-0 top-0 z-50 border-b border-white/[0.07] bg-[#1A1A1A]/95 backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-3">
          <motion.button
            type="button"
            whileTap={reduceMotion ? undefined : { scale: 0.92 }}
            onClick={onToggleSidebar}
            className="hidden h-10 w-10 items-center justify-center rounded-xl text-white/50 hover:bg-white/[0.05] hover:text-white"
            aria-label="Toggle menu"
          >
            <Menu size={20} />
          </motion.button>
          <Link to="/dashboard" className="flex items-center">
            <span className="font-manrope text-lg font-semibold tracking-[-0.04em] text-white">
              PAYMATRIX
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-1.5">
          {flags.analyticsPage && (
            <HeaderAction to="/analytics" label="Analytics" reduceMotion={reduceMotion}>
              <BarChart3 size={20} strokeWidth={1.7} />
            </HeaderAction>
          )}
          <HeaderAction to="/activity" label="Notifications" reduceMotion={reduceMotion}>
            <Bell size={20} strokeWidth={1.7} />
            {unreadCount > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-[#1A1A1A] bg-white px-1 text-[9px] font-bold text-black">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </HeaderAction>
          <motion.div whileTap={reduceMotion ? undefined : { scale: 0.94 }} className="ml-1">
            <Link
              to="/profile"
              aria-label="Profile"
              className="block rounded-xl ring-white/10 hover:ring-1"
            >
              <Avatar name={user?.name} src={user?.avatar || user?.photoURL} size="sm" />
            </Link>
          </motion.div>
        </div>
      </div>
    </header>
  );
};

export default Header;
