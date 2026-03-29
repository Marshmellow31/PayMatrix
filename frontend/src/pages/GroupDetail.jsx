import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchGroup } from '../redux/groupSlice.js';
import { fetchExpenses, deleteExpense } from '../redux/expenseSlice.js';
import MemberList from '../components/group/MemberList.jsx';
import ExpenseCard from '../components/expense/ExpenseCard.jsx';
import BalanceSummary from '../components/balance/BalanceSummary.jsx';
import Loader from '../components/common/Loader.jsx';
import Button from '../components/common/Button.jsx';
import Modal from '../components/common/Modal.jsx';
import Input from '../components/common/Input.jsx';
import { HiPlus, HiUserAdd } from 'react-icons/hi';
import { GROUP_CATEGORIES } from '../utils/constants.js';
import expenseService from '../services/expenseService.js';
import groupService from '../services/groupService.js';
import toast from 'react-hot-toast';

const GroupDetail = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { currentGroup, loading: groupLoading } = useSelector((state) => state.groups);
  const { expenses, loading: expenseLoading } = useSelector((state) => state.expenses);
  const { user } = useSelector((state) => state.auth);

  const [tab, setTab] = useState('expenses');
  const [balances, setBalances] = useState([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');

  useEffect(() => {
    dispatch(fetchGroup(id));
    dispatch(fetchExpenses({ groupId: id }));
  }, [dispatch, id]);

  useEffect(() => {
    const loadBalances = async () => {
      try {
        const res = await expenseService.getBalances(id);
        setBalances(res.data.data.balances);
      } catch (err) { /* silent */ }
    };
    loadBalances();
  }, [id, expenses]);

  const handleDeleteExpense = async (expenseId) => {
    const result = await dispatch(deleteExpense(expenseId));
    if (result.meta.requestStatus === 'fulfilled') toast.success('Expense deleted');
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      await groupService.addMember(id, { email: memberEmail });
      toast.success('Member added!');
      setShowAddMember(false);
      setMemberEmail('');
      dispatch(fetchGroup(id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add member');
    }
  };

  if (groupLoading || !currentGroup) return <Loader className="py-20" />;

  const category = GROUP_CATEGORIES.find((c) => c.value === currentGroup.category);
  const isAdmin = currentGroup.admin === user?._id;
  const tabs = ['expenses', 'balances', 'members'];

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Group Header */}
      <div className="elevated-card mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl" style={{ background: `${category?.color || '#919191'}15` }}>
              {category?.label?.split(' ')[0] || '📌'}
            </div>
            <div>
              <h1 className="text-xl font-bold font-manrope text-primary">{currentGroup.title}</h1>
              <p className="text-sm text-on-surface-variant capitalize">{currentGroup.category} · {currentGroup.members?.length} members</p>
            </div>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Button variant="ghost" onClick={() => setShowAddMember(true)}>
                <HiUserAdd size={18} />
              </Button>
            )}
            <Link to={`/groups/${id}/add-expense`}>
              <Button><HiPlus size={18} /> Add Expense</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-surface-container rounded-lg p-1">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2.5 rounded-md text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-surface-container-high text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'expenses' && (
        <div className="flex flex-col gap-3">
          {expenseLoading ? <Loader className="py-12" /> : expenses.length === 0 ? (
            <div className="elevated-card text-center py-12">
              <p className="text-on-surface-variant">No expenses yet</p>
            </div>
          ) : expenses.map((expense) => (
            <ExpenseCard key={expense._id} expense={expense} currentUserId={user?._id} onDelete={handleDeleteExpense} />
          ))}
        </div>
      )}

      {tab === 'balances' && (
        <div className="elevated-card">
          <h3 className="text-sm font-medium text-on-surface-variant mb-4 uppercase tracking-wider">Net Balances</h3>
          <BalanceSummary balances={balances} />
        </div>
      )}

      {tab === 'members' && (
        <div className="elevated-card">
          <MemberList members={currentGroup.members} adminId={currentGroup.admin} />
        </div>
      )}

      {/* Add Member Modal */}
      <Modal isOpen={showAddMember} onClose={() => setShowAddMember(false)} title="Add Member" size="sm">
        <form onSubmit={handleAddMember} className="flex flex-col gap-4">
          <Input label="Member Email" type="email" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} placeholder="member@example.com" required id="member-email" />
          <Button type="submit" className="w-full">Add Member</Button>
        </form>
      </Modal>
    </div>
  );
};

export default GroupDetail;
