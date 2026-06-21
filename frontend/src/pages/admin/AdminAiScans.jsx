import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Clock, Coins, Percent, CheckCircle,
  XCircle, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react';
import adminService from '../../services/adminService.js';
import Loader from '../../components/common/Loader.jsx';
import Avatar from '../../components/common/Avatar.jsx';
import toast from 'react-hot-toast';

const StatCard = ({ label, value, icon: Icon, sub, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ scale: 0.98 }}
    transition={{ delay, duration: 0.35, ease: 'easeOut' }}
    className="relative overflow-hidden rounded-2xl p-4 sm:p-6 bg-surface-container-low border border-white/5 shadow-xl group cursor-pointer"
  >
    <div className="flex justify-between items-start mb-4">
      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
        <Icon size={14} className="text-on-surface-variant" />
      </div>
      <span className="font-inter text-[8px] sm:text-[10px] font-bold tracking-widest uppercase text-on-surface-variant opacity-60">{label}</span>
    </div>
    <h3 className="font-manrope font-bold text-xl sm:text-2xl font-black text-white leading-none mb-1">
      {value}
    </h3>
    {sub && (
      <p className="text-[10px] mt-2 text-on-surface-variant opacity-50 font-inter leading-none">{sub}</p>
    )}
    <div className="absolute -right-2 -bottom-2 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity text-white">
      <Icon size={56} />
    </div>
  </motion.div>
);

const ScanLogRow = ({ log }) => {
  const [expanded, setExpanded] = useState(false);
  const isPassed = log.status === 'passed';

  return (
    <div className="border-b border-white/[0.04] last:border-b-0">
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-white/[0.02] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={log.userName} src={log.photoURL || log.avatar} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{log.userName}</p>
            <p className="text-xs text-white/35 truncate">{log.email || 'Anonymous'}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {/* Status Badge */}
          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1 ${
            isPassed
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}>
            {isPassed ? <CheckCircle size={9} /> : <XCircle size={9} />}
            {isPassed ? 'Passed' : 'Failed'}
          </span>

          <span className="hidden sm:flex text-xs text-white/40 items-center gap-1">
            <Clock size={11} className="opacity-60" />
            {log.duration ? `${(log.duration / 1000).toFixed(2)}s` : '—'}
          </span>

          <span className="text-[10px] font-bold uppercase tracking-widest text-white/20">
            {log.timestamp ? new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
          </span>

          <div className="text-white/30">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-white/[0.015]"
          >
            <div className="p-4 sm:p-5 border-t border-white/[0.02] space-y-4 text-xs font-inter leading-relaxed">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Meta details */}
                <div className="space-y-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/30">Scan Context</p>
                  <div className="space-y-1">
                    <p className="text-white/40">Timestamp: <span className="text-white/80 font-mono">{log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN') : '—'}</span></p>
                    <p className="text-white/40">Latency: <span className="text-white/80 font-mono">{log.duration || '0'} ms</span></p>
                    <p className="text-white/40">Model: <span className="text-white/80 font-mono">{log.model || 'Unknown'}</span></p>
                    <p className="text-white/40">User UID: <span className="text-white/80 font-mono">{log.uid}</span></p>
                  </div>
                </div>

                {/* Parsed results */}
                <div className="space-y-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/30">Parsed Content</p>
                  {isPassed ? (
                    <div className="space-y-1 bg-white/[0.02] p-3 rounded-xl border border-white/[0.05]">
                      <p className="text-white/40">Parsed Amount: <span className="text-orange-400 font-bold">₹{log.parsedAmount?.toLocaleString('en-IN') || '—'}</span></p>
                      <p className="text-white/40">Items Extracted: <span className="text-white/80 font-bold">{log.itemsCount || 0} items</span></p>
                    </div>
                  ) : (
                    <div className="bg-red-500/5 p-3 rounded-xl border border-red-500/10 space-y-1 text-red-400/80 font-mono">
                      <p className="font-bold text-[10px] uppercase tracking-wide">Error Log:</p>
                      <p className="break-all text-[11px] leading-normal">{log.error || 'Unknown scanner error'}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AdminAiScans = () => {
  const [logs, setLogs]           = useState([]);
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc]     = useState(null);
  const [hasMore, setHasMore]     = useState(false);

  const loadData = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        const statsRes = await adminService.getAiScanStats();
        setStats(statsRes);
      } else {
        setLoadingMore(true);
      }
      
      const logsRes = await adminService.getAiScanLogs(20, reset ? null : lastDoc);
      setLogs((prev) => reset ? logsRes.logs : [...prev, ...logsRes.logs]);
      setLastDoc(logsRes.lastDoc);
      setHasMore(logsRes.hasMore);
    } catch {
      toast.error('Failed to load AI scanner logs');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [lastDoc]);

  useEffect(() => { loadData(true); }, []); // eslint-disable-line

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black font-manrope text-white tracking-tight">AI Scan Analytics</h1>
          <p className="text-sm text-white/40 mt-0.5">Performance and logs of Gemini Receipt Scanner</p>
        </div>
        <button onClick={() => loadData(true)} className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors" title="Refresh">
          <RefreshCw size={15} />
        </button>
      </div>

      {loading ? (
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader size="lg" />
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* Aggregate Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Scans"
              value={stats?.total ?? 0}
              icon={Brain}
              sub="all-time scans logged"
              delay={0}
            />
            <StatCard
              label="Success Rate"
              value={`${stats?.successRate ?? 100}%`}
              icon={Percent}
              sub={`${stats?.passed ?? 0} passed / ${stats?.failed ?? 0} failed`}
              delay={0.05}
            />
            <StatCard
              label="Avg Latency"
              value={stats?.avgDuration ? `${(stats.avgDuration / 1000).toFixed(2)}s` : '—'}
              icon={Clock}
              sub="average response duration"
              delay={0.1}
            />
            <StatCard
              label="Est. Scanner Cost"
              value={`₹${stats?.estCost?.toFixed(2) ?? '0.00'}`}
              icon={Coins}
              sub="@ ₹0.05 per scan query"
              delay={0.15}
            />
          </div>

          {/* Logs List */}
          <div className="rounded-2xl overflow-hidden bg-surface-container-low border border-white/5 shadow-xl">
            <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.01] border-b border-white/[0.04]">
              <Brain size={13} className="text-white/60" />
              <span className="text-[10px] font-bold text-white/45 uppercase tracking-widest">Receipt Scanner Log History</span>
            </div>

            <div className="divide-y divide-white/[0.02]">
              {logs.map((log) => (
                <ScanLogRow key={log._id} log={log} />
              ))}
            </div>

            {hasMore && (
              <div className="p-4 flex justify-center border-t border-white/[0.05]">
                <button
                  onClick={() => loadData(false)}
                  disabled={loadingMore}
                  className="px-5 py-2 rounded-xl text-sm font-medium text-white/50 hover:text-white/80 hover:bg-white/8 transition-all border border-white/[0.08]"
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}

            {logs.length === 0 && (
              <div className="py-16 text-center">
                <Brain size={28} className="mx-auto mb-3 text-white/10" />
                <p className="text-sm text-white/25">No scans have been recorded yet</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAiScans;
