import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header.jsx';
import Sidebar from './Sidebar.jsx';
import BottomNav from './BottomNav.jsx';

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Route paths that should hide global navigation for a focused experience
  const isFocusJourney = location.pathname.includes('/add-expense') || 
                         location.pathname.includes('/login') || 
                         location.pathname.includes('/register') ||
                         location.pathname.includes('/forgot-password');

  return (
    <div className="min-h-screen bg-background text-white selection:bg-primary/30 overflow-x-hidden">
      {!isFocusJourney && <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />}

      <div className="flex">
        {!isFocusJourney && (
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        )}

        <main className={`flex-1 ${!isFocusJourney ? 'p-4 lg:p-8 pb-24 lg:pb-8 min-h-[calc(100vh-80px)]' : 'min-h-screen flex flex-col'}`}>
          <Outlet />
        </main>
      </div>

      {!isFocusJourney && <BottomNav />}
    </div>
  );
};

export default AppLayout;
