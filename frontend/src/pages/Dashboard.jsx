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
  Nfc,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { setGroups } from '../redux/groupSlice.js';
import { GROUP_CATEGORIES } from '../utils/constants.js';
import groupService from '../services/groupService.js';
import expenseService from '../services/expenseService.js';
import Loader from '../components/common/Loader.jsx';
import BillScannerModal from '../components/bill/BillScannerModal.jsx';
import SettlementsPanel from '../components/dashboard/SettlementsPanel.jsx';
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
    <div className="w-full max-w-md lg:max-w-6xl mx-auto px-4 lg:px-8 pt-2 pb-32 space-y-6">
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

      {/* Desktop-optimised responsive grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 lg:items-start">
        {/* Amex Corporate Platinum Style Balance Card */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-8 relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-200 via-gray-100 to-slate-300 p-1 shadow-2xl flex flex-col justify-between h-52 lg:h-auto lg:min-h-[14rem] select-none"
        >
          {/* Inner Border (Intricate Frame Simulation) */}
          <div className="absolute inset-2 border-[1.5px] border-black/40 rounded-lg pointer-events-none" />
          <div className="absolute inset-[10px] border border-black/10 rounded-md pointer-events-none" />

          {/* Subtle noise texture */}
          <div className="absolute inset-0 opacity-[0.03] mix-blend-multiply pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiLz48cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSIjMDAwIi8+PC9zdmc+')]"></div>

          {/* Centered Top Text */}
          <div className="absolute top-4 left-0 right-0 flex flex-col items-center justify-center z-10 pointer-events-none">
            <h1
              className="font-sans font-black text-black/90 text-lg lg:text-[22px] tracking-tight leading-none scale-x-[1.15] origin-center"
              style={{ textShadow: '0px 1px 0px rgba(255,255,255,0.6)' }}
            >
              PAYMATRIX EXPRESS
            </h1>
            <h2
              className="font-serif font-bold text-black/80 text-[10px] lg:text-[11px] tracking-[0.55em] mt-1 pl-[0.55em]"
              style={{ textShadow: '0px 1px 0px rgba(255,255,255,0.6)' }}
            >
              CORPORATE
            </h2>
          </div>

          {/* Left: Chip, Right: Contactless & Top spacing */}
          <div className="flex justify-between items-start z-10 w-full mt-10 px-5">
            <div className="w-10 h-7 rounded bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center shadow-sm relative overflow-hidden border border-gray-500/50">
              {/* Fake chip lines */}
              <div className="absolute inset-0 opacity-40 border border-gray-600/50 rounded-sm m-1" />
              <div className="absolute w-full h-[1px] bg-gray-600/50 top-1/2 -translate-y-1/2" />
              <div className="absolute w-[1px] h-full bg-gray-600/50 left-1/3" />
              <div className="absolute w-[1px] h-full bg-gray-600/50 right-1/3" />
            </div>

            <div className="flex items-center gap-1.5 mt-1">
              <Nfc size={20} className="text-black/60 rotate-90" strokeWidth={1.5} />
              <span className="text-black/80 font-mono text-[10px] font-bold tracking-wider">
                {user?.friendCode ? user.friendCode.slice(4, 8) : '7997'}
              </span>
            </div>
          </div>

          {/* Center Graphic */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 opacity-90 mt-4 lg:mt-3">
            <div className="w-20 h-24 lg:w-24 lg:h-28 border-[1.5px] border-black/40 rounded-[50%] overflow-hidden flex items-center justify-center bg-[#eaeaea] p-1 shadow-inner">
              <img
                src="/centurion.png"
                alt="Centurion Logo"
                className="w-full h-full object-contain mix-blend-multiply opacity-80"
              />
            </div>
          </div>

          {/* Bottom Row: Friend Code, Balance & Member Since */}
          <div className="flex justify-between items-end z-10 px-5 pb-3 pt-6 w-full mt-auto">
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm font-mono text-black/80 uppercase tracking-[0.2em] font-bold mb-3 drop-shadow-sm flex gap-3">
                {user?.friendCode ? (
                  <>
                    <span>{user.friendCode.slice(0, 4)}</span>
                    <span>{user.friendCode.slice(4, 8)}</span>
                  </>
                ) : (
                  <span>GENERATING...</span>
                )}
              </span>
              <span className="text-[10px] sm:text-xs font-inter text-black/80 uppercase tracking-widest font-bold truncate max-w-[150px]">
                {user?.name || user?.email?.split('@')[0] || 'USER'}
              </span>
            </div>

            <div className="flex flex-col items-center justify-end text-center mb-1">
              <div className="border border-black/40 px-2 rounded-[2px] mb-0.5 relative">
                <div className="absolute -left-[2px] -right-[2px] top-1/2 h-[1px] bg-black/40" />
                <p className="text-[6px] lg:text-[7px] text-black/80 uppercase tracking-[0.1em] font-serif font-bold relative z-10 bg-[#e3e5e8] px-1 leading-none py-[1px]">
                  MEMBER SINCE
                </p>
              </div>
              <span className="text-sm font-sans text-black/80 font-medium tracking-widest">
                {(() => {
                  const d = user?.createdAt ? new Date(user.createdAt) : new Date();
                  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`;
                })()}
              </span>
            </div>
          </div>

          {/* Balance Overlay */}
          <div className="absolute bottom-[35%] left-6 z-10">
            <p className="font-inter text-black/50 text-[7px] font-bold tracking-[0.15em] uppercase mb-0.5">
              Total Liquidity
            </p>
            <h2 className="font-manrope font-extrabold text-xl sm:text-2xl mt-0 tracking-tight text-black/80 flex items-baseline leading-none shadow-sm drop-shadow-sm">
              <span className="text-black/60 font-medium mr-0.5 text-sm sm:text-base">₹</span>
              {Math.abs(summary?.netBalance || 0).toLocaleString()}
              <span className="text-black/50 text-xs font-normal">.00</span>
            </h2>
          </div>

          {/* Status Corner */}
          <div className="absolute bottom-2 right-4 z-10 flex items-center justify-end">
            <span className="text-[7px] font-sans font-bold uppercase tracking-wider text-black/50 border border-black/20 rounded-full px-1.5 flex items-center gap-1 bg-white/10 backdrop-blur-sm">
              <span className="w-1 h-1 rounded-full bg-emerald-600 animate-pulse" />
              Online
            </span>
          </div>
        </motion.section>

        {/* Bento Grid Stats (sits beside balance on desktop, stacked) */}
        <div className="lg:col-span-4 grid grid-cols-2 gap-4 lg:flex lg:flex-col lg:h-full lg:min-h-[14rem]">
          {/* You Owe Card */}
          <div className="group bg-gradient-to-br from-[#1c1414] to-[#141416]/40 hover:from-[#241616] p-4 lg:p-5 rounded-[20px] border border-red-500/10 hover:border-red-500/30 transition-all duration-300 relative overflow-hidden shadow-md flex flex-col justify-between h-28 lg:h-auto lg:flex-1 cursor-default select-none">
            {/* Subtle red glow in corner */}
            <div className="absolute top-[-20px] right-[-20px] w-20 h-20 bg-red-500/10 rounded-full blur-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div className="flex justify-between items-center mb-1 relative z-10">
              <span className="font-inter text-[9px] font-black tracking-widest uppercase text-red-400/70 group-hover:text-red-400 transition-colors">
                Debt Status
              </span>
              <div className="w-6 h-6 rounded-full bg-red-500/10 group-hover:bg-red-500/20 transition-colors flex items-center justify-center text-red-400 group-hover:scale-110 duration-300">
                <ArrowUpRight size={12} strokeWidth={2.5} />
              </div>
            </div>
            <div className="relative z-10 mt-2">
              <h3 className="font-manrope font-semibold text-[10px] text-white/40 uppercase tracking-wide leading-none mb-1 group-hover:text-white/60 transition-colors">
                You Owe
              </h3>
              <p className="font-manrope text-lg sm:text-xl lg:text-3xl font-extrabold text-red-400/90 group-hover:text-red-400 transition-colors tracking-tight">
                <span className="text-red-400/50 mr-0.5 text-sm sm:text-base lg:text-xl font-medium">
                  ₹
                </span>
                {summary?.totalOwe?.toLocaleString('en-IN') || '0'}
              </p>
            </div>
          </div>

          {/* You Are Owed Card */}
          <div className="group bg-gradient-to-br from-[#131a16] to-[#141416]/40 hover:from-[#16241c] p-4 lg:p-5 rounded-[20px] border border-emerald-500/10 hover:border-emerald-500/30 transition-all duration-300 relative overflow-hidden shadow-md flex flex-col justify-between h-28 lg:h-auto lg:flex-1 cursor-default select-none">
            {/* Subtle emerald glow in corner */}
            <div className="absolute top-[-20px] right-[-20px] w-20 h-20 bg-emerald-500/10 rounded-full blur-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div className="flex justify-between items-center mb-1 relative z-10">
              <span className="font-inter text-[9px] font-black tracking-widest uppercase text-emerald-400/70 group-hover:text-emerald-400 transition-colors">
                Pending Returns
              </span>
              <div className="w-6 h-6 rounded-full bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors flex items-center justify-center text-emerald-400 group-hover:scale-110 duration-300">
                <ArrowDownLeft size={12} strokeWidth={2.5} />
              </div>
            </div>
            <div className="relative z-10 mt-2">
              <h3 className="font-manrope font-semibold text-[10px] text-white/40 uppercase tracking-wide leading-none mb-1 group-hover:text-white/60 transition-colors">
                You Are Owed
              </h3>
              <p className="font-manrope text-lg sm:text-xl lg:text-3xl font-extrabold text-emerald-400/90 group-hover:text-emerald-400 transition-colors tracking-tight">
                <span className="text-emerald-400/50 mr-0.5 text-sm sm:text-base lg:text-xl font-medium">
                  ₹
                </span>
                {summary?.totalOwed?.toLocaleString('en-IN') || '0'}
              </p>
            </div>
          </div>
        </div>

        {/* Unified Quick Actions Hub (full-width action bar) */}
        <div className="lg:col-span-12 grid grid-cols-3 gap-3 lg:gap-5">
          {/* AI Copilot */}
          <Link
            to="/copilot"
            className="group relative flex flex-col items-center justify-center p-4 lg:p-6 rounded-[20px] bg-gradient-to-b from-[#1c1b2e]/40 to-[#141416]/40 hover:from-[#23213a]/60 border border-indigo-500/20 hover:border-indigo-400/40 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all duration-300 text-center overflow-hidden"
          >
            <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/5 transition-colors duration-300" />
            <div className="relative w-10 h-10 lg:w-14 lg:h-14 rounded-full bg-indigo-500/10 group-hover:bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:text-indigo-300 group-hover:scale-110 transition-all duration-300 mb-2 lg:mb-3 shadow-inner">
              <Sparkles size={18} className="animate-pulse lg:hidden" />
              <Sparkles size={24} className="animate-pulse hidden lg:block" />
            </div>
            <span className="relative text-[10px] lg:text-xs font-black uppercase tracking-[0.15em] text-indigo-200 group-hover:text-white transition-colors">
              AI Copilot
            </span>
            <span className="relative text-[8px] lg:text-[10px] font-semibold text-indigo-400/50 group-hover:text-indigo-300/80 mt-1 transition-colors">
              Ask anything
            </span>
          </Link>

          {/* Scan Bill */}
          <button
            onClick={() => setShowBillScanner(true)}
            className="group relative flex flex-col items-center justify-center p-4 lg:p-6 rounded-[20px] bg-gradient-to-b from-[#16241c]/40 to-[#141416]/40 hover:from-[#1b2f23]/60 border border-emerald-500/20 hover:border-emerald-400/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all duration-300 text-center overflow-hidden"
          >
            <div className="absolute inset-0 bg-emerald-500/0 group-hover:bg-emerald-500/5 transition-colors duration-300" />
            <div className="relative w-10 h-10 lg:w-14 lg:h-14 rounded-full bg-emerald-500/10 group-hover:bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:text-emerald-300 group-hover:scale-110 transition-all duration-300 mb-2 lg:mb-3 shadow-inner">
              <Camera size={18} className="lg:hidden" />
              <Camera size={24} className="hidden lg:block" />
            </div>
            <span className="relative text-[10px] lg:text-xs font-black uppercase tracking-[0.15em] text-emerald-200 group-hover:text-white transition-colors">
              Scan Bill
            </span>
            <span className="relative text-[8px] lg:text-[10px] font-semibold text-emerald-400/50 group-hover:text-emerald-300/80 mt-1 transition-colors">
              Gemini OCR
            </span>
          </button>

          {/* Record (Manual) */}
          <button
            onClick={() => openAddExpense()}
            className="group relative flex flex-col items-center justify-center p-4 lg:p-6 rounded-[20px] bg-gradient-to-b from-[#242426]/40 to-[#141416]/40 hover:from-[#2d2d30]/60 border border-white/10 hover:border-white/30 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all duration-300 text-center overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-300" />
            <div className="relative w-10 h-10 lg:w-14 lg:h-14 rounded-full bg-white/5 group-hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 group-hover:text-white group-hover:scale-110 transition-all duration-300 mb-2 lg:mb-3 shadow-inner">
              <Plus size={18} strokeWidth={2.5} className="lg:hidden" />
              <Plus size={24} strokeWidth={2.5} className="hidden lg:block" />
            </div>
            <span className="relative text-[10px] lg:text-xs font-black uppercase tracking-[0.15em] text-white/70 group-hover:text-white transition-colors">
              Record
            </span>
            <span className="relative text-[8px] lg:text-[10px] font-semibold text-white/40 group-hover:text-white/60 mt-1 transition-colors">
              Add manually
            </span>
          </button>
        </div>

        {/* Settlements (merged from the old dedicated /settlements page) */}
        <SettlementsPanel groups={groups} groupBalances={summary?.groupBalances || {}} />

        {/* Active Cohorts (wraps to fill width on desktop) */}
        <div className="lg:col-span-5 space-y-3">
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

          <div className="flex gap-4 overflow-x-auto no-scrollbar lg:flex-wrap lg:overflow-visible lg:gap-5 py-1 px-1 w-full max-w-full">
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
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10 shadow-inner group-hover:scale-105 transition-all">
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
        <div className="lg:col-span-7 space-y-3">
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
