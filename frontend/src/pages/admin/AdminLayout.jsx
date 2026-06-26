import { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import {
  LayoutDashboard,
  Users,
  LayoutGrid,
  Bell,
  BarChart3,
  Shield,
  ToggleLeft,
  X,
  Menu,
  ArrowLeft,
  ChevronRight,
  Brain,
} from 'lucide-react';
import Avatar from '../../components/common/Avatar.jsx';
import { useFeatureFlags } from '../../hooks/useFeatureFlags.js';

const navItems = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/groups', label: 'Groups', icon: LayoutGrid },
  { to: '/admin/notifications', label: 'Notifications', icon: Bell },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/ai-scans', label: 'AI Scans', icon: Brain },
  { to: '/admin/security', label: 'Security Logs', icon: Shield },
  { to: '/admin/flags', label: 'Feature Flags', icon: ToggleLeft },
];

const SidebarContent = ({ onClose }) => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col h-full justify-between">
      <nav className="flex flex-col gap-1 mt-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-surface-container-high text-primary'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="pt-4 border-t border-white/5">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all w-full font-medium"
        >
          <ArrowLeft size={16} />
          Back to App
        </button>
      </div>
    </div>
  );
};

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useSelector((state) => state.auth);
  const flags = useFeatureFlags();

  const desktopSidebarClasses = flags.maintenanceMode
    ? 'top-32 h-[calc(100vh-128px)]'
    : 'top-20 h-[calc(100vh-80px)]';

  return (
    <div className="min-h-screen bg-background text-white selection:bg-primary/30 overflow-x-hidden pt-20">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-white/5">
        <div className="flex items-center justify-between h-20 px-4 sm:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-md hover:bg-surface-container transition-colors text-on-surface-variant"
              aria-label="Toggle menu"
            >
              <Menu size={22} />
            </button>
            <Link to="/admin" className="flex items-center gap-2">
              <span className="text-xl font-bold font-manrope text-primary tracking-tight">
                PayMatrix
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-orange-500/10 text-orange-500 font-bold uppercase rounded-full tracking-wider border border-orange-500/20 font-inter">
                Admin
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/70 hover:text-white transition-all"
            >
              <ArrowLeft size={13} />
              Return to App
            </Link>
            <Avatar name={user?.name} src={user?.avatar || user?.photoURL} size="sm" />
          </div>
        </div>
      </header>

      {/* Maintenance Mode Banner */}
      {flags.maintenanceMode && (
        <div className="fixed top-20 left-0 right-0 z-40 bg-orange-500/10 border-b border-orange-500/25 text-orange-500 py-2.5 px-4 text-center text-xs font-bold font-inter tracking-wide flex items-center justify-center gap-2 backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
          PayMatrix is currently undergoing scheduled maintenance. Some services may be temporarily
          unavailable.
        </div>
      )}

      <div className={`flex ${flags.maintenanceMode ? 'pt-12' : ''}`}>
        {/* Desktop sidebar */}
        <aside
          className={`hidden lg:flex flex-col w-64 bg-surface-container-low/40 backdrop-blur-xl border-r border-outline-variant/5 fixed left-0 p-6 z-30 transition-all ${desktopSidebarClasses}`}
        >
          <SidebarContent />
        </aside>

        {/* Mobile sidebar overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSidebarOpen(false)}
              />
              <motion.aside
                className="fixed top-0 left-0 bottom-0 w-72 bg-surface-container-low/80 backdrop-blur-2xl z-50 p-6 lg:hidden shadow-2xl"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              >
                <div className="flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold font-manrope text-primary tracking-tight">
                          PayMatrix
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-orange-500/10 text-orange-500 font-bold uppercase rounded-full tracking-wider border border-orange-500/20 font-inter">
                          Admin
                        </span>
                      </div>
                      <button
                        onClick={() => setSidebarOpen(false)}
                        className="p-2 rounded-md hover:bg-surface-container text-on-surface-variant"
                        aria-label="Close menu"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    <SidebarContent onClose={() => setSidebarOpen(false)} />
                  </div>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <main
          className={`flex-1 px-4 sm:px-6 pt-1 lg:px-8 lg:pt-4 pb-32 lg:pb-8 lg:ml-64 transition-all ${flags.maintenanceMode ? 'min-h-[calc(100vh-128px)]' : 'min-h-[calc(100vh-80px)]'}`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
