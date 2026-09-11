import { useState, useEffect } from 'react';
import { instrumentation } from '../services/instrumentation.js';
import Button from '../components/common/Button.jsx';
import toast from 'react-hot-toast';
import {
  Activity,
  RefreshCw,
  Download,
  Database,
  Shield,
  Zap,
  Layers,
  AlertTriangle,
} from 'lucide-react';

export default function DeveloperInstrumentation() {
  const [metrics, setMetrics] = useState(() => instrumentation.getMetrics());

  const refresh = () => {
    setMetrics(instrumentation.getMetrics());
  };

  useEffect(() => {
    const timer = setInterval(refresh, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleReset = () => {
    instrumentation.resetMetrics();
    refresh();
    toast.success('Instrumentation counters reset');
  };

  const handleExport = () => {
    const jsonStr = instrumentation.exportMetricsJson();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(jsonStr).catch(() => {});
    }

    try {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `paymatrix-firebase-usage-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('JSON export downloaded and copied to clipboard');
    } catch {
      toast.success('Export JSON copied to clipboard');
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-24 px-4 sm:px-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-widest font-mono mb-1">
            <Shield size={14} /> Local-Only Dev Tools
          </div>
          <h1 className="text-3xl font-bold font-manrope text-white tracking-tight">
            Firebase Usage Instrumentation
          </h1>
          <p className="text-sm text-on-surface-variant font-inter mt-1">
            Real-time local query telemetry, listener tracking, and cache distribution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={handleReset} className="h-10 text-xs font-bold">
            <RefreshCw size={14} className="mr-1.5" /> Reset
          </Button>
          <Button variant="primary" onClick={handleExport} className="h-10 text-xs font-bold">
            <Download size={14} className="mr-1.5" /> Export JSON
          </Button>
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-8 flex items-start gap-3">
        <Shield className="text-primary mt-0.5 shrink-0" size={18} />
        <div className="text-xs text-white/80 font-inter leading-relaxed">
          <strong className="text-primary font-semibold">Privacy Invariant:</strong> Instrumentation
          data is strictly stored locally on device and scoped to the active session. Document
          contents, financial amounts, email addresses, and user identifiers are never stored or
          exported.
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="DOCUMENT READS"
          value={metrics.documentReads}
          icon={Database}
          sub={`Cache: ${metrics.cacheReads} | Server: ${metrics.serverReads}`}
        />
        <MetricCard
          label="DOCUMENT WRITES"
          value={metrics.documentWrites}
          icon={Activity}
          sub="Mutations & batches"
        />
        <MetricCard
          label="ACTIVE LISTENERS"
          value={metrics.activeListeners}
          icon={Layers}
          sub={`Duplicates: ${metrics.duplicateListenerSignatures}`}
        />
        <MetricCard
          label="AVG QUERY LATENCY"
          value={`${metrics.averageQueryLatencyMs}ms`}
          icon={Zap}
          sub={`Last: ${metrics.lastQueryLatencyMs}ms (${metrics.queryCount} queries)`}
        />
        <MetricCard
          label="RETURNED DOCUMENTS"
          value={metrics.returnedDocuments}
          icon={Database}
          sub="Across all queries & snaps"
        />
        <MetricCard
          label="CACHE HIT RATIO"
          value={
            metrics.documentReads > 0
              ? `${Math.round((metrics.cacheReads / metrics.documentReads) * 100)}%`
              : 'N/A'
          }
          icon={Shield}
          sub={`${metrics.cacheReads} / ${metrics.documentReads} reads`}
        />
        <MetricCard
          label="DUPLICATE SIGNATURES"
          value={metrics.duplicateListenerSignatures}
          icon={AlertTriangle}
          sub="Concurrent duplicates"
          alert={metrics.duplicateListenerSignatures > 0}
        />
      </div>

      {/* Query Signatures List */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-bold uppercase tracking-widest text-white/70 font-mono mb-4">
          Recorded Query Signatures ({Object.keys(metrics.querySignatures || {}).length})
        </h3>
        {Object.keys(metrics.querySignatures || {}).length === 0 ? (
          <p className="text-sm text-on-surface-variant font-inter py-4 text-center">
            No queries or listener signatures recorded in this session yet.
          </p>
        ) : (
          <div className="divide-y divide-white/5 font-mono text-xs max-h-96 overflow-y-auto">
            {Object.entries(metrics.querySignatures).map(([sig, count]) => (
              <div key={sig} className="py-2.5 flex items-center justify-between gap-4">
                <span className="text-white/80 truncate">{sig}</span>
                <span className="text-primary font-bold shrink-0 bg-primary/10 px-2 py-0.5 rounded-full">
                  {count}×
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, sub, alert = false }) {
  return (
    <div
      className={`glass-card p-4 flex flex-col justify-between border ${alert ? 'border-amber-500/40 bg-amber-500/5' : 'border-white/5'}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 font-mono">
          {label}
        </span>
        <Icon size={14} className={alert ? 'text-amber-400' : 'text-primary/70'} />
      </div>
      <div>
        <div className="text-2xl font-black font-manrope text-white tracking-tight">{value}</div>
        {sub && <div className="text-[11px] text-white/40 font-inter mt-1 truncate">{sub}</div>}
      </div>
    </div>
  );
}
