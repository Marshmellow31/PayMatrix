import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchGroups } from '../redux/groupSlice.js';
import { addExpense } from '../redux/expenseSlice.js';
import ExpenseForm from '../components/expense/ExpenseForm.jsx';
import Loader from '../components/common/Loader.jsx';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

const AddExpense = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { groups, loading: groupsLoading } = useSelector((state) => state.groups);
  const { loading: expenseLoading } = useSelector((state) => state.expenses);
  
  const [initialGroupId, setInitialGroupId] = useState(id || localStorage.getItem('lastGroupId') || '');

  useEffect(() => {
    dispatch(fetchGroups());
  }, [dispatch]);

  const handleSubmit = async (data) => {
    const groupId = data.groupId;
    const result = await dispatch(addExpense({ groupId, data }));
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Expense recorded!');
      localStorage.setItem('lastGroupId', groupId);
      navigate(`/groups/${groupId}`);
    } else {
      toast.error(result.payload || 'Failed to record expense');
    }
  };

  if (groupsLoading && groups.length === 0) return <Loader className="py-20" />;

  return (
    <main className="min-h-screen bg-background text-white relative overflow-hidden flex flex-col pt-4 pb-12 px-4 sm:px-6 lg:px-8">
      {/* Ambient Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-white/5 blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="flex items-center justify-between mb-10 relative z-10">
        <button 
          onClick={() => navigate(-1)}
          className="w-12 h-12 rounded-2xl bg-surface-container-low/50 border border-white/5 flex items-center justify-center hover:bg-surface-container-high transition-colors"
        >
          <X size={20} className="text-on-surface-variant" />
        </button>
        <div className="text-center">
          <h1 className="font-manrope font-black text-xl tracking-tighter">PayMatrix</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-50">Focused Session</p>
        </div>
        <div className="w-12 h-12" /> {/* Spacer */}
      </header>

      {/* Main Form Canvas */}
      <div className="w-full max-w-lg mx-auto relative z-10 flex-1">
        <div className="glass-panel rounded-[2.5rem] p-8 sm:p-10 border border-white/5 shadow-2xl relative overflow-hidden mb-8">
          <ExpenseForm
            groups={groups}
            initialGroupId={initialGroupId}
            onSubmit={handleSubmit}
            loading={expenseLoading}
          />
        </div>

        {/* Visual Context Simulation (As seen in design) */}
        <div className="opacity-10 pointer-events-none select-none px-4 hidden sm:block">
          <h4 className="font-manrope font-bold text-lg mb-4">Recent History</h4>
          <div className="h-20 rounded-3xl bg-surface-container-low border border-white/5" />
        </div>
      </div>
    </main>
  );
};

export default AddExpense;
