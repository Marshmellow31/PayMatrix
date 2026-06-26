import { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Filter,
  WifiOff,
  Sparkles,
  Camera,
  Hash,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { setGroups } from '../redux/groupSlice.js';
import { GROUP_CATEGORIES } from '../utils/constants.js';
import groupService from '../services/groupService.js';
import expenseService from '../services/expenseService.js';
import Loader from '../components/common/Loader.jsx';
import BillScannerModal from '../components/bill/BillScannerModal.jsx';
import { db } from '../config/firebase.js';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const Dashboard = () => {
  const dispatch = useDispatch();
  const { openAddExpense } = useOutletContext();
  const { user } = useSelector((state) => state.auth);
  const { groups = [], loading: groupsLoading } = useSelector((state) => state.groups);
  const { notifications = [] } = useSelector((state) => state.notifications);
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(!summary);
  const [showBillScanner, setShowBillScanner] = useState(false);

  const groupsUpdatedHash = useMemo(
    () => JSON.stringify(groups.map((g) => g.updatedAt || g._id)),
    [groups]
  );

  const [isOffline, setIsOffline] = useState(
    typeof window !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    if (!user?._id && !user?.uid) return;
    const userId = user._id || user.uid;

    const qGroups = query(collection(db, 'groups'), where('members', 'array-contains', userId));

    const _isInitialLoad = !groups.length;

    const unsubscribeGroups = onSnapshot(
      qGroups,
      (snapshot) => {
        try {
          // 1. Instant Step: Extract basic doc data (IDs, Titles, etc)
          const basicGroups = snapshot.docs.map((doc) => groupService.getBasicGroup(doc));
          const activeBasicGroups = basicGroups.filter((g) => g?.status !== 'deleted');

          // Dispatch basic data immediately to avoid blocking the UI
          dispatch(setGroups(activeBasicGroups));

          // 2. Background Step: Resolve full profiles (avatars, names)
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
          console.error('Error expanding group snapshot:', err);
        }
      },
      (err) => {
        console.error('Dashboard group snapshot error:', err);
      }
    );

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribeGroups();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, user?._id, user?.uid]);

  // 3. Reactive summary - updates whenever any group's metadata is "touched"
  useEffect(() => {
    if (!user?._id && !user?.uid) return;

    const updateSummary = async () => {
      if (!summary) setLoadingSummary(true);

      try {
        const res = await expenseService.getSummary();
        setSummary(res.data.data);
      } catch (err) {
        console.warn('Silent refresh of summary failed (likely offline):', err);
      } finally {
        setLoadingSummary(false);
      }
    };

    updateSummary();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupsUpdatedHash, user?._id, user?.uid]);

  const recentActivity = notifications.slice(0, 5);

  if (groupsLoading && groups.length === 0 && loadingSummary && !isOffline) return <Loader />;

  return (
    <div className="max-w-md mx-auto px-4 pt-2 pb-32 space-y-6">
      {isOffline && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mt-1"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-on-surface-variant text-[11px] font-bold font-inter tracking-wide">
            <WifiOff size={13} className="opacity-60" />
            Offline — changes will sync when reconnected
          </span>
        </motion.div>
      )}

      {/* Welcoming Header */}
      <div className="flex items-center justify-between mt-3">
        <div>
          <h1 className="text-lg sm:text-xl font-black font-manrope text-white tracking-tight leading-none">
            Hello, {user?.name?.split(' ')[0] || 'User'} 👋
          </h1>
          <p className="text-[10px] text-white/30 font-inter mt-1.5 font-bold uppercase tracking-wider">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>
        <Link
          to="/profile"
          className="w-10 h-10 rounded-full border border-white/10 overflow-hidden hover:scale-105 transition-all select-none"
        >
          <img
            src={
              user?.avatar ||
              user?.photoURL ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.name || 'user'}`
            }
            alt="Profile"
            className="w-full h-full object-cover"
          />
        </Link>
      </div>

      {/* Monolithic Glass Balance Card */}
      <motion.section
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#18181b] via-[#111113] to-[#0a0a0c] border border-white/[0.08] p-6 shadow-2xl flex flex-col justify-between h-44 select-none"
      >
        {/* Decorative glows inside card */}
        <div className="absolute top-[-20%] right-[-10%] w-40 h-40 rounded-full bg-indigo-500/[0.03] blur-[50px] pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-10%] w-40 h-40 rounded-full bg-purple-500/[0.03] blur-[50px] pointer-events-none" />

        <div className="flex justify-between items-start z-10">
          <div>
            <p className="font-inter text-white/40 text-[9px] font-black tracking-[0.25em] uppercase">
              Total Liquidity
            </p>
            <h2 className="font-manrope font-extrabold text-3xl sm:text-4xl mt-2.5 tracking-tight text-white flex items-baseline leading-none">
              <span className="text-indigo-400 font-medium mr-1 text-xl sm:text-2xl">₹</span>
              {Math.abs(summary?.netBalance || 0).toLocaleString()}
              <span className="text-white/30 text-base font-normal">.00</span>
            </h2>
          </div>
          <span className="text-[8px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full font-bold uppercase text-white/50 tracking-wider">
            Active Sync
          </span>
        </div>

        <div className="flex justify-between items-center mt-auto z-10 pt-3 border-t border-white/[0.04]">
          <span className="text-[9px] font-mono text-white/20 uppercase tracking-widest truncate max-w-[65%]">
            {user?.email || 'paymatrix.net'}
          </span>
          <span className="text-[9px] font-bold font-inter text-emerald-400/90 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Online
          </span>
        </div>
      </motion.section>

      {/* Unified Quick Actions Hub */}
      <div className="grid grid-cols-3 gap-3">
        {/* AI Copilot */}
        <Link
          to="/copilot"
          className="flex flex-col items-center justify-center p-3 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 transition-all text-center group shadow-md shadow-indigo-950/10"
        >
          <div className="w-9 h-9 rounded-full bg-indigo-600/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform mb-1.5">
            <Sparkles size={16} className="animate-pulse" />
          </div>
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-indigo-200">
            AI Copilot
          </span>
          <span className="text-[7px] text-indigo-400/60 mt-0.5">Ask anything</span>
        </Link>

        {/* Scan Bill */}
        <button
          onClick={() => setShowBillScanner(true)}
          className="flex flex-col items-center justify-center p-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all text-center group shadow-md shadow-emerald-950/10"
        >
          <div className="w-9 h-9 rounded-full bg-emerald-600/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform mb-1.5">
            <Camera size={16} />
          </div>
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-200">
            Scan Bill
          </span>
          <span className="text-[7px] text-emerald-400/60 mt-0.5">Gemini OCR</span>
        </button>

        {/* Record (Manual) */}
        <button
          onClick={() => openAddExpense()}
          className="flex flex-col items-center justify-center p-3 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all text-center group shadow-sm"
        >
          <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-white/70 group-hover:scale-105 transition-transform mb-1.5">
            <Plus size={16} strokeWidth={2.5} />
          </div>
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-white/80">
            Record
          </span>
          <span className="text-[7px] text-white/40 mt-0.5">Add manually</span>
        </button>
      </div>

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-2 gap-3">
        {/* You Owe Card */}
        <div className="bg-[#141416]/40 p-4 rounded-2xl border border-white/[0.04] relative overflow-hidden shadow-md flex flex-col justify-between h-24 select-none">
          <div className="flex justify-between items-center mb-1">
            <span className="font-inter text-[8px] font-black tracking-widest uppercase text-red-400/60">
              Debt Status
            </span>
            <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
              <ArrowUpRight size={10} />
            </div>
          </div>
          <div>
            <h3 className="font-manrope font-semibold text-[10px] text-white/35 uppercase tracking-wide leading-none mb-1">
              You Owe
            </h3>
            <p className="font-manrope text-base sm:text-lg font-extrabold text-red-400/90">
              ₹{summary?.totalOwe?.toLocaleString('en-IN') || '0'}
            </p>
          </div>
        </div>

        {/* You Are Owed Card */}
        <div className="bg-[#141416]/40 p-4 rounded-2xl border border-white/[0.04] relative overflow-hidden shadow-md flex flex-col justify-between h-24 select-none">
          <div className="flex justify-between items-center mb-1">
            <span className="font-inter text-[8px] font-black tracking-widest uppercase text-emerald-400/60">
              Pending Returns
            </span>
            <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <ArrowDownLeft size={10} />
            </div>
          </div>
          <div>
            <h3 className="font-manrope font-semibold text-[10px] text-white/35 uppercase tracking-wide leading-none mb-1">
              You Are Owed
            </h3>
            <p className="font-manrope text-base sm:text-lg font-extrabold text-emerald-400/90">
              ₹{summary?.totalOwed?.toLocaleString('en-IN') || '0'}
            </p>
          </div>
        </div>
      </div>

      {/* Active Cohorts (Horizontal scroll) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-manrope font-black text-xs uppercase tracking-wider text-white">
              Active Cohorts
            </h2>
            <p className="text-[9px] text-white/30 font-inter">{groups.length} active groups</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/groups?add=true"
              className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/70 hover:text-white transition-all active:scale-95"
            >
              <Plus size={12} />
            </Link>
            <Link
              to="/groups"
              className="text-[10px] font-bold tracking-wider text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              See All
            </Link>
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto no-scrollbar py-1 px-1 w-full max-w-full">
          {groups.map((group) => (
            <Link
              to={`/groups/${group._id}`}
              key={group._id}
              className="flex flex-col items-center shrink-0 w-16 group"
            >
              {/* Rounded-square icon matching GroupDetail header style */}
              {(() => {
                const cat = GROUP_CATEGORIES.find((c) => c.value === group.category);
                const IconComp = cat?.icon ? LucideIcons[cat.icon] || Hash : Hash;
                const iconColor = cat?.color || '#919191';
                return (
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10 shadow-inner group-hover:scale-105 transition-all"
                  >
                    <IconComp size={20} style={{ color: iconColor }} />
                  </div>
                );
              })()}
              <span className="text-[9px] text-white/70 mt-2 truncate w-full text-center font-semibold font-inter group-hover:text-white transition-colors">
                {group.name || group.title}
              </span>
            </Link>
          ))}

          {groups.length === 0 && (
            <div className="w-full py-6 text-center rounded-2xl border border-dashed border-white/10 bg-white/[0.01]">
              <p className="text-white/30 text-xs font-inter">No active cohorts yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Timeline */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-manrope font-black text-xs uppercase tracking-wider text-white">
              Recent Timeline
            </h2>
            <p className="text-[9px] text-white/30 font-inter">Recent activities & logs</p>
          </div>
          <Filter
            size={14}
            className="text-white/40 hover:text-white cursor-pointer transition-colors"
          />
        </div>

        <div className="glass-card rounded-2xl overflow-hidden border border-white/[0.05]">
          <div className="divide-y divide-white/[0.04]">
            {recentActivity.map((notif) => (
              <div
                key={notif._id}
                className="p-3.5 flex items-center justify-between hover:bg-white/[0.02] transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-white/50 group-hover:text-white transition-colors shrink-0">
                    <Plus size={12} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-manrope font-bold text-white text-xs leading-snug truncate">
                      {typeof notif.message === 'string'
                        ? notif.message
                        : notif.message?.message || 'Notification action performed'}
                    </p>
                    <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest font-mono mt-0.5">
                      {new Date(notif.createdAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <ChevronRight
                  size={14}
                  className="text-white/30 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0"
                />
              </div>
            ))}

            {recentActivity.length === 0 && (
              <div className="py-10 text-center">
                <p className="text-white/30 text-xs font-inter">Timeline is quiet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bill Scanner Modal */}
      <BillScannerModal
        isOpen={showBillScanner}
        onClose={() => setShowBillScanner(false)}
        onFill={(data) => {
          setShowBillScanner(false);
          openAddExpense('', null, data);
        }}
      />
    </div>
  );
};

export default Dashboard;
