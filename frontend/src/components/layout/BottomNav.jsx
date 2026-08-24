import { NavLink } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Home, Users, User, ScrollText, LayoutGrid } from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/friends', label: 'Friends', icon: Users },
  { to: '/groups', label: 'Groups', icon: LayoutGrid },
  { to: '/logs', label: 'Logs', icon: ScrollText },
  { to: '/profile', label: 'Profile', icon: User },
];

const BottomNav = () => {
  const reduceMotion = useReducedMotion();

  return (
    <nav
      aria-label="Main navigation"
      className="paymatrix-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.07] bg-[#1A1A1A]/[0.98] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto flex h-[58px] max-w-md items-stretch px-2 sm:px-5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            aria-label={item.label}
            className="relative flex min-w-0 flex-1 items-center justify-center"
          >
            {({ isActive }) => (
              <motion.div
                whileTap={reduceMotion ? undefined : { scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                className={`relative flex h-full min-w-0 flex-col items-center justify-center gap-1 ${isActive ? 'text-white' : 'text-white/[0.38]'}`}
              >
                {isActive && (
                  <motion.span
                    layoutId="paymatrix-bottom-nav-active"
                    className="absolute top-0 h-0.5 w-5 rounded-full bg-white"
                    transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                  />
                )}
                <item.icon size={19} strokeWidth={isActive ? 2.1 : 1.65} />
                <span
                  className={`truncate text-[10px] leading-none ${isActive ? 'font-semibold' : 'font-medium'}`}
                >
                  {item.label}
                </span>
              </motion.div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
