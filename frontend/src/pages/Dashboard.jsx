import { getLucideIcon } from '../utils/iconMap.js';
import { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useOutletContext } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Activity, Camera, ChevronRight, Hash, Plus, ReceiptText, WifiOff } from 'lucide-react';

import { setGroups } from '../redux/groupSlice.js';
import { GROUP_CATEGORIES } from '../utils/constants.js';
import groupService from '../services/groupService.js';
import expenseService from '../services/expenseService.js';
import Loader from '../components/common/Loader.jsx';
import BillScannerModal from '../components/bill/BillScannerModal.jsx';
import SettlementsPanel from '../components/dashboard/SettlementsPanel.jsx';
import { db } from '../config/firebase.js';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const spring = { type: 'spring', stiffness: 340, damping: 32, mass: 0.8 };

const formatAmount = (value) =>
  Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatMemberSince = (value) => {
  const date = value ? new Date(value) : new Date();
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
};

const formatUserId = (value) => {
  const normalized = String(value || '')
    .replace(/\s+/g, '')
    .toUpperCase();

  return normalized ? normalized.match(/.{1,4}/g)?.join(' ') : 'GENERATING…';
};

const Dashboard = () => {
  const dispatch = useDispatch();
  const reduceMotion = useReducedMotion();
  const { openAddExpense } = useOutletContext();
  const { user } = useSelector((state) => state.auth);
  const { groups = [], loading: groupsLoading } = useSelector((state) => state.groups);
  const { notifications = [] } = useSelector((state) => state.notifications);
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(!summary);
  const [showBillScanner, setShowBillScanner] = useState(false);
  const [isOffline, setIsOffline] = useState(
    typeof window !== 'undefined' ? !navigator.onLine : false
  );

  const groupsUpdatedHash = useMemo(
    () => JSON.stringify(groups.map((group) => group.updatedAt || group._id)),
    [groups]
  );

  useEffect(() => {
    if (!user?._id && !user?.uid) return undefined;
    const userId = user._id || user.uid;
    const groupsQuery = query(collection(db, 'groups'), where('members', 'array-contains', userId));

    const unsubscribeGroups = onSnapshot(
      groupsQuery,
      (snapshot) => {
        try {
          const basicGroups = snapshot.docs.map((snapshotDoc) =>
            groupService.getBasicGroup(snapshotDoc)
          );
          dispatch(setGroups(basicGroups.filter((group) => group?.status !== 'deleted')));

          Promise.all(
            snapshot.docs.map(async (snapshotDoc) => {
              const basic = groupService.getBasicGroup(snapshotDoc);
              if (basic.status === 'deleted') return null;
              const profiles = await groupService.resolveMemberProfiles(basic._id, basic.members);
              return { ...basic, members: profiles, isBasic: false };
            })
          ).then((expanded) => dispatch(setGroups(expanded.filter(Boolean))));
        } catch (error) {
          console.error('Error expanding group snapshot:', error);
        }
      },
      (error) => console.error('Dashboard group snapshot error:', error)
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
  }, [dispatch, user?._id, user?.uid]);

  useEffect(() => {
    if (!user?._id && !user?.uid) return;

    const updateSummary = async () => {
      if (!summary) setLoadingSummary(true);
      try {
        const response = await expenseService.getSummary();
        setSummary(response.data.data);
      } catch (error) {
        console.warn('Silent refresh of summary failed (likely offline):', error);
      } finally {
        setLoadingSummary(false);
      }
    };

    updateSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupsUpdatedHash, user?._id, user?.uid]);

  const recentActivity = notifications.slice(0, 5);
  const entrance = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.16 } }
    : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: spring };

  if (groupsLoading && groups.length === 0 && loadingSummary && !isOffline) return <Loader />;

  return (
    <div className="mx-auto w-full max-w-md pb-32 pt-2 lg:max-w-6xl">
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
            transition={spring}
            className="mb-4 flex justify-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#171717] px-3 py-1.5 text-xs font-medium text-white/[0.55]">
              <WifiOff size={13} />
              Offline · changes will sync later
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
        <motion.section
          {...entrance}
          className="relative min-h-[12.5rem] overflow-hidden rounded-[1.35rem] border border-white/60 bg-[linear-gradient(145deg,#f5f5f3_0%,#e6e7e4_48%,#cfd1cf_100%)] p-6 text-[#121212] shadow-[0_28px_75px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.9)] lg:col-span-8 lg:p-8"
        >
          <div className="relative z-10 flex h-full min-h-[9.5rem] flex-col justify-between">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-black/[0.36]">
                  User ID
                </p>
                <p className="mt-1 truncate font-mono text-sm font-semibold tracking-[0.14em] text-black/[0.78] sm:text-base">
                  {formatUserId(user?.friendCode)}
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-black/[0.08] bg-white/25 px-2.5 py-1 text-[11px] font-medium text-black/[0.48]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                Online
              </span>
            </div>

            <div className="py-6">
              <p className="text-xs font-medium text-black/[0.42]">Net balance</p>
              <p className="mt-1 font-manrope text-[2.2rem] font-semibold leading-none tracking-[-0.055em] text-black/[0.88] tabular-nums sm:text-[2.65rem]">
                <span className="mr-1 text-[0.62em] font-medium text-black/[0.42]">₹</span>
                {formatAmount(Math.abs(summary?.netBalance || 0))}
              </p>
            </div>

            <div className="grid grid-cols-2 items-end gap-4 border-t border-black/[0.09] pt-4 text-xs">
              <div className="min-w-0">
                <p className="text-black/[0.36]">Account</p>
                <p className="mt-1 truncate font-medium text-black/[0.72]">
                  {user?.name || user?.email?.split('@')[0] || 'Member'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-black/[0.36]">Member since</p>
                <p className="mt-1 font-medium text-black/[0.72]">
                  {formatMemberSince(user?.createdAt)}
                </p>
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full bg-white/[0.45] blur-3xl" />
          <div className="pointer-events-none absolute inset-x-5 top-1 h-px bg-white/70" />
        </motion.section>

        <motion.section
          {...entrance}
          transition={{ ...spring, delay: reduceMotion ? 0 : 0.04 }}
          className="rounded-2xl border border-white/[0.08] bg-[#1A1A1A] p-5 shadow-[0_16px_38px_rgba(0,0,0,0.12)] lg:col-span-4 lg:p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-manrope text-base font-semibold tracking-[-0.02em] text-white">
                Balances
              </h2>
              <p className="mt-1 text-xs text-white/[0.35]">Across all groups</p>
            </div>
            <Activity size={18} className="text-white/30" />
          </div>

          <div className="mt-6 grid grid-cols-2 divide-x divide-white/[0.08] lg:grid-cols-1 lg:divide-x-0 lg:divide-y">
            <div className="pb-1 pr-5 lg:pb-5 lg:pr-0">
              <p className="text-xs text-white/40">You owe</p>
              <p className="mt-2 font-manrope text-2xl font-semibold tracking-[-0.03em] text-red-300/90 tabular-nums">
                ₹{formatAmount(summary?.totalOwe)}
              </p>
            </div>
            <div className="pb-1 pl-5 lg:pb-0 lg:pl-0 lg:pt-5">
              <p className="text-xs text-white/40">You are owed</p>
              <p className="mt-2 font-manrope text-2xl font-semibold tracking-[-0.03em] text-emerald-300/90 tabular-nums">
                ₹{formatAmount(summary?.totalOwed)}
              </p>
            </div>
          </div>
        </motion.section>

        <motion.div
          {...entrance}
          transition={{ ...spring, delay: reduceMotion ? 0 : 0.08 }}
          className="grid grid-cols-2 gap-3 lg:col-span-12 lg:gap-4"
        >
          <motion.button
            type="button"
            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            transition={spring}
            onClick={() => setShowBillScanner(true)}
            className="flex min-h-24 items-center gap-3 rounded-2xl bg-white px-4 text-left text-black shadow-[0_12px_35px_rgba(255,255,255,0.06)] sm:px-5"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/[0.06]">
              <Camera size={19} strokeWidth={2} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold tracking-[-0.01em]">Scan bill</span>
              <span className="mt-0.5 block truncate text-xs text-black/[0.45]">
                Use a receipt photo
              </span>
            </span>
          </motion.button>

          <motion.button
            type="button"
            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            transition={spring}
            onClick={() => openAddExpense()}
            className="flex min-h-24 items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#1A1A1A] px-4 text-left text-white shadow-[0_12px_30px_rgba(0,0,0,0.08)] sm:px-5"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
              <ReceiptText size={19} strokeWidth={1.8} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold tracking-[-0.01em]">Record</span>
              <span className="mt-0.5 block truncate text-xs text-white/[0.35]">
                Enter manually
              </span>
            </span>
          </motion.button>
        </motion.div>

        <SettlementsPanel groups={groups} groupBalances={summary?.groupBalances || {}} />

        <motion.section
          {...entrance}
          transition={{ ...spring, delay: reduceMotion ? 0 : 0.12 }}
          className="space-y-4 lg:col-span-5"
        >
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-manrope text-base font-semibold tracking-[-0.02em] text-white">
                Groups
              </h2>
              <p className="mt-1 text-xs text-white/[0.35]">{groups.length} active</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/groups?add=true"
                aria-label="Create group"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-white/[0.65] hover:text-white"
              >
                <Plus size={15} />
              </Link>
              <Link
                to="/groups"
                className="px-1 text-xs font-medium text-white/[0.55] hover:text-white"
              >
                See all
              </Link>
            </div>
          </div>

          <div className="flex max-w-full gap-4 overflow-x-auto py-1 no-scrollbar lg:flex-wrap lg:overflow-visible">
            {groups.map((group, index) => {
              const category = GROUP_CATEGORIES.find((item) => item.value === group.category);
              const Icon = category?.icon ? getLucideIcon(category.icon) || Hash : Hash;
              return (
                <motion.div
                  key={group._id}
                  initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...spring, delay: reduceMotion ? 0 : index * 0.035 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                  className="w-16 shrink-0"
                >
                  <Link to={`/groups/${group._id}`} className="group flex flex-col items-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#171717] text-white/[0.58] transition-colors group-hover:text-white">
                      <Icon size={19} strokeWidth={1.7} />
                    </span>
                    <span className="mt-2 w-full truncate text-center text-[11px] font-medium text-white/[0.55] group-hover:text-white/[0.85]">
                      {group.name || group.title}
                    </span>
                  </Link>
                </motion.div>
              );
            })}

            {groups.length === 0 && (
              <div className="w-full rounded-2xl border border-white/[0.08] bg-[#1A1A1A] px-5 py-8 text-center shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
                <p className="text-sm font-medium text-white/[0.58]">No groups yet</p>
                <p className="mt-1 text-xs text-white/30">
                  Create one when you have an expense to share.
                </p>
              </div>
            )}
          </div>
        </motion.section>

        <motion.section
          {...entrance}
          transition={{ ...spring, delay: reduceMotion ? 0 : 0.16 }}
          className="space-y-4 lg:col-span-7"
        >
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-manrope text-base font-semibold tracking-[-0.02em] text-white">
                Recent activity
              </h2>
              <p className="mt-1 text-xs text-white/[0.35]">Updates from your account</p>
            </div>
            <Link to="/activity" className="text-xs font-medium text-white/[0.55] hover:text-white">
              View all
            </Link>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1A1A1A] shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
            {recentActivity.map((notification, index) => (
              <motion.div
                key={notification._id}
                initial={{ opacity: 0, x: reduceMotion ? 0 : -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...spring, delay: reduceMotion ? 0 : index * 0.035 }}
                className="border-b border-white/[0.06] last:border-b-0"
              >
                <Link
                  to="/activity"
                  className="group flex min-h-[4.5rem] items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.025]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.045] text-white/[0.45] group-hover:text-white/75">
                    <Activity size={16} strokeWidth={1.7} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium leading-snug text-white/[0.78]">
                      {typeof notification.message === 'string'
                        ? notification.message
                        : notification.message?.message || 'Account activity updated'}
                    </span>
                    <span className="mt-1 block text-[11px] text-white/30">
                      {new Date(notification.createdAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </span>
                  <ChevronRight
                    size={15}
                    className="shrink-0 text-white/[0.18] group-hover:text-white/[0.45]"
                  />
                </Link>
              </motion.div>
            ))}

            {recentActivity.length === 0 && (
              <div className="px-5 py-10 text-center">
                <p className="text-sm font-medium text-white/[0.52]">Nothing new yet</p>
                <p className="mt-1 text-xs text-white/[0.28]">
                  Your latest account activity will appear here.
                </p>
              </div>
            )}
          </div>
        </motion.section>
      </div>

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
