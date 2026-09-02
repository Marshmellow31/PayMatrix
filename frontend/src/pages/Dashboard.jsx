import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useOutletContext } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Activity,
  BarChart3,
  Bell,
  Camera,
  CheckCircle2,
  ChevronRight,
  CloudUpload,
  Hash,
  Plus,
  WalletCards,
  WifiOff,
} from 'lucide-react';
import { getGroupCategoryMeta } from '../utils/iconMap.js';
import expenseService from '../services/expenseService.js';
import { useSyncStatus } from '../hooks/useSyncStatus.js';
import Loader from '../components/common/Loader.jsx';
import BillScannerModal from '../components/bill/BillScannerModal.jsx';
import LiveUpdate from '../components/common/LiveUpdate.jsx';

const spring = { type: 'spring', stiffness: 340, damping: 32, mass: 0.8 };
const formatAmount = (value) =>
  Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const shortDate = (value) => {
  const date = toDate(value);
  return date?.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) || '';
};

const Dashboard = () => {
  const reduceMotion = useReducedMotion();
  const syncStatus = useSyncStatus();
  const { openAddExpense } = useOutletContext();
  const { user } = useSelector((state) => state.auth);
  const { groups = [], loading: groupsLoading } = useSelector((state) => state.groups);
  const { notifications = [], unreadCount = 0 } = useSelector((state) => state.notifications);
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [showBillScanner, setShowBillScanner] = useState(false);
  const [isOffline, setIsOffline] = useState(
    typeof window !== 'undefined' ? !navigator.onLine : false
  );

  const groupsUpdatedHash = useMemo(
    () => JSON.stringify(groups.map((group) => group.updatedAt || group._id)),
    [groups]
  );

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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

  const sortedGroups = useMemo(
    () =>
      [...groups].sort((a, b) => {
        const byBalance =
          Math.abs(summary?.groupBalances?.[b._id] || 0) -
          Math.abs(summary?.groupBalances?.[a._id] || 0);
        return (
          byBalance || (toDate(b.updatedAt)?.getTime() || 0) - (toDate(a.updatedAt)?.getTime() || 0)
        );
      }),
    [groups, summary?.groupBalances]
  );

  const attentionItems = useMemo(() => {
    const items = [];
    if (syncStatus.pending > 0) {
      items.push({
        key: 'sync',
        title: 'Sync pending',
        body: `${syncStatus.pending} secure change${syncStatus.pending === 1 ? '' : 's'} waiting for a connection`,
        icon: CloudUpload,
        tone: 'amber',
        to: '/activity',
      });
    }
    sortedGroups
      .filter((group) => Math.abs(summary?.groupBalances?.[group._id] || 0) > 0.005)
      .slice(0, 2)
      .forEach((group) => {
        const balance = summary.groupBalances[group._id];
        items.push({
          key: group._id,
          title:
            balance < 0
              ? `Settle ${group.name || group.title}`
              : `Balance in ${group.name || group.title}`,
          body: `${balance < 0 ? 'You owe' : 'You are owed'} ₹${formatAmount(Math.abs(balance))}`,
          icon: WalletCards,
          tone: balance < 0 ? 'red' : 'green',
          to: `/groups/${group._id}`,
        });
      });
    if (unreadCount > 0 && items.length < 3) {
      items.push({
        key: 'activity',
        title: 'Review activity',
        body: `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}`,
        icon: Bell,
        tone: 'blue',
        to: '/activity',
      });
    }
    return items.slice(0, 3);
  }, [sortedGroups, summary?.groupBalances, syncStatus.pending, unreadCount]);

  const categories = summary?.categories || [];
  const trackedSpend = categories.reduce(
    (total, category) => total + Number(category.value || 0),
    0
  );
  const topCategory = categories[0];
  const netBalance = Number(summary?.netBalance || 0);
  const firstName = (user?.name || user?.email?.split('@')[0] || 'Member').split(' ')[0];
  const entrance = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.16 } }
    : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: spring };
  const syncLabel = isOffline
    ? 'Offline'
    : syncStatus.pending > 0
      ? 'Pending sync'
      : syncStatus.lastSyncedAt
        ? `Synced ${shortDate(syncStatus.lastSyncedAt)}`
        : 'Ready';

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
              <WifiOff size={13} /> Offline · changes will sync later
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.header {...entrance} className="mb-6 flex items-center justify-between gap-4 lg:mb-8">
        <div className="min-w-0">
          <p className="text-xs font-medium text-white/35">Welcome back</p>
          <h1 className="mt-0.5 truncate font-manrope text-[1.75rem] font-black tracking-[-0.045em] text-white sm:text-3xl">
            {firstName}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-2">
          <span
            className={`h-2 w-2 rounded-full ${isOffline ? 'bg-red-300' : syncStatus.pending > 0 ? 'bg-amber-300' : 'bg-emerald-300'}`}
          />
          <span className="text-[10px] font-semibold text-white/45">{syncLabel}</span>
        </div>
      </motion.header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
        <motion.section
          {...entrance}
          className="relative overflow-hidden rounded-[1.85rem] border border-white/[0.1] bg-[linear-gradient(145deg,#101010_0%,#1b1b1b_55%,#242424_100%)] p-6 shadow-[0_24px_65px_rgba(0,0,0,0.3)] lg:col-span-7 lg:p-8"
        >
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/25">
                  Your position
                </p>
                <p className="mt-2 text-xs text-white/45">
                  {netBalance > 0.005
                    ? 'Overall, you are owed'
                    : netBalance < -0.005
                      ? 'Overall, you owe'
                      : 'You are settled'}
                </p>
              </div>
              <WalletCards size={22} className="text-white/25" />
            </div>
            <p className="mt-8 font-manrope text-[2.6rem] font-black leading-none tracking-[-0.065em] text-white tabular-nums sm:text-5xl">
              <span className="mr-1 text-[0.58em] font-semibold text-white/35">₹</span>
              {formatAmount(Math.abs(netBalance))}
            </p>
            <div className="mt-8 grid grid-cols-2 divide-x divide-white/[0.08] border-t border-white/[0.08] pt-5">
              <PositionMetric label="You owe" value={summary?.totalOwe} tone="red" />
              <PositionMetric label="You are owed" value={summary?.totalOwed} tone="green" inset />
            </div>
          </div>
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/[0.055] blur-3xl" />
        </motion.section>

        <motion.div
          {...entrance}
          transition={{ ...spring, delay: reduceMotion ? 0 : 0.04 }}
          className="grid grid-cols-2 gap-3 lg:col-span-5"
        >
          <QuickAction
            primary
            icon={Camera}
            title="Scan receipt"
            body="Camera or gallery"
            reduceMotion={reduceMotion}
            onClick={() => setShowBillScanner(true)}
          />
          <QuickAction
            icon={Plus}
            title="Add expense"
            body="Record manually"
            reduceMotion={reduceMotion}
            onClick={() => openAddExpense()}
          />
        </motion.div>

        <motion.section
          {...entrance}
          transition={{ ...spring, delay: reduceMotion ? 0 : 0.08 }}
          className="space-y-4 lg:col-span-5"
        >
          <SectionHeading title="Needs attention" body="The next useful actions" />
          {attentionItems.length ? (
            <div className="space-y-2.5">
              {attentionItems.map((item) => (
                <AttentionRow key={item.key} item={item} />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-[1.35rem] border border-emerald-300/[0.12] bg-emerald-300/[0.045] p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-300/10 text-emerald-300">
                <CheckCircle2 size={19} />
              </span>
              <div>
                <p className="text-sm font-semibold text-white/85">Everything is clear</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-white/35">
                  No pending sync, unread activity, or balances need your attention.
                </p>
              </div>
            </div>
          )}
        </motion.section>

        <motion.section
          {...entrance}
          transition={{ ...spring, delay: reduceMotion ? 0 : 0.12 }}
          className="space-y-4 lg:col-span-7"
        >
          <div className="flex items-end justify-between">
            <SectionHeading title="Active groups" body="Balances ordered by what matters" />
            <div className="flex items-center gap-2">
              <Link
                to="/groups?add=true"
                aria-label="Create group"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-white/60 hover:text-white"
              >
                <Plus size={15} />
              </Link>
              <Link to="/groups" className="text-xs font-medium text-white/45 hover:text-white">
                See all
              </Link>
            </div>
          </div>
          <div className="space-y-2.5">
            {sortedGroups.slice(0, 5).map((group, index) => (
              <LiveUpdate
                key={group._id}
                value={`${group.updatedAt || ''}:${summary?.groupBalances?.[group._id] || 0}`}
              >
                <GroupRow
                  group={group}
                  balance={Number(summary?.groupBalances?.[group._id] || 0)}
                  index={index}
                  reduceMotion={reduceMotion}
                />
              </LiveUpdate>
            ))}
            {!sortedGroups.length && (
              <div className="rounded-[1.35rem] border border-white/[0.08] bg-[#1a1a1a] px-5 py-9 text-center">
                <p className="text-sm font-medium text-white/55">No groups yet</p>
                <p className="mt-1 text-xs text-white/25">
                  Create one when you have something to share.
                </p>
              </div>
            )}
          </div>
        </motion.section>

        <motion.section
          {...entrance}
          transition={{ ...spring, delay: reduceMotion ? 0 : 0.16 }}
          className="rounded-[1.5rem] border border-white/[0.08] bg-[#1a1a1a] p-5 lg:col-span-5 lg:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <SectionHeading
              title="Spending overview"
              body="Your tracked share across active groups"
            />
            <BarChart3 size={20} className="text-white/25" />
          </div>
          <p className="mt-7 font-manrope text-3xl font-black tracking-[-0.045em] text-white tabular-nums">
            ₹{formatAmount(trackedSpend)}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <SnapshotMetric
              label="Top category"
              value={topCategory?.name || 'No spending'}
              supporting={topCategory ? `₹${formatAmount(topCategory.value)}` : '—'}
            />
            <SnapshotMetric
              label="Categories"
              value={categories.length || 'None yet'}
              supporting="Tracked in your splits"
            />
          </div>
        </motion.section>

        <motion.section
          {...entrance}
          transition={{ ...spring, delay: reduceMotion ? 0 : 0.2 }}
          className="space-y-4 lg:col-span-7"
        >
          <div className="flex items-end justify-between">
            <SectionHeading title="Recent activity" body="Latest account updates" />
            <Link to="/activity" className="text-xs font-medium text-white/45 hover:text-white">
              View all
            </Link>
          </div>
          <div className="overflow-hidden rounded-[1.35rem] border border-white/[0.08] bg-[#1a1a1a]">
            {notifications.slice(0, 5).map((notification) => (
              <LiveUpdate
                key={notification._id}
                value={`${notification.read}:${notification.createdAt || ''}:${typeof notification.message === 'string' ? notification.message : notification.message?.message || ''}`}
              >
                <Link
                  to="/activity"
                  className="group flex min-h-[4.5rem] items-center gap-3 border-b border-white/[0.06] px-4 py-3.5 last:border-b-0 hover:bg-white/[0.025]"
                >
                  <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.85rem] bg-white/[0.045] text-white/40">
                    <Activity size={17} />
                    {!notification.read && (
                      <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-sm leading-snug ${notification.read ? 'font-medium text-white/60' : 'font-semibold text-white/85'}`}
                    >
                      {typeof notification.message === 'string'
                        ? notification.message
                        : notification.message?.message || 'Account activity updated'}
                    </span>
                    <span className="mt-1 block text-[10px] text-white/25">
                      {shortDate(notification.createdAt)}
                    </span>
                  </span>
                  <ChevronRight size={15} className="text-white/15 group-hover:text-white/45" />
                </Link>
              </LiveUpdate>
            ))}
            {!notifications.length && (
              <div className="px-5 py-10 text-center">
                <p className="text-sm font-medium text-white/50">Nothing new yet</p>
                <p className="mt-1 text-xs text-white/25">
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

const SectionHeading = ({ title, body }) => (
  <div>
    <h2 className="font-manrope text-base font-semibold tracking-[-0.02em] text-white">{title}</h2>
    <p className="mt-1 text-xs text-white/30">{body}</p>
  </div>
);

const PositionMetric = ({ label, value, tone, inset = false }) => (
  <div className={inset ? 'pl-5' : 'pr-5'}>
    <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-white/25">{label}</p>
    <p
      className={`mt-2 font-manrope text-lg font-bold tabular-nums ${tone === 'red' ? 'text-red-300/90' : 'text-emerald-300/90'}`}
    >
      ₹{formatAmount(value)}
    </p>
  </div>
);

const QuickAction = ({ primary = false, icon: Icon, title, body, reduceMotion, onClick }) => (
  <motion.button
    type="button"
    whileTap={reduceMotion ? undefined : { scale: 0.98 }}
    transition={spring}
    onClick={onClick}
    className={`flex min-h-28 flex-col justify-between rounded-3xl p-4 text-left sm:min-h-32 sm:p-5 ${primary ? 'bg-white text-black shadow-[0_16px_38px_rgba(255,255,255,0.05)]' : 'border border-white/[0.08] bg-[#1a1a1a] text-white'}`}
  >
    <span
      className={`flex h-10 w-10 items-center justify-center rounded-xl ${primary ? 'bg-black/[0.06]' : 'bg-white/[0.06]'}`}
    >
      <Icon size={19} />
    </span>
    <span>
      <span className="block text-sm font-bold">{title}</span>
      <span className={`mt-1 block text-[10px] ${primary ? 'text-black/45' : 'text-white/30'}`}>
        {body}
      </span>
    </span>
  </motion.button>
);

const AttentionRow = ({ item }) => {
  const Icon = item.icon;
  const tones = {
    amber: 'bg-amber-300/10 text-amber-200',
    red: 'bg-red-300/10 text-red-300',
    green: 'bg-emerald-300/10 text-emerald-300',
    blue: 'bg-blue-300/10 text-blue-300',
  };
  return (
    <Link
      to={item.to}
      className="group flex items-center gap-3 rounded-[1.35rem] border border-white/[0.08] bg-[#1a1a1a] p-3.5 transition-colors hover:bg-[#202020]"
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tones[item.tone]}`}
      >
        <Icon size={19} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-white/85">{item.title}</span>
        <span className="mt-0.5 block truncate text-[11px] text-white/35">{item.body}</span>
      </span>
      <ChevronRight size={16} className="text-white/20 group-hover:text-white/50" />
    </Link>
  );
};

const GroupRow = ({ group, balance, index, reduceMotion }) => {
  const categoryMeta = getGroupCategoryMeta(group.category, group.name || group.title);
  const Icon = categoryMeta.IconComponent || Hash;
  const memberCount = Array.isArray(group.members) ? group.members.length : 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: reduceMotion ? 0 : index * 0.035 }}
    >
      <Link
        to={`/groups/${group._id}`}
        className="group flex items-center gap-3 rounded-[1.35rem] border border-white/[0.08] bg-[#1a1a1a] p-3.5 transition-colors hover:bg-[#202020]"
      >
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: `${categoryMeta.color || '#919191'}18`,
            color: categoryMeta.color || '#919191',
          }}
        >
          <Icon size={21} strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-white/85">
            {group.name || group.title}
          </span>
          <span className="mt-1 block text-[10px] text-white/30">
            {shortDate(group.updatedAt) || `${memberCount} member${memberCount === 1 ? '' : 's'}`}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-[9px] text-white/30">
            {balance < -0.005 ? 'You owe' : balance > 0.005 ? 'You are owed' : 'Settled'}
          </span>
          <span
            className={`mt-1 block font-manrope text-sm font-bold tabular-nums ${balance < -0.005 ? 'text-red-300/90' : balance > 0.005 ? 'text-emerald-300/90' : 'text-white/55'}`}
          >
            ₹{formatAmount(Math.abs(balance))}
          </span>
        </span>
        <ChevronRight size={16} className="text-white/15 group-hover:text-white/45" />
      </Link>
    </motion.div>
  );
};

const SnapshotMetric = ({ label, value, supporting }) => (
  <div className="rounded-2xl bg-white/[0.035] p-3.5">
    <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-white/25">{label}</p>
    <p className="mt-2 truncate text-xs font-semibold text-white/75">{value}</p>
    <p className="mt-1 truncate text-[10px] text-white/30">{supporting}</p>
  </div>
);

export default Dashboard;
