import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import ErrorBoundary from '../common/ErrorBoundary.jsx';
import Header from './Header.jsx';
import Sidebar from './Sidebar.jsx';
import BottomNav from './BottomNav.jsx';
import SyncStatus from './SyncStatus.jsx';
import Modal from '../common/Modal.jsx';
import ExpenseForm from '../expense/ExpenseForm.jsx';
import { fetchGroups } from '../../redux/groupSlice.js';
import { addExpense, updateExpense } from '../../redux/expenseSlice.js';
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
  const [editingExpense, setEditingExpense] = useState(null);

  useEffect(() => {
    dispatch(fetchGroups());
  }, [dispatch]);

  // Route paths that should hide global navigation for a focused experience
  const isFocusJourney = location.pathname.includes('/add-expense') || 
                         location.pathname.includes('/login') || 
                         location.pathname.includes('/register') ||
                         location.pathname.includes('/forgot-password');

  const openAddExpense = (groupId = '', expense = null) => {
    setPreSelectedGroupId(groupId || (expense ? (expense.group?._id || expense.group) : ''));
    setEditingExpense(expense);
    setIsAddExpenseOpen(true);
  };

  const handleAddExpenseSubmit = async (data) => {
    const groupId = data.groupId;
    let result;

    if (editingExpense) {
      result = await dispatch(updateExpense({ id: editingExpense._id, data }));
    } else {
      result = await dispatch(addExpense({ groupId, data }));
    }

    if (result.meta.requestStatus === 'fulfilled') {
      toast.success(editingExpense ? 'Expense updated!' : 'Expense recorded!');
      setIsAddExpenseOpen(false);
      setEditingExpense(null);
      if (!location.pathname.includes('/groups/')) {
        navigate(`/groups/${groupId}`);
      }
    } else {
      toast.error(result.payload || 'Failed to process expense');
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

        <main className={`flex-1 ${!isFocusJourney ? 'p-4 lg:p-8 pb-32 lg:pb-8 min-h-[calc(100vh-80px)]' : 'min-h-screen flex flex-col'}`}>
          <ErrorBoundary>
            <Outlet context={{ openAddExpense }} />
          </ErrorBoundary>
        </main>
      </div>

      {!isFocusJourney && <BottomNav />}
      <SyncStatus />

      {/* Global Add Expense Modal */}
      <Modal 
        isOpen={isAddExpenseOpen} 
        onClose={() => {
          setIsAddExpenseOpen(false);
          setEditingExpense(null);
        }} 
        title={editingExpense ? "Edit Transaction" : "Record Transaction"}
        size="md"
      >
        <div className="py-2">
          <ExpenseForm 
            groups={groups}
            initialGroupId={preSelectedGroupId}
            initialData={editingExpense}
            onSubmit={handleAddExpenseSubmit}
            loading={expenseLoading}
          />
        </div>
      </Modal>
    </div>
  );
};


export default AppLayout;
