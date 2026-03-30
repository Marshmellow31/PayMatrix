import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Header from './Header.jsx';
import Sidebar from './Sidebar.jsx';
import BottomNav from './BottomNav.jsx';
import SyncStatus from './SyncStatus.jsx';
import Modal from '../common/Modal.jsx';
import ExpenseForm from '../expense/ExpenseForm.jsx';
import { fetchGroups } from '../../redux/groupSlice.js';
import { addExpense } from '../../redux/expenseSlice.js';
import toast from 'react-hot-toast';

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [preSelectedGroupId, setPreSelectedGroupId] = useState('');
  
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { groups } = useSelector((state) => state.groups);
  const { loading: expenseLoading } = useSelector((state) => state.expenses);

  useEffect(() => {
    dispatch(fetchGroups());
  }, [dispatch]);

  // Route paths that should hide global navigation for a focused experience
  const isFocusJourney = location.pathname.includes('/add-expense') || 
                         location.pathname.includes('/login') || 
                         location.pathname.includes('/register') ||
                         location.pathname.includes('/forgot-password');

  const openAddExpense = (groupId = '') => {
    setPreSelectedGroupId(groupId || '');
    setIsAddExpenseOpen(true);
  };

  const handleAddExpenseSubmit = async (data) => {
    const groupId = data.groupId;
    const result = await dispatch(addExpense({ groupId, data }));
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Expense recorded!');
      setIsAddExpenseOpen(false);
      // Optional: Navigate to the group or refresh current view
      if (location.pathname.includes('/groups/')) {
        // We are already in a group, maybe no need to navigate
      } else {
        navigate(`/groups/${groupId}`);
      }
    } else {
      toast.error(result.payload || 'Failed to record expense');
    }
  };

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
          <Outlet context={{ openAddExpense }} />
        </main>
      </div>

      {!isFocusJourney && <BottomNav />}
      <SyncStatus />

      {/* Global Add Expense Modal */}
      <Modal 
        isOpen={isAddExpenseOpen} 
        onClose={() => setIsAddExpenseOpen(false)} 
        title="Record Transaction"
        size="md"
      >
        <div className="py-2">
          <ExpenseForm 
            groups={groups}
            initialGroupId={preSelectedGroupId}
            onSubmit={handleAddExpenseSubmit}
            loading={expenseLoading}
          />
        </div>
      </Modal>
    </div>
  );
};


export default AppLayout;
