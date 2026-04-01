import { useEffect, useState } from 'react';
import { useParams, Link, useOutletContext, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { fetchGroup } from '../redux/groupSlice.js';
import { fetchExpenses, deleteExpense, clearExpenses } from '../redux/expenseSlice.js';
import { deleteGroup } from '../redux/groupSlice.js';
import MemberList from '../components/group/MemberList.jsx';
import ActivityFeed from '../components/group/ActivityFeed.jsx';
import ExportActions from '../components/group/ExportActions.jsx';
import ExpenseCard from '../components/expense/ExpenseCard.jsx';
import BalanceSummary from '../components/balance/BalanceSummary.jsx';
import Loader from '../components/common/Loader.jsx';
import Button from '../components/common/Button.jsx';
import Modal from '../components/common/Modal.jsx';
import Input from '../components/common/Input.jsx';
import SettleUpModal from '../components/group/SettleUpModal.jsx';
import { Plus, UserPlus, WalletCards, Trash2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { GROUP_CATEGORIES } from '../utils/constants.js';
import expenseService from '../services/expenseService.js';
import groupService from '../services/groupService.js';
import friendService from '../services/friendService.js';
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
  const [showSettleUp, setShowSettleUp] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showDeleteGroupConfirm, setShowDeleteGroupConfirm] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);

  useEffect(() => {
    // 1. Clear any stale expenses from a previous group immediately
    dispatch(clearExpenses());

    // 2. Fetch the group data and the current group's expenses
    dispatch(fetchGroup(id));
    dispatch(fetchExpenses({ groupId: id }));

    // Firebase handles online/offline and cache transparency under the hood. 
    // We don't need manual sync manager listeners or hydration.
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

  useEffect(() => {
    if (showAddMember) {
      setLoadingFriends(true);
      setSelectedFriend(null);
      friendService.getFriends()
        .then(res => {
          // Filter out friends already in the group
          const currentMemberIds = new Set(currentGroup.members.map(m => (m.user?._id || m.user).toString()));
          setFriends(res.data.data.friends.filter(f => !currentMemberIds.has(f._id)));
        })
        .finally(() => setLoadingFriends(false));
    }
  }, [showAddMember, currentGroup]);

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

  const handleAddFriend = async () => {
    if (!selectedFriend) return;
    try {
      await groupService.addMember(id, { userId: selectedFriend._id });
      toast.success('Friend added to group!');
      setShowAddMember(false);
      setSelectedFriend(null);
      dispatch(fetchGroup(id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add friend');
    }
  };

  const handleLeaveGroup = async () => {
    setLeaving(true);
    try {
      await groupService.leaveGroup(id);
      toast.success('You have left the group');
      setShowLeaveConfirm(false);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to leave group. Ensure your balance is zero.');
    } finally {
      setLeaving(false);
    }
  };

  const handleDeleteGroup = async () => {
    setDeletingGroup(true);
    try {
      const result = await dispatch(deleteGroup(id));
      if (result.meta.requestStatus === 'fulfilled') {
        toast.success('Group deleted successfully');
        navigate('/groups');
      } else {
        toast.error(result.payload || 'Failed to delete group');
      }
    } catch (err) {
      toast.error('Failed to delete group');
    } finally {
      setDeletingGroup(false);
      setShowDeleteGroupConfirm(false);
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
              <div className="flex items-center justify-between gap-3 mt-1">
                <p className="text-xs text-on-surface-variant uppercase tracking-[0.2em] font-inter font-bold opacity-60">
                  {currentGroup.category} <span className="mx-2 opacity-50">·</span> {uniqueMembers.length} members
                </p>
                {isAdmin && (
                  <button 
                    onClick={() => setShowAddMember(true)} 
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 active:scale-95 text-on-surface-variant group ml-auto"
                    title="Add Member"
                  >
                    <UserPlus size={18} className="group-hover:text-primary transition-colors" />
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4 mt-6 md:mt-0 w-full md:w-auto">
            <button 
              onClick={() => openAddExpense(id)} 
              className="h-12 w-full md:w-80 rounded-2xl font-manrope font-bold text-xs tracking-[0.2em] flex items-center justify-center gap-3 bg-white text-black hover:bg-white/90 transition-all shadow-[0_20px_40px_-10px_rgba(255,255,255,0.1)] active:scale-[0.98] uppercase"
            >
              <Plus size={18} strokeWidth={3} /> RECORD EXPENSE
            </button>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowSettleUp(true)} 
                className="h-12 px-6 rounded-2xl font-manrope font-bold text-xs tracking-widest flex items-center justify-center gap-3 bg-surface-container-highest/40 text-on-surface hover:bg-surface-container-highest/60 transition-all border border-white/5 active:scale-95 flex-1 md:flex-none uppercase"
              >
                <WalletCards size={18} className="text-primary" /> SETTLE UP
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

        </div>
      )}

      {tab === 'members' && (
        <div className="flex flex-col gap-6">
          <div className="glass-card p-6 lg:p-10">
            <MemberList 
              members={currentGroup.members} 
              adminId={currentGroup.admin} 
              balances={balances}
              groupId={id}
              onMemberRemoved={() => dispatch(fetchGroup(id))}
              currentUserId={user?._id}
            />
          </div>
          
          {/* Non-admin: Leave group */}
          {!isAdmin && (
            <div className="px-1">
              <button 
                onClick={() => setShowLeaveConfirm(true)}
                className="w-full py-4 rounded-2xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 text-xs font-black tracking-[0.2em] uppercase transition-all active:scale-[0.98]"
              >
                Exit Cohort
              </button>
            </div>
          )}

          {/* Admin: Delete group (danger zone) */}
          {isAdmin && (
            <div className="px-1 mt-2">
              <div className="rounded-2xl border border-red-500/10 bg-red-500/[0.03] p-5">
                <p className="text-[10px] font-black text-red-500/60 uppercase tracking-[0.2em] mb-3">Danger Zone</p>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-white/80">Delete This Group</p>
                    <p className="text-[11px] text-white/30 mt-0.5 font-inter">Permanently removes the group and all its data.</p>
                  </div>
                  <button 
                    onClick={() => setShowDeleteGroupConfirm(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-black tracking-widest uppercase transition-all active:scale-95 shrink-0"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
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
          
          {/* Quick Selection for Friends */}
          <div className="flex flex-col gap-3">
            <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] font-manrope">
              Select From Friends
            </h4>
            
            {selectedFriend ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.04] border border-white/5"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                    <p className="text-sm font-black text-black">
                      {selectedFriend.name.substring(0,1).toUpperCase()}
                    </p>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-sm font-black text-white">{selectedFriend.name}</p>
                    <p className="text-[10px] font-bold text-white/40 uppercase">Add to group?</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setSelectedFriend(null)}
                    className="h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddFriend}
                    className="h-10 px-6 rounded-xl bg-white text-black hover:bg-white/90 text-[10px] font-black uppercase transition-all shadow-xl"
                  >
                    Confirm
                  </button>
                </div>
              </motion.div>
            ) : loadingFriends ? (
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {[1,2,3].map(i => (
                  <div key={i} className="w-12 h-12 rounded-full bg-white/5 animate-pulse shrink-0" />
                ))}
              </div>
            ) : friends.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {friends.map(friend => (
                  <button 
                    key={friend._id}
                    onClick={() => setSelectedFriend(friend)}
                    className="flex flex-col items-center gap-2 group shrink-0"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 group-hover:bg-primary group-hover:border-primary flex items-center justify-center transition-all">
                      <p className="text-sm font-black font-manrope group-hover:text-black">
                        {friend.name.substring(0,1).toUpperCase()}
                      </p>
                    </div>
                    <span className="text-[9px] font-bold text-white/40 group-hover:text-white uppercase truncate w-14 text-center">
                      {friend.name.split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest bg-white/[0.02] border border-dashed border-white/5 p-4 rounded-xl text-center">
                No available friends to add
              </p>
            )}
          </div>

          <div className="h-[1px] bg-white/5 w-full -my-2" />

          <form onSubmit={handleAddMember} className="flex flex-col gap-4">
            <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] font-manrope">Invite by Email</h4>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Input 
                  type="email" 
                  value={memberEmail} 
                  onChange={(e) => setMemberEmail(e.target.value)} 
                  placeholder="member@example.com" 
                  required 
                  id="member-email" 
                  className="h-14 bg-white/[0.03]"
                />
              </div>
              <Button type="submit" className="h-14 px-8 rounded-2xl bg-white text-black font-black uppercase text-[10px] tracking-widest">
                Add
              </Button>
            </div>
          </form>

          <div className="h-[1px] bg-white/5 w-full -my-2" />

          <div className="flex flex-col gap-4">
            <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] font-manrope">Share Invite Link</h4>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-mono text-white/40 truncate">
                  {currentGroup?.inviteCode 
                    ? `${window.location.origin}/join/${currentGroup.inviteCode}`
                    : 'Generating invite link...'
                  }
                </p>
              </div>
              <Button 
                variant="ghost" 
                onClick={handleCopyLink}
                disabled={!currentGroup?.inviteCode}
                className="h-11 w-11 p-0 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 transition-all shrink-0"
              >
                <LucideIcons.Copy size={20} className="text-white" />
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Settle Up Modal */}
      <SettleUpModal 
        isOpen={showSettleUp} 
        onClose={() => setShowSettleUp(false)} 
        groupId={id} 
        userId="me"
        onSettled={() => {
          // Re-fetch balances after a settlement
          expenseService.getBalances(id).then(res => {
            setBalances(res.data.data.balances || []);
            setSimplifiedDebts(res.data.data.simplifiedDebts || []);
          }).catch(() => {});
        }}
      />

      {/* Leave Group Confirmation Modal */}
      <Modal isOpen={showLeaveConfirm} onClose={() => setShowLeaveConfirm(false)} title="Exit Cohort" size="sm">
        <div className="flex flex-col gap-6 py-4">
          <p className="text-sm font-medium text-on-surface-variant font-inter leading-relaxed">
            Are you sure you want to leave this cohort? This action is permanent. 
            <br/><br/>
            You can only exit if your net balance is <span className="text-white font-bold">₹0.00</span>.
          </p>
          <div className="flex gap-4 w-full">
            <button
              onClick={() => setShowLeaveConfirm(false)}
              className="flex-1 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-xs font-black tracking-[0.2em] uppercase transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleLeaveGroup}
              disabled={leaving}
              className="flex-1 py-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 text-xs font-black tracking-[0.2em] uppercase transition-all disabled:opacity-50"
            >
              {leaving ? 'Exiting...' : 'Confirm'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Group Confirmation Modal */}
      <Modal isOpen={showDeleteGroupConfirm} onClose={() => setShowDeleteGroupConfirm(false)} title="Delete Group" size="sm">
        <div className="flex flex-col gap-6 py-4">
          <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10">
            <p className="text-sm font-medium text-on-surface-variant font-inter leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <span className="text-white font-bold">"{currentGroup?.title}"</span>?
              <br/><br/>
              This will remove the group and all associated data. 
              <span className="text-red-400 font-semibold"> This action cannot be undone.</span>
            </p>
          </div>
          <div className="flex gap-4 w-full">
            <button
              onClick={() => setShowDeleteGroupConfirm(false)}
              disabled={deletingGroup}
              className="flex-1 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-xs font-black tracking-[0.2em] uppercase transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteGroup}
              disabled={deletingGroup}
              className="flex-1 py-4 rounded-2xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 text-xs font-black tracking-[0.2em] uppercase transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {deletingGroup ? (
                <>
                  <div className="w-3 h-3 border border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={12} />
                  Delete Forever
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default GroupDetail;
