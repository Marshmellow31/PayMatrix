import { NavLink } from 'react-router-dom';
import { Home, Users, User, BarChart3, Wallet, LayoutGrid } from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/friends', label: 'Friends', icon: Users },
  { to: '/groups', label: 'Groups', icon: LayoutGrid },
  { to: '/settlements', label: 'Settlements', icon: Wallet },
  { to: '/profile', label: 'Profile', icon: User },
];

const BottomNav = () => {
  return (
    <nav className="lg:hidden fixed bottom-6 left-0 right-0 z-50 px-6">
      <div className="glass-pill h-16 flex items-center justify-around px-2 relative">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center justify-center w-14 h-14 rounded-full transition-all duration-300 relative`
            }
          >
            {({ isActive }) => (
              <div className={`flex flex-col items-center justify-center transition-all duration-300 ${isActive
                ? 'bg-surface-variant/20 w-12 h-12 rounded-full text-primary'
                : 'text-on-surface-variant hover:text-on-surface'
                }`}>
                {isActive ? (
                  <item.icon size={22} strokeWidth={2.5} />
                ) : (
                  <item.icon size={22} strokeWidth={1.5} />
                )}
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};



export default BottomNav;
