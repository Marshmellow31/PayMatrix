import { useEffect, useState } from 'react';
import { useParams, Link, useOutletContext, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { fetchGroup } from '../redux/groupSlice.js';
import { fetchExpenses, deleteExpense } from '../redux/expenseSlice.js';
import MemberList from '../components/group/MemberList.jsx';
import ActivityFeed from '../components/group/ActivityFeed.jsx';
import ExportActions from '../components/group/ExportActions.jsx';
import ExpenseCard from '../components/expense/ExpenseCard.jsx';
import BalanceSummary from '../components/balance/BalanceSummary.jsx';
import Loader from '../components/common/Loader.jsx';
import Button from '../components/common/Button.jsx';
import Modal from '../components/common/Modal.jsx';
import Input from '../components/common/Input.jsx';
import { Plus, UserPlus } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { GROUP_CATEGORIES } from '../utils/constants.js';
import expenseService from '../services/expenseService.js';
import groupService from '../services/groupService.js';
import toast from 'react-hot-toast';

const GroupDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { openAddExpense } = useOutletContext();
  const { currentGroup, loading: groupLoading } = useSelector((state) => state.groups);
  const { expenses, loading: expenseLoading } = useSelector((state) => state.expenses);
  const { user } = useSelector((state) => state.auth);

  const [tab, setTab] = useState('expenses');
  const [balances, setBalances] = useState([]);
  const [simplifiedDebts, setSimplifiedDebts] = useState([]);
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
        setBalances(res.data.data.balances || []);
        setSimplifiedDebts(res.data.data.simplifiedDebts || []);
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

  const handleCopyLink = () => {
    const link = `${window.location.origin}/join/${currentGroup.inviteCode}`;
    navigator.clipboard.writeText(link);
    toast.success('Invite link copied to clipboard!');
  };

  if (groupLoading || !currentGroup) return <Loader className="py-20" />;

  const category = GROUP_CATEGORIES.find((c) => c.value === currentGroup.category);
  const isAdmin = currentGroup.admin === user?._id;
  const tabs = ['expenses', 'balances', 'members', 'logs'];

  // De-duplicate members for accurate count
  const uniqueMembers = Array.from(new Map(
    (currentGroup.members || []).map(m => {
      const id = (m.user?._id || m.user || '').toString();
      return [id, m];
    })
  ).values());

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-24">
      {/* Group Header */}
      <div className="submerged mb-6 p-6 lg:p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-surface-lowest shadow-inner" style={{ background: `${category?.color || '#ffffff'}10` }}>
              {category?.icon ? (
                (() => {
                  const IconComponent = LucideIcons[category.icon];
                  return IconComponent ? <IconComponent size={40} style={{ color: category.color }} /> : <LucideIcons.Hash size={40} />;
                })()
              ) : (
                <LucideIcons.Hash size={40} />
              )}
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold font-manrope text-primary tracking-tight mb-2">{currentGroup.title}</h1>
              <p className="text-base text-on-surface-variant uppercase tracking-widest font-inter font-semibold">{currentGroup.category} <span className="mx-2 opacity-50">·</span> {uniqueMembers.length} members</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mt-6 md:mt-0">
            {isAdmin && (
              <button 
                onClick={() => setShowAddMember(true)} 
                className="h-11 px-5 rounded-xl flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 transition-all border border-white/5 active:scale-95 text-[10px] font-bold text-on-surface-variant/60 tracking-wider uppercase"
              >
                <UserPlus size={16} /> ADD USERS
              </button>
            )}
            
            <div className="flex items-center gap-3 flex-1 sm:flex-none">
              <button 
                onClick={() => openAddExpense(id)} 
                className="btn-primary h-11 px-8 rounded-xl font-manrope font-bold text-sm tracking-wider flex items-center justify-center gap-2 shadow-[0_10px_30px_-5px_rgba(255,255,255,0.1)] active:scale-95 transition-all flex-1 sm:flex-none"
              >
                <Plus size={18} /> RECORD EXPENSE
              </button>
              
              <ExportActions group={currentGroup} expenses={expenses} balances={balances} iconOnly={true} />
            </div>
          </div>
        </div>
      </div>


      {/* Tabs */}
      <div 
        className="flex gap-8 mb-6 pb-0 overflow-x-auto hide-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {tabs.map((t) => (
          <button 
            key={t} 
            onClick={() => setTab(t)} 
            className={`pb-3 text-sm font-bold font-inter capitalize transition-all whitespace-nowrap relative tracking-tight ${tab === t ? 'text-primary' : 'text-on-surface-variant/50 hover:text-on-surface'}`}
          >
            {t}
            {tab === t && (
              <motion.div 
                layoutId="activeTab" 
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full" 
              />
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
            <ExpenseCard 
              key={expense._id} 
              expense={expense} 
              currentUserId={user?._id} 
              onDelete={handleDeleteExpense} 
              onEdit={(exp) => openAddExpense(id, exp)}
            />
          ))}
        </div>
      )}

      {tab === 'balances' && (
        <div className="flex flex-col gap-6">
          <div className="glass-card p-6 lg:p-10">
            <h3 className="text-sm font-semibold text-on-surface-variant mb-6 uppercase tracking-widest font-inter">Net Balances</h3>
            <BalanceSummary balances={balances} />
          </div>

          {simplifiedDebts.length > 0 && (
            <div className="glass-card p-6 lg:p-10 border-primary/20 bg-primary/5">
              <div className="flex items-center gap-3 mb-6">
                <LucideIcons.Sparkles className="text-primary" size={20} />
                <h3 className="text-sm font-bold text-white uppercase tracking-widest font-inter">Suggested Settlements</h3>
              </div>
              
              <div className="space-y-3">
                {simplifiedDebts.map((debt, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-highest/20 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="text-left">
                        <span className="text-xs font-bold text-white">{debt.fromUser?.name || 'Unknown'}</span>
                        <span className="text-[10px] text-on-surface-variant mx-2">owes</span>
                        <span className="text-xs font-bold text-white">{debt.toUser?.name || 'Unknown'}</span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <p className="font-manrope font-black text-primary text-lg">₹{debt.amount.toFixed(2)}</p>
                      <Button
                        size="sm"
                        className="h-8 px-4 text-xs font-bold tracking-wider"
                        onClick={() => navigate(`/groups/${id}/settlements`, { state: { prefill: debt } })}
                      >
                        Settle Now
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-[10px] text-on-surface-variant font-inter italic opacity-60">
                Min-flow algorithm is active. These transactions will settle all debts with the fewest steps possible.
              </p>
            </div>
          )}
        </div>
      )}

      {tab === 'members' && (
        <div className="glass-card p-6 lg:p-10">
          <MemberList members={currentGroup.members} adminId={currentGroup.admin} />
        </div>
      )}

      {tab === 'logs' && (
        <div className="glass-card p-6 lg:p-10">
          <h3 className="text-sm font-semibold text-on-surface-variant mb-10 uppercase tracking-widest font-inter">Recent Activity</h3>
          <ActivityFeed groupId={id} />
        </div>
      )}

      {/* Add Member Modal */}
      <Modal isOpen={showAddMember} onClose={() => setShowAddMember(false)} title="Add Member" size="md">
        <div className="flex flex-col gap-8 py-4">
          <form onSubmit={handleAddMember} className="flex flex-col gap-4">
            <h4 className="text-sm font-semibold text-on-surface-variant uppercase tracking-widest font-inter mb-2">Invite by Email</h4>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Input type="email" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} placeholder="member@example.com" required id="member-email" />
              </div>
              <Button type="submit" className="h-14 px-6 rounded-2xl">Add</Button>
            </div>
          </form>

          <div className="h-[1px] bg-outline-variant/10 w-full" />

          <div className="flex flex-col gap-4">
            <h4 className="text-sm font-semibold text-on-surface-variant uppercase tracking-widest font-inter">Share Invite Link</h4>
            <p className="text-xs text-on-surface-variant/70 font-inter leading-relaxed">
              Anyone with this link can join the group. Use it to quickly onboard multiple members.
            </p>
            
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-highest/30 border border-white/5">
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-mono text-on-surface truncate opacity-60">
                  {`${window.location.origin}/join/${currentGroup.inviteCode}`}
                </p>
              </div>
              <Button 
                variant="ghost" 
                onClick={handleCopyLink}
                className="h-10 w-10 p-0 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 transition-all shrink-0"
              >
                <LucideIcons.Copy size={18} className="text-primary" />
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default GroupDetail;
