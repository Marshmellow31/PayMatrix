import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchGroup } from '../redux/groupSlice.js';
import { addExpense } from '../redux/expenseSlice.js';
import ExpenseForm from '../components/expense/ExpenseForm.jsx';
import Loader from '../components/common/Loader.jsx';
import toast from 'react-hot-toast';

const AddExpense = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentGroup, loading: groupLoading } = useSelector((state) => state.groups);
  const { loading: expenseLoading } = useSelector((state) => state.expenses);

  useEffect(() => {
    if (!currentGroup || currentGroup._id !== id) {
      dispatch(fetchGroup(id));
    }
  }, [dispatch, id, currentGroup]);

  const handleSubmit = async (data) => {
    const result = await dispatch(addExpense({ groupId: id, data }));
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Expense added!');
      navigate(`/groups/${id}`);
    } else {
      toast.error(result.payload || 'Failed to add expense');
    }
  };

  if (groupLoading || !currentGroup) return <Loader className="py-20" />;

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold font-manrope text-primary mb-2">
        Add Expense
      </h1>
      <p className="text-sm text-on-surface-variant mb-8">
        to <span className="text-on-surface font-medium">{currentGroup.title}</span>
      </p>

      <div className="glass-card p-6">
        <ExpenseForm
          members={currentGroup.members}
          onSubmit={handleSubmit}
          loading={expenseLoading}
        />
      </div>
    </div>
  );
};

export default AddExpense;
