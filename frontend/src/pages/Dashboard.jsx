import { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Users, ArrowUpRight, ArrowDownLeft, PieChart, ChevronRight, Filter, Wallet, WifiOff } from 'lucide-react';
import { fetchGroups, setGroups } from '../redux/groupSlice.js';
import groupService from '../services/groupService.js';
import expenseService from '../services/expenseService.js';
import Loader from '../components/common/Loader.jsx';
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

  const groupsUpdatedHash = useMemo(() => 
    JSON.stringify(groups.map(g => g.updatedAt || g._id)), 
  [groups]);

  const [isOffline, setIsOffline] = useState(typeof window !== 'undefined' ? !navigator.onLine : false);

  useEffect(() => {
    if (!user?._id && !user?.uid) return;
    const userId = user._id || user.uid;

    const qGroups = query(
      collection(db, 'groups'),
      where('members', 'array-contains', userId)
    );
    
    let isInitialLoad = !groups.length;

    const unsubscribeGroups = onSnapshot(qGroups, async (snapshot) => {
      try {
        // 1. Instant Step: Extract basic doc data (IDs, Titles, etc)
        const basicGroups = snapshot.docs.map(doc => groupService.getBasicGroup(doc));
        const activeBasicGroups = basicGroups.filter(g => g?.status !== 'deleted');
        
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
        console.error("Error expanding group snapshot:", err);
      }
    }, (err) => {
      console.error("Dashboard group snapshot error:", err);
    });

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribeGroups();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [dispatch, user?._id, user?.uid]);

  // 3. Reactive summary - updates whenever any group's metadata is "touched"
  useEffect(() => {
    if (!user?._id && !user?.uid) return;

    const updateSummary = async () => {
      // Only show loader if we don't have a summary yet (Stale-While-Revalidate)
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
  }, [groupsUpdatedHash, user?._id, user?.uid]);

  const recentActivity = notifications.slice(0, 5);
  const topGroups = groups.slice(0, 3);

  if (groupsLoading && groups.length === 0 && loadingSummary && !isOffline) return <Loader />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-32 space-y-8">

      {isOffline && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mt-2"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-on-surface-variant text-[11px] font-bold font-inter tracking-wide">
            <WifiOff size={13} className="opacity-60" />
            Offline — changes will sync when reconnected
          </span>
        </motion.div>
      )}

      {/* Hero Balance Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1 mt-6"
      >
        <p className="font-inter text-on-surface-variant text-[10px] font-bold tracking-[0.2em] uppercase opacity-70">
          Total Liquidity
        </p>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <h1 className="font-manrope font-extrabold text-[3rem] sm:text-[4rem] lg:text-[5rem] leading-[1.1] tracking-[-0.04em] text-white">
            <span className="opacity-40 tracking-normal mr-1">₹</span>
            {Math.abs(summary?.netBalance || 0).toLocaleString()}
            <span className="text-on-surface-variant opacity-30">.00</span>
          </h1>

          <button
            onClick={() => openAddExpense()}
            className="h-14 px-8 rounded-2xl bg-white text-black font-manrope font-bold text-sm tracking-widest flex items-center justify-center gap-3 hover:bg-white/90 transition-all active:scale-95 shadow-xl shadow-white/5 mb-2"
          >
            <Plus size={20} strokeWidth={3} /> RECORD EXPENSE
          </button>
        </div>
      </motion.section>

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-6">
        {/* You Owe Card */}
        <motion.div
          whileHover={{ scale: 0.98 }}
          className="bg-surface-container-low p-4 sm:p-6 rounded-2xl border border-white/5 cursor-pointer relative overflow-hidden group shadow-xl"
        >
          <div className="flex justify-between items-start mb-4 sm:mb-6">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/5 flex items-center justify-center">
              <ArrowUpRight size={12} className="text-on-surface-variant" />
            </div>
            <span className="font-inter text-[8px] sm:text-[10px] font-bold tracking-widest uppercase text-on-surface-variant opacity-60">Debt Status</span>
          </div>
          <h3 className="font-manrope font-bold text-sm sm:text-lg text-white/60 mb-1 leading-tight">You Owe</h3>
          <p className="font-manrope text-xl sm:text-2xl font-black text-white">₹{summary?.totalOwe?.toLocaleString() || '0'}</p>
          <div className="absolute -right-1 -bottom-1 opacity-[0.03] group-hover:opacity-[0.04] transition-opacity">
            <ArrowUpRight size={48} />
          </div>
        </motion.div>

        {/* You Are Owed Card */}
        <motion.div
          whileHover={{ scale: 0.98 }}
          className="bg-surface-container-low p-4 sm:p-6 rounded-2xl border border-white/5 cursor-pointer relative overflow-hidden group shadow-xl"
        >
          <div className="flex justify-between items-start mb-4 sm:mb-6">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/5 flex items-center justify-center">
              <ArrowDownLeft size={12} className="text-on-surface-variant" />
            </div>
            <span className="font-inter text-[8px] sm:text-[10px] font-bold tracking-widest uppercase text-on-surface-variant opacity-60">Pending Returns</span>
          </div>
          <h3 className="font-manrope font-bold text-sm sm:text-lg text-white/60 mb-1 leading-tight">You Are Owed</h3>
          <p className="font-manrope text-xl sm:text-2xl font-black text-white">₹{summary?.totalOwed?.toLocaleString() || '0'}</p>
          <div className="absolute -right-1 -bottom-1 opacity-[0.03] group-hover:opacity-[0.04] transition-opacity">
            <ArrowDownLeft size={48} />
          </div>
        </motion.div>
      </div>

      {/* Asymmetric Layout: Groups and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 sm:gap-16">

        {/* Top Groups Column */}
        <div className="lg:col-span-4 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="font-manrope font-black text-xl text-white tracking-tight">Active Cohorts</h2>
            <div className="flex items-center gap-4">
              <Link to="/groups?add=true" className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-on-surface-variant hover:text-white transition-colors">
                <Plus size={16} />
              </Link>
              <Link to="/groups" className="text-[10px] font-bold tracking-[0.2em] uppercase text-on-surface-variant hover:text-white transition-colors">See All</Link>
            </div>
          </div>

          <div className="space-y-1">
            {topGroups.map((group, idx) => (
              <Link
                to={`/groups/${group._id}`}
                key={group._id}
                className={`flex items-center gap-4 group cursor-pointer py-3.5 transition-all ${idx !== topGroups.length - 1 ? 'border-b border-white/[0.04]' : ''}`}
              >
                <div className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden flex-shrink-0 border border-white/5">
                  <div className="w-full h-full bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center font-manrope font-bold text-white text-base">
                    {(group.name || group.title)?.[0] || '?'}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-manrope font-bold text-white text-base leading-none mb-1 group-hover:translate-x-1 transition-transform">{group.name || group.title}</p>
                  <p className="text-[10px] font-bold font-inter text-on-surface-variant uppercase tracking-widest opacity-50">
                    {group.members?.length || 0} Members
                  </p>
                </div>
                <ChevronRight size={18} className="text-on-surface-variant opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </Link>
            ))}

            {groups.length === 0 && (
              <div className="py-10 text-center glass-card rounded-2xl border border-dashed border-white/10">
                <p className="text-on-surface-variant text-sm font-inter">No active cohorts yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity Column */}
        <div className="lg:col-span-8 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="font-manrope font-black text-xl text-white tracking-tight">Recent Timeline</h2>
            <Filter size={18} className="text-on-surface-variant opacity-50 cursor-pointer hover:text-white transition-colors" />
          </div>

          <div className="glass-card rounded-3xl overflow-hidden border border-white/5">
            <div className="divide-y divide-white/5">
              {recentActivity.map((notif) => (
                <div key={notif._id} className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3.5">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/60 group-hover:text-white transition-colors">
                      <Plus size={16} />
                    </div>
                    <div>
                      <p className="font-manrope font-bold text-white text-sm leading-tight mb-0.5">
                        {typeof notif.message === 'string' ? notif.message : (notif.message?.message || "Notification action performed")}
                      </p>
                      <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest opacity-40">
                        {new Date(notif.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}

              {recentActivity.length === 0 && (
                <div className="p-20 text-center">
                  <p className="text-on-surface-variant text-sm font-inter">Timeline is quiet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
