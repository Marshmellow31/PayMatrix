import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronRight, X, Users, Loader2 } from 'lucide-react';
import adminService from '../../services/adminService.js';
import Loader from '../../components/common/Loader.jsx';
import toast from 'react-hot-toast';

const StatusBadge = ({ status }) => {
  const map = {
    active: {
      color: '#22c55e',
      label: 'Active',
      bg: 'rgba(34,197,94,0.1)',
      border: 'rgba(34,197,94,0.2)',
    },
    archived: {
      color: '#eab308',
      label: 'Archived',
      bg: 'rgba(234,179,8,0.1)',
      border: 'rgba(234,179,8,0.2)',
    },
    deleted: {
      color: '#ef4444',
      label: 'Deleted',
      bg: 'rgba(239,68,68,0.1)',
      border: 'rgba(239,68,68,0.2)',
    },
  };
  const { color, label, bg, border } = map[status] || {
    color: '#e5e2e1',
    label: status || 'Active',
    bg: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.1)',
  };
  return (
    <span
      className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
      style={{ backgroundColor: bg, borderColor: border, color }}
    >
      {label}
    </span>
  );
};

const GroupDetailDrawer = ({ groupId, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService
      .getGroupDetails(groupId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [groupId]);

  return (
    <motion.div
      className="fixed inset-y-0 right-0 w-full max-w-sm z-50 flex flex-col glass-panel shadow-2xl border-l border-white/10"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 22, stiffness: 220 }}
    >
      <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
        <h3 className="font-bold text-white font-manrope">Group Details</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70"
        >
          <X size={16} />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader size="md" />
        </div>
      ) : !data?.group ? (
        <div className="flex-1 flex items-center justify-center text-white/30 text-sm">
          Group not found
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div>
            <p className="font-bold text-white text-base">{data.group.name || data.group.title}</p>
            <p className="text-[10px] font-mono text-white/40 mt-1 break-all">{data.group._id}</p>
          </div>

          {[
            { label: 'Status', value: <StatusBadge status={data.group.status} /> },
            { label: 'Members', value: `${data.group.members?.length ?? 0} active` },
            { label: 'Invite Code', value: data.group.inviteCode || '—' },
            {
              label: 'Created',
              value: data.group.createdAt
                ? new Date(data.group.createdAt).toLocaleDateString('en-IN')
                : '—',
            },
          ].map((row) => (
            <div
              key={row.label}
              className="flex justify-between items-center py-3 border-b border-white/[0.04]"
            >
              <span className="text-xs text-white/40">{row.label}</span>
              <span className="text-xs text-white/70">{row.value}</span>
            </div>
          ))}

          {/* Recent expenses */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">
              Recent Expenses ({data.expenses.length})
            </p>
            <div className="space-y-1.5">
              {data.expenses.slice(0, 8).map((e) => (
                <div
                  key={e._id}
                  className="flex items-center justify-between rounded-xl px-3 py-2 border border-white/[0.02] bg-white/[0.04]"
                >
                  <span className="text-xs text-white/70 truncate flex-1">{e.title}</span>
                  <span className="text-xs font-bold ml-3 text-orange-400">
                    ₹{e.amount?.toLocaleString('en-IN') || '—'}
                  </span>
                </div>
              ))}
              {data.expenses.length === 0 && (
                <p className="text-xs text-white/25 italic">No expenses</p>
              )}
            </div>
          </div>

          {/* Recent settlements */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">
              Recent Settlements ({data.settlements.length})
            </p>
            <div className="space-y-1.5">
              {data.settlements.slice(0, 5).map((s) => (
                <div
                  key={s._id}
                  className="flex items-center justify-between rounded-xl px-3 py-2 border border-white/[0.02] bg-white/[0.04]"
                >
                  <span className="text-xs text-white/60 truncate">
                    {s.payerName} → {s.receiverName}
                  </span>
                  <span className="text-xs font-bold ml-2 text-emerald-400">
                    ₹{s.amount?.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
              {data.settlements.length === 0 && (
                <p className="text-xs text-white/25 italic">No settlements</p>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

const AdminGroups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [acting, setActing] = useState({});

  const loadGroups = useCallback(
    async (reset = false) => {
      try {
        reset ? setLoading(true) : setLoadingMore(true);
        const res = await adminService.getAllGroups(20, reset ? null : lastDoc);
        setGroups((prev) => (reset ? res.groups : [...prev, ...res.groups]));
        setLastDoc(res.lastDoc);
        setHasMore(res.hasMore);
      } catch {
        toast.error('Failed to load groups');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [lastDoc]
  );

  useEffect(() => {
    loadGroups(true);
  }, []); // eslint-disable-line

  const act = async (groupId, action, fn, confirmMsg) => {
    if (!window.confirm(confirmMsg)) return;
    setActing((prev) => ({ ...prev, [`${groupId}_${action}`]: true }));
    try {
      await fn();
      toast.success(`Group ${action}d`);
      loadGroups(true);
    } catch (e) {
      toast.error(e.message || `Failed to ${action} group`);
    } finally {
      setActing((prev) => ({ ...prev, [`${groupId}_${action}`]: false }));
    }
  };

  const filtered = search.trim()
    ? groups.filter((g) => (g.name || g.title || '').toLowerCase().includes(search.toLowerCase()))
    : groups;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black font-manrope text-white tracking-tight">Groups</h1>
          <p className="text-sm text-white/40 mt-0.5">{groups.length} loaded</p>
        </div>
      </div>

      <div className="relative mb-5">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search groups…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/5 text-white placeholder-white/25 focus:outline-none focus:border-white/20 transition-colors"
        />
      </div>

      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader size="lg" />
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden bg-surface-container-low border border-white/5 shadow-xl">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white/25 border-b border-white/[0.04] bg-white/[0.01]">
            <span>Group</span>
            <span>Members</span>
            <span className="hidden sm:block">Status</span>
            <span>Actions</span>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {filtered.map((group) => (
              <motion.div
                key={group._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setSelected(group._id)}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-4 py-3 hover:bg-white/[0.04] cursor-pointer transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {group.name || group.title || 'Unnamed'}
                  </p>
                  <p className="text-xs text-white/30 truncate">
                    {group.category || 'No category'} ·{' '}
                    {group.createdAt
                      ? new Date(group.createdAt).toLocaleDateString('en-IN', {
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-xs text-white/50">
                  <Users size={11} />
                  {group.members?.length ?? 0}
                </span>
                <span className="hidden sm:block">
                  <StatusBadge status={group.status} />
                </span>
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {group.status !== 'archived' && group.status !== 'deleted' && (
                    <button
                      onClick={() =>
                        act(
                          group._id,
                          'archive',
                          () => adminService.forceArchiveGroup(group._id),
                          'Archive this cohort? This will hide it from normal views.'
                        )
                      }
                      disabled={acting[`${group._id}_archive`]}
                      className="px-2 py-1 text-[9px] font-black uppercase rounded-lg border border-yellow-500/20 text-yellow-500 bg-yellow-500/5 hover:bg-yellow-500/10 transition-colors disabled:opacity-40"
                    >
                      {acting[`${group._id}_archive`] ? '...' : 'Archive'}
                    </button>
                  )}
                  {group.status !== 'deleted' && (
                    <button
                      onClick={() =>
                        act(
                          group._id,
                          'delete',
                          () => adminService.forceDeleteGroup(group._id),
                          'Permanently delete this cohort? This action is irreversible.'
                        )
                      }
                      disabled={acting[`${group._id}_delete`]}
                      className="px-2 py-1 text-[9px] font-black uppercase rounded-lg border border-red-500/20 text-red-500 bg-red-500/5 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                    >
                      {acting[`${group._id}_delete`] ? '...' : 'Delete'}
                    </button>
                  )}
                  <button
                    onClick={() => setSelected(group._id)}
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
                onClick={() => loadGroups(false)}
                disabled={loadingMore}
                className="px-5 py-2 rounded-xl text-sm font-medium text-white/50 hover:text-white/80 hover:bg-white/8 transition-all border border-white/[0.08]"
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="py-12 text-center text-white/25 text-sm">No groups found</div>
          )}
        </div>
      )}

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
            <GroupDetailDrawer groupId={selected} onClose={() => setSelected(null)} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminGroups;
