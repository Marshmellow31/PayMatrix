import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useOutletContext, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { collection, onSnapshot, query, orderBy, doc, limit } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { fetchGroup } from '../redux/groupSlice.js';
import { deleteExpense, clearExpenses, setExpenses } from '../redux/expenseSlice.js';
import { deleteGroup } from '../redux/groupSlice.js';
import MemberList from '../components/group/MemberList.jsx';
import ActivityFeed from '../components/group/ActivityFeed.jsx';
import ExportActions from '../components/group/ExportActions.jsx';
import ExpenseCard from '../components/expense/ExpenseCard.jsx';
import BalanceSummary from '../components/balance/BalanceSummary.jsx';
import { computeGroupBalances, simplifyDebts } from '../utils/balanceEngine.js';
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
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
import { formatCurrency } from '../utils/formatCurrency.js';

const GroupDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { openAddExpense } = useOutletContext();

  // Quick settle deep-linking
  const queryParams = new URLSearchParams(location.search);
  const shouldSettle = queryParams.get('settle') === 'true';
  const settleWithId = queryParams.get('with');

  const { currentGroup, groups, loading: groupLoading } = useSelector((state) => state.groups);
  const { expenses = [], loading: expenseLoading } = useSelector((state) => state.expenses);
  const { user } = useSelector((state) => state.auth);
  const isOnline = useOnlineStatus();

  const [tab, setTab] = useState('expenses');
  const [settlements, setSettlements] = useState([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showSettleUp, setShowSettleUp] = useState(shouldSettle);
  const [selectedSettleFriendId, setSelectedSettleFriendId] = useState(settleWithId);
  const [memberEmail, setMemberEmail] = useState('');
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showDeleteGroupConfirm, setShowDeleteGroupConfirm] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [updatingGroup, setUpdatingGroup] = useState(false);
  const [showOnlyMe, setShowOnlyMe] = useState(false);
  const [groupLogs, setGroupLogs] = useState([]);

  useEffect(() => {
    if (!id) return;

    // 1. Clear any stale expenses from a previous group immediately
    dispatch(clearExpenses());

    // 2. Real-time listener for Group Metadata (Title, Members, Admin)
    const unsubscribeGroup = onSnapshot(doc(db, 'groups', id), async (docSnap) => {
      if (docSnap.exists()) {
        try {
          const groupData = await groupService.expandGroupData(docSnap);
          dispatch({ type: 'groups/fetchOne/fulfilled', payload: { data: { group: groupData } } });
        } catch (err) {
          console.error("Error expanding group snapshot:", err);
          // Fallback to raw data if expansion fails (minimizes broken UI)
          const rawData = { _id: docSnap.id, ...docSnap.data() };
          dispatch({ type: 'groups/fetchOne/fulfilled', payload: { data: { group: rawData } } });
        }
      }
    }, (err) => {
      // Ignore permission errors if we are currently deleting the group
      if (deletingGroup && err.code === 'permission-denied') return;
      console.error("Group metadata snapshot error:", err);
    });

    // 3. Real-time listener for Expenses
    const qExpenses = query(
      collection(db, 'groups', id, 'expenses'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeExpenses = onSnapshot(qExpenses, (snapshot) => {
      const liveExpenses = snapshot.docs.map(docSnap => ({
        _id: docSnap.id,
        ...docSnap.data()
      }));
      dispatch(setExpenses({ expenses: liveExpenses, groupId: id }));
    }, (err) => {
      if (deletingGroup && err.code === 'permission-denied') return;
      console.error("Expenses snapshot error:", err);
    });

    // 4. Real-time listener for Settlements
    const qSettlements = query(
      collection(db, 'groups', id, 'settlements'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeSettlements = onSnapshot(qSettlements, (snapshot) => {
      const liveSettlements = snapshot.docs.map(doc => ({
        _id: doc.id,
        // Ensure groupId is explicitly attached for filtering
        groupId: id,
        ...doc.data()
      }));
      setSettlements(liveSettlements);
    }, (err) => {
      if (deletingGroup && err.code === 'permission-denied') return;
      console.error("Settlements snapshot error:", err);
    });

    // 5. Real-time listener for Group Logs is now lazy-loaded in a separate useEffect

    return () => {
      setSettlements([]); // Immediate clearance of local state
      unsubscribeGroup();
      unsubscribeExpenses();
      unsubscribeSettlements();
    };
  }, [id, dispatch]);

  // Lazy-load logs only when viewing the logs tab or exporting
  useEffect(() => {
    if (!id || tab !== 'logs') return;

    const qLogs = query(
      collection(db, 'groups', id, 'logs'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    const unsubscribeLogs = onSnapshot(qLogs, (snapshot) => {
      const liveLogs = snapshot.docs.map(docSnap => ({
        _id: docSnap.id,
        ...docSnap.data()
      }));
      setGroupLogs(liveLogs);
    }, (err) => {
      if (deletingGroup && err.code === 'permission-denied') return;
      console.error("Logs snapshot error:", err);
    });

    return () => {
      setGroupLogs([]);
      unsubscribeLogs();
    };
  }, [id, tab, deletingGroup]);

  const { netBalances, balanceList, debts, scopedExpenses } = useMemo(() => {
    const activeGrp = currentGroup?._id === id ? currentGroup : groups.find(g => g._id === id);
    if (!activeGrp || !id) return { netBalances: {}, balanceList: [], debts: [], scopedExpenses: [] };

    // Defense in Depth: Filter expenses and settlements with STRICT equality.
    // This prevents "Zombie Data" (records from other groups or global state
    // with missing groupId fields) from leaking into the current view.
    const currentUserId = user?._id || user?.uid;
    const scopedExpenses = expenses.filter(e => {
      const eGroupId = e.groupId || (e.group?._id || e.group);
      if (eGroupId !== id || e.status === 'deleted') return false;

      // Personal filter logic
      if (showOnlyMe) {
        const isPayer = (e.paidBy?._id || e.paidBy) === currentUserId;
        const isParticipant = e.participants?.includes(currentUserId) || e.splits?.some(s => (s.user?._id || s.user) === currentUserId);
        return isPayer || isParticipant;
      }
      return true;
    });

    const scopedSettlements = settlements.filter(s => s.groupId === id && s.status !== 'deleted');

    const calculatedBalances = computeGroupBalances(scopedExpenses, scopedSettlements, activeGrp.members);

    const list = Object.keys(calculatedBalances).map(uid => {
      const member = activeGrp.members.find(m => {
        const mid = m.user?._id || m.user?.uid || m.user;
        return (mid || '').toString() === uid;
      });
      return {
        user: member?.user || { _id: uid, name: 'Member' },
        balance: calculatedBalances[uid]
      };
    });

    const calculatedDebts = simplifyDebts(calculatedBalances);

    const hasPending = Object.values(calculatedBalances).some(val => Math.abs(val) > 0.01);
    const myBalance = calculatedBalances[user?._id || user?.uid] || 0;

    return {
      netBalances: calculatedBalances,
      balanceList: list,
      debts: calculatedDebts,
      hasPending,
      myBalance,
      scopedExpenses
    };
  }, [expenses, settlements, currentGroup, groups, id, user, showOnlyMe]);

  // Ensure legacy groups get an invite code
  useEffect(() => {
    const activeGrp = currentGroup?._id === id ? currentGroup : groups.find(g => g._id === id);
    if (!activeGrp || activeGrp.inviteCode || !user) return;

    // Only admins can generate the initial invite code for legacy groups
    const isAdmin = activeGrp.admin === (user?._id || user?.uid);
    if (isAdmin && isOnline) {
      const newCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      groupService.updateGroup(id, { inviteCode: newCode })
        .then(() => dispatch(fetchGroup(id)))
        .catch(err => console.error("Failed to generate legacy invite code:", err));
    }
  }, [currentGroup, groups, id, user, isOnline, dispatch]);

  const balances = balanceList;
  const simplifiedDebts = debts;
  const { hasPending, myBalance } = { hasPending: debts.length > 0 || Object.values(netBalances).some(v => Math.abs(v) > 0.01), myBalance: netBalances[user?._id || user?.uid] || 0 };

  useEffect(() => {
    if (showAddMember) {
      setLoadingFriends(true);
      setSelectedFriend(null);
      friendService.getFriends()
        .then(res => {
          // Filter out friends already in the group
          const activeGrp = currentGroup?._id === id ? currentGroup : groups.find(g => g._id === id);
          if (!activeGrp) return;
          const currentMemberIds = new Set(activeGrp.members.map(m => (m.user?._id || m.user).toString()).filter(m => m && typeof m === 'string' && m !== 'undefined'));
          setFriends(res.data.data.friends.filter(f => !currentMemberIds.has(f._id)));
        })
        .finally(() => setLoadingFriends(false));
    }
  }, [showAddMember, currentGroup, groups, id]);

  const handleDeleteExpense = async (expenseId) => {
    const result = await dispatch(deleteExpense({ id: expenseId, groupId: id }));
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
      await groupService.leaveGroup(id, user?.uid || user?._id);
      toast.success('You have left the group');
      setShowLeaveConfirm(false);
      navigate('/dashboard');
    } catch (err) {
      console.error("Leave Group Error:", err);
      // Determine error type for better feedback
      const errMsg = err.message?.toLowerCase() || '';
      if (errMsg.includes('balance')) {
        toast.error("Clear your pending balance (settle up) to exit.");
      } else if (err.code === 'permission-denied' || errMsg.includes('permission')) {
        toast.error("Exit failed. Ensure you are not the last admin or have zero balance.");
      } else {
        toast.error('Exit failed. Please verify your connection and try again.');
      }
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

  const handleUpdateGroupLabel = () => {
    setEditName(activeGroup?.name || activeGroup?.title || '');
    setEditCategory(activeGroup?.category || '');
    setShowEditGroup(true);
  };

  const handleUpdateGroup = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setUpdatingGroup(true);
    try {
      await groupService.updateGroup(id, {
        name: editName.trim(),
        category: editCategory
      });
      toast.success('Cohort updated');
      setShowEditGroup(false);
      // Real-time snapshot will update the UI automatically
    } catch (err) {
      console.error("Update cohort error:", err);
      toast.error(err?.message || 'Failed to update cohort');
    } finally {
      setUpdatingGroup(false);
    }
  };

  const activeGroup = currentGroup?._id === id ? currentGroup : groups.find(g => g._id === id);

  // Only show the full-page loader if we have NO group data for this ID at all.
  // If we have it in the cache (groups array), we show the content and let snapshots update it.
  if (!activeGroup && groupLoading) return <Loader className="py-20" />;
  if (!activeGroup) return <div className="text-center py-20 opacity-50 font-inter">Identifying Cohort...</div>;

  const category = GROUP_CATEGORIES.find((c) => c.value === activeGroup.category);
  const isAdmin = activeGroup.admin === (user?._id || user?.uid);
  const tabs = ['expenses', 'members', 'logs'];

  // De-duplicate members for accurate count
  const uniqueMembers = Array.from(new Map(
    (activeGroup.members || []).map(m => {
      const u = m.user || m;
      const idStr = (u?._id || u?.uid || u || '').toString();
      return [idStr, m];
    })
  ).values());

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-24">
      {/* Compact Group Header */}
      <div className="bg-surface-container-low mt-4 mb-6 p-4 sm:p-6 rounded-[2rem] border border-white/5">
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10 shadow-inner backdrop-blur-sm">
                {category?.icon ? (
                  (() => {
                    const IconComponent = LucideIcons[category.icon];
                    return IconComponent ? <IconComponent size={24} style={{ color: category.color }} /> : <LucideIcons.Hash size={24} />;
                  })()
                ) : (
                  <LucideIcons.Hash size={24} />
                )}
              </div>
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <h1 className="text-lg md:text-xl font-black font-manrope text-white tracking-tight uppercase leading-tight truncate">
                  {activeGroup.name || activeGroup.title}
                </h1>
                <p className="text-[9px] text-white/30 uppercase tracking-[0.22em] font-black font-manrope truncate">
                  {activeGroup.category} <span className="mx-1.5 opacity-50">•</span> {uniqueMembers.length} Members
                </p>
              </div>
            </div>

            {isAdmin && (
              <button
                onClick={() => isOnline && setShowAddMember(true)}
                disabled={!isOnline}
                className={`w-10 h-10 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] transition-all border border-white/5 active:scale-90 text-white/40 flex items-center justify-center shrink-0 ${!isOnline ? 'opacity-20 grayscale cursor-not-allowed' : 'hover:text-primary'}`}
                title="Add Member"
              >
                <UserPlus size={18} />
              </button>
            )}
          </div>

          <div className="flex w-full gap-3">
            <button
              onClick={() => openAddExpense(id)}
              className="flex-1 h-11 px-2 rounded-xl font-manrope font-black text-[10px] sm:text-xs tracking-[0.12em] sm:tracking-[0.2em] flex items-center justify-center gap-2 bg-white text-black hover:bg-white/90 transition-all active:scale-[0.97] uppercase shadow-lg shadow-white/5"
            >
              <Plus size={16} strokeWidth={4} className="shrink-0" /> <span className="truncate">Record</span>
            </button>

            <button
              onClick={() => isOnline && setShowSettleUp(true)}
              disabled={!isOnline}
              className={`flex-1 h-11 px-2 rounded-xl font-manrope font-black text-[10px] sm:text-xs tracking-[0.12em] sm:tracking-[0.2em] flex items-center justify-center gap-2 bg-white/[0.03] text-white/60 transition-all border border-white/5 active:scale-[0.97] uppercase ${!isOnline ? 'opacity-20 grayscale cursor-not-allowed' : 'hover:bg-white/[0.08] hover:text-white'}`}
            >
              <WalletCards size={16} className="shrink-0" />
              <span className="truncate">Settle</span>
            </button>
          </div>
        </div>
      </div>


      {/* Tabs */}
      <div
        className="flex gap-5 sm:gap-8 mb-6 pb-0 overflow-x-auto hide-scrollbar"
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
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black font-manrope text-white/30 uppercase tracking-[0.3em]">Chronicle</h3>
            <button
              onClick={() => setShowOnlyMe(!showOnlyMe)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-[10px] font-bold uppercase tracking-widest ${showOnlyMe
                  ? 'bg-primary border-primary text-black'
                  : 'bg-white/5 border-white/5 text-on-surface-variant hover:bg-white/10'
                }`}
            >
              <LucideIcons.User size={12} />
              {showOnlyMe ? 'Viewing Yours' : 'View Yours'}
            </button>
          </div>

          {(() => {
            if (expenseLoading && scopedExpenses.length === 0) return <Loader className="py-12" />;
            if (scopedExpenses.length === 0) return (
              <div className="submerged text-center py-16 border-none">
                <p className="text-lg font-inter text-on-surface-variant">No expenses yet. Time to split a bill!</p>
              </div>
            );

            return scopedExpenses.map((expense) => (
              <ExpenseCard
                key={expense._id}
                expense={expense}
                currentUserId={user?._id || user?.uid}
                onDelete={handleDeleteExpense}
                onEdit={(exp) => openAddExpense(id, exp)}
              />
            ));
          })()}
        </div>
      )}


      {tab === 'members' && (
        <div className="flex flex-col gap-6">
          <div className="glass-card p-6 lg:p-10">
            <MemberList
              members={activeGroup.members}
              adminId={activeGroup.admin}
              balances={balances}
              groupId={id}
              onMemberRemoved={() => dispatch(fetchGroup(id))}
              currentUserId={user?._id || user?.uid}
            />
          </div>

          {/* Non-admin: Leave group */}
          {!isAdmin && (
            <div className="px-1">
              <button
                onClick={() => isOnline && setShowLeaveConfirm(true)}
                disabled={!isOnline || Math.abs(myBalance) > 0.01}
                className={`w-full py-4 rounded-2xl border text-xs font-black tracking-[0.2em] uppercase transition-all active:scale-[0.98] ${(!isOnline || Math.abs(myBalance) > 0.01) ? 'opacity-20 grayscale border-white/10 bg-white/5 text-white/40 cursor-not-allowed' : 'border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500'}`}
              >
                {!isOnline ? 'Exit Blocked (Offline)' : Math.abs(myBalance) > 0.01 ? `Clear ${formatCurrency(myBalance)} to Exit` : 'Exit Cohort'}
              </button>
            </div>
          )}

          {/* Admin: Edit group details */}
          {isAdmin && (
            <div className="px-1 mt-2">
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-3">Group Settings</p>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-white/80">Edit Details</p>
                    <p className="text-[11px] text-white/30 mt-0.5 font-inter">Update name and category.</p>
                  </div>
                  <button
                    onClick={() => isOnline && handleUpdateGroupLabel()}
                    disabled={!isOnline}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[10px] font-black tracking-widest uppercase transition-all active:scale-95 shrink-0 ${!isOnline ? 'opacity-20 grayscale border-white/10 bg-white/5 text-white/40 cursor-not-allowed' : 'border-white/10 bg-white/5 hover:bg-white/10 text-white'}`}
                  >
                    <LucideIcons.Settings size={14} />
                    Edit
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Admin: Delete group (danger zone) */}
          {isAdmin && (
            <div className="px-1">
              <div className="rounded-2xl border border-red-500/10 bg-red-500/[0.03] p-5">
                <p className="text-[10px] font-black text-red-500/60 uppercase tracking-[0.2em] mb-3">Danger Zone</p>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-white/80">Delete This Group</p>
                    <p className="text-[11px] text-white/30 mt-0.5 font-inter">Permanently removes the group and all its data.</p>
                  </div>
                  <button
                    onClick={() => isOnline && setShowDeleteGroupConfirm(true)}
                    disabled={!isOnline || hasPending}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[10px] font-black tracking-widest uppercase transition-all active:scale-95 shrink-0 ${(!isOnline || hasPending) ? 'opacity-20 grayscale border-white/10 bg-white/5 text-white/40 cursor-not-allowed' : 'border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-500'}`}
                  >
                    {hasPending ? <LucideIcons.Lock size={12} className="opacity-40" /> : <Trash2 size={14} />}
                    {!isOnline ? 'Offline' : hasPending ? 'Locked' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'logs' && (
        <div className="glass-card p-6 lg:p-10">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-widest font-inter">Recent Activity</h3>
            <ExportActions
              group={activeGroup}
              expenses={scopedExpenses}
              balances={balanceList}
              logs={groupLogs}
            />
          </div>
          <ActivityFeed groupId={id} externalLogs={groupLogs} />
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
                      {selectedFriend.name.substring(0, 1).toUpperCase()}
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
                {[1, 2, 3].map(i => (
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
                        {friend.name.substring(0, 1).toUpperCase()}
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
                  {activeGroup?.inviteCode
                    ? `${window.location.origin}/join/${activeGroup.inviteCode}`
                    : 'Generating invite link...'
                  }
                </p>
              </div>
              {navigator.share && (
                <Button
                  variant="ghost"
                  onClick={async () => {
                    const link = `${window.location.origin}/join/${activeGroup.inviteCode}`;
                    try {
                      await navigator.share({
                        title: `Join ${activeGroup?.name || activeGroup?.title} on PayMatrix`,
                        text: `Join my group "${activeGroup?.name || activeGroup?.title}" on PayMatrix to split expenses!`,
                        url: link,
                      });
                      toast.success('Invite shared!');
                    } catch (err) {
                      if (err.name !== 'AbortError') {
                        navigator.clipboard.writeText(link);
                        toast.success('Invite link copied to clipboard!');
                      }
                    }
                  }}
                  disabled={!activeGroup?.inviteCode}
                  className="h-11 px-4 rounded-xl flex items-center justify-center gap-2 bg-white text-black hover:bg-white/90 transition-all shrink-0 text-[10px] font-black uppercase tracking-widest"
                >
                  <LucideIcons.Share2 size={16} />
                  Share
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => {
                  const link = `${window.location.origin}/join/${activeGroup.inviteCode}`;
                  navigator.clipboard.writeText(link);
                  toast.success('Invite link copied to clipboard!');
                }}
                disabled={!activeGroup?.inviteCode}
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
        onClose={() => {
          setShowSettleUp(false);
          setSelectedSettleFriendId(null);
        }}
        groupId={id}
        userId={user?.uid || user?._id}
        forcedPayeeId={selectedSettleFriendId}
        onSettled={() => {
          // No manual fetch needed anymore, snapshot listeners handle reactivity
          toast.success("Accounts reconciled");
        }}
      />

      {/* Leave Group Confirmation Modal */}
      <Modal isOpen={showLeaveConfirm} onClose={() => setShowLeaveConfirm(false)} title="Exit Cohort" size="sm">
        <div className="flex flex-col gap-6 py-4">
          <p className="text-sm font-medium text-on-surface-variant font-inter leading-relaxed">
            Are you sure you want to leave this cohort? This action is permanent.
            <br /><br />
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
              disabled={leaving || Math.abs(myBalance) > 0.01}
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
              <span className="text-white font-bold">"{activeGroup?.name || activeGroup?.title}"</span>?
              <br /><br />
              This will remove the group and all associated data.
              <span className="text-red-400 font-semibold"> This action cannot be undone.</span>
            </p>
          </div>
          <div className="flex gap-4 w-full">
            <button
              onClick={() => setShowDeleteGroupConfirm(false)}
              disabled={deletingGroup || hasPending}
              className="flex-1 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-xs font-black tracking-[0.2em] uppercase transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteGroup}
              disabled={deletingGroup || hasPending}
              className="flex-1 py-4 rounded-2xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 text-xs font-black tracking-[0.2em] uppercase transition-all disabled:opacity-50 flex items-center justify-center"
            >
              <div className="flex items-center justify-center gap-2">
                {deletingGroup ? (
                  <>
                    <div className="w-3 h-3 border border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Forever</span>
                )}
              </div>
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Group Modal */}
      <Modal isOpen={showEditGroup} onClose={() => setShowEditGroup(false)} title="Edit Group" size="md">
        <form onSubmit={handleUpdateGroup} className="flex flex-col gap-8 py-4">
          <div className="flex flex-col gap-3">
            <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] font-manrope">Cohort Name</h4>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="E.g. Goa Trip 2024"
              required
              className="h-14 bg-white/[0.03]"
            />
          </div>

          <div className="flex flex-col gap-4">
            <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] font-manrope">Category</h4>
            <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar">
              {GROUP_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setEditCategory(cat.value)}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-xl border transition-all text-[11px] font-bold flex items-center gap-2 ${editCategory === cat.value
                    ? 'bg-white text-black border-white'
                    : 'bg-white/[0.03] border-white/5 text-white/40 hover:text-white'
                    }`}
                >
                  {(() => {
                    const IconComp = LucideIcons[cat.icon] || LucideIcons.Hash;
                    return <IconComp size={14} />;
                  })()}
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4 pt-2">
            <button
              type="button"
              onClick={() => setShowEditGroup(false)}
              className="flex-1 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-xs font-black tracking-[0.2em] uppercase transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updatingGroup || !editName.trim()}
              className="flex-1 py-4 rounded-2xl bg-white text-black text-xs font-black tracking-[0.2em] uppercase transition-all disabled:opacity-50"
            >
              {updatingGroup ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default GroupDetail;
