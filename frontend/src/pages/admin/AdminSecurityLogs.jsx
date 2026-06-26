import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Shield, Filter, RefreshCw, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import adminService from '../../services/adminService.js';
import Loader from '../../components/common/Loader.jsx';
import toast from 'react-hot-toast';

const EVENT_TYPES = [
  { value: '', label: 'All Events' },
  { value: 'auth/login-success', label: 'Login Success' },
  { value: 'auth/login-failure', label: 'Login Failure' },
  { value: 'rate-limit/exceeded', label: 'Rate Limit Exceeded' },
  { value: 'security/suspicious', label: 'Suspicious Activity' },
  { value: 'security/validation-error', label: 'Validation Error' },
];

const eventIcon = (event = '') => {
  if (event.includes('failure') || event.includes('suspicious'))
    return <AlertTriangle size={12} className="text-red-400" />;
  if (event.includes('success')) return <CheckCircle size={12} className="text-emerald-400" />;
  return <Info size={12} className="text-blue-400" />;
};

const eventColor = (event = '') => {
  if (event.includes('failure') || event.includes('suspicious') || event.includes('rate-limit'))
    return '#ef4444';
  if (event.includes('success')) return '#34d399';
  return '#3b82f6';
};

const LogRow = ({ log }) => {
  const color = eventColor(log.event);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-start gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition-colors border-b border-white/[0.04]"
    >
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-white/5 border border-white/10"
        style={{ background: `${color}15` }}
      >
        {eventIcon(log.event)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="text-xs font-bold font-mono" style={{ color }}>
            {log.event || 'unknown'}
          </span>
          {log.uid && (
            <span className="text-[10px] text-white/30 font-mono truncate max-w-[140px] bg-white/5 px-1.5 py-0.5 rounded-md border border-white/[0.02]">
              {log.uid}
            </span>
          )}
        </div>
        {log.details && (
          <p className="text-xs text-white/40 truncate">
            {typeof log.details === 'string'
              ? log.details
              : JSON.stringify(log.details).slice(0, 120)}
          </p>
        )}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-white/20 shrink-0 mt-1 whitespace-nowrap">
        {log.timestamp
          ? new Date(log.timestamp).toLocaleString('en-IN', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '—'}
      </span>
    </motion.div>
  );
};

const AdminSecurityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [eventFilter, setEventFilter] = useState('');

  const loadLogs = useCallback(
    async (reset = false) => {
      try {
        reset ? setLoading(true) : setLoadingMore(true);
        const res = await adminService.getSecurityLogs(
          30,
          reset ? null : lastDoc,
          eventFilter || null
        );
        setLogs((prev) => (reset ? res.logs : [...prev, ...res.logs]));
        setLastDoc(res.lastDoc);
        setHasMore(res.hasMore);
      } catch (e) {
        toast.error('Failed to load security logs');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [lastDoc, eventFilter]
  );

  useEffect(() => {
    loadLogs(true);
  }, [eventFilter]); // eslint-disable-line

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black font-manrope text-white tracking-tight">
            Security Logs
          </h1>
          <p className="text-sm text-white/40 mt-0.5">Immutable audit trail of security events</p>
        </div>
        <button
          onClick={() => loadLogs(true)}
          className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Filter */}
      <div className="flex flex-col gap-2.5 mb-6">
        <div className="flex items-center gap-2 text-white/30">
          <Filter size={13} />
          <span className="text-[10px] font-bold uppercase tracking-widest font-inter">
            Filter events
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {EVENT_TYPES.map((et) => (
            <button
              key={et.value}
              onClick={() => setEventFilter(et.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                eventFilter === et.value
                  ? 'bg-white text-black border-transparent shadow-md shadow-white/5'
                  : 'bg-white/[0.03] text-white/40 border-white/[0.05] hover:text-white hover:bg-white/5'
              }`}
            >
              {et.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader size="lg" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl overflow-hidden bg-surface-container-low border border-white/5 shadow-xl"
        >
          <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.01] border-b border-white/[0.04]">
            <Shield size={13} className="text-white/60" />
            <span className="text-[10px] font-bold text-white/45 uppercase tracking-widest">
              {logs.length} events logged
            </span>
          </div>

          <div className="divide-y divide-white/[0.02]">
            {logs.map((log) => (
              <LogRow key={log._id} log={log} />
            ))}
          </div>

          {hasMore && (
            <div className="p-4 flex justify-center border-t border-white/[0.05]">
              <button
                onClick={() => loadLogs(false)}
                disabled={loadingMore}
                className="px-5 py-2 rounded-xl text-sm font-medium text-white/50 hover:text-white/80 hover:bg-white/8 transition-all border border-white/[0.08]"
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}

          {logs.length === 0 && (
            <div className="py-16 text-center">
              <Shield size={28} className="mx-auto mb-3 text-white/10" />
              <p className="text-sm text-white/25">No security events found</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default AdminSecurityLogs;
