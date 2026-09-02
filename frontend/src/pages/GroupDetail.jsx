import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useOutletContext, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { fetchGroup, deleteGroup } from '../redux/groupSlice.js';
import { deleteExpense } from '../redux/expenseSlice.js';
import MemberList from '../components/group/MemberList.jsx';
import ActivityFeed from '../components/group/ActivityFeed.jsx';
import ExportActions from '../components/group/ExportActions.jsx';
import ExpenseCard from '../components/expense/ExpenseCard.jsx';
import GroupHeader from '../components/group/GroupHeader.jsx';
import GroupInsightsTab from '../components/group/GroupInsightsTab.jsx';
import SettleUpModal from '../components/group/SettleUpModal.jsx';
import BillScannerModal from '../components/bill/BillScannerModal.jsx';
import {
  AddMemberModal,
  EditGroupModal,
  ConfirmLeaveGroupModal,
  ConfirmDeleteGroupModal,
} from '../components/group/GroupModals.jsx';

import { computeGroupBalances, simplifyDebts } from '../utils/balanceEngine.js';
import Loader from '../components/common/Loader.jsx';
import { useFeatureFlags } from '../hooks/useFeatureFlags.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import { useGroupRealtime } from '../hooks/useGroupRealtime.js';
import groupService from '../services/groupService.js';
import friendService from '../services/friendService.js';
import toast from 'react-hot-toast';
import { User } from 'lucide-react';

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
  const flags = useFeatureFlags();

  const [tab, setTab] = useState('expenses');
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
  const deletingGroupRef = useRef(false);

  const [showEditGroup, setShowEditGroup] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [updatingGroup, setUpdatingGroup] = useState(false);
  const [showOnlyMe, setShowOnlyMe] = useState(false);
  const [showBillScanner, setShowBillScanner] = useState(false);

  // Managed real-time subscriptions
  const { settlements, groupLogs } = useGroupRealtime(id, dispatch, deletingGroupRef, tab);

  const setDeletingGroupSafe = (val) => {
    deletingGroupRef.current = val;
    setDeletingGroup(val);
  };

  const activeGroup = currentGroup?._id === id ? currentGroup : groups.find((g) => g._id === id);

  const { netBalances, balanceList, debts, scopedExpenses } = useMemo(() => {
    if (!activeGroup || !id) {
      return { netBalances: {}, balanceList: [], debts: [], scopedExpenses: [] };
    }

    const currentUserId = user?._id || user?.uid;
    const scopedExp = expenses.filter((e) => {
      const eGroupId = e.groupId || e.group?._id || e.group;
      if (eGroupId !== id || e.status === 'deleted') return false;

      if (showOnlyMe) {
        const isPayer = (e.paidBy?._id || e.paidBy) === currentUserId;
        const isParticipant =
          e.participants?.includes(currentUserId) ||
          e.splits?.some((s) => (s.user?._id || s.user) === currentUserId);
        return isPayer || isParticipant;
      }
      return true;
    });

    const scopedSettlements = settlements.filter((s) => s.groupId === id && s.status !== 'deleted');

    const calculatedBalances = computeGroupBalances(
      scopedExp,
      scopedSettlements,
      activeGroup.members
    );

    const list = Object.keys(calculatedBalances).map((uid) => {
      const member = activeGroup.members.find((m) => {
        const mid = m.user?._id || m.user?.uid || m.user;
        return (mid || '').toString() === uid;
      });
      return {
        user: member?.user || { _id: uid, name: 'Member' },
        balance: calculatedBalances[uid],
      };
    });

    const calculatedDebts = simplifyDebts(calculatedBalances);

    return {
      netBalances: calculatedBalances,
      balanceList: list,
      debts: calculatedDebts,
      scopedExpenses: scopedExp,
    };
  }, [expenses, settlements, activeGroup, id, user, showOnlyMe]);

  const hasPending = debts.length > 0 || Object.values(netBalances).some((v) => Math.abs(v) > 0.01);
  const myBalance = netBalances[user?._id || user?.uid] || 0;
  const isAdmin = activeGroup?.admin === (user?._id || user?.uid);
  const isMember = activeGroup?.members?.some(
    (m) => (m.user?._id || m.user?.uid || m.user || m) === (user?._id || user?.uid)
  );

  // Load friends list when opening Add Member
  useEffect(() => {
    if (showAddMember && activeGroup) {
      setLoadingFriends(true);
      setSelectedFriend(null);
      friendService
        .getFriends()
        .then((res) => {
          const currentMemberIds = new Set(
            activeGroup.members
              .map((m) => (m.user?._id || m.user).toString())
              .filter((m) => m && typeof m === 'string' && m !== 'undefined')
          );
          setFriends(res.data.data.friends.filter((f) => !currentMemberIds.has(f._id)));
        })
        .finally(() => setLoadingFriends(false));
    }
  }, [showAddMember, activeGroup]);

  const handleDeleteExpense = async (expenseId) => {
    const result = await dispatch(deleteExpense({ id: expenseId, groupId: id }));
    if (result.meta.requestStatus === 'fulfilled') toast.success('Expense deleted');
  };

  const handleAddMemberByEmail = async (e) => {
    e.preventDefault();
    if (!memberEmail.trim()) return;
    try {
      await groupService.addMember(id, { email: memberEmail.trim() });
      toast.success('Member added!');
      setShowAddMember(false);
      setMemberEmail('');
      dispatch(fetchGroup(id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add member');
    }
  };

  const handleAddSelectedFriend = async () => {
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
      console.error('Leave Group Error:', err);
      const errMsg = err.message?.toLowerCase() || '';
      if (errMsg.includes('balance')) {
        toast.error('Clear your pending balance (settle up) to exit.');
      } else {
        toast.error('Exit failed. Please verify your connection and try again.');
      }
    } finally {
      setLeaving(false);
    }
  };

  const handleDeleteGroup = async () => {
    setDeletingGroupSafe(true);
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
      setDeletingGroupSafe(false);
      setShowDeleteGroupConfirm(false);
    }
  };

  const handleOpenEditGroup = () => {
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
        category: editCategory,
      });
      toast.success('Group updated');
      setShowEditGroup(false);
    } catch (err) {
      console.error('Update group error:', err);
      toast.error(err?.message || 'Failed to update group');
    } finally {
      setUpdatingGroup(false);
    }
  };

  const tabs = ['expenses', 'members', 'logs', 'insights'];

  if (groupLoading && !activeGroup) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader size="lg" />
      </div>
    );
  }

  if (!activeGroup) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <p className="text-lg font-bold text-white">Group not found</p>
        <p className="text-sm text-white/40">
          This group may have been deleted or you may not be a member.
        </p>
        <button
          onClick={() => navigate('/groups')}
          className="px-6 py-2.5 rounded-xl bg-white text-black font-bold text-xs uppercase"
        >
          Back to Groups
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header Section */}
      <GroupHeader
        activeGroup={activeGroup}
        isAdmin={isAdmin}
        isMember={isMember}
        myBalance={myBalance}
        hasPending={hasPending}
        onOpenAddExpense={() => openAddExpense(id)}
        onOpenScanBill={() => setShowBillScanner(true)}
        onOpenSettleUp={() => setShowSettleUp(true)}
        onOpenAddMember={() => setShowAddMember(true)}
        onOpenEditGroup={handleOpenEditGroup}
        onOpenLeaveGroup={() => setShowLeaveConfirm(true)}
        onOpenDeleteGroup={() => setShowDeleteGroupConfirm(true)}
        billScanningEnabled={flags.billScanning}
      />

      {/* Main Grid: Content + Desktop Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Main Column */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {/* Navigation Tabs */}
          <div className="flex gap-4 border-b border-white/5 pb-0 overflow-x-auto hide-scrollbar">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap relative ${
                  tab === t ? 'text-primary' : 'text-white/40 hover:text-white'
                }`}
              >
                {t}
                {tab === t && (
                  <motion.div
                    layoutId="activeTabGroupDetail"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full"
                  />
                )}
              </button>
            ))}
          </div>

          {/* Expenses Tab */}
          {tab === 'expenses' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-black font-manrope text-white/30 uppercase tracking-[0.2em]">
                  {scopedExpenses.length}{' '}
                  {scopedExpenses.length === 1 ? 'Transaction' : 'Transactions'}
                </span>
                <button
                  onClick={() => setShowOnlyMe(!showOnlyMe)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all ${
                    showOnlyMe
                      ? 'bg-primary border-primary text-black'
                      : 'bg-white/[0.03] border-white/5 text-white/50 hover:bg-white/[0.08]'
                  }`}
                >
                  <User size={11} />
                  <span>{showOnlyMe ? 'Your Expenses' : 'All Expenses'}</span>
                </button>
              </div>

              {expenseLoading && scopedExpenses.length === 0 ? (
                <Loader className="py-12" />
              ) : scopedExpenses.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-white/[0.02] border border-dashed border-white/5">
                  <p className="text-sm text-white/40 font-inter">
                    {showOnlyMe
                      ? 'No expenses involving you in this group.'
                      : 'No expenses recorded yet. Tap "Add Expense" to start!'}
                  </p>
                </div>
              ) : (
                scopedExpenses.map((expense) => (
                  <ExpenseCard
                    key={expense._id}
                    expense={expense}
                    currentUserId={user?._id || user?.uid}
                    onDelete={handleDeleteExpense}
                    onEdit={(exp) => openAddExpense(id, exp)}
                  />
                ))
              )}
            </div>
          )}

          {/* Members Tab */}
          {tab === 'members' && (
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5">
              <MemberList
                members={activeGroup.members}
                adminId={activeGroup.admin}
                balances={balanceList}
                groupId={id}
                onMemberRemoved={() => dispatch(fetchGroup(id))}
                currentUserId={user?._id || user?.uid}
              />
            </div>
          )}

          {/* Activity / Logs Tab */}
          {tab === 'logs' && (
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-6">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/70 font-inter">
                  Audited Activity Log
                </h3>
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

          {/* Insights Tab */}
          {tab === 'insights' && (
            <GroupInsightsTab
              members={activeGroup.members}
              expenses={scopedExpenses}
              settlements={settlements}
              netBalances={netBalances}
            />
          )}
        </div>

        {/* Right Sticky Sidebar (Desktop Only) */}
        <aside className="hidden lg:flex lg:col-span-4 lg:flex-col lg:gap-4 sticky top-6">
          <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] font-manrope">
              Group Positions
            </p>
            <div className="space-y-2.5">
              {balanceList.map((item) => {
                const u = item.user || {};
                const uid = (u._id || u.uid || '').toString();
                const bal = item.balance;
                return (
                  <div
                    key={uid}
                    className="flex items-center justify-between py-1.5 border-b border-white/[0.03] last:border-none"
                  >
                    <span className="text-xs text-white/70 font-inter truncate max-w-[120px]">
                      {u.name || 'Member'}
                    </span>
                    <span
                      className={`text-xs font-bold font-manrope ${
                        bal > 0.01
                          ? 'text-emerald-400'
                          : bal < -0.01
                            ? 'text-amber-400'
                            : 'text-white/30'
                      }`}
                    >
                      {bal > 0.01 ? '+' : ''}
                      {Math.abs(bal) > 0.01 ? formatCurrency(bal) : 'Settled'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* Modals Container */}
      <AddMemberModal
        isOpen={showAddMember}
        onClose={() => setShowAddMember(false)}
        memberEmail={memberEmail}
        setMemberEmail={setMemberEmail}
        friends={friends}
        loadingFriends={loadingFriends}
        selectedFriend={selectedFriend}
        setSelectedFriend={setSelectedFriend}
        onAddMemberByEmail={handleAddMemberByEmail}
        onAddSelectedFriend={handleAddSelectedFriend}
      />

      <EditGroupModal
        isOpen={showEditGroup}
        onClose={() => setShowEditGroup(false)}
        editName={editName}
        setEditName={setEditName}
        editCategory={editCategory}
        setEditCategory={setEditCategory}
        onUpdateGroup={handleUpdateGroup}
        updatingGroup={updatingGroup}
      />

      <ConfirmLeaveGroupModal
        isOpen={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onLeave={handleLeaveGroup}
        leaving={leaving}
        myBalance={myBalance}
      />

      <ConfirmDeleteGroupModal
        isOpen={showDeleteGroupConfirm}
        onClose={() => setShowDeleteGroupConfirm(false)}
        onDelete={handleDeleteGroup}
        deleting={deletingGroup}
        hasPending={hasPending}
      />

      <SettleUpModal
        isOpen={showSettleUp}
        onClose={() => {
          setShowSettleUp(false);
          setSelectedSettleFriendId(null);
        }}
        groupId={id}
        userId={user?.uid || user?._id}
        forcedPayeeId={selectedSettleFriendId}
      />

      <BillScannerModal
        isOpen={showBillScanner}
        onClose={() => setShowBillScanner(false)}
        onFill={(data) => {
          setShowBillScanner(false);
          openAddExpense(id, null, data);
        }}
      />
    </div>
  );
};

export default GroupDetail;
