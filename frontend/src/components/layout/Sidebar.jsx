import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Users, LayoutGrid, User, X, ScrollText } from 'lucide-react';
import AppLogo from '../common/AppLogo.jsx';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/friends', label: 'Friends', icon: Users },
  { to: '/groups', label: 'Groups', icon: LayoutGrid },
  { to: '/logs', label: 'Logs', icon: ScrollText },
  { to: '/profile', label: 'Profile', icon: User },
];

const Sidebar = ({ isOpen, onClose, maintenanceMode }) => {
  const topOffset = maintenanceMode
    ? 'top-32 h-[calc(100vh-128px)]'
    : 'top-20 h-[calc(100vh-80px)]';
  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`fixed left-0 z-30 hidden w-64 flex-col border-r border-white/[0.06] bg-[#1A1A1A] p-6 lg:flex ${topOffset}`}
      >
        <nav className="flex flex-col gap-1 mt-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/[0.07] text-white'
                    : 'text-white/[0.42] hover:bg-white/[0.035] hover:text-white/75'
                }`
              }
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.aside
              className="fixed bottom-0 left-0 top-0 z-50 w-72 border-r border-white/[0.07] bg-[#1A1A1A]/95 p-6 shadow-2xl backdrop-blur-2xl lg:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2.5">
                  <AppLogo size="xs" decorative />
                  <span className="font-manrope text-xl font-semibold tracking-[-0.04em] text-white">
                    paymatrix
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-md hover:bg-surface-container text-on-surface-variant"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>
              <nav className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-white/[0.07] text-white'
                          : 'text-white/[0.42] hover:bg-white/[0.035] hover:text-white/75'
                      }`
                    }
                  >
                    <item.icon size={20} />
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
