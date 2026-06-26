import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserX, UserCheck, WifiOff, ChevronRight, X, Loader2 } from 'lucide-react';
import adminService from '../../services/adminService.js';
import Avatar from '../../components/common/Avatar.jsx';
import Loader from '../../components/common/Loader.jsx';
import toast from 'react-hot-toast';

const ActionBtn = ({ onClick, icon: Icon, label, accent, loading }) => (
  <button
    onClick={onClick}
    disabled={loading}
    title={label}
    className="p-2 rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-40 flex items-center justify-center shrink-0"
    style={{ background: `${accent}0d`, border: `1px solid ${accent}20`, color: accent }}
  >
    {loading ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} />}
  </button>
);

const UserDetailDrawer = ({ user, onClose }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService
      .getUserDetails(user._id)
      .then(setDetails)
      .catch(() => setDetails(null))
      .finally(() => setLoading(false));
  }, [user._id]);

  return (
    <motion.div
      className="fixed inset-y-0 right-0 w-full max-w-sm z-50 flex flex-col glass-panel shadow-2xl border-l border-white/10"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 22, stiffness: 220 }}
    >
      <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
        <h3 className="font-bold text-white font-manrope">User Details</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader size="md" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Profile */}
          <div className="flex items-center gap-3">
            <Avatar
              name={details?.user?.name || user.name}
              src={details?.user?.avatar || details?.user?.photoURL || user.avatar || user.photoURL}
              size="md"
            />
            <div>
              <p className="font-bold text-white text-sm">{details?.user?.name || '—'}</p>
              <p className="text-xs text-white/40">{details?.user?.email}</p>
            </div>
          </div>

          {/* Info rows */}
          {[
            { label: 'UID', value: user._id },
            { label: 'UPI ID', value: details?.user?.upiId || '—' },
            {
              label: 'Joined',
              value: details?.user?.createdAt
                ? new Date(details.user.createdAt).toLocaleDateString('en-IN')
                : '—',
            },
            { label: 'Friends', value: `${details?.user?.friends?.length ?? 0} connections` },
            { label: 'Status', value: details?.user?.suspended ? 'Suspended' : 'Active' },
          ].map((row) => (
            <div
              key={row.label}
              className="flex justify-between items-center py-3 border-b border-white/[0.04]"
            >
              <span className="text-xs text-white/40">{row.label}</span>
              <span className="text-xs text-white/80 font-mono break-all text-right max-w-[180px]">
                {row.value}
              </span>
            </div>
          ))}

          {/* Groups */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">
              Groups ({details?.groups?.length ?? 0})
            </p>
            <div className="space-y-1.5">
              {details?.groups?.map((g) => (
                <div
                  key={g._id}
                  className="flex items-center justify-between rounded-xl px-3 py-2 border border-white/[0.02] bg-white/[0.04]"
                >
                  <span className="text-xs text-white/70">{g.name || g.title || 'Unnamed'}</span>
                  <span className="text-[10px] text-white/30">
                    {g.members?.length ?? 0} members
                  </span>
                </div>
              ))}
              {(!details?.groups || details.groups.length === 0) && (
                <p className="text-xs text-white/25 italic">No groups</p>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [acting, setActing] = useState({});

  const loadUsers = useCallback(
    async (reset = false) => {
      try {
        reset ? setLoading(true) : setLoadingMore(true);
        const res = await adminService.getAllUsers(20, reset ? null : lastDoc);
        setUsers((prev) => (reset ? res.users : [...prev, ...res.users]));
        setLastDoc(res.lastDoc);
        setHasMore(res.hasMore);
      } catch (e) {
        toast.error('Failed to load users');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [lastDoc]
  );

  useEffect(() => {
    loadUsers(true);
  }, []); // eslint-disable-line

  const act = async (uid, action, fn) => {
    setActing((prev) => ({ ...prev, [`${uid}_${action}`]: true }));
    try {
      await fn();
      toast.success(`${action} successful`);
      loadUsers(true);
    } catch (e) {
      toast.error(e.message || `${action} failed`);
    } finally {
      setActing((prev) => ({ ...prev, [`${uid}_${action}`]: false }));
    }
  };

  const filtered = search.trim()
    ? users.filter((u) => {
        const q = search.toLowerCase();
        return (
          (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
        );
      })
    : users;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black font-manrope text-white tracking-tight">Users</h1>
          <p className="text-sm text-white/40 mt-0.5">{users.length} loaded</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/5 text-white placeholder-white/25 focus:outline-none focus:border-white/20 transition-colors"
        />
      </div>

      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader size="lg" />
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden bg-surface-container-low border border-white/5 shadow-xl">
          {/* Table header */}
          <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white/25 border-b border-white/[0.04] bg-white/[0.01]">
            <span className="w-9" />
            <span>User</span>
            <span className="hidden sm:block">Joined</span>
            <span>Actions</span>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {filtered.map((user) => (
              <motion.div
                key={user._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center px-4 py-3 hover:bg-white/[0.02] transition-colors"
              >
                <Avatar name={user.name} src={user.avatar || user.photoURL} size="sm" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">
                      {user.name || 'No name'}
                    </p>
                    {user.suspended && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                        Suspended
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/35 truncate">{user.email}</p>
                </div>
                <span className="hidden sm:block text-xs text-white/30 whitespace-nowrap">
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: '2-digit',
                      })
                    : '—'}
                </span>
                <div className="flex items-center gap-1.5">
                  {user.suspended ? (
                    <ActionBtn
                      onClick={() =>
                        act(user._id, 'enable', () => adminService.enableUser(user._id))
                      }
                      icon={UserCheck}
                      label="Enable"
                      accent="#22c55e"
                      loading={acting[`${user._id}_enable`]}
                    />
                  ) : (
                    <ActionBtn
                      onClick={() =>
                        act(user._id, 'suspend', () => adminService.suspendUser(user._id))
                      }
                      icon={UserX}
                      label="Suspend"
                      accent="#ef4444"
                      loading={acting[`${user._id}_suspend`]}
                    />
                  )}
                  <ActionBtn
                    onClick={() =>
                      act(user._id, 'clearFCM', () => adminService.clearUserFCM(user._id))
                    }
                    icon={WifiOff}
                    label="Clear FCM token"
                    accent="#eab308"
                    loading={acting[`${user._id}_clearFCM`]}
                  />
                  <button
                    onClick={() => setSelected(user)}
                    className="p-2 rounded-xl hover:bg-white/8 text-white/30 hover:text-white/60 transition-colors"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {hasMore && !search && (
            <div className="p-4 flex justify-center border-t border-white/[0.05]">
              <button
                onClick={() => loadUsers(false)}
                disabled={loadingMore}
                className="px-5 py-2 rounded-xl text-sm font-medium transition-all hover:bg-white/8 text-white/50 hover:text-white/80 border border-white/[0.08]"
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="py-12 text-center text-white/25 text-sm">No users found</div>
          )}
        </div>
      )}

      {/* Detail drawer */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
            />
            <UserDetailDrawer user={selected} onClose={() => setSelected(null)} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminUsers;
