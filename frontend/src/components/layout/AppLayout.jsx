import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import ErrorBoundary from '../common/ErrorBoundary.jsx';
import Header from './Header.jsx';
import Sidebar from './Sidebar.jsx';
import BottomNav from './BottomNav.jsx';
import Modal from '../common/Modal.jsx';
import ExpenseForm from '../expense/ExpenseForm.jsx';
import { fetchGroups } from '../../redux/groupSlice.js';
import { setGroups } from '../../redux/groupSlice.js';
import { addExpense, updateExpense } from '../../redux/expenseSlice.js';
import toast from 'react-hot-toast';
import { useFeatureFlags } from '../../hooks/useFeatureFlags.js';
import SyncStatus from '../common/SyncStatus.jsx';
import CachedTabOutlet from './CachedTabOutlet.jsx';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase.js';
import groupService from '../../services/groupService.js';

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [preSelectedGroupId, setPreSelectedGroupId] = useState('');
  const [prefillData, setPrefillData] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { groups } = useSelector((state) => state.groups);
  const { user } = useSelector((state) => state.auth);
  const { loading: expenseLoading } = useSelector((state) => state.expenses);
  const [editingExpense, setEditingExpense] = useState(null);
  const [_expenseStep, setExpenseStep] = useState(1);
  const flags = useFeatureFlags();

  useEffect(() => {
    dispatch(fetchGroups());

    // Pre-warm the Render backend to reduce cold-start latency.
    // Render's free tier sleeps after ~15min; this fires a silent ping
    // so subsequent API calls don't wait for the backend to wake up.
    const apiBase = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || '';
    if (apiBase) {
      fetch(`${apiBase}/api/health`, { method: 'GET' }).catch(() => {
        /* silent */
      });
    }
  }, [dispatch]);

  // One shared live group feed powers every retained tab. This avoids opening
  // duplicate listeners after both Home and Groups have been visited.
  useEffect(() => {
    const userId = user?._id || user?.uid;
    if (!userId) return undefined;

    let active = true;
    let revision = 0;
    const groupsQuery = query(collection(db, 'groups'), where('members', 'array-contains', userId));

    const unsubscribe = onSnapshot(
      groupsQuery,
      async (snapshot) => {
        const currentRevision = ++revision;
        try {
          const basicGroups = snapshot.docs
            .map((snapshotDoc) => groupService.getBasicGroup(snapshotDoc))
            .filter((group) => group?.status !== 'deleted');
          dispatch(setGroups(basicGroups));

          const expandedGroups = await Promise.all(
            snapshot.docs.map(async (snapshotDoc) => {
              const basic = groupService.getBasicGroup(snapshotDoc);
              if (basic.status === 'deleted') return null;
              const profiles = await groupService.resolveMemberProfiles(basic._id, basic.members);
              return { ...basic, members: profiles, isBasic: false };
            })
          );

          if (active && currentRevision === revision) {
            dispatch(setGroups(expandedGroups.filter(Boolean)));
          }
        } catch (error) {
          console.error('Live group refresh failed:', error);
        }
      },
      (error) => console.error('Live group feed failed:', error)
    );

    return () => {
      active = false;
      revision += 1;
      unsubscribe();
    };
  }, [dispatch, user?._id, user?.uid]);

  // Route paths that should hide global navigation for a focused experience
  const isFocusJourney =
    location.pathname.includes('/add-expense') ||
    location.pathname.includes('/login') ||
    location.pathname.includes('/register') ||
    location.pathname.includes('/forgot-password');

  const openAddExpense = (groupId = '', expense = null, prefill = null) => {
    setPreSelectedGroupId(groupId || (expense ? expense.group?._id || expense.group : ''));
    setEditingExpense(expense);
    setPrefillData(prefill);
    setExpenseStep(1);
    setIsAddExpenseOpen(true);
  };

  const handleAddExpenseSubmit = async (data) => {
    const groupId = data.groupId;
    const isEdit = !!editingExpense;
    const expenseId = editingExpense?._id;

    // Close modal optimistically for instant offline UI response
    setIsAddExpenseOpen(false);
    setEditingExpense(null);
    toast.success(isEdit ? 'Expense updated!' : 'Expense recorded!');

    if (!location.pathname.includes('/groups/')) {
      navigate(`/groups/${groupId}`);
    }

    // Process in background without blocking the UI
    try {
      let result;
      if (isEdit) {
        result = await dispatch(updateExpense({ id: expenseId, data }));
      } else {
        result = await dispatch(addExpense({ groupId, data }));
      }

      if (result.meta.requestStatus !== 'fulfilled') {
        toast.error(result.payload || 'Failed to process expense. It may still sync when online.');
      }
    } catch (e) {
      toast.error('Failed to process expense.');
    }
  };

  return (
    <div className="min-h-screen bg-background text-white selection:bg-primary/30 overflow-x-hidden">
      {!isFocusJourney && <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />}

      {!isFocusJourney && flags.maintenanceMode && (
        <div className="paymatrix-maintenance-banner fixed left-0 right-0 z-40 bg-orange-500/10 border-b border-orange-500/25 text-orange-500 py-2.5 px-4 text-center text-xs font-bold font-inter tracking-wide flex items-center justify-center gap-2 backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
          PayMatrix is currently undergoing scheduled maintenance. Some services may be temporarily
          unavailable.
        </div>
      )}

      <div
        className={`flex ${
          !isFocusJourney
            ? `paymatrix-app-body ${flags.maintenanceMode ? 'paymatrix-app-body--maintenance' : ''}`
            : ''
        }`}
      >
        {!isFocusJourney && (
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            maintenanceMode={flags.maintenanceMode}
          />
        )}

        <main
          className={`flex-1 min-w-0 max-w-full overflow-x-hidden ${!isFocusJourney ? `px-4 sm:px-6 pt-1 lg:px-8 lg:pt-4 pb-32 lg:pb-8 lg:ml-64 transition-all ${flags.maintenanceMode ? 'min-h-[calc(100vh-104px)]' : 'min-h-[calc(100vh-56px)]'}` : 'min-h-screen flex flex-col'}`}
        >
          <ErrorBoundary>
            <CachedTabOutlet context={{ openAddExpense }} />
          </ErrorBoundary>
        </main>
      </div>

      {!isFocusJourney && <BottomNav />}
      {!isFocusJourney && <SyncStatus />}

      {/* Global Add Expense Modal */}
      <Modal
        isOpen={isAddExpenseOpen}
        onClose={() => {
          setIsAddExpenseOpen(false);
          setEditingExpense(null);
          setPrefillData(null);
        }}
        title={editingExpense ? 'Edit Transaction' : 'Record Transaction'}
        size="3xl"
      >
        <div className="py-2">
          <ExpenseForm
            groups={groups}
            initialGroupId={preSelectedGroupId}
            initialData={editingExpense}
            prefillData={prefillData}
            onSubmit={handleAddExpenseSubmit}
            loading={expenseLoading}
            onStepChange={setExpenseStep}
          />
        </div>
      </Modal>
    </div>
  );
};

export default AppLayout;
