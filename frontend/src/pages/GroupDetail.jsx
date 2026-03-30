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
    <div className="max-w-4xl mx-auto animate-fade-in pb-24">
      {/* Group Header */}
      <div className="submerged mb-10 p-8 lg:p-12 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl bg-surface-lowest shadow-inner" style={{ background: `${category?.color || '#ffffff'}10` }}>
              {category?.label?.split(' ')[0] || '📌'}
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold font-manrope text-primary tracking-tight mb-2">{currentGroup.title}</h1>
              <p className="text-base text-on-surface-variant uppercase tracking-widest font-inter font-semibold">{currentGroup.category} <span className="mx-2 opacity-50">·</span> {currentGroup.members?.length} members</p>
            </div>
          </div>
          <div className="flex gap-3">
            {isAdmin && (
              <Button variant="ghost" onClick={() => setShowAddMember(true)} className="h-12 w-12 rounded-full p-0 flex items-center justify-center bg-surface-container-low hover:bg-surface-variant transition-colors">
                <HiUserAdd size={22} className="text-on-surface-variant" />
              </Button>
            )}
            <Link to={`/groups/${id}/add-expense`}>
              <Button className="h-12 px-6 rounded-full font-manrope tracking-wide"><HiPlus size={20} className="mr-2" /> Record Expense</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 mb-10 border-b border-outline-variant/10 pb-4 overflow-x-auto hide-scrollbar">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`pb-2 text-base font-semibold font-inter capitalize transition-all whitespace-nowrap relative ${tab === t ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>
            {t}
            {tab === t && (
              <motion.div layoutId="activeTab" className="absolute bottom-[-17px] left-0 right-0 h-[2px] bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'expenses' && (
        <div className="flex flex-col gap-4">
          {expenseLoading ? <Loader className="py-12" /> : expenses.length === 0 ? (
            <div className="submerged text-center py-16 border-none">
              <p className="text-lg font-inter text-on-surface-variant">No expenses yet. Time to split a bill!</p>
            </div>
          ) : expenses.map((expense) => (
            <ExpenseCard key={expense._id} expense={expense} currentUserId={user?._id} onDelete={handleDeleteExpense} />
          ))}
        </div>
      )}

      {tab === 'balances' && (
        <div className="glass-card p-6 lg:p-10">
          <h3 className="text-sm font-semibold text-on-surface-variant mb-6 uppercase tracking-widest font-inter">Net Balances</h3>
          <BalanceSummary balances={balances} />
        </div>
      )}

      {tab === 'members' && (
        <div className="glass-card p-6 lg:p-10">
          <MemberList members={currentGroup.members} adminId={currentGroup.admin} />
        </div>
      )}

      {/* Add Member Modal */}
      <Modal isOpen={showAddMember} onClose={() => setShowAddMember(false)} title="Add Member" size="md">
        <form onSubmit={handleAddMember} className="flex flex-col gap-6 mt-4">
          <Input label="Member Email" type="email" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} placeholder="member@example.com" required id="member-email" />
          <Button type="submit" className="w-full h-14 mt-4 text-base">Add Member</Button>
        </form>
      </Modal>
    </div>
  );
};

export default GroupDetail;
