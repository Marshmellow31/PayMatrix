import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Loader2, Hash } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { fetchGroups, createGroup, setGroups } from '../redux/groupSlice.js';
import GroupCard from '../components/group/GroupCard.jsx';
import Modal from '../components/common/Modal.jsx';
import Input from '../components/common/Input.jsx';
import Button from '../components/common/Button.jsx';
import Loader from '../components/common/Loader.jsx';
import { GROUP_CATEGORIES } from '../utils/constants.js';
import toast from 'react-hot-toast';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
import friendService from '../services/friendService.js';
import groupService from '../services/groupService.js';
import expenseService from '../services/expenseService.js';
import { db } from '../config/firebase.js';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { getInitials } from '../utils/nameUtils.js';

const Groups = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { openAddExpense } = useOutletContext();
  const { groups, loading } = useSelector((state) => state.groups);
  const { user } = useSelector((state) => state.auth);
  const isOnline = useOnlineStatus();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'Other', members: [] });
  const [friends, setFriends] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const groupsUpdatedHash = useMemo(() =>
    JSON.stringify(groups.map(g => g.updatedAt || g._id)),
    [groups]);

  useEffect(() => {
    if (!user?._id && !user?.uid) return;
    const userId = user._id || user.uid;

    fetchFriends();

    // Real-time listener for groups
    const q = query(
      collection(db, 'groups'),
      where('members', 'array-contains', userId)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        // Step 1: Instant load of basic group data (names, IDs)
        const basicGroups = snapshot.docs.map(doc => groupService.getBasicGroup(doc));
        const activeBasicGroups = basicGroups.filter(g => g?.status !== 'deleted');
        dispatch(setGroups(activeBasicGroups));

        // Step 2: Background resolution of member profiles (names, avatars)
        const expandedGroupsPromise = Promise.all(
          snapshot.docs.map(async (doc) => {
            const basic = groupService.getBasicGroup(doc);
            if (basic.status === 'deleted') return null;
            const profiles = await groupService.resolveMemberProfiles(basic._id, basic.members);
            return { ...basic, members: profiles, isBasic: false };
          })
        );

        expandedGroupsPromise.then((expanded) => {
          const finalGroups = expanded.filter(Boolean);
          dispatch(setGroups(finalGroups));
        });
      } catch (err) {
        console.error("Error expanding group snapshot in Groups page:", err);
      }
    });

    // Check if we should open the modal (from nav links)
    const params = new URLSearchParams(location.search);
    if (params.get('add') === 'true') {
      setShowModal(true);
    }

    return () => unsubscribe();
  }, [dispatch, location.search, user?._id, user?.uid]);

  // Reactive summary for real-time balances on individual cards
  useEffect(() => {
    if (!user?._id && !user?.uid) return;

    const updateSummary = async () => {
      try {
        const res = await expenseService.getSummary();
        setSummary(res.data.data);
      } catch (err) {
        console.error('Failed to fetch summary in groups list:', err);
      } finally {
        setLoadingSummary(false);
      }
    };

    updateSummary();
  }, [groupsUpdatedHash, user?._id, user?.uid]);

  const fetchFriends = async () => {
    try {
      const res = await friendService.getFriends();
      setFriends(res.data.data.friends);
    } catch (error) {
      console.error('Failed to load friends');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Identity sync in progress... please wait a moment.');
      return;
    }
    // Prepare data: self is added automatically by backend, but we send selected friends
    const result = await dispatch(createGroup(form));
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Cohort Established!');
      setShowModal(false);
      setForm({ title: '', category: 'Other', members: [] });
    } else {
      toast.error(result.payload || 'Failed to create group');
    }
  };

  const toggleFriend = (friendId) => {
    setForm(prev => {
      const isSelected = prev.members.includes(friendId);
      return {
        ...prev,
        members: isSelected
          ? prev.members.filter(id => id !== friendId)
          : [...prev.members, friendId]
      };
    });
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in pb-32 px-6">
      <div className="mb-10 pt-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-headline text-3xl font-bold text-white tracking-tight">
            Groups
          </h1>
          <button
            onClick={() => isOnline && setShowModal(true)}
            disabled={!isOnline}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${!isOnline ? 'bg-white/5 border-white/5 text-white/20 cursor-not-allowed opacity-50 grayscale' : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20'}`}
          >
            <LucideIcons.Plus size={16} />
            <span className="text-[10px] uppercase tracking-widest font-bold">{isOnline ? 'New Cohort' : 'Offline'}</span>
          </button>
        </div>
        <p className="text-on-surface-variant text-sm tracking-wide font-inter opacity-70">
          Manage shared expenses and collective balances
        </p>
      </div>

      {loading && groups.length === 0 ? (
        <Loader className="py-20" />
      ) : groups.length === 0 ? (
        <div className="submerged text-center py-20 px-8 border-none rounded-3xl">
          <div className="w-16 h-16 bg-surface-container-high rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Plus size={32} className="text-on-surface-variant opacity-50" />
          </div>
          <h3 className="text-2xl font-bold font-manrope text-white mb-3 tracking-tight">Your Network is Empty</h3>
          <p className="text-base text-on-surface-variant mb-10 max-w-xs mx-auto font-inter leading-relaxed opacity-70">
            Create your first group to establish a shared expense ledger and start managing finances with clarity.
          </p>
          <Button
            onClick={() => isOnline && setShowModal(true)}
            disabled={!isOnline}
            className={`h-12 px-8 rounded-xl font-bold ${!isOnline ? 'bg-white/5 text-white/20 cursor-not-allowed opacity-50' : 'bg-primary text-on-primary'}`}
          >
            {isOnline ? 'Establish Group' : 'Network Required'}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <GroupCard
              key={group._id}
              group={group}
              balance={summary?.groupBalances?.[group._id] || 0}
            />
          ))}
        </div>
      )}

      {/* Floating Action Button - Now for Add Expense */}
      <div className="fixed bottom-28 right-6 z-40 lg:right-[calc(50%-22rem)]">
        <button
          onClick={() => openAddExpense()}
          className="h-14 w-14 rounded-full bg-primary text-on-primary shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform duration-200"
        >
          <LucideIcons.Plus size={24} />
        </button>
      </div>


      {/* Create Group Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Establish Group">
        <form onSubmit={handleCreate} className="flex flex-col gap-8">
          <div className="text-center py-4">
            <input
              className="bg-transparent border-none text-center font-headline text-3xl font-bold text-white focus:ring-0 placeholder:text-neutral-700 w-full tracking-tighter sm:text-4xl"
              placeholder="Cohort Name"
              value={form.title || form.name || ''}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div className="space-y-4">
            <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-white/30 font-label">Select Category</label>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {GROUP_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setForm({ ...form, category: cat.value })}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-xl border transition-all text-[11px] font-bold flex items-center gap-2 ${form.category === cat.value
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

          <div className="space-y-4">
            <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-white/30 font-label">Add from Friends</label>
            <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto no-scrollbar pr-1">
              {friends.length === 0 ? (
                <p className="col-span-2 text-[10px] text-white/10 font-bold uppercase tracking-widest py-4 bg-white/[0.01] rounded-xl text-center border border-dashed border-white/5">
                  No friends identified
                </p>
              ) : (
                friends.map((friend) => (
                  <button
                    key={friend._id}
                    type="button"
                    onClick={() => toggleFriend(friend._id)}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${form.members.includes(friend._id)
                      ? 'bg-white text-black border-white shadow-xl'
                      : 'bg-white/[0.02] border-white/5 text-white/40 hover:bg-white/[0.05]'
                      }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${form.members.includes(friend._id) ? 'bg-black text-white' : 'bg-white/5'
                      }`}>
                      {getInitials(friend.name)}
                    </div>
                    <span className="text-[11px] font-bold truncate">{friend.name}</span>
                  </button>
                )
                ))}
            </div>
          </div>
          <Button
            disabled={!user || loading || !isOnline}
            type="submit"
            className={`w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl ${(!user || loading || !isOnline) ? 'bg-white/10 text-white/20 cursor-not-allowed grayscale' : 'bg-white text-black hover:bg-neutral-200 active:scale-[0.98]'
              }`}
          >
            {loading ? <LucideIcons.Loader2 className="animate-spin" /> : (isOnline ? 'Launch Cohort' : 'Connect to Launch')}
          </Button>
        </form>
      </Modal>
    </div>
  );
};

export default Groups;
