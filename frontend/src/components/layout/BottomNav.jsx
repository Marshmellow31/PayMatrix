import { NavLink } from 'react-router-dom';
import { HiHome, HiUserGroup, HiPlusCircle, HiClock, HiUser } from 'react-icons/hi';

const navItems = [
  { to: '/dashboard', label: 'Home', icon: HiHome },
  { to: '/groups', label: 'Groups', icon: HiUserGroup },
  { to: '/groups/new', label: 'Add', icon: HiPlusCircle, isAction: true },
  { to: '/activity', label: 'Activity', icon: HiClock },
  { to: '/profile', label: 'Profile', icon: HiUser },
];

const BottomNav = () => {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-container/90 backdrop-blur-xl border-t border-outline-variant/10">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                item.isAction
                  ? 'text-on-primary'
                  : isActive
                  ? 'text-primary'
                  : 'text-on-surface-variant'
              }`
            }
          >
            {item.isAction ? (
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center -mt-4 shadow-lg">
                <item.icon size={24} className="text-on-primary" />
              </div>
            ) : (
              <item.icon size={22} />
            )}
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
