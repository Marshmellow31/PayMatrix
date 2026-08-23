import { NavLink } from 'react-router-dom';
import { Home, Users, User, ScrollText, LayoutGrid } from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/friends', label: 'Friends', icon: Users },
  { to: '/groups', label: 'Groups', icon: LayoutGrid },
  { to: '/logs', label: 'Logs', icon: ScrollText },
  { to: '/profile', label: 'Profile', icon: User },
];

const BottomNav = () => {
  return (
    <nav
      aria-label="Main navigation"
      className="paymatrix-bottom-nav lg:hidden fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-0 right-0 z-50 px-3 sm:px-6"
    >
      <div className="glass-pill h-[72px] flex items-center justify-around px-1.5 relative">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            aria-label={item.label}
            className="flex min-w-0 flex-1 items-center justify-center h-16 rounded-2xl transition-all duration-300 relative"
          >
            {({ isActive }) => (
              <div
                className={`flex min-w-0 flex-col items-center justify-center gap-1 transition-all duration-300 ${
                  isActive ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span
                  className={`flex h-8 w-10 items-center justify-center rounded-full transition-colors ${
                    isActive ? 'bg-surface-variant/25' : ''
                  }`}
                >
                  <item.icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                </span>
                <span
                  className={`max-w-full truncate text-[9px] leading-none tracking-wide ${
                    isActive ? 'font-extrabold' : 'font-semibold'
                  }`}
                >
                  {item.label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
