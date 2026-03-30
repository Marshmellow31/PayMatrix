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
    <div className="max-w-xl mx-auto animate-fade-in pb-24 px-4 pt-8 lg:pt-12">
      <div className="mb-10 text-center">
        <h1 className="text-4xl lg:text-5xl font-bold font-manrope text-primary mb-3 tracking-[-0.01em]">
          Record Expense
        </h1>
        <p className="text-on-surface-variant font-inter text-lg">
          for <span className="text-primary font-medium">{currentGroup.title}</span>
        </p>
      </div>

      <div className="submerged p-8 lg:p-12 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">
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
