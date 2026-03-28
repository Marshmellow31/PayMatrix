import { motion } from "framer-motion";
import { 
  BarChart3, 
  Users, 
  History, 
  Settings, 
  Plus, 
  Bell 
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export const Layout = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { icon: <BarChart3 size={20} />, path: "/dashboard", label: "Dashboard" },
    { icon: <Users size={20} />, path: "/groups", label: "Groups" },
    { icon: <History size={20} />, path: "/activity", label: "Activity" },
    { icon: <Settings size={20} />, path: "/profile", label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-background text-on-background pb-24 md:pb-0 md:pl-20">
      {/* Desktop Sidebar (Asymmetric) */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 bg-surface-container-lowest border-r border-on-surface-variant/5 flex-col items-center py-10 space-y-12">
        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-background font-bold">
          PM
        </div>
        
        <nav className="flex-1 space-y-8">
          {navItems.map((item) => (
            <Link 
              key={item.path} 
              to={item.path}
              className={`block p-3 rounded-lg transition-all ${
                location.pathname === item.path 
                  ? "bg-primary text-background" 
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              {item.icon}
            </Link>
          ))}
        </nav>

        <button className="p-3 text-on-surface-variant hover:text-primary transition-colors">
          <Bell size={20} />
        </button>
      </aside>

      {/* Mobile Glass Bottom Nav */}
      <nav className="md:hidden fixed bottom-6 left-6 right-6 h-16 glass-panel ghost-border rounded-full flex items-center justify-around px-6 z-50">
        {navItems.map((item) => (
          <Link 
            key={item.path} 
            to={item.path}
            className={`transition-all ${
              location.pathname === item.path 
                ? "text-primary scale-110" 
                : "text-on-surface-variant/60"
            }`}
          >
            {item.icon}
          </Link>
        ))}
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto p-6 md:p-12">
        {children}
      </main>

      {/* Floating Add Action (PWA feel) */}
      <Link to="/add-expense">
        <motion.button
          whileTap={{ scale: 0.9 }}
          className="fixed bottom-28 right-6 md:bottom-12 md:right-12 w-14 h-14 bg-primary text-background rounded-full shadow-2xl flex items-center justify-center z-40"
        >
          <Plus size={24} strokeWidth={3} />
        </motion.button>
      </Link>
    </div>
  );
};
